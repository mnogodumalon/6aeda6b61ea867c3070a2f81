// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Testeintraege {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    beschreibung?: string;
    testdatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    prioritaet?: LookupValue;
    bestanden?: boolean;
  };
}

export const APP_IDS = {
  TESTEINTRAEGE: '6aeda6ade5c6813be686481d',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'testeintraege': {
    status: [{ key: "offen", label: "Offen" }, { key: "in_bearbeitung", label: "In Bearbeitung" }, { key: "abgeschlossen", label: "Abgeschlossen" }],
    prioritaet: [{ key: "niedrig", label: "Niedrig" }, { key: "mittel", label: "Mittel" }, { key: "hoch", label: "Hoch" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'testeintraege': {
    'titel': 'string/text',
    'beschreibung': 'string/textarea',
    'testdatum': 'date/date',
    'status': 'lookup/select',
    'prioritaet': 'lookup/radio',
    'bestanden': 'bool',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateTesteintraege = StripLookup<Testeintraege['fields']>;