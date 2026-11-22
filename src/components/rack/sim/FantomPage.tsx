"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { packsHref } from "@/components/studio/packsLink";
import { Fader } from "../Fader";
import { Knob } from "../Knob";
import { RackKeys } from "../RackKeys";
import {
  applyZoneControl,
  asPerformance,
  audibleZones,
  channelLevel,
  CTRL_KNOBS,
  ctrlsForScene,
  ctrlText,
  eqGainsDb,
  FANTOM_SCENES,
  learnTargets,
  learnTargetLabel,
  noteName,
  noteTargets,
  OCTAVE_RANGE,
  PAD_COUNT,
  PAD_START,
  padFace,
  padsForNewScene,
  PANEL_ZONES,
  panText,
  partialChannels,
  partialText,
  pcmAttackS,
  pcmReleaseS,
  pickCurrentZone,
  pressPad,
  pressPadMode,
  setCtrl,
  setSplit,
  signedText,
  stepKeyShift,
  toggleZone,
  TRANSPOSE_RANGE,
  vaWithCtrl,
  zoneRange,
  type FantomLearnTarget,
  type KnobMode,
  type PadState,
  type SplitState,
  type ZoneCtrl,
} from "@/lib/sim/fantom";
import { emptyLearn, forget, handleCc, toggleLearn, type LearnState, bendCents } from "@/lib/sim/midi";
import { canRetryLoad } from "@/lib/sim/sampler";
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
const SCENE_NAMES = FANTOM_SCENES.map((s) => s.name);

const padHint = (pads: PadState) =>
  pads.choosing ? "กด Pad 5 MUTE · 6 SOLO · 16 SYSTEM" : pads.mode === "ZONE MUTE" ? "ZONE MUTE: Pad = ZONE" : pads.mode === "ZONE SOLO" ? "ZONE SOLO: ฟังทีละ ZONE" : "SYSTEM: เลือก Scene";

/**
 * FANTOM-0-style page of the rack: a Scene of zones (layer with ZONE INT/EXT, split with [SPLIT]
 * and a key), knobs [1]–[8] for zone pan and sliders [1]–[8] for zone volume (PAN/LEVEL, Owner's
 * Manual p. 19), and pads with [PAD MODE]: ZONE MUTE, ZONE SOLO, or picking Scenes. An emulation with the store's own sounds; see
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
  const [pads, setPads] = useState<PadState>(PAD_START);
  // Knobs: PAN/LEVEL or CTRL (Owner's Manual p. 19); CTRL works on the current zone, picked with [ZONE SELECT].
  const [knobMode, setKnobMode] = useState<KnobMode>("PAN/LEVEL");
  const [currentZone, setCurrentZone] = useState(0);
  const [zoneSelectArmed, setZoneSelectArmed] = useState(false);
  const [ctrls, setCtrls] = useState<ZoneCtrl[]>(() => ctrlsForScene(scene));
  const audible = audibleZones(on, pads);
  // Octave ±3 and Transpose −5..+6 (Owner's Manual p. 18), for the on-screen and computer keys only.
  const [octave, setOctave] = useState(0);
  const [transpose, setTranspose] = useState(0);
  const transposeRef = useRef(0);
  useEffect(() => {
    transposeRef.current = transpose;
  }, [transpose]);
  // Screen key → note it is playing, so a key lets go of the right note after Transpose changes.
  const screenNotes = useRef(new Map<number, number>());
  const [screenView, setScreenView] = useState<ReadonlyMap<number, number>>(new Map());
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  const [loading, setLoading] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  // CC learn: which zone control the LEARN button is for, and the CCs learnt so far (kept across Scenes).
  const [learnFor, setLearnFor] = useState<FantomLearnTarget>("level1");
  const [learn, setLearnView] = useState<LearnState<FantomLearnTarget>>(() => emptyLearn());
  const learnRef = useRef(learn);
  const setLearn = (next: LearnState<FantomLearnTarget>) => {
    learnRef.current = next;
    setLearnView(next);
  };

  const engine = useRef<SimEngine | null>(null);
  const loadedFor = useRef(-1);
  const sustain = useRef({ down: false, notes: new Set<number>() });
  const live = useRef({ scene, on, audible, split, splitArmed, knobMode, currentZone });
  useEffect(() => {
    live.current = { scene, on, audible, split, splitArmed, knobMode, currentZone };
  });

  const ensure = useCallback(() => {
    if (!engine.current) engine.current = new SimEngine();
    const e = engine.current;
    e.resume();
    if (loadedFor.current !== sceneIndex) {
      loadedFor.current = sceneIndex;
      setLoading("loading");
      const s = FANTOM_SCENES[sceneIndex];
      void e.load(asPerformance(s), partialChannels(s).map((c) => s.zones[c.zone].pan), true).then((ok) => {
        if (loadedFor.current === sceneIndex) setLoading(ok ? "ready" : "failed");
      });
    }
    return e;
  }, [sceneIndex]);

  // S2f: after SAMPLE ERROR, load the same Scene's sounds again without reloading the page.
  const retryLoad = () => {
    loadedFor.current = -1;
    ensure();
  };

  // Sliders, knobs, ZONE INT/EXT and the pads' MUTE / SOLO drive every partial channel of their zone.
  const audibleKey = audible.join();
  useEffect(() => {
    const e = engine.current;
    if (!e || loadedFor.current !== sceneIndex) return;
    const heard = audibleKey.split(",").map((v) => v === "true");
    partialChannels(scene).forEach((c, i) => {
      e.setLevel(i, channelLevel(c, levels, heard));
      e.setPan(i, pans[c.zone] ?? 0.5);
    });
  }, [scene, sceneIndex, levels, pans, audibleKey, loading]);

  // CTRL knobs: each zone's EQ and sends, and ATTACK / RELEASE on its partials (VA and PCM: both; PCM ATTACK through the store's sample voice, S5j).
  useEffect(() => {
    const e = engine.current;
    if (!e || loadedFor.current !== sceneIndex) return;
    partialChannels(scene).forEach((c, i) => {
      const k = ctrls[c.zone];
      if (!k) return;
      e.setZoneFx(i, eqGainsDb(k), k.REVERB, k.CHORUS);
      e.setEnvelope(i, c.partial.va ? vaWithCtrl(c.partial.va, k) : undefined, c.partial.type === "PCM" ? pcmReleaseS(k) : undefined, c.partial.type === "PCM" ? pcmAttackS(k) : undefined);
    });
  }, [scene, sceneIndex, ctrls, loading]);

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
    setPads(padsForNewScene);
    setCtrls(ctrlsForScene(s));
    setCurrentZone(0);
    setZoneSelectArmed(false);
    if (engine.current) loadedFor.current = -1;
  };

  useEffect(() => {
    if (engine.current && loadedFor.current !== sceneIndex) ensure();
  }, [sceneIndex, ensure]);

  const noteOn = useCallback(
    (note: number, velocity = 0.8) => {
      const e = ensure();
      const { scene: s, on: o, audible: heard, split: sp, splitArmed: armed } = live.current;
      // [SPLIT] held + a key sets the split point (Owner's Manual p. 17).
      if (armed) {
        const r = setSplit(o, note);
        setSplitState(r.split);
        setOn(r.on);
        setSplitArmed(false);
        return;
      }
      const targets = noteTargets(s, note, heard, sp);
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

  // On-screen and computer keys go through Octave (RackKeys) and Transpose; USB notes do not.
  const screenOn = useCallback(
    (key: number) => {
      const note = key + transposeRef.current;
      screenNotes.current.set(key, note);
      setScreenView(new Map(screenNotes.current));
      noteOn(note);
    },
    [noteOn],
  );
  const screenOff = useCallback(
    (key: number) => {
      const note = screenNotes.current.get(key) ?? key;
      screenNotes.current.delete(key);
      setScreenView(new Map(screenNotes.current));
      noteOff(note);
    },
    [noteOff],
  );
  // Light the key that was pressed, not the transposed note it plays.
  const playedBy = new Map([...screenView].map(([key, note]) => [note, key]));
  const litKeys = transpose === 0 ? held : new Set([...held].map((n) => playedBy.get(n) ?? n));

  const midi = useMidiIn(active, {
    noteOn,
    noteOff,
    // Pitch bend wheel: ±2 semitones (store's choice), heard on the VA and PCM partials (PCM through the store's own sample voice, S2c; not on the smplr fallback).
    bend: (v) => engine.current?.bend(bendCents(v)),
    sustain: (down) => {
      sustain.current.down = down;
      if (!down) {
        for (const n of sustain.current.notes) engine.current?.noteOff(n);
        sustain.current.notes.clear();
      }
    },
    // CC learn: a knob or slider on the keyboard moves the zone slider or knob it was learnt to.
    cc: (cc, value) => {
      const r = handleCc(learnRef.current, cc, value);
      if (r.state !== learnRef.current) setLearn(r.state);
      for (const { target, value: v } of r.set) {
        if (target.startsWith("level")) setLevels((l) => applyZoneControl(l, [], target, v).levels);
        else if (live.current.knobMode === "CTRL") {
          // A learnt knob is the same knob in either mode: in CTRL it moves that knob's job for the current zone.
          const zone = live.current.currentZone;
          setCtrls((c) => setCtrl(c, zone, Number(target.slice(3)) - 1, v));
        } else setPans((p) => applyZoneControl([], p, target, v).pans);
      }
    },
  });

  const targets = learnTargets(Math.min(scene.zones.length, PANEL_ZONES));
  const targetLabel = (t: FantomLearnTarget) => learnTargetLabel(t, scene.zones.length);
  const learnHint = learn.learning === learnFor ? "หมุนปุ่มบนคีย์บอร์ด…" : learn.map[learnFor] !== undefined ? `CC ${learn.map[learnFor]}` : "ยังไม่ได้ผูก";

  // [SPLIT]: off → waiting for a key; waiting → cancel; on → off.
  const pressSplit = () => {
    if (splitArmed) setSplitArmed(false);
    else if (split.key !== null) {
      engine.current?.allOff();
      setHeld(new Set());
      setSplitState(NO_SPLIT);
    } else setSplitArmed(true);
  };

  const hitPad = (i: number) => {
    const r = pressPad(pads, i, Math.min(scene.zones.length, PAD_COUNT), FANTOM_SCENES.length);
    setPads(r.state);
    if (r.scene !== null) chooseScene(r.scene);
  };

  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) setHeld(new Set());
  }
  useEffect(() => {
    if (!active) {
      engine.current?.allOff();
      engine.current?.bend(0);
    }
  }, [active]);

  useEffect(
    () => () => {
      engine.current?.close();
      engine.current = null;
    },
    [],
  );

  const statusText = learn.learning
    ? "MOVE A CONTROL…"
    : splitArmed
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
                    <li key={i} className={`sim-part ${audible[i] ? "" : "is-mute"}`}>
                      <span>{i + 1}</span>
                      <span className="truncate">{z.tone.name}</span>
                      <span>{partialText(z.tone)}</span>
                      <span className="hidden sm:inline">
                        {noteName(r.low)}–{noteName(r.high)}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div className="rack-lcd-row rack-lcd-small">
                <span className="truncate">
                  ZONE {on.map((v, i) => (v ? i + 1 : null)).filter((v) => v !== null).join(" ") || "—"}
                  {pads.mutes.some(Boolean) && ` · MUTE ${pads.mutes.map((v, i) => (v ? i + 1 : null)).filter((v) => v !== null).join(" ")}`}
                  {pads.solo !== null && ` · SOLO ${pads.solo + 1}`}
                  {` · CURRENT ${currentZone + 1}`}
                </span>
                <span>{statusText}</span>
              </div>
            </div>
            {canRetryLoad(loading) && (
              <div className="sim-retry">
                <button type="button" className="rack-mini" onClick={retryLoad}>
                  โหลดเสียงอีกครั้ง
                </button>
                <span className="rack-hint leading-snug">โหลดไฟล์เสียงตัวอย่างไม่สำเร็จ เสียงส่วนนั้นจะเงียบจนกว่าจะโหลดได้</span>
              </div>
            )}
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
            <p className="rack-hint leading-snug">
              เล่นจากคีย์บอร์ดจริงผ่าน USB (Chrome / Edge) · LEARN: เลือกปุ่มบนหน้า กด LEARN แล้วหมุนปุ่มบนคีย์บอร์ด · ยังไม่ได้ทดสอบกับเครื่องจริง
            </p>
            <div className="flex items-center gap-1.5">
              <select
                className="rack-select min-w-0 flex-1"
                aria-label="ปุ่มบนหน้าที่จะผูกกับคีย์บอร์ด"
                value={learnFor}
                onChange={(e) => {
                  if (learnRef.current.learning) setLearn({ ...learnRef.current, learning: null });
                  setLearnFor(e.target.value as FantomLearnTarget);
                }}
              >
                {targets.map((t) => (
                  <option key={t} value={t}>
                    {targetLabel(t)}
                    {learn.map[t] !== undefined ? ` · CC ${learn.map[t]}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`rack-mini px-1.5 text-[0.55rem] ${learn.learning === learnFor ? "sim-shift-on" : ""}`}
                aria-pressed={learn.learning === learnFor}
                disabled={midi.state !== "on"}
                title={midi.state === "on" ? undefined : "ต่อคีย์บอร์ด USB ก่อน"}
                onClick={() => setLearn(toggleLearn(learnRef.current, learnFor))}
                aria-label={`${targetLabel(learnFor)}: ผูกกับปุ่มหรือสไลเดอร์บนคีย์บอร์ด (${learnHint})`}
              >
                LEARN
              </button>
              {learn.map[learnFor] !== undefined && (
                <button
                  type="button"
                  className="rack-mini px-1.5 text-[0.55rem]"
                  onClick={() => setLearn(forget(learnRef.current, learnFor))}
                  aria-label={`${targetLabel(learnFor)}: เลิกผูก CC ${learn.map[learnFor]}`}
                >
                  ×
                </button>
              )}
              <span className="rack-hint shrink-0">{learnHint}</span>
            </div>
            <div className="mt-auto flex items-center justify-between gap-2">
              <button type="button" className={`rack-preset ${splitArmed ? "sim-shift-on" : ""}`} aria-pressed={split.key !== null} onClick={pressSplit}>
                SPLIT
              </button>
              <span className="rack-hint leading-snug">{splitArmed ? "กดคีย์เพื่อตั้งจุดแบ่ง" : "SPLIT + คีย์ = ZONE 1 บน / ZONE 4 ล่าง"}</span>
            </div>
          </div>

          {/* Knobs [1]–[8] (PAN), sliders [1]–[8] (LEVEL) and ZONE INT/EXT [1]–[8], one strip per zone. */}
          <div className="rack-panel col-span-6 md:col-span-7">
            <div className="flex items-center justify-between gap-2">
              <p className="rack-title">ZONE</p>
              <span className="rack-hint min-w-0 flex-1 truncate">
                {zoneSelectArmed ? "กดปุ่ม ZONE เพื่อเลือก ZONE ปัจจุบัน" : knobMode === "CTRL" ? `CTRL: ปุ่มหมุนคุม ZONE ${currentZone + 1}` : "ไฟติด = ZONE ทำงาน"}
              </span>
            </div>
            <div className="sim-knob-mode" role="group" aria-label="หน้าที่ปุ่มหมุน">
              {(["PAN/LEVEL", "CTRL"] as const).map((m) => (
                <button key={m} type="button" className="rack-mini px-1.5 text-[0.55rem]" aria-pressed={knobMode === m} onClick={() => setKnobMode(m)}>
                  {m}
                </button>
              ))}
              <button
                type="button"
                className={`rack-mini px-1.5 text-[0.55rem] ${zoneSelectArmed ? "sim-shift-on" : ""}`}
                aria-pressed={zoneSelectArmed}
                onClick={() => setZoneSelectArmed((a) => !a)}
                aria-label={`ZONE SELECT (ZONE ปัจจุบัน ${currentZone + 1})`}
              >
                ZONE SELECT
              </button>
            </div>
            <div className="sim-faders">
              {Array.from({ length: PANEL_ZONES }, (_, i) => {
                const exists = i < scene.zones.length;
                const job = CTRL_KNOBS[i];
                const k = ctrls[currentZone];
                const ctrl = knobMode === "CTRL" && !!k;
                return (
                  <div key={i} className={`sim-strip sim-zone ${exists || ctrl ? "" : "is-empty"}`}>
                    {ctrl ? (
                      <Knob label={job} hint={ctrlText(job, k)} value={k[job]} onChange={(v) => setCtrls((c) => setCtrl(c, currentZone, i, v))} />
                    ) : (
                      <Knob
                        label={`${i + 1}`}
                        hint={exists ? panText(pans[i] ?? 0.5) : "—"}
                        value={exists ? (pans[i] ?? 0.5) : 0.5}
                        onChange={(v) => exists && setPans((p) => p.map((x, z) => (z === i ? v : x)))}
                      />
                    )}
                    <Fader
                      label={`${i + 1}`}
                      hint={exists ? `${Math.round((levels[i] ?? 0) * 100)}` : "—"}
                      value={exists ? (levels[i] ?? 0) : 0}
                      onChange={(v) => exists && setLevels((l) => l.map((x, z) => (z === i ? v : x)))}
                    />
                    <button
                      type="button"
                      className={`rack-mini sim-part-btn w-full ${exists && i === currentZone ? "is-current" : ""}`}
                      disabled={!exists}
                      aria-pressed={exists && !!on[i]}
                      onClick={() => {
                        if (zoneSelectArmed) {
                          setCurrentZone((c) => pickCurrentZone(c, i, scene.zones.length));
                          setZoneSelectArmed(false);
                        } else setOn((o) => toggleZone(o, i));
                      }}
                      aria-label={`ZONE INT/EXT ${i + 1}${on[i] ? " (ทำงาน)" : ""}${i === currentZone ? " (ZONE ปัจจุบัน)" : ""}`}
                    >
                      {i + 1}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pads [1]–[16] and [PAD MODE]: press it, then a pad picks what the pads do. */}
          <div className="rack-panel col-span-6 md:col-span-5">
            <div className="flex items-center justify-between gap-2">
              <p className="rack-title">PAD</p>
              <span className="rack-hint min-w-0 flex-1 truncate text-right">{padHint(pads)}</span>
              <button type="button" className={`rack-mini shrink-0 px-1.5 text-[0.55rem] ${pads.choosing ? "sim-shift-on" : ""}`} aria-pressed={pads.choosing} onClick={() => setPads(pressPadMode)}>
                PAD MODE
              </button>
            </div>
            <div className="sim-pads" role="group" aria-label={`Pad โหมด ${pads.mode}`}>
              {Array.from({ length: PAD_COUNT }, (_, i) => {
                const face = padFace(pads, i, scene.zones.length, SCENE_NAMES, sceneIndex);
                return (
                  <button key={i} type="button" className="rack-preset sim-pad" disabled={!face.enabled} aria-pressed={face.pressed} onClick={() => hitPad(i)} aria-label={face.aria}>
                    {face.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rack-panel rack-keys col-span-6 md:col-span-12">
            <div className="flex items-center justify-between gap-3">
              <p className="rack-title">KEYS</p>
              <div className="sim-keyshift" role="group" aria-label="OCTAVE และ TRANSPOSE ของคีย์บนจอ">
                <span className="sim-keyshift-pair">
                  <span className="rack-hint">OCTAVE</span>
                  <button type="button" className="rack-mini" disabled={octave <= OCTAVE_RANGE.min} onClick={() => setOctave(stepKeyShift(octave, -1, OCTAVE_RANGE))} aria-label="OCTAVE ลง">
                    −
                  </button>
                  <span className="sim-keyshift-value" aria-live="polite">{signedText(octave)}</span>
                  <button type="button" className="rack-mini" disabled={octave >= OCTAVE_RANGE.max} onClick={() => setOctave(stepKeyShift(octave, 1, OCTAVE_RANGE))} aria-label="OCTAVE ขึ้น">
                    +
                  </button>
                </span>
                <span className="sim-keyshift-pair">
                  <span className="rack-hint">TRANSPOSE</span>
                  <button type="button" className="rack-mini" disabled={transpose <= TRANSPOSE_RANGE.min} onClick={() => setTranspose(stepKeyShift(transpose, -1, TRANSPOSE_RANGE))} aria-label="TRANSPOSE ลง">
                    −
                  </button>
                  <span className="sim-keyshift-value" aria-live="polite">{signedText(transpose)}</span>
                  <button type="button" className="rack-mini" disabled={transpose >= TRANSPOSE_RANGE.max} onClick={() => setTranspose(stepKeyShift(transpose, 1, TRANSPOSE_RANGE))} aria-label="TRANSPOSE ขึ้น">
                    +
                  </button>
                </span>
              </div>
              <p className="rack-hint hidden lg:block">ซ้อนเสียงด้วย ZONE · แบ่งคีย์ด้วย SPLIT · CTRL ปรับเสียง ZONE ปัจจุบัน · PAD MODE เปลี่ยนหน้าที่ Pad</p>
            </div>
            <RackKeys active={active} held={litKeys} octave={octave} onNoteOn={screenOn} onNoteOff={screenOff} />
          </div>
        </div>
      </div>

      <p className="text-sm text-muted">
        <b className="text-ink">จำลองการทำงานแบบ FANTOM-0 · ไม่ใช่เสียงจริงของเครื่อง</b> เสียงทั้งหมดเป็นของร้าน: partial แบบ PCM ใช้แซมเปิลเปิด
        FluidR3_GM (CC BY 3.0) แบบ VA ใช้ซินธ์อนาล็อกที่ร้านเขียนเอง FANTOM เป็นเครื่องหมายการค้าของ Roland Corporation ร้านไม่ได้เกี่ยวข้องกับ Roland
      </p>
      <p className="text-sm">
        <Link href={packsHref("fantom-0") ?? "/packs"} className="font-semibold text-ink underline underline-offset-2">
          ดูแพ็กเสียงสำหรับ FANTOM-0
        </Link>
      </p>
    </section>
  );
}
