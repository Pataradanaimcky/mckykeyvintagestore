import { instruments } from "./instruments";
import { categories, products } from "./products";
import type { CategoryId, Instrument, InstrumentId, Product } from "./types";

export type { Category, CategoryId, Instrument, InstrumentId, Patch, Product } from "./types";
export { categories, instruments };

export function listProducts(filter: { category?: CategoryId; instrument?: InstrumentId } = {}): Product[] {
  return products.filter(
    (p) =>
      (!filter.category || p.category === filter.category) &&
      (!filter.instrument || p.instrument === filter.instrument),
  );
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getInstrument(id: InstrumentId): Instrument {
  const instrument = instruments.find((i) => i.id === id);
  if (!instrument) throw new Error(`Unknown instrument "${id}".`);
  return instrument;
}

export function isCategoryId(value: unknown): value is CategoryId {
  return categories.some((c) => c.id === value);
}

export function isInstrumentId(value: unknown): value is InstrumentId {
  return instruments.some((i) => i.id === value);
}

/** Whole-number discount percentage, or undefined when there is no original price. */
export function discountPercent(product: Product): number | undefined {
  if (!product.compareAtSatang || product.compareAtSatang <= product.priceSatang) {
    return undefined;
  }
  return Math.round((1 - product.priceSatang / product.compareAtSatang) * 100);
}
