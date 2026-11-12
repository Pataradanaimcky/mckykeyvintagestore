import type { CSSProperties } from "react";
import Link from "next/link";

const headline = ["เล่น จัด และหา", "เสียงคีย์บอร์ด", "ในที่เดียว"];

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Small drawing for the "play" card: a cream panel with three knobs and a cable. */
function PlayArt() {
  return (
    <svg viewBox="0 0 160 70" aria-hidden="true" className="pillar-art">
      <rect x="4" y="6" width="152" height="58" rx="8" className="pillar-panel" />
      {[30, 70, 110].map((x, i) => (
        <g key={x} className="pillar-knob" style={{ "--i": i } as CSSProperties}>
          <circle cx={x} cy="30" r="11" />
          <line x1={x} y1="30" x2={x} y2="21" />
        </g>
      ))}
      <path d="M30 52 C 55 70, 85 70, 110 52" className="pillar-cable" />
      <circle cx="30" cy="52" r="4" className="pillar-jack" />
      <circle cx="110" cy="52" r="4" className="pillar-jack" />
      <circle cx="140" cy="18" r="3.5" className="pillar-led" />
    </svg>
  );
}

/** Small drawing for the "arrange" card: a grid of slots with a few lit and one moving. */
function ArrangeArt() {
  const lit = [0, 2, 5, 6];
  return (
    <svg viewBox="0 0 160 70" aria-hidden="true" className="pillar-art">
      <rect x="4" y="6" width="152" height="58" rx="8" className="pillar-screen" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={14 + (i % 4) * 35}
          y={14 + Math.floor(i / 4) * 23}
          width="30"
          height="18"
          rx="4"
          className={lit.includes(i) ? "pillar-slot is-lit" : "pillar-slot"}
        />
      ))}
      <rect x="49" y="14" width="30" height="18" rx="4" className="pillar-slot is-moving" />
    </svg>
  );
}

/** Small drawing for the "buy" card: keys with a download arrow. */
function BuyArt() {
  return (
    <svg viewBox="0 0 160 70" aria-hidden="true" className="pillar-art">
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={8 + i * 21} y="22" width="18" height="44" rx="4" className="pillar-white" />
      ))}
      {[0, 1, 3, 4, 5].map((i) => (
        <rect key={i} x={20 + i * 21} y="22" width="12" height="26" rx="3" className="pillar-black" />
      ))}
      <g className="pillar-arrow">
        <line x1="80" y1="2" x2="80" y2="16" />
        <path d="M73 10 L80 17 L87 10" />
      </g>
    </svg>
  );
}

const pillars = [
  {
    href: "#play",
    title: "เล่นซินธ์",
    text: "ซินธ์ 3 เครื่องให้ลองเล่นในเว็บ: โมดูลาร์ต่อสาย, FM ที่เปิดไฟล์ DX7 ได้ และโพลีอนาล็อกยุค 80",
    cta: "เล่นเลย",
    Art: PlayArt,
  },
  {
    href: "/studio",
    title: "จัดเรียงเสียง",
    text: "จัดลำดับเสียงในคีย์บอร์ดของคุณบนจอใหญ่: แบงก์ DX7, Live Set ของ MODX M และ Scene ของ FANTOM-0",
    cta: "เปิดตัวจัดเรียง",
    Art: ArrangeArt,
  },
  {
    href: "/packs",
    title: "ซื้อเสียง",
    text: "แพ็กเสียงไทยป๊อปและซิตี้ป๊อปสำหรับ MODX M และ FANTOM-0 ตั้งค่าสำหรับเล่นสดไว้แล้ว",
    cta: "ดูแพ็กเสียง",
    Art: BuyArt,
  },
];

/** Opening section of the landing page: what the site is for, in three parts. */
export function Hero() {
  return (
    <section className="flex flex-col gap-8 sm:gap-10">
      <div className="flex flex-col items-start gap-6">
        <p className="rise flex items-center gap-2.5 rounded-full border border-line px-4 py-1.5 text-sm font-medium">
          <span aria-hidden="true" className="eq text-red">
            {[0, 1, 2].map((i) => (
              <i key={i} style={{ "--i": i } as CSSProperties} />
            ))}
          </span>
          สำหรับนักคีย์บอร์ดและคนรักซินธ์วินเทจ
        </p>
        <h1 className="text-[clamp(2.75rem,8vw,5.75rem)] font-bold leading-[1.05] tracking-tight">
          {headline.map((line, index) => (
            <span key={line} className="line-mask">
              <span className="line-rise" style={d(index * 110 + 80)}>
                {line}
              </span>
            </span>
          ))}
        </h1>
        <p className="rise max-w-2xl text-lg text-muted" style={d(420)}>
          ลองเล่นซินธ์ได้ทันทีในเบราว์เซอร์ จัดลำดับเสียงในคีย์บอร์ดของคุณให้หาง่ายบนเวที แล้วเลือกแพ็กเสียงที่ทำโดยนักคีย์บอร์ดแบ็กอัพ
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {pillars.map(({ href, title, text, cta, Art }, index) => (
          <Link
            key={href}
            href={href}
            className="pillar rise group flex min-w-0 flex-col gap-4 rounded-[2rem] border border-line bg-surface p-6 transition-transform duration-500 ease-out hover:-translate-y-1.5 sm:p-7"
            style={d(500 + index * 110)}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-sm text-muted">0{index + 1}</span>
              <span
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-canvas transition-transform duration-500 ease-out group-hover:rotate-45"
              >
                ↗
              </span>
            </div>
            <Art />
            <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            <p className="text-muted">{text}</p>
            <span className="mt-auto font-semibold">
              {cta} <span aria-hidden="true" className="btn-arrow">→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
