import type { Instrument } from "@/lib/catalog";

/** Plain-text label that says which keyboard a pack is made for. */
export function InstrumentChip({ instrument, size = "sm" }: { instrument: Instrument; size?: "sm" | "md" }) {
  return (
    <span
      className={`self-start rounded-sm border border-brand/40 bg-brand/5 font-medium text-brand ${
        size === "md" ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-xs"
      }`}
    >
      สำหรับ {instrument.maker} {instrument.model}
    </span>
  );
}
