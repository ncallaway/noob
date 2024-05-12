import { PublicKey } from "./identity";
import { Mass, Volume } from "./metrics";
import { Branded, ISOZonedDateTime } from "src/types";

export module Medicine {

  export type DrugId = Branded<string, "DrugId">;
  export type MedicationId = Branded<string, "MedicationId">;

  export type Medication = {
    id: MedicationId;
    authorKey: PublicKey;
    at: ISOZonedDateTime;
    drug: DrugId;
    form?: DosageForm;
    quantity?: MedicationQuantity;
  }

  export type MedicationQuantity = LiquidQuantity | PillQuantity;

  export type DosageForm = LiquidDosageForm | PillDosageForm;

  export type Drug = {
    id: DrugId;

    name: string;
    brandName?: string;

    forms: DosageForm[]
  }
}
type LiquidQuantity = {
  kind: "liquid";
  quantity: Volume.Measure;
}

type PillQuantity = {
  kind: "pill";
  count: number;
}

type LiquidDosageForm = {
  kind: "liquid";

  quantity: Mass.Measure;
  per: Volume.Measure;

  name?: string;
}

type PillDosageForm = {
  kind: "pill"
  quantity: Mass.Measure;

  name?: string;
}

