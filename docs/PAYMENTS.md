# Payments

## How it works today

`PAYMENT_PROVIDER=mock` runs a simulator. It never moves money.

1. The buyer submits the checkout form. The server creates an order and asks the provider for a charge.
2. The order page shows a QR code. The simulator's QR is deliberately **not** a payable PromptPay code.
3. The "โหมดทดสอบ" buttons send a signed webhook through the same code a real gateway would use.
4. The order becomes `paid` or `failed`. A pending order past its expiry shows as `expired`.

## Connecting a real Thai gateway

Automatic confirmation needs a gateway that calls the store back when the bank confirms. Gateways that offer PromptPay QR to Thai merchants include Opn Payments (Omise), Stripe, 2C2P and GB Prime Pay. Each needs a registered merchant account, and their fees and requirements differ, so compare them before choosing.

Steps, whichever gateway you pick:

1. **Write the provider.** Create `src/lib/payments/providers/<name>.ts` that implements `PaymentProvider` from `src/lib/payments/types.ts`:
   - `createCharge` calls the gateway's API to create a PromptPay charge and returns its id, the QR text and the expiry time.
   - `parseWebhook` verifies the gateway's signature exactly as its documentation describes and returns `{ providerRef, type }`, or `null` if the signature is wrong.
   - Set `isMock: false`.
2. **Register it** in `src/lib/payments/index.ts`.
3. **Add its keys** to `src/lib/env.ts` and `.env.example`. Never commit real keys.
4. **Set up storage.** A real provider refuses to start without `DATABASE_URL` and a real `ORDER_SECRET`.
5. **Point the gateway's webhook** at `https://<your-domain>/api/payments/webhook/<name>`.
6. **Set `PAYMENT_PROVIDER=<name>`** and test with the gateway's test keys before going live.

If the gateway returns a QR image instead of QR text, store the image URL in `qrPayload` and change `QrCode.tsx` to show an image for that provider.

## The PromptPay QR builder

`src/lib/payments/promptpay.ts` builds the standard PromptPay QR text for a phone number or national ID, with an optional fixed amount. It is tested in `tests/promptpay.test.ts`.

A bare PromptPay QR sends money straight to a bank account, but nothing tells the store that it was paid. Use it only if you are willing to confirm each payment by hand. It is not wired into checkout.

## Before taking real money

- Deliver the file only when the order status is `paid`.
- Send a receipt email.
- Add rate limiting to checkout and the webhook URL.
- Check the tax and e-commerce registration rules that apply to you in Thailand.
