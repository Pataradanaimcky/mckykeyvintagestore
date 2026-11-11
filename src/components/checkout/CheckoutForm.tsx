"use client";

import { useActionState } from "react";
import { startCheckout, type CheckoutState } from "@/app/checkout/[slug]/actions";

const initialState: CheckoutState = {};

export function CheckoutForm({
  productSlug,
  paymentLabel,
  defaultEmail,
}: {
  productSlug: string;
  paymentLabel: string;
  /** Email of the signed-in buyer, used to fill the field in advance. */
  defaultEmail?: string;
}) {
  const [state, formAction, pending] = useActionState(startCheckout, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="productSlug" value={productSlug} />
      {/* Honeypot: hidden from people, visible to bots. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-medium">
          อีเมลสำหรับรับไฟล์
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="name@example.com"
          defaultValue={state.email ?? defaultEmail}
          aria-describedby={state.error ? "checkout-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          className="rounded-2xl border border-line bg-canvas px-4 py-3 text-base outline-none focus:border-ink"
        />
        {state.error ? (
          <p id="checkout-error" role="alert" className="text-sm text-sale">
            {state.error}
          </p>
        ) : null}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 font-medium">วิธีชำระเงิน</legend>
        <label className="flex items-center gap-3 rounded-2xl border border-ink bg-surface px-4 py-3">
          <input type="radio" name="method" value="promptpay" defaultChecked readOnly />
          <span>{paymentLabel}</span>
        </label>
        <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
          บัตรเครดิตและช่องทางอื่น ยังไม่เปิดให้ใช้
        </p>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-6 py-3 font-semibold text-canvas transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "กำลังสร้างคำสั่งซื้อ…" : "ไปหน้าชำระเงิน"}
      </button>
    </form>
  );
}
