import type { CSSProperties } from "react";
import type { Instrument } from "@/lib/catalog";

/** Plain-text label that says which keyboard a pack is made for, with the product line's color dot. */
export function InstrumentChip({ instrument, size = "sm" }: { instrument: Instrument; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start rounded-full border border-line bg-canvas font-medium ${
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full bg-[var(--line-color)]"
        style={{ "--line-color": instrument.color } as CSSProperties}
      />
      สำหรับ {instrument.maker} {instrument.model}
    </span>
  );
}
