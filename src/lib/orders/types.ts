export type OrderStatus = "pending" | "paid" | "failed" | "expired";

export interface Order {
  /** Unguessable identifier used in the order page URL. */
  id: string;
  productSlug: string;
  productName: string;
  amountSatang: number;
  currency: "THB";
  email: string;
  /** Signed-in buyer, e.g. "google:1234". Null when bought without signing in. */
  userId: string | null;
  status: OrderStatus;
  /** Payment provider that created the charge, e.g. "mock". */
  provider: string;
  /** The provider's own reference for the charge. */
  providerRef: string;
  /** Text encoded in the QR code shown to the buyer. */
  qrPayload: string;
  /** ISO timestamps. */
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
}

export type NewOrder = Omit<Order, "id" | "status" | "createdAt" | "paidAt">;

/**
 * Storage for orders. Two implementations exist:
 * - postgres: real storage, used when DATABASE_URL is set
 * - signed links: no storage at all, the order travels inside its own signed id (demo mode)
 */
export interface OrderRepository {
  create(input: NewOrder): Promise<Order>;
  get(id: string): Promise<Order | null>;
  findByProviderRef(provider: string, providerRef: string): Promise<Order | null>;
  /** A signed-in buyer's orders, newest first. */
  listByUser(userId: string): Promise<Order[]>;
  /**
   * Move a pending order to a final status. Returns the stored order, or null if it
   * does not exist. In demo mode the returned order has a NEW id, so always use the
   * returned id for redirects.
   */
  setStatus(id: string, status: Exclude<OrderStatus, "pending">): Promise<Order | null>;
}
