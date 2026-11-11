import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** One row per checkout attempt. Amounts are in satang. */
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    productSlug: text("product_slug").notNull(),
    productName: text("product_name").notNull(),
    amountSatang: integer("amount_satang").notNull(),
    currency: text("currency").notNull().default("THB"),
    email: text("email").notNull(),
    userId: text("user_id"),
    status: text("status").notNull().default("pending"),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref").notNull(),
    qrPayload: text("qr_payload").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    index("orders_provider_ref_idx").on(table.provider, table.providerRef),
    index("orders_email_idx").on(table.email),
    index("orders_user_id_idx").on(table.userId),
  ],
);

export type OrderRow = typeof orders.$inferSelect;
