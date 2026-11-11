export type CategoryId = "keys" | "pads" | "bass-brass" | "bundle";

export interface Category {
  id: CategoryId;
  label: string;
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
  category: CategoryId;
  /** Price in satang. Checkout always reads the price from here, never from the browser. */
  priceSatang: number;
  /** Original price in satang, shown struck through when set. */
  compareAtSatang?: number;
  performances: number;
  engines: string;
  status: "available" | "coming_soon";
  badge?: string;
  /** Two colors used to draw the cover. */
  cover: { from: string; to: string; label: string };
  patches: Patch[];
}
