import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { PackCover } from "./PackCover";
import { PriceTag } from "./PriceTag";

export function ProductCard({ product }: { product: Product }) {
  const comingSoon = product.status === "coming_soon";
  return (
    <Link
      href={`/packs/${product.slug}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-canvas transition hover:border-ink/30 hover:shadow-lg"
    >
      <div className="bg-surface">
        <PackCover product={product} className={comingSoon ? "opacity-70" : ""} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex min-h-6 flex-wrap gap-2">
          {product.badge ? (
            <span className="rounded-full bg-sun px-2.5 py-0.5 text-xs font-semibold text-ink">
              {product.badge}
            </span>
          ) : null}
          {comingSoon ? (
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-white">
              เร็ว ๆ นี้
            </span>
          ) : null}
        </div>
        <h3 className="font-display text-base font-semibold group-hover:text-brand">{product.name}</h3>
        <p className="text-sm text-muted">{product.summary}</p>
        <p className="text-xs text-muted">
          {product.performances} เสียง · {product.engines}
        </p>
        <div className="mt-auto pt-2">
          <PriceTag product={product} />
        </div>
      </div>
    </Link>
  );
}
