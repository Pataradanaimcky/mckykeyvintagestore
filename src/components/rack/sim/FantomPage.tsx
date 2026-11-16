"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Fader } from "../Fader";
import { Knob } from "../Knob";
import { OctaveSwitch, RackKeys } from "../RackKeys";
import {
  asPerformance,
  FANTOM_SCENES,
  noteName,
  PAD_COUNT,
  PANEL_ZONES,
  panText,
  setSplit,
  toggleZone,
  zoneRange,
  zonesForNote,
  type SplitState,
} from "@/lib/sim/fantom";
import { SimEngine } from "./engine";
import { useMidiIn } from "./useMidiIn";

const MIDI_TEXT = {
  off: "ต่อคีย์บอร์ด USB",
  unsupported: "เบราว์เซอร์นี้ไม่มี Web MIDI (ใช้ Chrome หรือ Edge)",
  denied: "ไม่ได้รับอนุญาตให้ใช้ MIDI",
  waiting: "รอคีย์บอร์ด… เสียบสาย USB",
  on: "ต่อแล้ว",
} as const;

const NO_SPLIT: SplitState = { key: null };

/**
 * FANTOM-0-style page of the rack: a Scene of zones (layer with ZONE INT/EXT, split with [SPLIT]
 * and a key), knobs [1]–[8] for zone pan and sliders [1]–[8] for zone volume (PAN/LEVEL, Owner's
 * Manual p. 19), and pads that select Scenes. An emulation with the store's own sounds; see
 * docs/SIMULATOR.md.
 */
export function FantomPage({ active }: { active: boolean }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const scene = FANTOM_SCENES[sceneIndex];
  const [levels, setLevels] = useState<number[]>(() => scene.zones.map((z) => z.level));
  const [pans, setPans] = useState<number[]>(() => scene.zones.map((z) => z.pan));
  const [on, setOn] = useState<boolean[]>(() => scene.zones.map((z) => z.on));
  const [split, setSplitState] = useState<SplitState>(NO_SPLIT);
  const [splitArmed, setSplitArmed] = useState(false);
  const [octave, setOctave] = useState(0);
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  const [loading, setLoading] = useState<"idle" | "loading" | "ready" | "failed">("idle");

  const engine = useRef<SimEngine | null>(null);
  const loadedFor = useRef(-1);
  const sustain = useRef({ down: false, notes: new Set<number>() });
  const live = useRef({ scene, on, split, splitArmed });
  useEffect(() => {
    live.current = { scene, on, split, splitArmed };
  });

  const ensure = useCallback(() => {
    if (!engine.current) engine.current = new SimEngine();
    const e = engine.current;
    e.resume();
    if (loadedFor.current !== sceneIndex) {
      loadedFor.current = sceneIndex;
      setLoading("loading");
      const s = FANTOM_SCENES[sceneIndex];
      void e.load(asPerformance(s), s.zones.map((z) => z.pan)).then((ok) => {
        if (loadedFor.current === sceneIndex) setLoading(ok ? "ready" : "failed");
      });
    }
    return e;
  }, [sceneIndex]);

  // Sliders, knobs and ZONE INT/EXT drive the zone channels.
  useEffect(() => {
    const e = engine.current;
    if (!e || loadedFor.current !== sceneIndex) return;
    scene.zones.forEach((_, i) => {
      e.setLevel(i, on[i] ? (levels[i] ?? 0) : 0);
      e.setPan(i, pans[i] ?? 0.5);
    });
  }, [scene, sceneIndex, levels, pans, on, loading]);

  const chooseScene = (i: number) => {
    const n = (i + FANTOM_SCENES.length) % FANTOM_SCENES.length;
    const s = FANTOM_SCENES[n];
    engine.current?.allOff();
    setHeld(new Set());
    setSceneIndex(n);
    setLevels(s.zones.map((z) => z.level));
    setPans(s.zones.map((z) => z.pan));
    setOn(s.zones.map((z) => z.on));
    setSplitState(NO_SPLIT);
    setSplitArmed(false);
    if (engine.current) loadedFor.current = -1;
  };

  useEffect(() => {
    if (engine.current && loadedFor.current !== sceneIndex) ensure();
  }, [sceneIndex, ensure]);

  const noteOn = useCallback(
    (note: number, velocity = 0.8) => {
      const e = ensure();
      const { scene: s, on: o, split: sp, splitArmed: armed } = live.current;
      // [SPLIT] held + a key sets the split point (Owner's Manual p. 17).
      if (armed) {
        const r = setSplit(o, note);
        setSplitState(r.split);
        setOn(r.on);
        setSplitArmed(false);
        return;
      }
      const targets = zonesForNote(s, note, o, sp).map((i) => [i, note + (s.zones[i].shift ?? 0)] as [number, number]);
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
  });

  // [SPLIT]: off → waiting for a key; waiting → cancel; on → off.
  const pressSplit = () => {
    if (splitArmed) setSplitArmed(false);
    else if (split.key !== null) {
      engine.current?.allOff();
      setHeld(new Set());
      setSplitState(NO_SPLIT);
    } else setSplitArmed(true);
  };

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

  const statusText = splitArmed
    ? "PRESS A KEY…"
    : loading === "loading"
      ? "LOADING…"
      : loading === "failed"
        ? "SAMPLE ERROR"
        : loading === "ready"
          ? "READY"
          : "TOUCH A KEY";

  return (
    <section aria-label="FANTOM-0 แบบจำลอง" className="flex flex-col gap-3">
      <div className="rack-case rack-skin-fm rack-skin-sim relative select-none p-2 sm:p-3">
        <div className="grid grid-cols-6 gap-1.5 md:grid-cols-12 md:gap-2">
          {/* Display: Scene and its zones. */}
          <div className="rack-panel col-span-6 md:col-span-7">
            <p className="rack-title">SCENE</p>
            <div className="rack-lcd sim-display" aria-live="polite">
              <div className="rack-lcd-row">
                <span className="truncate">
                  {String(sceneIndex + 1).padStart(2, "0")} {scene.name}
                </span>
                <span className="rack-lcd-small">{split.key !== null ? `SPLIT ${noteName(split.key)}` : "LAYER"}</span>
              </div>
              <ol className="sim-parts">
                {scene.zones.map((z, i) => {
                  const r = zoneRange(z, i, split);
                  return (
                    <li key={i} className={`sim-part ${on[i] ? "" : "is-mute"}`}>
                      <span>{i + 1}</span>
                      <span className="truncate">{z.tone.name}</span>
                      <span>{z.tone.partial}</span>
                      <span className="hidden sm:inline">
                        {noteName(r.low)}–{noteName(r.high)}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div className="rack-lcd-row rack-lcd-small">
                <span>ZONE {on.map((v, i) => (v ? i + 1 : null)).filter((v) => v !== null).join(" ") || "—"}</span>
                <span>{statusText}</span>
              </div>
            </div>
          </div>

          {/* Scene select and USB. */}
          <div className="rack-panel col-span-6 md:col-span-5">
            <p className="rack-title">SCENE SELECT / USB</p>
            <div className="flex items-center gap-1.5">
              <button type="button" className="rack-mini" onClick={() => chooseScene(sceneIndex - 1)} aria-label="Scene ก่อนหน้า">
                −
              </button>
              <select className="rack-select" aria-label="เลือก Scene" value={sceneIndex} onChange={(e) => chooseScene(Number(e.target.value))}>
                {FANTOM_SCENES.map((s, i) => (
                  <option key={s.name} value={i}>
                    {String(i + 1).padStart(2, "0")} {s.name}
                  </option>
                ))}
              </select>
              <button type="button" className="rack-mini" onClick={() => chooseScene(sceneIndex + 1)} aria-label="Scene ถัดไป">
                +
              </button>
            </div>
            <button type="button" className="rack-preset h-auto py-2 text-left leading-snug" onClick={() => void midi.connect()} aria-pressed={midi.state === "on"}>
              {MIDI_TEXT[midi.state]}
              {midi.state === "on" && midi.names.length > 0 && <span className="block font-normal opacity-80">{midi.names.join(", ")}</span>}
            </button>
            <p className="rack-hint leading-snug">เล่นจากคีย์บอร์ดจริงผ่าน USB (Chrome / Edge) · ยังไม่ได้ทดสอบกับเครื่องจริง</p>
            <div className="mt-auto flex items-center justify-between gap-2">
              <button type="button" className={`rack-preset ${splitArmed ? "sim-shift-on" : ""}`} aria-pressed={split.key !== null} onClick={pressSplit}>
                SPLIT
              </button>
              <span className="rack-hint leading-snug">{splitArmed ? "กดคีย์เพื่อตั้งจุดแบ่ง" : "SPLIT + คีย์ = ZONE 1 บน / ZONE 4 ล่าง"}</span>
              <OctaveSwitch octave={octave} onChange={setOctave} />
            </div>
          </div>

          {/* Knobs [1]–[8] (PAN), sliders [1]–[8] (LEVEL) and ZONE INT/EXT [1]–[8], one strip per zone. */}
          <div className="rack-panel col-span-6 md:col-span-7">
            <div className="flex items-center justify-between gap-2">
              <p className="rack-title">ZONE · PAN/LEVEL</p>
              <span className="rack-hint hidden sm:inline">ไฟติด = ZONE ทำงาน</span>
            </div>
            <div className="sim-faders">
              {Array.from({ length: PANEL_ZONES }, (_, i) => {
                const exists = i < scene.zones.length;
                return (
                  <div key={i} className={`sim-strip sim-zone ${exists ? "" : "is-empty"}`}>
                    <Knob
                      label={`${i + 1}`}
                      hint={exists ? panText(pans[i] ?? 0.5) : "—"}
                      value={exists ? (pans[i] ?? 0.5) : 0.5}
                      onChange={(v) => exists && setPans((p) => p.map((x, z) => (z === i ? v : x)))}
                    />
                    <Fader
                      label={`${i + 1}`}
                      hint={exists ? `${Math.round((levels[i] ?? 0) * 100)}` : "—"}
                      value={exists ? (levels[i] ?? 0) : 0}
                      onChange={(v) => exists && setLevels((l) => l.map((x, z) => (z === i ? v : x)))}
                    />
                    <button
                      type="button"
                      className="rack-mini sim-part-btn w-full"
                      disabled={!exists}
                      aria-pressed={exists && !!on[i]}
                      onClick={() => setOn((o) => toggleZone(o, i))}
                      aria-label={`ZONE INT/EXT ${i + 1}${on[i] ? " (ทำงาน)" : ""}`}
                    >
                      {i + 1}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pads [1]–[16]: here they select Scenes. */}
          <div className="rack-panel col-span-6 md:col-span-5">
            <div className="flex items-center justify-between gap-2">
              <p className="rack-title">PAD</p>
              <span className="rack-hint">เลือก Scene</span>
            </div>
            <div className="sim-pads" role="group" aria-label="Pad เลือก Scene">
              {Array.from({ length: PAD_COUNT }, (_, i) => {
                const exists = i < FANTOM_SCENES.length;
                return (
                  <button
                    key={i}
                    type="button"
                    className="rack-preset sim-pad"
                    disabled={!exists}
                    aria-pressed={sceneIndex === i}
                    onClick={() => chooseScene(i)}
                    aria-label={exists ? `Pad ${i + 1}: Scene ${FANTOM_SCENES[i].name}` : `Pad ${i + 1} (ว่าง)`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rack-panel rack-keys col-span-6 md:col-span-12">
            <div className="flex items-center justify-between gap-3">
              <p className="rack-title">KEYS</p>
              <p className="rack-hint hidden sm:block">ซ้อนเสียงด้วย ZONE · แบ่งคีย์ด้วย SPLIT · Pad เลือก Scene</p>
            </div>
            <RackKeys active={active} held={held} octave={octave} onNoteOn={(n) => noteOn(n)} onNoteOff={noteOff} />
          </div>
        </div>
      </div>

      <p className="text-sm text-muted">
        <b className="text-ink">จำลองการทำงานแบบ FANTOM-0 · ไม่ใช่เสียงจริงของเครื่อง</b> เสียงทั้งหมดเป็นของร้าน: partial แบบ PCM ใช้แซมเปิลเปิด
        FluidR3_GM (CC BY 3.0) แบบ VA ใช้ซินธ์อนาล็อกที่ร้านเขียนเอง FANTOM เป็นเครื่องหมายการค้าของ Roland Corporation ร้านไม่ได้เกี่ยวข้องกับ Roland
      </p>
    </section>
  );
}
