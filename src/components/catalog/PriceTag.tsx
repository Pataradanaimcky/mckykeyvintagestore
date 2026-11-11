import { discountPercent, type Product } from "@/lib/catalog";
import { formatTHB } from "@/lib/format";

export function PriceTag({ product, size = "md" }: { product: Product; size?: "md" | "lg" }) {
  const discount = discountPercent(product);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
      <span className={`font-display font-semibold text-sale ${size === "lg" ? "text-3xl" : "text-xl"}`}>
        {formatTHB(product.priceSatang)}
      </span>
      {product.compareAtSatang && discount ? (
        <>
          <s className="text-sm text-muted">{formatTHB(product.compareAtSatang)}</s>
          <span className="rounded-sm bg-sale px-1.5 py-0.5 text-xs font-semibold text-white">-{discount}%</span>
        </>
      ) : null}
    </p>
  );
}
