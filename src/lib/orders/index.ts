import "server-only";
import { getProduct } from "@/lib/catalog";
import { isDemoMode } from "@/lib/env";
import { getProvider, type PaymentEvent } from "@/lib/payments";
import { postgresOrderRepository } from "./postgres-repository";
import { signedLinkOrderRepository } from "./signed-link-repository";
import type { Order, OrderItem, OrderRepository } from "./types";

export type { Order, OrderItem, OrderStatus } from "./types";

function repository(): OrderRepository {
  return isDemoMode ? signedLinkOrderRepository : postgresOrderRepository;
}

export class OrderError extends Error {}

/** "Pack A" or "Pack A และอีก 2 แพ็ก" */
function describe(items: OrderItem[]): string {
  return items.length === 1 ? items[0].name : `${items[0].name} และอีก ${items.length - 1} แพ็ก`;
}

/**
 * Create a pending order for one or more packs, and its payment charge.
 * Prices always come from the catalog, never from the browser.
 */
export async function createOrder(input: {
  productSlugs: string[];
  email: string;
  userId?: string | null;
}): Promise<Order> {
  const slugs = [...new Set(input.productSlugs)];
  if (slugs.length === 0) throw new OrderError("ตะกร้าว่างอยู่");

  const items: OrderItem[] = slugs.map((slug) => {
    const product = getProduct(slug);
    if (!product) throw new OrderError("มีแพ็กที่ไม่พบในร้าน กรุณาตรวจตะกร้าอีกครั้ง");
    if (product.status !== "available") throw new OrderError(`${product.name} ยังไม่เปิดขาย`);
    return { slug: product.slug, name: product.name, priceSatang: product.priceSatang };
  });
  const amountSatang = items.reduce((sum, item) => sum + item.priceSatang, 0);
  const summary = describe(items);

  const provider = getProvider();
  const charge = await provider.createCharge({ amountSatang, description: summary });

  return repository().create({
    items,
    productSlug: items[0].slug,
    productName: summary,
    amountSatang,
    currency: "THB",
    email: input.email,
    userId: input.userId ?? null,
    provider: provider.name,
    providerRef: charge.providerRef,
    qrPayload: charge.qrPayload,
    expiresAt: charge.expiresAt,
  });
}

/** Orders a signed-in buyer made, newest first. Always empty in demo mode. */
export async function listOrdersForUser(userId: string): Promise<Order[]> {
  const now = Date.now();
  const orders = await repository().listByUser(userId);
  return orders.map((order) =>
    order.status === "pending" && Date.parse(order.expiresAt) < now ? { ...order, status: "expired" } : order,
  );
}

/** Load an order. A pending order past its expiry time is reported as expired. */
export async function getOrder(id: string): Promise<Order | null> {
  const order = await repository().get(id);
  if (!order) return null;
  if (order.status === "pending" && Date.parse(order.expiresAt) < Date.now()) {
    return { ...order, status: "expired" };
  }
  return order;
}

/**
 * Apply a verified payment event to its order. Safe to call more than once.
 * `orderId` is only needed in demo mode, where orders cannot be looked up by
 * provider reference.
 */
export async function applyPaymentEvent(
  providerName: string,
  event: PaymentEvent,
  orderId?: string,
): Promise<Order | null> {
  const repo = repository();
  const order = orderId
    ? await repo.get(orderId)
    : await repo.findByProviderRef(providerName, event.providerRef);

  if (!order) return null;
  if (order.provider !== providerName || order.providerRef !== event.providerRef) return null;
  if (order.status !== "pending") return order;
  if (event.type === "paid" && Date.parse(order.expiresAt) < Date.now()) {
    return repo.setStatus(order.id, "expired");
  }
  return repo.setStatus(order.id, event.type);
}
