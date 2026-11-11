/** What a provider returns after it is asked to collect money for an order. */
export interface Charge {
  /** The provider's own id for this charge. Stored on the order. */
  providerRef: string;
  /** Text to encode in the QR code the buyer scans. */
  qrPayload: string;
  /** ISO timestamp after which the QR must not be paid. */
  expiresAt: string;
}

/** A payment result reported by the provider, normally through a webhook. */
export interface PaymentEvent {
  providerRef: string;
  type: "paid" | "failed";
}

export interface ChargeRequest {
  amountSatang: number;
  description: string;
}

/**
 * Everything the store needs from a payment company. To add a real Thai gateway
 * (for example PromptPay through Opn Payments, Stripe or 2C2P), write one file
 * that implements this interface and register it in `payments/index.ts`.
 */
export interface PaymentProvider {
  name: string;
  /** Shown to the buyer, e.g. "PromptPay QR". */
  label: string;
  /** True for the built-in simulator. The order page shows test buttons when true. */
  isMock: boolean;
  createCharge(request: ChargeRequest): Promise<Charge>;
  /**
   * Check the webhook's signature and translate it into a PaymentEvent.
   * Must return null when the signature is missing or wrong.
   */
  parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent | null>;
}
