import "server-only";

/**
 * Server-side environment access. Every variable the app reads is listed here,
 * so a missing setting fails in one obvious place.
 */

const DEV_ORDER_SECRET = "dev-only-secret-change-me";

export type PaymentProviderName = "mock";

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export const env = {
  /** Postgres connection string. When unset, orders are kept in signed links (demo mode). */
  databaseUrl: read("DATABASE_URL") ?? read("POSTGRES_URL"),
  /** Secret used to sign order links and mock webhooks. */
  orderSecret: read("ORDER_SECRET") ?? DEV_ORDER_SECRET,
  /** Which payment provider handles checkout. Only "mock" exists today. */
  paymentProvider: (read("PAYMENT_PROVIDER") ?? "mock") as PaymentProviderName,
};

/** True when no database is configured, so orders live only in signed links. */
export const isDemoMode = !env.databaseUrl;

/** True when the signing secret is still the built-in development value. */
export const usesDevSecret = env.orderSecret === DEV_ORDER_SECRET;

/**
 * Real payment providers must never run with the development secret.
 * Call this from any non-mock provider before it creates a charge.
 */
export function assertProductionSecrets(): void {
  if (usesDevSecret) {
    throw new Error(
      "ORDER_SECRET is not set. Set a long random value before enabling real payments.",
    );
  }
}
