import { categories, products } from "./products";
import type { CategoryId, Product } from "./types";

export type { Category, CategoryId, Patch, Product } from "./types";
export { categories };

export function listProducts(category?: CategoryId): Product[] {
  return category ? products.filter((p) => p.category === category) : products;
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function isCategoryId(value: unknown): value is CategoryId {
  return categories.some((c) => c.id === value);
}

/** Whole-number discount percentage, or undefined when there is no original price. */
export function discountPercent(product: Product): number | undefined {
  if (!product.compareAtSatang || product.compareAtSatang <= product.priceSatang) {
    return undefined;
  }
  return Math.round((1 - product.priceSatang / product.compareAtSatang) * 100);
}
