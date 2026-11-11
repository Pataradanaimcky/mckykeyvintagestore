import Link from "next/link";
import { getInstrument, type Product } from "@/lib/catalog";
import { InstrumentChip } from "./InstrumentChip";
import { PackCover } from "./PackCover";
import { PriceTag } from "./PriceTag";

export function ProductCard({ product }: { product: Product }) {
  const comingSoon = product.status === "coming_soon";
  const instrument = getInstrument(product.instrument);
  return (
    <Link
      href={`/packs/${product.slug}`}
      className="group flex w-full min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-canvas transition duration-300 hover:-translate-y-1 hover:border-ink hover:shadow-xl active:translate-y-0"
    >
      <PackCover product={product} className={comingSoon ? "opacity-80" : ""} />
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <InstrumentChip instrument={instrument} />
        <h3 className="font-display text-base font-semibold sm:text-lg">{product.name}</h3>
        <p className="text-sm text-muted">{product.summary}</p>
        <p className="text-xs text-muted">
          {product.soundCount} {instrument.soundUnit} · ไฟล์ {instrument.fileFormat}
        </p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <PriceTag product={product} />
          <span className="flex flex-wrap gap-1.5">
            {product.badge ? (
              <span className="rounded bg-sun px-2 py-0.5 text-xs font-semibold text-ink">{product.badge}</span>
            ) : null}
            {comingSoon ? (
              <span className="rounded border border-line px-2 py-0.5 text-xs font-medium text-muted">
                เร็ว ๆ นี้
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </Link>
  );
}
