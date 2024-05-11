import { Snapshot, Update } from "secsync";

type Branded<T, X extends string> = T & { __type: X };

export type RepositoryId = Branded<string, "repositoryId">;
export type SnapshotId = Branded<string, "snapshotId">;
export type PublicKey = Branded<string, "publicKey">;
export type ClientClock = Branded<number, "clientClock">;
export type SnapshotVersion = Branded<number, "snapshotVersion">;

export type Repository = {
  id: RepositoryId;
  snapshots: SnapshotData[];
}

type Clocks = Record<PublicKey, ClientClock | undefined>;

export type SnapshotData = {
  id: SnapshotId;
  snapshot: Snapshot;
  latestVersion: SnapshotVersion;
  clientClocks: Clocks;
  ciphertextHash: string;
  updates: UpdateData[];
}

export type UpdateData = {
  update: Update;
  version: SnapshotVersion;
}

const documents: Record<RepositoryId, Repository | undefined> = {};

export const get = async (id: RepositoryId): Promise<Repository | undefined> => {
  return documents[id];
}

export const set = async (id: RepositoryId, repository: Omit<Repository, 'id'>): Promise<Repository> => {
  const repo = { ...repository, id };
  documents[id] = repo;
  return repo;
}

export const activeSnapshot = (repository: Repository): SnapshotData | undefined => {
  if (repository.snapshots.length > 0) {
    return repository.snapshots[repository.snapshots.length - 1];
  }
}

