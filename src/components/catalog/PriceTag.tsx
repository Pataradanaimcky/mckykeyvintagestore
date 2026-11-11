import { discountPercent, type Product } from "@/lib/catalog";
import { formatTHB } from "@/lib/format";

export function PriceTag({ product, size = "md" }: { product: Product; size?: "md" | "lg" }) {
  const discount = discountPercent(product);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
      <span className={`font-display font-bold ${size === "lg" ? "text-3xl" : "text-lg"}`}>
        {formatTHB(product.priceSatang)}
      </span>
      {product.compareAtSatang && discount ? (
        <>
          <s className="text-sm text-muted">{formatTHB(product.compareAtSatang)}</s>
          <span className="text-sm font-semibold text-sale">ลด {discount}%</span>
        </>
      ) : null}
    </p>
  );
}
