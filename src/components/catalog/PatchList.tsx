"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { GmPreview } from "@/components/studio/gmPreview";
import { getSound, guessSound } from "@/lib/studio/sounds";

interface Row {
  tag: string;
  name: string;
  /** The owner's recorded demo, when there is one. */
  clip?: string;
}

/**
 * The sounds in a pack, each with a play button. A sound plays its recorded
 * demo, or a close-match preview until a recording exists. Plays through Web
 * Audio only; the page has no file links.
 */
export function PatchList({ slug, patches, soundCount }: { slug: string; patches: Row[]; soundCount: number }) {
  const player = useRef<GmPreview | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const count = patches.length;
  const anyReal = patches.some((p) => p.clip);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      player.current?.close();
    },
    [],
  );

  const play = async (index: number) => {
    const row = patches[index];
    player.current ??= new GmPreview();
    if (playing === index) {
      player.current.stopClip();
      setPlaying(null);
      return;
    }
    setLoading(index);
    setFailed(false);
    try {
      if (row.clip) await player.current.clip(row.clip, 12);
      else await player.current.chord(getSound(guessSound(`${row.tag} ${row.name}`)).gm);
      setPlaying(index);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPlaying(null), row.clip ? 12000 : 1500);
    } catch {
      setFailed(true);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-line text-sm" onContextMenu={(e) => e.preventDefault()}>
      <div className="relative">
        <div aria-hidden="true" className="patch-cursor pointer-events-none absolute inset-x-0 top-0" style={{ "--n": count } as CSSProperties} />
        <ul className="relative">
          {patches.map((patch, index) => (
            <li key={patch.name} className="grid h-11 grid-cols-[2.2rem_2rem_3.2rem_minmax(0,1fr)] items-center gap-2 border-b border-line px-3 tabular-nums">
              <button
                type="button"
                onClick={() => void play(index)}
                aria-label={`${playing === index ? "หยุด" : "ฟัง"} ${patch.name}`}
                aria-pressed={playing === index}
                className="patch-play"
              >
                {loading === index ? "…" : playing === index ? "■" : "▶"}
              </button>
              <span className="text-muted">{index + 1}</span>
              <span className="text-muted">{patch.tag}</span>
              <span className="truncate font-medium">
                {patch.name}
                {patch.clip && <span className="ml-2 rounded-full bg-ok px-1.5 py-0.5 text-[0.6rem] font-bold text-canvas">DEMO</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-surface px-5 py-3 text-xs text-muted">
        <span>
          ตัวอย่าง {count} จากทั้งหมด {soundCount} เสียง
          {anyReal ? "" : " · ตอนนี้เป็นเสียงใกล้เคียงตามประเภท รอเดโมที่อัดจากเครื่อง"}
          {failed ? " · โหลดเสียงไม่ได้ ลองใหม่อีกครั้ง" : ""}
        </span>
        <Link href={`/studio?demo=${slug}`} className="font-semibold text-ink underline underline-offset-2">
          ลองจัดเรียงในแบงก์เดโม →
        </Link>
      </div>
    </div>
  );
}
