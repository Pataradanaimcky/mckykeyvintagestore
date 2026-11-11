import Link from "next/link";
import { discountPercent, type Product } from "@/lib/catalog";
import { formatTHB } from "@/lib/format";
import { PackCover } from "./PackCover";

/** Large banner at the top of the store that promotes one pack. */
export function PromoBanner({ product }: { product: Product }) {
  const discount = discountPercent(product);
  return (
    <section className="overflow-hidden rounded-3xl bg-brand text-white">
      <div className="grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[1.2fr_1fr]">
        <div className="flex min-w-0 flex-col items-start gap-4">
          {discount ? (
            <span className="rounded-full bg-sun px-3 py-1 text-sm font-semibold text-ink">
              ราคาเปิดร้าน ลด {discount}%
            </span>
          ) : null}
          <h1 className="font-display text-3xl font-bold sm:text-5xl">
            เสียง Thai Pop และ City Pop พร้อมขึ้นเวที
          </h1>
          <p className="max-w-xl text-white/85">
            แพ็ก Performance สำหรับ MODX M และ MONTAGE M ตั้ง Scene และ Super Knob ไว้แล้ว
            โหลดเสร็จเล่นได้ทันที
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={`/packs/${product.slug}`}
              className="rounded-full bg-white px-6 py-3 font-display font-semibold text-brand transition hover:bg-sun hover:text-ink"
            >
              ดู {product.name}
            </Link>
            <span className="tabular-nums text-white/90">เริ่มต้น {formatTHB(product.priceSatang)}</span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/20">
          <PackCover product={product} />
        </div>
      </div>
    </section>
  );
}
