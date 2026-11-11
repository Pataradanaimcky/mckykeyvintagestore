"use server";

import { redirect } from "next/navigation";
import { applyPaymentEvent, getOrder } from "@/lib/orders";
import { getProvider } from "@/lib/payments";
import { buildMockWebhook } from "@/lib/payments/providers/mock";

/**
 * Test buttons on the order page. Only works while the mock provider is active.
 * It builds a signed webhook and feeds it through the same verification and
 * order-update code that a real gateway's webhook uses.
 */
export async function simulatePayment(formData: FormData): Promise<void> {
  const orderId = String(formData.get("orderId") ?? "");
  const outcome = formData.get("outcome") === "failed" ? "failed" : "paid";

  const provider = getProvider();
  if (!provider.isMock) {
    throw new Error("Simulated payments are disabled when a real provider is active.");
  }

  const order = await getOrder(orderId);
  if (!order) redirect("/");

  const { body, headers } = buildMockWebhook({ providerRef: order.providerRef, type: outcome });
  const event = await provider.parseWebhook(body, headers);
  if (!event) throw new Error("Mock webhook failed signature verification.");

  const updated = await applyPaymentEvent(provider.name, event, order.id);
  redirect(`/orders/${updated?.id ?? order.id}`);
}
