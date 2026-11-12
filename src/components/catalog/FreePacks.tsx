"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { INIT } from "@audio/synth-dx7";
import { FM_PRESETS } from "@/components/rack/fm/presets";
import { POLY_PROGRAMS } from "@/components/rack/poly/voices";
import { bankSysex } from "@/lib/studio/dx7";

function downloadFmBank() {
  const bytes = bankSysex(
    FM_PRESETS.map((p) => p.patch),
    INIT,
  );
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/octet-stream" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "MCKY-FM-FREE-VOL1.syx";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * The free packs: the store's own default sounds for the synths on the site.
 * The FM bank downloads as a standard 32-voice DX7 .syx file; the others play
 * on the site.
 */
export function FreePacks() {
  const packs = [
    {
      id: "fm",
      tag: "ไฟล์ .syx · 32 เสียง",
      title: "MCKY FM ฟรี Vol.1",
      text: "เสียง FM ที่ร้านทำเอง 32 เสียง: EP, เบลล์, เบส, แพด, ระนาด, ขลุ่ย และอื่นๆ เปิดได้กับ DX7 และโปรแกรมที่อ่านไฟล์ DX7 เช่น Dexed",
      names: FM_PRESETS.slice(0, 8).map((p) => p.name),
      download: true,
    },
    {
      id: "poly",
      tag: "เล่นในเว็บ · 10 โปรแกรม",
      title: "MCKY POLY ฟรี",
      text: "โปรแกรมโพลีซินธ์อนาล็อกยุค 80 ตั้งแต่สตริง แพด เบรส ไปจนถึงเบสเรโซแนนซ์",
      names: POLY_PROGRAMS.slice(0, 8).map((p) => p.name),
      download: false,
    },
    {
      id: "modular",
      tag: "เล่นในเว็บ · 4 แพตช์",
      title: "MCKY MODULAR ฟรี",
      text: "แพตช์ตั้งต้นสำหรับแร็คโมดูลาร์: BASIC, ACID, WOBBLE และ SIREN เลือกแล้วต่อสายเพิ่มเองได้",
      names: ["BASIC", "ACID", "WOBBLE", "SIREN"],
      download: false,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {packs.map((pack, index) => (
        <article
          key={pack.id}
          data-reveal
          style={{ "--d": `${index * 90}ms` } as CSSProperties}
          className="lift flex min-w-0 flex-col gap-4 rounded-[2rem] border border-line bg-surface p-6"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-ok px-3 py-1 text-xs font-bold text-canvas">ฟรี</span>
            <span className="text-xs text-muted">{pack.tag}</span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight">{pack.title}</h3>
          <p className="text-sm text-muted">{pack.text}</p>
          <ul className="flex flex-wrap gap-1" aria-label="ตัวอย่างชื่อเสียง">
            {pack.names.map((name) => (
              <li key={name} className="rounded-md bg-canvas px-2 py-0.5 font-mono text-[0.68rem]">
                {name}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap gap-2">
            {pack.download && (
              <button type="button" onClick={downloadFmBank} className="btn btn-dark">
                ดาวน์โหลดฟรี <span aria-hidden="true" className="btn-arrow">↓</span>
              </button>
            )}
            <Link href={`/#play-${pack.id}`} className={`btn ${pack.download ? "btn-light" : "btn-dark"}`}>
              เล่นในเว็บ <span aria-hidden="true" className="btn-arrow">→</span>
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
