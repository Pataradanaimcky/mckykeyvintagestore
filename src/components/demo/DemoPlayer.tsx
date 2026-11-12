"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FM_PRESETS } from "@/components/rack/fm/presets";
import { LiveScope } from "@/components/rack/LiveScope";
import { OctaveSwitch, RackKeys } from "@/components/rack/RackKeys";
import { POLY_PROGRAMS } from "@/components/rack/poly/voices";
import { getPhrase, PHRASES, phraseFor, type Phrase } from "@/lib/demo/phrases";
import { getSound, guessSound } from "@/lib/studio/sounds";
import { DemoSound, type DemoSource } from "./demoSound";

export interface DemoPack {
  slug: string;
  name: string;
  model: string;
  color: string;
  patches: { tag: string; name: string; clip?: string }[];
}

interface DemoPatch {
  id: string;
  name: string;
  /** Tag shown on the button, e.g. "Key". */
  tag: string;
  source: DemoSource;
  /** How close the sound is to the real thing. */
  kind: "real" | "engine" | "close";
  phrase: Phrase["id"];
  /** Pack page, for store packs. */
  href?: string;
}

interface Collection {
  id: string;
  label: string;
  note: string;
  color?: string;
  patches: DemoPatch[];
}

const KIND_LABEL: Record<DemoPatch["kind"], string> = {
  real: "เดโมจริงจากเครื่อง",
  engine: "เสียงจริงจากเอนจินในเว็บ",
  close: "เสียงใกล้เคียงตามประเภท · ไม่ใช่เสียงจริงของแพ็ก",
};

/**
 * The demo page player: pick a collection, then tap patches while a short
 * phrase loops, to hear and compare them. A and B remember the last two
 * patches so one button swaps between them. Nothing on the page links to a
 * file, and the player has no download control.
 */
export function DemoPlayer({ packs, initialPack }: { packs: DemoPack[]; initialPack?: string }) {
  const collections = useMemo<Collection[]>(() => {
    const store = packs.map((pack) => ({
      id: pack.slug,
      label: pack.name,
      note: pack.model,
      color: pack.color,
      patches: pack.patches.map((p, i) => ({
        id: `${pack.slug}-${i}`,
        name: p.name,
        tag: p.tag,
        source: p.clip ? ({ kind: "clip", url: p.clip } as const) : ({ kind: "gm", gm: getSound(guessSound(`${p.tag} ${p.name}`)).gm } as const),
        kind: p.clip ? ("real" as const) : ("close" as const),
        phrase: phraseFor(`${p.tag} ${p.name}`),
        href: `/packs/${pack.slug}`,
      })),
    }));
    const fm: Collection = {
      id: "free-fm",
      label: "MCKY FM ฟรี",
      note: "32 เสียง · ฟรี",
      patches: FM_PRESETS.map((p, i) => ({
        id: `fm-${i}`,
        name: p.name,
        tag: "FM",
        source: { kind: "fm", patch: p.patch },
        kind: "engine",
        phrase: phraseFor(p.name),
      })),
    };
    const poly: Collection = {
      id: "free-poly",
      label: "MCKY POLY ฟรี",
      note: "10 โปรแกรม · ฟรี",
      patches: POLY_PROGRAMS.map((p, i) => ({
        id: `poly-${i}`,
        name: p.name,
        tag: "POLY",
        source: { kind: "poly", program: i },
        kind: "engine",
        phrase: phraseFor(p.name),
      })),
    };
    return [fm, poly, ...store];
  }, [packs]);

  const [collectionId, setCollectionId] = useState(() =>
    initialPack && collections.some((c) => c.id === initialPack) ? initialPack : collections[0].id,
  );
  const collection = collections.find((c) => c.id === collectionId) ?? collections[0];
  const [current, setCurrent] = useState<DemoPatch>(collection.patches[0]);
  const [other, setOther] = useState<DemoPatch | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [autoPhrase, setAutoPhrase] = useState(true);
  const [phraseId, setPhraseId] = useState<Phrase["id"]>(current.phrase);
  const [beat, setBeat] = useState(-1);
  const [swapCount, setSwapCount] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [octave, setOctave] = useState(0);
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  const sound = useRef<DemoSound | null>(null);
  const phrase = getPhrase(autoPhrase ? current.phrase : phraseId);
  const phraseRef = useRef(phrase);
  useEffect(() => {
    phraseRef.current = phrase;
  }, [phrase]);

  const engine = () => (sound.current ??= new DemoSound());

  /** Swap to a patch; the phrase keeps looping and the old sound plays until the new one is ready. */
  const choose = useCallback(
    async (patch: DemoPatch) => {
      if (patch.id === current.id) return;
      setOther(current);
      setCurrent(patch);
      setSwapCount((n) => n + 1);
      if (!sound.current?.ctx) return;
      setLoading(true);
      setFailed(false);
      try {
        await sound.current.setSource(patch.source, playing);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [current, playing],
  );

  const toggle = async () => {
    const s = engine();
    if (playing) {
      setPlaying(false);
      s.allOff();
      await s.transport(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      await s.start();
      setAnalyser(s.analyser);
      await s.setSource(current.source, true);
      setPlaying(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  // The phrase loop: notes are scheduled a little ahead of the audio clock.
  useEffect(() => {
    const s = sound.current;
    if (!playing || !s?.ctx || s.isClip) return;
    const ctx = s.ctx;
    const timers = new Set<number>();
    let loopStart = ctx.currentTime + 0.1;
    let next = 0;
    const tick = () => {
      const p = phraseRef.current;
      const spb = 60 / p.bpm;
      const horizon = ctx.currentTime + 0.15;
      for (;;) {
        if (next >= p.events.length) {
          next = 0;
          loopStart += p.beats * spb;
        }
        const e = p.events[next];
        const when = loopStart + e.at * spb;
        if (when > horizon) break;
        const delay = Math.max(0, (when - ctx.currentTime) * 1000);
        const on = window.setTimeout(() => {
          timers.delete(on);
          for (const n of e.notes) s.noteOn(n, e.velocity ?? 96);
          setBeat(Math.floor(e.at));
        }, delay);
        const off = window.setTimeout(() => {
          timers.delete(off);
          for (const n of e.notes) s.noteOff(n);
        }, delay + e.len * spb * 1000);
        timers.add(on);
        timers.add(off);
        next++;
      }
    };
    const id = window.setInterval(tick, 40);
    tick();
    return () => {
      window.clearInterval(id);
      timers.forEach((t) => window.clearTimeout(t));
      s.allOff();
    };
  }, [playing, phrase.id]);

  useEffect(() => () => sound.current?.close(), []);

  const noteOn = async (note: number) => {
    setHeld((h) => new Set(h).add(note));
    const s = engine();
    if (!s.ctx) {
      await s.start();
      setAnalyser(s.analyser);
      await s.setSource(current.source, false).catch(() => setFailed(true));
    }
    s.noteOn(note, 100);
  };
  const noteOff = (note: number) => {
    setHeld((h) => {
      const next = new Set(h);
      next.delete(note);
      return next;
    });
    sound.current?.noteOff(note);
  };

  return (
    <div className="flex flex-col gap-5" onContextMenu={(e) => e.preventDefault()}>
      {/* Collections */}
      <div role="tablist" aria-label="ชุดเสียง" className="rack-tabs flex-wrap">
        {collections.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === collection.id}
            onClick={() => {
              setCollectionId(c.id);
              void choose(c.patches[0]);
            }}
            className="rack-tab"
            style={c.color ? ({ "--tab-dot": c.color } as CSSProperties) : undefined}
          >
            <span className="flex items-center gap-1.5">
              {c.color && <span aria-hidden="true" className="demo-dot" />}
              {c.label}
            </span>
            <span className="rack-tab-note">{c.note}</span>
          </button>
        ))}
      </div>

      {/* Now playing */}
      <section className="demo-deck" aria-label="กำลังเล่น">
        <div className="demo-screen">
          <div className="flex items-center justify-between gap-3">
            <span className="demo-screen-small">{collection.label}</span>
            <span className={`demo-kind is-${current.kind}`}>{KIND_LABEL[current.kind]}</span>
          </div>
          <p key={`${current.id}-${swapCount}`} className="demo-screen-name lcd-in">
            {current.name}
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="demo-screen-small">
              {current.kind === "real" ? "เดโมที่อัดจากเครื่อง" : `${phrase.label} · ${phrase.bpm} BPM`}
            </span>
            <span className="demo-beats" aria-hidden="true">
              {Array.from({ length: 16 }, (_, i) => (
                <i key={i} className={playing && !sound.current?.isClip && i === beat ? "is-on" : ""} />
              ))}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <LiveScope analyser={analyser} />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={`demo-play ${playing ? "is-on" : ""}`} onClick={() => void toggle()} aria-pressed={playing}>
              {loading ? "กำลังโหลด…" : playing ? "■ หยุด" : "▶ เล่นเดโม"}
            </button>
            <button type="button" className="studio-btn" disabled={!other} onClick={() => other && void choose(other)}>
              สลับ A ↔ B
            </button>
          </div>
          <p className="text-xs text-white/60">
            A: {current.name}
            {other ? ` · B: ${other.name}` : " · เลือกอีกเสียงเพื่อเทียบ"}
          </p>
          {failed && <p className="text-xs text-sale">โหลดเสียงนี้ไม่ได้ ลองใหม่อีกครั้ง หรือเช็กอินเทอร์เน็ต</p>}
        </div>
      </section>

      {/* Patches */}
      <section className="flex flex-col gap-3" aria-label={`เสียงใน ${collection.label}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">แตะเพื่อสลับเสียง (เดโมเล่นต่อเนื่อง)</h2>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="เพลงตัวอย่าง">
            <button type="button" className={`studio-pill ${autoPhrase ? "is-on" : ""}`} aria-pressed={autoPhrase} onClick={() => setAutoPhrase(true)}>
              อัตโนมัติ
            </button>
            {PHRASES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`studio-pill ${!autoPhrase && phraseId === p.id ? "is-on" : ""}`}
                aria-pressed={!autoPhrase && phraseId === p.id}
                onClick={() => {
                  setAutoPhrase(false);
                  setPhraseId(p.id);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {collection.patches.map((p) => {
            const active = p.id === current.id;
            return (
              <button
                key={active ? `${p.id}-${swapCount}` : p.id}
                type="button"
                aria-pressed={active}
                onClick={() => void choose(p)}
                className={`demo-patch ${other?.id === p.id ? "is-b" : ""}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="demo-patch-tag">{p.tag}</span>
                  {active ? <span className="demo-ab">A</span> : other?.id === p.id ? <span className="demo-ab is-b">B</span> : null}
                </span>
                <span className="demo-patch-name">{p.name}</span>
                {active && playing && (
                  <span aria-hidden="true" className="eq text-red">
                    {[0, 1, 2].map((i) => (
                      <i key={i} style={{ "--i": i } as CSSProperties} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {current.href && (
          <p className="text-sm text-muted">
            {current.kind === "close"
              ? "แพ็กนี้ยังไม่มีเดโมที่อัดจากเครื่อง ตอนนี้เป็นเสียงใกล้เคียงตามประเภทจากชุด sample ฟรี เพื่อให้ฟังแนวเสียงก่อน · "
              : ""}
            <Link href={current.href} className="font-semibold text-ink underline underline-offset-2">
              ดูแพ็กนี้
            </Link>
          </p>
        )}
      </section>

      {/* Play it yourself */}
      <section className="studio-panel" aria-label="ลองเล่นเอง">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">ลองเล่นเสียงนี้เอง</h2>
          <OctaveSwitch octave={octave} onChange={setOctave} />
        </div>
        {current.kind === "real" ? (
          <p className="text-sm text-muted">เสียงนี้เป็นเดโมที่อัดไว้ จึงเล่นเป็นโน้ตเองไม่ได้</p>
        ) : (
          <div className="rack-skin-fm rounded-xl bg-case p-1.5">
            <RackKeys active held={held} octave={octave} onNoteOn={(n) => void noteOn(n)} onNoteOff={noteOff} />
          </div>
        )}
        <p className="text-xs text-muted">
          ฟังได้อย่างเดียว ไม่มีไฟล์ให้ดาวน์โหลดในหน้านี้ · เสียงใกล้เคียงใช้ FluidR3_GM โดย Frank Wen (CC BY 3.0) ผ่าน smplr (MIT)
        </p>
      </section>
    </div>
  );
}
