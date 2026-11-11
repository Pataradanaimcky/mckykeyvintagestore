import type { CSSProperties } from "react";
import type { Product } from "@/lib/catalog";

/** Patch names shown like a synth's category-search screen, with a cursor stepping down the list. */
export function PatchList({ product }: { product: Product }) {
  const count = product.patches.length;
  return (
    <div className="rounded-lg bg-ink p-4 font-mono text-sm text-white/85">
      <div className="flex justify-between gap-3 border-b border-white/15 pb-2 text-xs tracking-wide text-led/80">
        <span className="truncate">LIBRARY · {product.name.toUpperCase()}</span>
        <span className="shrink-0">{product.soundCount} SOUNDS</span>
      </div>
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
              className="grid h-10 grid-cols-[2.5rem_3rem_minmax(0,1fr)] items-center gap-2 border-b border-white/10 px-2 tabular-nums"
            >
              <span className="text-white/45">{String(index + 1).padStart(3, "0")}</span>
              <span className="text-led">{patch.tag}</span>
              <span className="truncate">{patch.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="pt-2 text-xs text-white/45">
        ตัวอย่าง {count} จาก {product.soundCount} เสียง
      </p>
    </div>
  );
}
