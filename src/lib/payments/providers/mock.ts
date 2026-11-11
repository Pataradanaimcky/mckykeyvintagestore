import "server-only";
import { z } from "zod";
import { randomId, sign, verify } from "@/lib/security/sign";
import type { PaymentEvent, PaymentProvider } from "../types";

/**
 * Payment simulator. It never moves money. The QR it produces is deliberately
 * not a payable PromptPay code, and "payments" are triggered by the test buttons
 * on the order page, which send a signed webhook through the same code path a
 * real gateway would use.
 */

export const MOCK_SIGNATURE_HEADER = "x-mock-signature";
const QR_LIFETIME_MINUTES = 15;

const eventSchema = z.object({
  providerRef: z.string().min(1),
  type: z.enum(["paid", "failed"]),
});

/** Build the body and signature header of a simulated webhook. */
export function buildMockWebhook(event: PaymentEvent): { body: string; headers: Headers } {
  const body = JSON.stringify(event);
  return { body, headers: new Headers({ [MOCK_SIGNATURE_HEADER]: sign(body) }) };
}

export const mockProvider: PaymentProvider = {
  name: "mock",
  label: "PromptPay QR (จำลอง)",
  isMock: true,

  async createCharge({ amountSatang }) {
    const providerRef = randomId("mockchg", 9);
    return {
      providerRef,
      qrPayload: `MOCK-PAYMENT|${providerRef}|THB${(amountSatang / 100).toFixed(2)}`,
      expiresAt: new Date(Date.now() + QR_LIFETIME_MINUTES * 60_000).toISOString(),
    };
  },

  async parseWebhook(rawBody, headers) {
    const signature = headers.get(MOCK_SIGNATURE_HEADER);
    if (!signature || !verify(rawBody, signature)) return null;
    try {
      return eventSchema.parse(JSON.parse(rawBody));
    } catch {
      return null;
    }
  },
};
