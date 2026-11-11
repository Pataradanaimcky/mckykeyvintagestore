import type { Product } from "@/lib/catalog";

/** Patch names shown like a synth's category-search screen. */
export function PatchList({ product }: { product: Product }) {
  return (
    <div className="rounded-2xl bg-ink p-4 font-mono text-sm text-teal-100">
      <div className="flex justify-between gap-3 border-b border-white/15 pb-2 text-xs tracking-wide text-teal-300/80">
        <span className="truncate">LIBRARY · {product.name.toUpperCase()}</span>
        <span className="shrink-0">{product.performances} PERF</span>
      </div>
      <ul>
        {product.patches.map((patch, index) => (
          <li
            key={patch.name}
            className="grid grid-cols-[2.5rem_3rem_minmax(0,1fr)] gap-2 border-b border-white/10 px-1 py-2 tabular-nums"
          >
            <span className="text-teal-300/70">{String(index + 1).padStart(3, "0")}</span>
            <span className="text-sun">{patch.tag}</span>
            <span className="truncate">{patch.name}</span>
          </li>
        ))}
      </ul>
      <p className="pt-2 text-xs text-teal-300/70">
        ตัวอย่าง {product.patches.length} จาก {product.performances} เสียง
      </p>
    </div>
  );
}
