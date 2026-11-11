import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { orders, type OrderRow } from "@/lib/db/schema";
import { randomId } from "@/lib/security/sign";
import type { NewOrder, Order, OrderRepository, OrderStatus } from "./types";

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    productSlug: row.productSlug,
    productName: row.productName,
    amountSatang: row.amountSatang,
    currency: "THB",
    email: row.email,
    userId: row.userId,
    status: row.status as OrderStatus,
    provider: row.provider,
    providerRef: row.providerRef,
    qrPayload: row.qrPayload,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  };
}

export const postgresOrderRepository: OrderRepository = {
  async create(input: NewOrder) {
    const [row] = await getDb()
      .insert(orders)
      .values({
        id: randomId("ord"),
        ...input,
        expiresAt: new Date(input.expiresAt),
      })
      .returning();
    return toOrder(row);
  },

  async get(id) {
    const [row] = await getDb().select().from(orders).where(eq(orders.id, id)).limit(1);
    return row ? toOrder(row) : null;
  },

  async findByProviderRef(provider, providerRef) {
    const [row] = await getDb()
      .select()
      .from(orders)
      .where(and(eq(orders.provider, provider), eq(orders.providerRef, providerRef)))
      .limit(1);
    return row ? toOrder(row) : null;
  },

  async listByUser(userId) {
    const rows = await getDb()
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(100);
    return rows.map(toOrder);
  },

  async setStatus(id, status) {
    // The WHERE clause makes this safe to call twice: only a pending order changes.
    const [updated] = await getDb()
      .update(orders)
      .set({ status, paidAt: status === "paid" ? new Date() : null })
      .where(and(eq(orders.id, id), eq(orders.status, "pending")))
      .returning();
    if (updated) return toOrder(updated);
    return this.get(id);
  },
};
