require("make-promises-safe"); // installs an 'unhandledRejection' handler
import sodium from "libsodium-wrappers";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import {
  CreateSnapshotParams,
  CreateUpdateParams,
  GetDocumentParams,
  SecsyncSnapshotBasedOnOutdatedSnapshotError,
  SecsyncSnapshotMissesUpdatesError,
  Snapshot,
  Update,
  compareUpdateClocks,
  createWebSocketConnection,
  hash,
} from "secsync";
import { WebSocketServer } from "ws";
import { ClientClock, PublicKey, Repository, RepositoryId, SnapshotId, SnapshotVersion, activeSnapshot, get, set } from "src/store";
import { produce, freeze } from "immer";
// import { createSnapshot as createSnapshotDb } from "./database/createSnapshot";
// import { createUpdate as createUpdateDb } from "./database/createUpdate";
// import { getOrCreateDocument as getOrCreateDocumentDb } from "./database/getOrCreateDocument";

async function main() {
  // const allowedOrigin =
  //   process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
  //     ? "http://localhost:3000"
  //     : "https://www.secsync.com";
  const allowedOrigin = "*";
  const corsOptions = { credentials: true, origin: allowedOrigin };

  const app = express();
  app.use(cors(corsOptions));

  const server = createServer(app);

  const webSocketServer = new WebSocketServer({ noServer: true });
  webSocketServer.on(
    "connection",
    createWebSocketConnection({
      getDocument: getOrCreateDocument,
      createSnapshot: createSnapshot,
      createUpdate: createUpdate,
      hasAccess: async () => true,
      hasBroadcastAccess: async ({ websocketSessionKeys }) => websocketSessionKeys.map(() => true),
      logging: "error",
    })
  );

  server.on("upgrade", (request, socket, head) => {
    // @ts-ignore
    webSocketServer.handleUpgrade(request, socket, head, (ws) => {
      webSocketServer.emit("connection", ws, request);
    });
  });

  const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
  server.listen(port, () => {
    console.log(`🚀 App ready at http://localhost:${port}/`);
    console.log(`🚀 Websocket service ready at ws://localhost:${port}`);
  });
}

type GetDocumentResult = {
  snapshot?: Snapshot;
  snapshotProofChain?: SnapshotProofChainEntry[];
  updates: Update[];
};

export type SnapshotProofChainEntry = {
  snapshotId: string;
  snapshotCiphertextHash: string;
  parentSnapshotProof: string;
};

const getOrCreateDocument = async (params: GetDocumentParams): Promise<GetDocumentResult | undefined> => {
  const { documentId, knownSnapshotId, knownSnapshotUpdateClocks, mode } = params;

  const repositoryId: RepositoryId = documentId as RepositoryId;

  let repo = await get(repositoryId);
  if (!repo) {
    const created: Omit<Repository, "id"> = freeze(
      {
        snapshots: [],
      },
      true
    );
    repo = await set(repositoryId, created);
  }

  const active = activeSnapshot(repo);

  if (!active) {
    return {
      updates: [],
      snapshotProofChain: [],
    };
  }

  let snapshotProofChain: SnapshotProofChainEntry[] = [];
  if (knownSnapshotId && knownSnapshotId !== active.id) {
    const idx = repo.snapshots.findIndex(s => s.id === knownSnapshotId);
    if (idx < 0) {
      throw new Error(`Repository \`${repositoryId}\` does not have a snapshot \`${knownSnapshotId}\``);
    }
    const unknownSnapshots = repo.snapshots.slice(idx + 1);
    snapshotProofChain = unknownSnapshots.map(s => ({
      parentSnapshotProof: s.snapshot.publicData.parentSnapshotProof,
      snapshotCiphertextHash: s.ciphertextHash,
      snapshotId: s.id
    }));
  }

  let lastKnownVersion: SnapshotVersion | undefined = undefined;
  // in case the last known snapshot is the current one, try to find the lastKnownVersion number
  if (knownSnapshotId === active.id && knownSnapshotUpdateClocks) {
    const updateIds = Object.entries(knownSnapshotUpdateClocks).map(
      ([pubKey, clock]) => {
        return `${knownSnapshotId}-${pubKey}-${clock}`;
      }
    );
    const lastUpdate = active.updates.reverse().find(u => {
      const pub = u.update.publicData;
      const key = `${pub.refSnapshotId}-${pub.pubKey}-${pub.clock}`;
      return updateIds.includes(key);
    });

    lastKnownVersion = lastUpdate?.version;
  }

  // fetch the active snapshot with
    // - all updates after the last known version if there is one and
    // - all updates if there is none
  const updates = lastKnownVersion ? active.updates.filter(u => u.version > lastKnownVersion) : active.updates;

  if (mode === "delta" && knownSnapshotId === active.id) {
    return {
      updates: updates.map(u => u.update)
    };
  }

  return {
    snapshot: active.snapshot,
    updates: updates.map(u => u.update),
    snapshotProofChain: snapshotProofChain
  };
};

const createSnapshot = async (params: CreateSnapshotParams): Promise<Snapshot> => {
  const { snapshot } = params;

  const repositoryId: RepositoryId = snapshot.publicData.docId as RepositoryId;

  const repo = await get(repositoryId);

  if (!repo) {
    throw new Error(`Repository ${repositoryId} was not found`);
  }

  const active = activeSnapshot(repo);
  if (active) {
    if (snapshot.publicData.parentSnapshotId !== undefined && snapshot.publicData.parentSnapshotId !== active.id) {
      throw new SecsyncSnapshotBasedOnOutdatedSnapshotError("Snapshot is out of date.");
    }

    const compareUpdateClocksResult = compareUpdateClocks(
      active.clientClocks as Record<string, number>,
      snapshot.publicData.parentSnapshotUpdateClocks
    );

    if (!compareUpdateClocksResult.equal) {
      throw new SecsyncSnapshotMissesUpdatesError("Snapshot does not include the latest changes.");
    }
  }

  const cloned: Snapshot = JSON.parse(JSON.stringify(snapshot));

  const updated = produce(repo, (draft) => {
    draft.snapshots.push({
      id: cloned.publicData.snapshotId as SnapshotId,
      clientClocks: {},
      latestVersion: 0 as SnapshotVersion,
      updates: [],
      snapshot: cloned,
      ciphertextHash: hash(snapshot.ciphertext, sodium)
    });
  });

  set(repositoryId, updated);

  return cloned;
};

const createUpdate = async ({ update }: CreateUpdateParams): Promise<Update> => {
  const repositoryId: RepositoryId = update.publicData.docId as RepositoryId;
  const refSnapshotId: SnapshotId = update.publicData.refSnapshotId as SnapshotId;

  const repo = await get(repositoryId);

  if (!repo) {
    throw new Error(`Repository ${repositoryId} was not found`);
  }

  const active = activeSnapshot(repo);

  if (!active) {
    throw new Error(`Repository ${repositoryId} did not have an active snapshot`);
  }

  if (active.id !== refSnapshotId) {
    throw new Error("Update referencing an out of date snapshot.");
  }

  const clock = active.clientClocks[update.publicData.pubKey as PublicKey];
  if (clock === undefined) {
    if (update.publicData.clock !== 0) {
      throw new Error(`Update clock incorrect. Clock: ${update.publicData.clock}, but should be 0`);
    }
  } else {
    const expectedClockValue = (clock + 1) as ClientClock;
    if (expectedClockValue !== update.publicData.clock) {
      throw new Error(`Update clock incorrect. Clock: ${update.publicData.clock}, but should be ${expectedClockValue}`);
    }
  }

  const cloned: Update = JSON.parse(JSON.stringify(update));

  const updated = produce(repo, (draft) => {
    const active = draft.snapshots[draft.snapshots.length - 1];
    const version = (active.latestVersion + 1) as SnapshotVersion;
    active.latestVersion = version;
    active.clientClocks[update.publicData.pubKey as PublicKey] = update.publicData.clock as ClientClock;
    active.updates.push({
      update: cloned,
      version
    });
  });

  set(repositoryId, updated);

  return cloned;
};

main();
