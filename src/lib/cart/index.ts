import "server-only";
import { cookies } from "next/headers";
import { getProduct, type Product } from "@/lib/catalog";
import { parseCart, serializeCart } from "./parse";

/**
 * The cart lives in a cookie that holds pack slugs only. It works without a
 * database and without signing in. Prices are always read from the catalog.
 */

const COOKIE = "cart";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function isBuyable(slug: string): boolean {
  return getProduct(slug)?.status === "available";
}

export interface Cart {
  items: Product[];
  totalSatang: number;
}

export async function getCartSlugs(): Promise<string[]> {
  const jar = await cookies();
  return parseCart(jar.get(COOKIE)?.value, isBuyable);
}

export async function getCart(): Promise<Cart> {
  const items = (await getCartSlugs()).map((slug) => getProduct(slug)!).filter(Boolean);
  return { items, totalSatang: items.reduce((sum, item) => sum + item.priceSatang, 0) };
}

/** Replace the cart. Only call this from a server action or route handler. */
export async function saveCart(slugs: string[]): Promise<void> {
  const jar = await cookies();
  const clean = parseCart(serializeCart(slugs), isBuyable);
  if (clean.length === 0) {
    jar.delete(COOKIE);
    return;
  }
  jar.set(COOKIE, serializeCart(clean), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}
