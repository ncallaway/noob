import { Baby } from "./baby";
import { Postpartum } from "./postpartum";
import { PublicKey } from "./identity";
import { Branded } from "src/types";

export type RepositoryId = Branded<string, "RepositoryId">;

export type RepositoryMembership = {
  key: PublicKey;
  access: 'none' | 'read' | 'write'
}

export type Repository = Baby.Repository | Postpartum.Repository;
export type RepositoryKind = Repository['kind'];