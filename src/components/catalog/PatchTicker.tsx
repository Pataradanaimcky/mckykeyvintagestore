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
      tag: patch.tag,
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
            className="flex items-center gap-2 whitespace-nowrap px-5 py-3 transition hover:text-led"
          >
            <span className="text-led">{item.tag}</span>
            <span>{item.name}</span>
            <span className="text-white/40">{item.model}</span>
          </Link>
          <span aria-hidden="true" className="text-white/25">
            ◆
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label="ตัวอย่างชื่อเสียงในร้าน" className="ticker overflow-hidden rounded-md bg-ink font-mono text-sm text-white/85">
      <div className="ticker-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
