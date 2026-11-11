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
      className="group flex w-full min-w-0 flex-col rounded-3xl bg-surface p-2 transition-colors duration-300 hover:bg-line sm:p-3"
    >
      <div className="relative overflow-hidden rounded-2xl">
        <PackCover product={product} className="transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 grid h-10 w-10 translate-y-2 place-items-center rounded-full bg-white text-lg text-ink opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"
        >
          ↗
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <InstrumentChip instrument={instrument} />
          {comingSoon ? (
            <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white">เร็ว ๆ นี้</span>
          ) : null}
        </div>
        <h3 className="text-lg font-semibold leading-snug sm:text-xl">{product.name}</h3>
        <p className="text-sm text-muted">{product.summary}</p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
          <PriceTag product={product} />
          <span className="text-xs text-muted">
            {product.soundCount} {instrument.soundUnit} · {instrument.fileFormat}
          </span>
        </div>
      </div>
    </Link>
  );
}
