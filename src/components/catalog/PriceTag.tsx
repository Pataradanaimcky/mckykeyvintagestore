import { discountPercent, type Product } from "@/lib/catalog";
import { formatTHB } from "@/lib/format";

export function PriceTag({ product, size = "md" }: { product: Product; size?: "md" | "lg" }) {
  const discount = discountPercent(product);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
      <span className={`font-bold tracking-tight ${size === "lg" ? "text-4xl" : "text-xl"}`}>
        {formatTHB(product.priceSatang)}
      </span>
      {product.compareAtSatang && discount ? (
        <>
          <s className="text-sm text-muted">{formatTHB(product.compareAtSatang)}</s>
          <span className="rounded-full bg-sun px-2 py-0.5 text-xs font-semibold text-ink">-{discount}%</span>
        </>
      ) : null}
    </p>
  );
}
