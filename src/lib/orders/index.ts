import "server-only";
import { getProduct } from "@/lib/catalog";
import { isDemoMode } from "@/lib/env";
import { getProvider, type PaymentEvent } from "@/lib/payments";
import { postgresOrderRepository } from "./postgres-repository";
import { signedLinkOrderRepository } from "./signed-link-repository";
import type { Order, OrderRepository } from "./types";

export type { Order, OrderStatus } from "./types";

function repository(): OrderRepository {
  return isDemoMode ? signedLinkOrderRepository : postgresOrderRepository;
}

export class OrderError extends Error {}

/** Create a pending order and its payment charge. The price always comes from the catalog. */
export async function createOrder(input: {
  productSlug: string;
  email: string;
  userId?: string | null;
}): Promise<Order> {
  const product = getProduct(input.productSlug);
  if (!product) throw new OrderError("ไม่พบสินค้านี้");
  if (product.status !== "available") throw new OrderError("สินค้านี้ยังไม่เปิดขาย");

  const provider = getProvider();
  const charge = await provider.createCharge({
    amountSatang: product.priceSatang,
    description: product.name,
  });

  return repository().create({
    productSlug: product.slug,
    productName: product.name,
    amountSatang: product.priceSatang,
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
