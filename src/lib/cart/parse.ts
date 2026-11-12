/** Most packs one cart can hold. Larger carts are cut down to this. */
export const MAX_CART_ITEMS = 50;

/**
 * Read the cart cookie: pack slugs separated by commas. Unknown, unavailable
 * and repeated slugs are dropped, so a tampered cookie can only ever produce a
 * shorter cart. Prices are never stored in the cookie.
 */
export function parseCart(value: string | undefined, isBuyable: (slug: string) => boolean): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const raw of value.split(",")) {
    const slug = raw.trim();
    if (slug && !seen.has(slug) && isBuyable(slug)) seen.add(slug);
    if (seen.size >= MAX_CART_ITEMS) break;
  }
  return [...seen];
}

export function serializeCart(slugs: string[]): string {
  return slugs.join(",");
}
