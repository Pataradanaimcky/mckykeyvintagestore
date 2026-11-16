"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Fader } from "../Fader";
import { Knob } from "../Knob";
import { OctaveSwitch, RackKeys } from "../RackKeys";
import {
  KNOB_POSITION_DEFAULTS,
  KNOB_POSITIONS,
  MAX_PARTS,
  noteName,
  PERFORMANCES,
  partControls,
  partsForNote,
  pressKnobPosition,
  pressPartSelect,
  pressScene,
  scenesOf,
  type Scene,
} from "@/lib/sim/modx";
import { emptyLearn, handleCc, toggleLearn, type LearnState } from "@/lib/sim/midi";
import { SimEngine } from "./engine";
import { useMidiIn } from "./useMidiIn";

/** Page controls a keyboard knob or slider can be learnt to: the Super Knob and part faders 1–8. */
type LearnTarget = "super" | `part${number}`;

const MIDI_TEXT = {
  off: "ต่อคีย์บอร์ด USB",
  unsupported: "เบราว์เซอร์นี้ไม่มี Web MIDI (ใช้ Chrome หรือ Edge)",
  denied: "ไม่ได้รับอนุญาตให้ใช้ MIDI",
  waiting: "รอคีย์บอร์ด… เสียบสาย USB",
  on: "ต่อแล้ว",
} as const;

/**
 * MODX M-style page of the rack: a Performance of up to eight parts (layer / split), eight part
 * faders, a Super Knob with LEFT / MID / RIGHT, eight Scenes, and play from the screen keys, the
 * computer keyboard or a USB keyboard. An emulation with the store's own sounds; see docs/SIMULATOR.md.
 */
export function ModxPage({ active }: { active: boolean }) {
  const [perfIndex, setPerfIndex] = useState(0);
  const perf = PERFORMANCES[perfIndex];
  const [levels, setLevels] = useState<number[]>(() => perf.parts.map((p) => p.level));
  const [mutes, setMutes] = useState<boolean[]>(() => perf.parts.map(() => false));
  const [knob, setKnob] = useState(perf.knobStart);
  const [knobPositions, setKnobPositions] = useState<number[]>(() => KNOB_POSITION_DEFAULTS.slice());
  const [scenes, setScenes] = useState<Scene[]>(() => scenesOf(perf));
  const [scene, setScene] = useState(0);
  const [shift, setShift] = useState(false);
  const [selected, setSelected] = useState(0);
  const [octave, setOctave] = useState(0);
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  const [loading, setLoading] = useState<"idle" | "loading" | "ready" | "failed">("idle");

  const [learn, setLearnView] = useState<LearnState<LearnTarget>>(() => emptyLearn());
  const learnRef = useRef(learn);
  const setLearn = (next: LearnState<LearnTarget>) => {
    learnRef.current = next;
    setLearnView(next);
  };

  const engine = useRef<SimEngine | null>(null);
  const loadedFor = useRef(-1);
  const sustain = useRef({ down: false, notes: new Set<number>() });
  const live = useRef({ perf, mutes, levels, knob });
  useEffect(() => {
    live.current = { perf, mutes, levels, knob };
  });

  const ensure = useCallback(() => {
    if (!engine.current) engine.current = new SimEngine();
    const e = engine.current;
    e.resume();
    if (loadedFor.current !== perfIndex) {
      loadedFor.current = perfIndex;
      setLoading("loading");
      void e.load(PERFORMANCES[perfIndex]).then((ok) => {
        if (loadedFor.current === perfIndex) setLoading(ok ? "ready" : "failed");
      });
    }
    return e;
  }, [perfIndex]);

  // Faders, mutes and the Super Knob drive the part channels.
  useEffect(() => {
    const e = engine.current;
    if (!e || loadedFor.current !== perfIndex) return;
    perf.parts.forEach((_, i) => {
      const c = partControls(perf, i, levels[i] ?? 0, knob);
      e.setLevel(i, mutes[i] ? 0 : c.level);
      if (c.cutoff !== undefined) e.setCutoff(i, c.cutoff);
    });
  }, [perf, perfIndex, levels, mutes, knob, loading]);

  const choosePerformance = (i: number) => {
    const p = PERFORMANCES[(i + PERFORMANCES.length) % PERFORMANCES.length];
    engine.current?.allOff();
    setHeld(new Set());
    setPerfIndex(PERFORMANCES.indexOf(p));
    setLevels(p.parts.map((x) => x.level));
    setMutes(p.parts.map(() => false));
    setKnob(p.knobStart);
    setKnobPositions(KNOB_POSITION_DEFAULTS.slice());
    setScenes(scenesOf(p));
    setScene(0);
    setSelected(0);
    if (engine.current) loadedFor.current = -1;
  };

  // Load the new Performance's sounds once the engine exists.
  useEffect(() => {
    if (engine.current && loadedFor.current !== perfIndex) ensure();
  }, [perfIndex, ensure]);

  const noteOn = useCallback(
    (note: number, velocity = 0.8) => {
      const e = ensure();
      const { perf: p, mutes: m } = live.current;
      const targets = partsForNote(p, note, m).map((i) => [i, note + (p.parts[i].shift ?? 0)] as [number, number]);
      sustain.current.notes.delete(note);
      e.noteOn(note, targets, velocity);
      setHeld((h) => new Set(h).add(note));
    },
    [ensure],
  );

  const noteOff = useCallback((note: number) => {
    if (sustain.current.down) sustain.current.notes.add(note);
    else engine.current?.noteOff(note);
    setHeld((h) => {
      const next = new Set(h);
      next.delete(note);
      return next;
    });
  }, []);

  const midi = useMidiIn(active, {
    noteOn,
    noteOff,
    sustain: (down) => {
      sustain.current.down = down;
      if (!down) {
        for (const n of sustain.current.notes) engine.current?.noteOff(n);
        sustain.current.notes.clear();
      }
    },
    // CC learn: a knob or slider on the keyboard moves the control it was learnt to.
    cc: (cc, value) => {
      const r = handleCc(learnRef.current, cc, value);
      if (r.state !== learnRef.current) setLearn(r.state);
      for (const { target, value: v } of r.set) {
        if (target === "super") setKnob(v);
        else {
          const i = Number(target.slice(4)) - 1;
          setLevels((l) => (i < l.length ? l.map((x, p) => (p === i ? v : x)) : l));
        }
      }
    },
  });

  const learnHint = (t: LearnTarget) =>
    learn.learning === t ? "หมุนปุ่มบนคีย์บอร์ด…" : learn.map[t] !== undefined ? `CC ${learn.map[t]}` : "ยังไม่ได้ผูก";
  const learnButton = (t: LearnTarget, label: string) => (
    <button
      type="button"
      className={`rack-mini px-1.5 text-[0.55rem] ${learn.learning === t ? "sim-shift-on" : ""}`}
      aria-pressed={learn.learning === t}
      disabled={midi.state !== "on"}
      title={midi.state === "on" ? undefined : "ต่อคีย์บอร์ด USB ก่อน"}
      onClick={() => setLearn(toggleLearn(learnRef.current, t))}
      aria-label={`${label}: ผูกกับปุ่มหรือสไลเดอร์บนคีย์บอร์ด (${learnHint(t)})`}
    >
      LEARN
    </button>
  );

  const recallScene = (i: number) => {
    const r = pressScene(scenes, i, shift, { levels, mutes, knob });
    setScenes(r.scenes);
    setScene(i);
    setShift(false);
    const s = r.recall;
    if (!s) return;
    setLevels((l) => l.map((v, p) => s.levels[p] ?? v));
    setMutes((m) => m.map((v, p) => s.mutes[p] ?? v));
    setKnob(s.knob);
  };

  // KNOB POSITION: recall, or [SHIFT] + button saves the current Super Knob value (Quick Guide p. 23).
  const pressPosition = (i: number) => {
    const r = pressKnobPosition(knobPositions, i, shift, knob);
    setKnobPositions(r.positions);
    setShift(false);
    if (r.recall !== null) setKnob(r.recall);
  };

  // [SHIFT] + [PART SELECT] turns the selected Part's MUTE on or off (Quick Guide p. 25).
  const pressPartSelectButton = () => {
    setMutes((m) => pressPartSelect(m, selected, shift));
    setShift(false);
  };

  // Another page of the rack is showing: let every note go.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) setHeld(new Set());
  }
  useEffect(() => {
    if (!active) engine.current?.allOff();
  }, [active]);

  useEffect(
    () => () => {
      engine.current?.close();
      engine.current = null;
    },
    [],
  );

  const part = perf.parts[selected];
  const statusText =
    learn.learning ? "MOVE A CONTROL…" : loading === "loading" ? "LOADING…" : loading === "failed" ? "SAMPLE ERROR" : loading === "ready" ? "READY" : "TOUCH A KEY";

  return (
    <section aria-label="MODX M แบบจำลอง" className="flex flex-col gap-3">
      <div className="rack-case rack-skin-fm rack-skin-sim relative select-none p-2 sm:p-3">
        <div className="grid grid-cols-6 gap-1.5 md:grid-cols-12 md:gap-2">
          {/* Super Knob and its position buttons, on the left as on the keyboard. */}
          <div className="rack-panel col-span-6 items-center md:col-span-2">
            <p className="rack-title self-stretch">SUPER KNOB</p>
            <div className="sim-superknob">
              <Knob label="SUPER" hint={`${Math.round(knob * 100)}`} value={knob} onChange={setKnob} />
            </div>
            <div className="flex items-center gap-1">
              {learnButton("super", "Super Knob")}
              <span className="rack-hint">{learnHint("super")}</span>
            </div>
            <div className="mt-auto flex gap-1" role="group" aria-label="ตำแหน่ง Super Knob">
              {KNOB_POSITIONS.map((k, i) => (
                <button
                  key={k.label}
                  type="button"
                  className="rack-mini px-1.5 text-[0.55rem]"
                  aria-pressed={knob === knobPositions[i]}
                  onClick={() => pressPosition(i)}
                  aria-label={shift ? `เก็บค่า Super Knob ไว้ที่ ${k.label}` : `เรียกค่า Super Knob ${k.label}`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {/* Display: Performance, parts, Scene. */}
          <div className="rack-panel col-span-6 md:col-span-7">
            <p className="rack-title">PERFORMANCE</p>
            <div className="rack-lcd sim-display" aria-live="polite">
              <div className="rack-lcd-row">
                <span className="truncate">{perf.name}</span>
                <span className="rack-lcd-small">SCENE {scene + 1}</span>
              </div>
              <ol className="sim-parts">
                {perf.parts.map((p, i) => (
                  <li key={i} className={`sim-part ${i === selected ? "is-sel" : ""} ${mutes[i] ? "is-mute" : ""}`}>
                    <span>{i + 1}</span>
                    <span className="truncate">{p.name}</span>
                    <span>{p.engine}</span>
                    <span className="hidden sm:inline">
                      {noteName(p.low)}–{noteName(p.high)}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="rack-lcd-row rack-lcd-small">
                <span>
                  PART {selected + 1} {part ? `${part.engine} ${noteName(part.low)}–${noteName(part.high)}` : "—"}
                  {mutes[selected] ? " MUTE" : ""}
                </span>
                <span>{statusText}</span>
              </div>
            </div>
          </div>

          {/* Performance select and USB. */}
          <div className="rack-panel col-span-6 md:col-span-3">
            <p className="rack-title">CATEGORY / USB</p>
            <div className="flex items-center gap-1.5">
              <button type="button" className="rack-mini" onClick={() => choosePerformance(perfIndex - 1)} aria-label="Performance ก่อนหน้า">
                −
              </button>
              <select className="rack-select" aria-label="เลือก Performance" value={perfIndex} onChange={(e) => choosePerformance(Number(e.target.value))}>
                {PERFORMANCES.map((p, i) => (
                  <option key={p.name} value={i}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button type="button" className="rack-mini" onClick={() => choosePerformance(perfIndex + 1)} aria-label="Performance ถัดไป">
                +
              </button>
            </div>
            <button type="button" className="rack-preset h-auto py-2 text-left leading-snug" onClick={() => void midi.connect()} aria-pressed={midi.state === "on"}>
              {MIDI_TEXT[midi.state]}
              {midi.state === "on" && midi.names.length > 0 && <span className="block font-normal opacity-80">{midi.names.join(", ")}</span>}
            </button>
            <p className="rack-hint leading-snug">
              เล่นจากคีย์บอร์ดจริงผ่าน USB (Chrome / Edge) · LEARN: กดแล้วหมุนปุ่มบนคีย์บอร์ด · ยังไม่ได้ทดสอบกับเครื่องจริง
            </p>
            <div className="mt-auto flex justify-end">
              <OctaveSwitch octave={octave} onChange={setOctave} />
            </div>
          </div>

          {/*
            Eight part faders over PART buttons 1–8, as on the keyboard: a PART button selects the
            part; [SHIFT] + [PART SELECT] mutes the selected part (Quick Guide pp. 24–25).
          */}
          <div className="rack-panel col-span-6 md:col-span-9">
            <div className="flex items-center justify-between gap-2">
              <p className="rack-title">PART LEVEL</p>
              <span className="ml-auto flex items-center gap-1">
                <span className="rack-hint hidden sm:inline">
                  {selected + 1}: {learnHint(`part${selected + 1}`)}
                </span>
                {learnButton(`part${selected + 1}`, `Part ${selected + 1} level`)}
              </span>
              <button
                type="button"
                className={`rack-mini px-1.5 text-[0.55rem] ${shift ? "sim-shift-on" : ""}`}
                onClick={pressPartSelectButton}
                aria-label={shift ? `MUTE Part ${selected + 1} เปิดหรือปิด` : "PART SELECT (กด SHIFT ก่อนเพื่อ MUTE)"}
              >
                PART SELECT (MUTE)
              </button>
            </div>
            <div className="sim-faders">
              {Array.from({ length: MAX_PARTS }, (_, i) => {
                const exists = i < perf.parts.length;
                return (
                  <div key={i} className={`sim-strip ${exists ? "" : "is-empty"}`}>
                    <Fader
                      label={`${i + 1}`}
                      hint={exists ? `${Math.round((levels[i] ?? 0) * 100)}` : "—"}
                      value={exists ? (levels[i] ?? 0) : 0}
                      onChange={(v) => exists && setLevels((l) => l.map((x, p) => (p === i ? v : x)))}
                    />
                    <button
                      type="button"
                      className={`rack-mini sim-part-btn w-full ${mutes[i] ? "is-mute" : ""}`}
                      disabled={!exists}
                      aria-pressed={selected === i}
                      onClick={() => setSelected(i)}
                      aria-label={`PART ${i + 1}${mutes[i] ? " (MUTE)" : ""}`}
                    >
                      {i + 1}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scene buttons. As on the keyboard, [SHIFT] + SCENE stores the current faders, mutes and knob. */}
          <div className="rack-panel col-span-6 md:col-span-3">
            <p className="rack-title">SCENE</p>
            <div className="grid grid-cols-4 gap-1" role="group" aria-label="Scene">
              {scenes.map((_, i) => (
                <button key={i} type="button" className="rack-preset" aria-pressed={scene === i} onClick={() => recallScene(i)}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-1.5">
              <button type="button" className="rack-preset" aria-pressed={shift} onClick={() => setShift((v) => !v)}>
                SHIFT
              </button>
              <p className="rack-hint leading-snug">
                {shift ? "กด SCENE เพื่อเก็บ · KNOB POSITION เพื่อเก็บค่า · PART SELECT เพื่อ MUTE" : "SHIFT + SCENE = STORE"}
              </p>
            </div>
          </div>

          <div className="rack-panel rack-keys col-span-6 md:col-span-12">
            <div className="flex items-center justify-between gap-3">
              <p className="rack-title">KEYS</p>
              <p className="rack-hint hidden sm:block">ซ้อนเสียง · แบ่งช่วงคีย์ · Super Knob · 8 Scene</p>
            </div>
            <RackKeys active={active} held={held} octave={octave} onNoteOn={(n) => noteOn(n)} onNoteOff={noteOff} />
          </div>
        </div>
      </div>

      <p className="text-sm text-muted">
        <b className="text-ink">จำลองการทำงานแบบ MODX M · ไม่ใช่เสียงจริงของเครื่อง</b> เสียงทั้งหมดเป็นของร้าน: ส่วน AWM2 ใช้แซมเปิลเปิด FluidR3_GM
        (CC BY 3.0) ส่วน AN-X ใช้ซินธ์อนาล็อกที่ร้านเขียนเอง MODX เป็นเครื่องหมายการค้าของ Yamaha Corporation ร้านไม่ได้เกี่ยวข้องกับ Yamaha
      </p>
    </section>
  );
}
