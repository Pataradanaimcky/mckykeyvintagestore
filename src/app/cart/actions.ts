"use server";

import { redirect } from "next/navigation";
import { getCartSlugs, saveCart } from "@/lib/cart";
import { getProduct } from "@/lib/catalog";
import { getOrder } from "@/lib/orders";

/** Add one pack. With `buyNow` set, go straight to checkout. */
export async function addToCart(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  if (getProduct(slug)?.status !== "available") return;

  const slugs = await getCartSlugs();
  if (!slugs.includes(slug)) await saveCart([...slugs, slug]);

  if (formData.get("buyNow")) redirect("/checkout");
}

export async function removeFromCart(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const slugs = await getCartSlugs();
  await saveCart(slugs.filter((s) => s !== slug));
}

/** Put an unpaid order's packs back in the cart so the buyer can try again. */
export async function restoreCartFromOrder(formData: FormData): Promise<void> {
  const order = await getOrder(String(formData.get("orderId") ?? ""));
  if (!order) redirect("/cart");

  const current = await getCartSlugs();
  await saveCart([...current, ...order.items.map((item) => item.slug)]);
  redirect("/checkout");
}
