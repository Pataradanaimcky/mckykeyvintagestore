import type { Instrument } from "@/lib/catalog";

/** Plain-text label that says which keyboard a pack is made for. */
export function InstrumentChip({ instrument, size = "sm" }: { instrument: Instrument; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start rounded-md bg-ink font-display font-semibold tracking-wide text-white ${
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-[0.7rem]"
      }`}
    >
      <span className="font-sans font-normal text-white/70">สำหรับ</span>
      {instrument.maker} {instrument.model}
    </span>
  );
}
