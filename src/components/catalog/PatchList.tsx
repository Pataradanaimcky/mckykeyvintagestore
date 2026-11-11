import type { CSSProperties } from "react";
import type { Product } from "@/lib/catalog";

/** Sample of the sounds in a pack, as a plain numbered list with a highlight stepping down it. */
export function PatchList({ product }: { product: Product }) {
  const count = product.patches.length;
  return (
    <div className="overflow-hidden rounded-3xl border border-line text-sm">
      <div className="relative">
        <div
          aria-hidden="true"
          className="patch-cursor pointer-events-none absolute inset-x-0 top-0"
          style={{ "--n": count } as CSSProperties}
        />
        <ul className="relative">
          {product.patches.map((patch, index) => (
            <li
              key={patch.name}
              className="grid h-10 grid-cols-[2rem_3.5rem_minmax(0,1fr)] items-center gap-2 border-b border-line px-5 tabular-nums"
            >
              <span className="text-muted">{index + 1}</span>
              <span className="text-muted">{patch.tag}</span>
              <span className="truncate font-medium">{patch.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="bg-surface px-5 py-3 text-xs text-muted">
        ตัวอย่าง {count} จากทั้งหมด {product.soundCount} เสียง
      </p>
    </div>
  );
}
