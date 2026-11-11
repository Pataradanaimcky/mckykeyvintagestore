import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackCover } from "@/components/catalog/PackCover";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Container } from "@/components/layout/Container";
import { getInstrument, getProduct } from "@/lib/catalog";
import { formatTHB } from "@/lib/format";
import { getProvider } from "@/lib/payments";

export const metadata: Metadata = { title: "ชำระเงิน", robots: { index: false } };

export default async function CheckoutPage({ params }: PageProps<"/checkout/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product || product.status !== "available") notFound();

  const provider = getProvider();
  const instrument = getInstrument(product.instrument);

  return (
    <Container className="flex flex-col gap-8 py-6 sm:py-10">
      <div className="flex flex-col gap-1">
        <Link href={`/packs/${product.slug}`} className="text-sm text-muted hover:text-ink">
          ← กลับไปหน้าแพ็ก
        </Link>
        <h1 className="text-3xl font-semibold">ชำระเงิน</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <section className="min-w-0">
          <CheckoutForm productSlug={product.slug} paymentLabel={provider.label} />
        </section>

        <aside className="flex min-w-0 flex-col gap-4 self-start rounded-2xl border border-line p-5">
          <h2 className="font-semibold">สรุปคำสั่งซื้อ</h2>
          <div className="flex items-center gap-4">
            <div className="w-24 shrink-0 overflow-hidden rounded-2xl">
              <PackCover product={product} />
            </div>
            <div className="min-w-0">
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-muted">
                สำหรับ {instrument.maker} {instrument.model}
              </p>
              <p className="text-sm text-muted">
                {product.soundCount} {instrument.soundUnit} · ไฟล์ {instrument.fileFormat}
              </p>
            </div>
          </div>
          <dl className="flex justify-between border-t border-line pt-4 text-lg font-semibold tabular-nums">
            <dt>ยอดชำระ</dt>
            <dd>{formatTHB(product.priceSatang)}</dd>
          </dl>
        </aside>
      </div>
    </Container>
  );
}
