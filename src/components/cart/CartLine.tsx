import Link from "next/link";
import { removeFromCart } from "@/app/cart/actions";
import { InstrumentChip } from "@/components/catalog/InstrumentChip";
import { PackCover } from "@/components/catalog/PackCover";
import { getInstrument, type Product } from "@/lib/catalog";
import { formatTHB } from "@/lib/format";

/** One pack in the cart, with a remove button. */
export function CartLine({ product }: { product: Product }) {
  const instrument = getInstrument(product.instrument);
  return (
    <li className="flex items-start gap-3 rounded-3xl border border-line p-3 sm:items-center sm:gap-4 sm:p-4">
      <Link href={`/packs/${product.slug}`} className="w-20 shrink-0 overflow-hidden rounded-2xl sm:w-32">
        <PackCover product={product} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <InstrumentChip instrument={instrument} />
        <Link href={`/packs/${product.slug}`} className="text-base font-semibold leading-snug hover:underline sm:truncate sm:text-lg">
          {product.name}
        </Link>
        <p className="text-sm text-muted">
          {product.soundCount} {instrument.soundUnit} · ไฟล์ {instrument.fileFormat}
        </p>
        {/* On phones the price and remove button sit under the name instead of in their own column. */}
        <div className="flex items-center justify-between gap-3 sm:hidden">
          <span className="text-lg font-bold tabular-nums">{formatTHB(product.priceSatang)}</span>
          <RemoveButton slug={product.slug} />
        </div>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
        <span className="text-lg font-bold tabular-nums">{formatTHB(product.priceSatang)}</span>
        <RemoveButton slug={product.slug} />
      </div>
    </li>
  );
}

function RemoveButton({ slug }: { slug: string }) {
  return (
    <form action={removeFromCart}>
      <input type="hidden" name="slug" value={slug} />
      <button type="submit" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        ลบออก
      </button>
    </form>
  );
}
