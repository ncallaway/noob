import { Person, PublicIdentity, PublicKey } from "./identity";
import { Medicine } from "./medicine";
import { Volume } from "./metrics";
import { Branded, ISODuration, ISOZonedDateTime, NoId, Store } from "src/types";
import { RepositoryId, RepositoryMembership } from "./repository";

export module Baby {
  export type FeedId = Branded<string, "FeedId">;
  export type ShitId = Branded<string, "ShitId">;
  export type SleepId = Branded<string, "SleepId">;

  export type FeedQuantity = DurationFeedQuantity | VolumetricFeedQuantity;
  export type FeedMethod = BreastFeedMethod | BottleFeedMethod;

  export type Feed = {
    id: FeedId;
    authorKey: PublicKey;
    at: ISOZonedDateTime;
    quantity?: FeedQuantity;
    method?: FeedMethod;
    fed: "breast-milk" | "formula";
  }

  export type Shit = {
    id: ShitId;
    authorKey: PublicKey;
    at: ISOZonedDateTime;
    // size?
    // color?
  }

  export type Sleep = {
    id: SleepId;
    authorKey: PublicKey;
    at: ISOZonedDateTime;
    duration?: ISODuration;
  }

  export type Meta = {
    // Stuff like defaults, or if the user has decided not to see certain options, etc
    trackFeeds?: boolean;
    trackShits?: boolean;
    trackSleeps?: boolean;
    trackMedications?: boolean;
  }


  export type Repository = {
    id: RepositoryId;
    kind: "baby";
    baby: Person | PublicIdentity;
    meta: Meta;
    owner: PublicKey;
    members: RepositoryMembership[];

    entries: {
      feeds: Store<FeedId, NoId<Feed>>;
      shits: Store<ShitId, NoId<Shit>>;
      sleeps: Store<SleepId, NoId<Sleep>>;
      medications: Store<Medicine.MedicationId, NoId<Medicine.Medication>>;
    }

    library: {
      people: Store<PublicKey, Omit<PublicIdentity, 'publicKey'>>;
      drugs: Store<Medicine.DrugId, NoId<Medicine.Drug>>;
    }
  }
}

type BreastFeedMethod = {
  kind: "breast";
  side?: "left" | "right";
};

type BottleFeedMethod = {
  kind: "bottle";
}

type QualitativeFeedDuration = { qualitative: 'short' | 'normal' | 'long'};
type QuantativeFeedDuration = { quantitative: ISODuration; }
type DurationFeedQuantity = QualitativeFeedDuration | QuantativeFeedDuration;

type QualitativeFeedVolume = { qualitative: 'small' | 'normal' | 'big' };
type QuantativeFeedVolume = { quantitative: Volume.Measure }
type VolumetricFeedQuantity = QualitativeFeedVolume | QuantativeFeedVolume;


