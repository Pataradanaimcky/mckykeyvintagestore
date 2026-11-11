import "server-only";
import { sign, verify } from "@/lib/security/sign";
import type { NewOrder, Order, OrderRepository } from "./types";

/**
 * Demo-mode storage: there is no database, so the whole order is packed into its
 * own id and signed. Anyone can read an order id, but nobody can change one
 * without the secret. Nothing is kept on the server, so there is no order history
 * and provider webhooks cannot find an order. Use Postgres for real sales.
 */

const PREFIX = "demo_";

function encode(order: Omit<Order, "id">): string {
  const body = Buffer.from(JSON.stringify(order)).toString("base64url");
  return `${PREFIX}${body}.${sign(body)}`;
}

function decode(id: string): Order | null {
  if (!id.startsWith(PREFIX)) return null;
  const [body, signature] = id.slice(PREFIX.length).split(".");
  if (!body || !signature || !verify(body, signature)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return { ...data, id } as Order;
  } catch {
    return null;
  }
}

export const signedLinkOrderRepository: OrderRepository = {
  async create(input: NewOrder) {
    const order: Omit<Order, "id"> = {
      ...input,
      status: "pending",
      createdAt: new Date().toISOString(),
      paidAt: null,
    };
    return { ...order, id: encode(order) };
  },

  async get(id) {
    return decode(id);
  },

  async findByProviderRef() {
    return null;
  },

  async setStatus(id, status) {
    const current = decode(id);
    if (!current) return null;
    if (current.status !== "pending") return current;
    const { id: _oldId, ...rest } = current;
    void _oldId;
    const next: Omit<Order, "id"> = {
      ...rest,
      status,
      paidAt: status === "paid" ? new Date().toISOString() : null,
    };
    return { ...next, id: encode(next) };
  },
};
