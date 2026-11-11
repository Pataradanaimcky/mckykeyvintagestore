export type CategoryId = "keys" | "pads" | "bass-brass" | "bundle";
export type InstrumentId = "yamaha-modx-m" | "roland-fantom-0";

export interface Category {
  id: CategoryId;
  label: string;
}

/** A keyboard that packs are made for. The maker's name is used only to say what a pack works with. */
export interface Instrument {
  id: InstrumentId;
  /** Maker, e.g. "Yamaha". */
  maker: string;
  /** Short model name for chips and tabs, e.g. "MODX M". */
  model: string;
  /** Full list of models the files load on. */
  worksWith: string;
  /** The store's own color for this product line. Not the maker's brand color. */
  color: string;
  /** File type the buyer receives, e.g. ".Y2L". */
  fileFormat: string;
  /** What one sound is called on this instrument. */
  soundUnit: string;
  compatibility: { model: string; ok: boolean; note: string }[];
  installSteps: string[];
}

export interface Patch {
  /** Short category tag shown on the synth screen, e.g. "Key", "Pad". */
  tag: string;
  name: string;
}

export interface Product {
  slug: string;
  name: string;
  /** One line under the name on a tile. */
  summary: string;
  description: string;
  instrument: InstrumentId;
  category: CategoryId;
  /** Price in satang. Checkout always reads the price from here, never from the browser. */
  priceSatang: number;
  /** Original price in satang, shown struck through when set. */
  compareAtSatang?: number;
  /** Number of sounds in the pack. */
  soundCount: number;
  engines: string;
  status: "available" | "coming_soon";
  badge?: string;
  /** Short label drawn on the cover. The cover color comes from the instrument. */
  cover: { label: string };
  /** Optional photo shown instead of the drawn cover, e.g. "/packs/thai-pop-keys-vol-1.jpg" (file in /public). */
  image?: string;
  patches: Patch[];
}
