import { Branded } from "src/types";
import { RepositoryId } from "./repository";

export type PrivateKey = Branded<string, "PrivateKey">;
export type PublicKey = Branded<string, "PublicKey">;

export type PersonAge = {
  dob: Date;
} | {
  age: number;
  ageSet: Date;
}
export type Person = {
  name: string;
} & PersonAge;

export type PublicIdentity = {
  publicKey: PublicKey;
} & Person;

export type PrivateIdentity = {
  privateKey: PrivateKey;

  repositories: RepositoryId[];
}