import Link from "next/link";
import { getInstrument, listProducts } from "@/lib/catalog";

/**
 * A strip of patch names that scrolls sideways like a display readout.
 * The list is drawn twice so the loop has no gap; the copy is hidden from screen readers.
 * It pauses on hover and stands still for reduced-motion users.
 */
export function PatchTicker() {
  const items = listProducts().flatMap((product) =>
    product.patches.map((patch) => ({
      key: `${product.slug}-${patch.name}`,
      href: `/packs/${product.slug}`,
      name: patch.name,
      model: getInstrument(product.instrument).model,
    })),
  );

  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item) => (
        <li key={item.key} className="flex items-center">
          <Link
            href={item.href}
            tabIndex={hidden ? -1 : undefined}
            className="flex items-center gap-2 whitespace-nowrap px-4 py-2 hover:text-brand hover:underline"
          >
            <span>{item.name}</span>
            <span className="text-muted">({item.model})</span>
          </Link>
          <span aria-hidden="true" className="text-line">
            |
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label="ตัวอย่างชื่อเสียงในร้าน" className="ticker overflow-hidden border-y border-line bg-surface text-sm">
      <div className="ticker-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
