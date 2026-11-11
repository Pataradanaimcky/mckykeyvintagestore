import Link from "next/link";
import { discountPercent, getInstrument, instruments, type Product } from "@/lib/catalog";
import { formatTHB } from "@/lib/format";
import { PackCover } from "./PackCover";

/** Dark banner at the top of the store. Says what the store sells and for which keyboards. */
export function PromoBanner({ product }: { product: Product }) {
  const discount = discountPercent(product);
  const instrument = getInstrument(product.instrument);
  return (
    <section className="overflow-hidden rounded-md bg-ink text-white">
      <div className="grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[1.25fr_1fr]">
        <div className="flex min-w-0 flex-col items-start gap-5">
          <p className="font-display text-sm font-medium uppercase tracking-[0.2em] text-led">
            Sound packs · แพ็กเสียงซินธ์
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-5xl">
            เสียง Thai Pop และ City Pop สำหรับซินธ์ของคุณ
          </h1>
          <p className="max-w-xl text-white/75">
            แพ็กเสียงที่โปรแกรมโดยนักคีย์บอร์ดแบ็กอัพ ตั้งค่าสำหรับเล่นสดไว้แล้ว โหลดเสร็จเล่นได้ทันที
          </p>

          <div className="flex flex-col gap-2">
            <p className="text-sm text-white/60">มีแพ็กสำหรับเครื่อง</p>
            <ul className="flex flex-wrap gap-2">
              {instruments.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/?inst=${item.id}#packs`}
                    className="block rounded-md border border-white/25 px-4 py-2 font-display font-semibold tracking-wide transition hover:border-led hover:text-led"
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
          className="group mx-auto flex w-full max-w-sm flex-col overflow-hidden rounded-lg border border-white/15 bg-white/5 transition hover:border-led"
        >
          <PackCover product={product} />
          <div className="flex flex-col gap-1 p-4">
            <p className="text-xs text-white/60">
              สำหรับ {instrument.maker} {instrument.model}
            </p>
            <p className="font-display text-lg font-semibold">{product.name}</p>
            <p className="flex flex-wrap items-baseline gap-2 tabular-nums">
              <span className="font-display text-xl font-bold text-led">{formatTHB(product.priceSatang)}</span>
              {discount ? (
                <span className="rounded bg-sun px-2 py-0.5 text-xs font-semibold text-ink">
                  ราคาเปิดร้าน ลด {discount}%
                </span>
              ) : null}
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}
