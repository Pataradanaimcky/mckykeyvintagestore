import type { Metadata } from "next";
import Link from "next/link";
import { CartLine } from "@/components/cart/CartLine";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCart } from "@/lib/cart";

export const metadata: Metadata = { title: "ตะกร้า", robots: { index: false } };

export default async function CartPage() {
  const { items, totalSatang } = await getCart();

  return (
    <Container className="flex flex-col gap-8 pb-10">
      <PageHeader title="ตะกร้า" />

      {items.length === 0 ? (
        <div className="rise flex flex-col items-start gap-4 rounded-3xl border border-dashed border-line p-8">
          <p className="text-lg font-semibold">ตะกร้ายังว่างอยู่</p>
          <p className="text-muted">เลือกแพ็กเสียงของเครื่องคุณ แล้วกด “หยิบใส่ตะกร้า” ที่หน้าแพ็ก</p>
          <Link href="/packs" className="btn btn-dark">
            ดูแพ็กเสียง <span aria-hidden="true" className="btn-arrow">→</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="flex min-w-0 flex-col gap-3">
            <ul className="rise flex flex-col gap-3">
              {items.map((product) => (
                <CartLine key={product.slug} product={product} />
              ))}
            </ul>
            <Link href="/packs" className="self-start text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
              ← เลือกแพ็กเพิ่ม
            </Link>
          </div>
          <OrderSummary lines={items.map((p) => ({ name: p.name, priceSatang: p.priceSatang }))} totalSatang={totalSatang}>
            <Link href="/checkout" className="btn btn-dark justify-center">
              ไปชำระเงิน <span aria-hidden="true" className="btn-arrow">→</span>
            </Link>
            <p className="text-xs text-muted">ไฟล์ดิจิทัล ส่งทางอีเมลหลังชำระเงิน ตรวจรุ่นเครื่องของแต่ละแพ็กก่อนชำระเงิน</p>
          </OrderSummary>
        </div>
      )}
    </Container>
  );
}
