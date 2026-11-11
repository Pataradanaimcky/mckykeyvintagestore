import "server-only";
import { assertProductionSecrets, env, isDemoMode } from "@/lib/env";
import { mockProvider } from "./providers/mock";
import type { PaymentProvider } from "./types";

export type { Charge, ChargeRequest, PaymentEvent, PaymentProvider } from "./types";

/** Register new providers here. The key is the value of PAYMENT_PROVIDER. */
const providers: Record<string, PaymentProvider> = {
  mock: mockProvider,
};

export function getProvider(name: string = env.paymentProvider): PaymentProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown payment provider "${name}".`);
  }
  if (!provider.isMock) {
    // Real money needs real storage and a real secret.
    assertProductionSecrets();
    if (isDemoMode) {
      throw new Error("DATABASE_URL must be set before enabling a real payment provider.");
    }
  }
  return provider;
}
