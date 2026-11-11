import type { CSSProperties } from "react";
import Link from "next/link";
import { listProducts, type Instrument } from "@/lib/catalog";
import { KeyStrip } from "./KeyStrip";

/** Large colored card for one product line. Links to the store filtered to that keyboard. */
export function InstrumentCard({ instrument, delay = 0 }: { instrument: Instrument; delay?: number }) {
  const count = listProducts({ instrument: instrument.id }).length;
  return (
    <Link
      href={`/packs?inst=${instrument.id}`}
      className="rise group relative flex min-w-0 flex-col overflow-hidden rounded-[2rem] bg-[var(--line-color)] text-white transition-transform duration-500 ease-out hover:-translate-y-1.5"
      style={{ "--line-color": instrument.color, "--d": `${delay}ms` } as CSSProperties}
    >
      <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <p className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
            แพ็กเสียงสำหรับ {instrument.maker}
          </p>
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-xl text-black transition-transform duration-500 ease-out group-hover:rotate-45"
          >
            ↗
          </span>
        </div>
        <p className="text-5xl font-bold leading-none tracking-tight sm:text-7xl">{instrument.model}</p>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-white/70">แพ็กในร้าน</dt>
            <dd className="text-lg font-semibold tabular-nums">{count} แพ็ก</dd>
          </div>
          <div>
            <dt className="text-white/70">ใช้กับ</dt>
            <dd className="text-lg font-semibold">{instrument.worksWith}</dd>
          </div>
          <div>
            <dt className="text-white/70">ไฟล์</dt>
            <dd className="text-lg font-semibold">{instrument.fileFormat}</dd>
          </div>
        </dl>
      </div>
      <svg viewBox="0 0 280 44" aria-hidden="true" preserveAspectRatio="none" className="pack-cover is-playing block h-14 w-full [--press:var(--line-color)] sm:h-20">
        <KeyStrip y={0} height={44} />
      </svg>
    </Link>
  );
}
