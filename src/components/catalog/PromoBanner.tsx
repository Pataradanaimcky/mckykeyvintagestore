import type { CSSProperties } from "react";
import Link from "next/link";
import { discountPercent, getInstrument, instruments, type Product } from "@/lib/catalog";
import { formatTHB } from "@/lib/format";
import { PackCover } from "./PackCover";

/** Flat promotion banner at the top of the store, in the style of a shop's sale banner. */
export function PromoBanner({ product }: { product: Product }) {
  const discount = discountPercent(product);
  const instrument = getInstrument(product.instrument);
  return (
    <section className="bg-brand text-white">
      <div className="grid items-center gap-6 p-5 sm:p-8 md:grid-cols-[1.3fr_1fr]">
        <div className="flex min-w-0 flex-col items-start gap-4">
          {discount ? (
            <p className="rise bg-sun px-3 py-1 font-display text-sm font-semibold text-ink">
              ราคาเปิดร้าน ลด {discount}%
            </p>
          ) : null}
          <h1
            className="rise font-display text-3xl font-semibold sm:text-[2.75rem]"
            style={{ "--d": "80ms" } as CSSProperties}
          >
            แพ็กเสียง Thai Pop และ City Pop สำหรับคีย์บอร์ดของคุณ
          </h1>
          <p className="rise max-w-xl text-white/90" style={{ "--d": "160ms" } as CSSProperties}>
            ทำโดยนักคีย์บอร์ดแบ็กอัพ ตั้งค่าสำหรับเล่นสดไว้แล้ว โหลดลงเครื่องแล้วเล่นได้เลย
          </p>
          <div className="rise flex flex-col gap-2" style={{ "--d": "240ms" } as CSSProperties}>
            <p className="text-sm text-white/80">เลือกเครื่องของคุณ</p>
            <ul className="flex flex-wrap gap-2">
              {instruments.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/?inst=${item.id}#packs`}
                    className="block rounded bg-white px-4 py-2 font-display font-medium text-brand transition hover:bg-sun hover:text-ink"
                  >
                    {item.maker} {item.model}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Link
          href={`/packs/${product.slug}`}
          className="rise group mx-auto flex w-full max-w-xs flex-col overflow-hidden rounded bg-white text-ink shadow-md transition hover:shadow-xl"
          style={{ "--d": "160ms" } as CSSProperties}
        >
          <PackCover product={product} playing />
          <div className="flex flex-col gap-0.5 p-3">
            <p className="text-xs text-muted">
              สำหรับ {instrument.maker} {instrument.model}
            </p>
            <p className="font-display text-lg font-medium">{product.name}</p>
            <p className="flex flex-wrap items-baseline gap-2 tabular-nums">
              <span className="font-display text-xl font-semibold text-sale">{formatTHB(product.priceSatang)}</span>
              {product.compareAtSatang ? (
                <s className="text-sm text-muted">{formatTHB(product.compareAtSatang)}</s>
              ) : null}
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}
