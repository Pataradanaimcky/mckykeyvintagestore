import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompatibilityTable } from "@/components/catalog/CompatibilityTable";
import { PackCover } from "@/components/catalog/PackCover";
import { PatchList } from "@/components/catalog/PatchList";
import { PriceTag } from "@/components/catalog/PriceTag";
import { Container } from "@/components/layout/Container";
import { categories, getProduct, listProducts } from "@/lib/catalog";

export function generateStaticParams() {
  return listProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps<"/packs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  return product ? { title: product.name, description: product.summary } : {};
}

const installSteps = [
  "ดาวน์โหลดไฟล์ .Y2L จากอีเมลยืนยันการสั่งซื้อ แล้วคัดลอกลง USB แฟลชไดรฟ์",
  "เสียบ USB ที่เครื่อง กด UTILITY แล้วเลือก Contents → Load",
  "ตั้ง Content Type เป็น Library File แล้วแตะชื่อไฟล์",
  "เปิด Category Search แล้วเลือก Bank เป็นชื่อแพ็กเพื่อเรียกเสียง",
];

export default async function PackPage({ params }: PageProps<"/packs/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const category = categories.find((c) => c.id === product.category);
  const available = product.status === "available";

  return (
    <Container className="flex flex-col gap-12 py-6 sm:py-10">
      <nav aria-label="ตำแหน่งหน้า" className="text-sm text-muted">
        <Link href="/" className="hover:text-ink">
          หน้าร้าน
        </Link>{" "}
        / {category?.label} / <span className="text-ink">{product.name}</span>
      </nav>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-line">
          <PackCover product={product} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <span className="self-start rounded-full border border-line px-3 py-1 text-xs text-muted">
            สำหรับ MODX M / MONTAGE M
          </span>
          <h1 className="text-3xl font-bold sm:text-4xl">{product.name}</h1>
          <p className="text-muted">{product.description}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-surface p-3">
              <dt className="text-muted">จำนวนเสียง</dt>
              <dd className="font-semibold tabular-nums">{product.performances} Performance</dd>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <dt className="text-muted">เอนจินเสียง</dt>
              <dd className="font-semibold">{product.engines}</dd>
            </div>
          </dl>
          <PriceTag product={product} size="lg" />
          {available ? (
            <Link
              href={`/checkout/${product.slug}`}
              className="rounded-full bg-brand px-6 py-3 text-center font-display font-semibold text-white transition hover:bg-brand-dark"
            >
              ซื้อแพ็กนี้
            </Link>
          ) : (
            <p className="rounded-full bg-surface px-6 py-3 text-center font-display font-semibold text-muted">
              ยังไม่เปิดขาย
            </p>
          )}
          <p className="text-xs text-muted">ไฟล์ดิจิทัล ส่งทางอีเมลหลังชำระเงิน</p>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="text-xl font-semibold">เสียงในแพ็ก</h2>
          <PatchList product={product} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="text-xl font-semibold">วิธีติดตั้ง</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-muted">
            {installSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">รุ่นที่ใช้ได้</h2>
        <CompatibilityTable />
      </section>
    </Container>
  );
}
