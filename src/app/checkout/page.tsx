import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { currentUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { getInstrument } from "@/lib/catalog";
import { getProvider } from "@/lib/payments";

export const metadata: Metadata = { title: "ชำระเงิน", robots: { index: false } };

export default async function CheckoutPage() {
  const { items, totalSatang } = await getCart();
  if (items.length === 0) redirect("/cart");

  const provider = getProvider();
  const user = await currentUser();

  return (
    <Container className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <Link href="/cart" className="text-sm text-muted hover:text-ink">
          ← กลับไปที่ตะกร้า
        </Link>
        <PageHeader title="ชำระเงิน" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="rise min-w-0">
          {!user ? (
            <p className="mb-6 rounded-2xl border border-line p-4 text-sm text-muted">
              ซื้อได้โดยไม่ต้องเข้าสู่ระบบ หรือ{" "}
              <Link href="/login?next=/checkout" className="text-ink underline underline-offset-4">
                เข้าสู่ระบบ
              </Link>{" "}
              เพื่อเก็บคำสั่งซื้อไว้ในบัญชี
            </p>
          ) : null}
          <CheckoutForm paymentLabel={provider.label} defaultEmail={user?.email ?? undefined} />
        </section>

        <OrderSummary lines={items.map((p) => ({ name: p.name, priceSatang: p.priceSatang }))} totalSatang={totalSatang}>
          <ul className="flex flex-col gap-1 border-t border-line pt-4 text-xs text-muted">
            {items.map((p) => {
              const instrument = getInstrument(p.instrument);
              return (
                <li key={p.slug}>
                  {p.name}: สำหรับ {instrument.maker} {instrument.model} ({instrument.fileFormat})
                </li>
              );
            })}
          </ul>
        </OrderSummary>
      </div>
    </Container>
  );
}
