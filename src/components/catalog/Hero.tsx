import type { CSSProperties } from "react";
import Link from "next/link";
import { instruments } from "@/lib/catalog";
import { InstrumentCard } from "./InstrumentCard";

const headline = ["เสียงไทยป๊อป", "และซิตี้ป๊อป", "พร้อมขึ้นเวที"];

/** Opening section: a large headline that rises line by line, then one card per product line. */
export function Hero() {
  return (
    <section className="flex flex-col gap-8 pt-6 sm:gap-10 sm:pt-10">
      <div className="flex flex-col items-start gap-6">
        <p className="rise rounded-full border border-line px-4 py-1.5 text-sm font-medium">
          แพ็กเสียงสำหรับนักคีย์บอร์ดเล่นสด
        </p>
        <h1 className="text-[clamp(2.75rem,8vw,5.75rem)] font-bold leading-[1.05] tracking-tight">
          {headline.map((line, index) => (
            <span key={line} className="line-mask">
              <span className="line-rise" style={{ "--d": `${index * 110 + 80}ms` } as CSSProperties}>
                {line}
              </span>
            </span>
          ))}
        </h1>
        <div className="flex w-full flex-wrap items-end justify-between gap-6">
          <p className="rise max-w-xl text-lg text-muted" style={{ "--d": "420ms" } as CSSProperties}>
            ทำโดยนักคีย์บอร์ดแบ็กอัพ ตั้งค่าสำหรับเล่นสดไว้แล้ว โหลดลงเครื่องแล้วเล่นได้เลย
          </p>
          <div className="rise flex flex-wrap gap-3" style={{ "--d": "500ms" } as CSSProperties}>
            <Link href="/#packs" className="btn btn-dark">
              ดูแพ็กทั้งหมด <span aria-hidden="true" className="btn-arrow">→</span>
            </Link>
            <Link href="/#compatibility" className="btn btn-light">
              เช็กรุ่นที่ใช้ได้
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {instruments.map((instrument, index) => (
          <InstrumentCard key={instrument.id} instrument={instrument} delay={560 + index * 120} />
        ))}
      </div>
    </section>
  );
}
