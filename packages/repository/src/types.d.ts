import { Baby } from "./types/baby";
import { Postpartum } from "./types/postpartum";

export type NoId<T> = Omit<T, 'id'>;
export type Store<K, V> = Record<K, V | undefined>;

export type Branded<T, X extends string> = T & { __type: X };

export type ISODate = Branded<string, "ISODate">;
export type ISOZonedDateTime = Branded<string, "ISOZonedDateTime">;
export type ISODuration = Branded<string, "ISODuration">;

