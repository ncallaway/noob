import { NoId, Store } from "src/types";
import { Medicine } from "src/types/medicine";
import { Person, PublicIdentity, PublicKey } from "./identity";
import { RepositoryId, RepositoryMembership } from "./repository";

export module Postpartum {
  export type Meta = {
    // Stuff like defaults, or if the user has decided not to see certain options, etc
    trackFeeds?: boolean;
    trackShits?: boolean;
    trackSleeps?: boolean;
    trackMedications?: boolean;
  }

  export type Repository = {
    id: RepositoryId;
    kind: "postpartum";
    person: Person | PublicIdentity;
    meta: Meta;
    owner: PublicKey;
    members: RepositoryMembership[];

    entries: {
      medications: Store<Medicine.MedicationId, NoId<Medicine.Medication>>;
    }

    library: {
      people: Store<PublicKey, Omit<PublicIdentity, 'publicKey'>>;
      drugs: Store<Medicine.DrugId, NoId<Medicine.Drug>>;
    }
  }
}
