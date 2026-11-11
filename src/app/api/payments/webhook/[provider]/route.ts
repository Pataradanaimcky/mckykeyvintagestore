import { NextResponse } from "next/server";
import { applyPaymentEvent } from "@/lib/orders";
import { getProvider, type PaymentProvider } from "@/lib/payments";

/**
 * Payment gateways call this URL when a charge is paid or fails:
 *   POST /api/payments/webhook/<provider-name>
 * The provider checks the signature. Unsigned or wrongly signed calls are rejected.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerName } = await params;

  let provider: PaymentProvider;
  try {
    provider = getProvider(providerName);
  } catch {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  const rawBody = await request.text();
  const event = await provider.parseWebhook(rawBody, request.headers);
  if (!event) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const order = await applyPaymentEvent(provider.name, event);
  return NextResponse.json({ received: true, matched: order !== null });
}
