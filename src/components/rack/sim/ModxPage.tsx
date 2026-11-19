"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { packsHref } from "@/components/studio/packsLink";
import { Fader } from "../Fader";
import { Knob } from "../Knob";
import { OctaveSwitch, RackKeys } from "../RackKeys";
import {
  applySplitJob,
  clearSplitGroups,
  KNOB_POSITION_DEFAULTS,
  KNOB_POSITIONS,
  MAX_PARTS,
  midiVelocity,
  MODX_DEFAULT_CC,
  newSplitJob,
  noteName,
  PERFORMANCES,
  partControls,
  partsForNote,
  pressKnobPosition,
  pressPartSelect,
  pressScene,
  pressSplitGroup,
  rangeFromKnob,
  rangesOf,
  rangeToKnob,
  sceneFromCc,
  scenesOf,
  SCREEN_VELOCITY,
  setRangeField,
  setSplitCount,
  setSplitPoint,
  SPLIT_GROUPS,
  SPLIT_POINT_COUNTS,
  SPLIT_POINT_MAX,
  SPLIT_POINT_MIN,
  splitGroupRanges,
  stepRangeField,
  VEL_MAX,
  VEL_MIN,
  withRanges,
  type PartRange,
  type RangeField,
  type Scene,
  type SplitJob,
} from "@/lib/sim/modx";
import { bendCents, emptyLearn, handleCc, hasReadyMap, toggleLearn, toggleReadyMap, type LearnState } from "@/lib/sim/midi";
import { SimEngine } from "./engine";
import { useMidiIn } from "./useMidiIn";

/** Page controls a keyboard control can move: the Super Knob, the SCENE buttons and part faders 1–8. */
type LearnTarget = "super" | "scene" | `part${number}`;

/** The numbers printed in Yamaha's documents for the controls this page has (docs/SIMULATOR.md, S8c). */
const READY_MAP: Partial<Record<LearnTarget, number>> = { super: MODX_DEFAULT_CC.superKnob, scene: MODX_DEFAULT_CC.scene };

/** The two views for setting Part limits; the names are the keyboard's (Operation Manual pp. 19, 80, 83). */
const RANGE_VIEWS = {
  note: { label: "Part - Note", limit: "Note Limit", fields: ["low", "high"] },
  velocity: { label: "Velocity - Note", limit: "Velocity Limit", fields: ["velLow", "velHigh"] },
} as const satisfies Record<string, { label: string; limit: string; fields: readonly [RangeField, RangeField] }>;
type RangeView = keyof typeof RANGE_VIEWS;

const rangeText = (field: RangeField, value: number) => (field === "low" || field === "high" ? noteName(value) : String(value));

/** Split Point as a 0..1 position for the DATA knob, and back (C#−2 to G8). */
const pointToKnob = (note: number) => (note - SPLIT_POINT_MIN) / (SPLIT_POINT_MAX - SPLIT_POINT_MIN);
const pointFromKnob = (k: number) => Math.round(SPLIT_POINT_MIN + k * (SPLIT_POINT_MAX - SPLIT_POINT_MIN));

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
  // Part limits the player set, and the view for setting them ([SHIFT] + [SPLIT], Operation Manual p. 19).
  const [ranges, setRanges] = useState<PartRange[]>(() => rangesOf(perf));
  const [rangeView, setRangeView] = useState<RangeView | null>(null);
  const [rangeField, setRangeFieldName] = useState<RangeField>("low");
  const [keyEntry, setKeyEntry] = useState(false);
  // The Split Job screen ([SPLIT], Operation Manual pp. 19, 389); nothing changes until Done or [EXIT].
  const [splitJob, setSplitJob] = useState<SplitJob | null>(null);
  const [splitIndex, setSplitIndex] = useState(0);
  const shown = withRanges(perf, ranges);
  // While keyboard entry is on, a key sets the value under the cursor instead of playing.
  const keyTarget = rangeView === "note" && keyEntry ? { part: selected, field: rangeField } : null;
  const splitKeyTarget = splitJob && keyEntry ? splitIndex : null;

  const [learn, setLearnView] = useState<LearnState<LearnTarget>>(() => emptyLearn());
  const learnRef = useRef(learn);
  const setLearn = (next: LearnState<LearnTarget>) => {
    learnRef.current = next;
    setLearnView(next);
  };

  const engine = useRef<SimEngine | null>(null);
  const loadedFor = useRef(-1);
  const sustain = useRef({ down: false, notes: new Set<number>() });
  const live = useRef({ perf: shown, mutes, levels, knob, keyTarget, splitKeyTarget });
  useEffect(() => {
    live.current = { perf: shown, mutes, levels, knob, keyTarget, splitKeyTarget };
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
    setRanges(rangesOf(p));
    setRangeFieldName(rangeView === "velocity" ? "velLow" : "low");
    setSplitJob(null);
    if (engine.current) loadedFor.current = -1;
  };

  // Load the new Performance's sounds once the engine exists.
  useEffect(() => {
    if (engine.current && loadedFor.current !== perfIndex) ensure();
  }, [perfIndex, ensure]);

  const noteOn = useCallback(
    (note: number, velocity = SCREEN_VELOCITY) => {
      const splitTarget = live.current.splitKeyTarget;
      if (splitTarget !== null) {
        setSplitJob((j) => j && setSplitPoint(j, splitTarget, note));
        setHeld((h) => new Set(h).add(note));
        return;
      }
      const target = live.current.keyTarget;
      if (target) {
        setRanges((r) => setRangeField(r, target.part, target.field, note));
        setHeld((h) => new Set(h).add(note));
        return;
      }
      const e = ensure();
      const { perf: p, mutes: m } = live.current;
      const targets = partsForNote(p, note, m, midiVelocity(velocity)).map((i) => [i, note + (p.parts[i].shift ?? 0)] as [number, number]);
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
    // Pitch bend wheel: ±2 semitones (store's choice), heard on the AN-X and FM-X parts (not the AWM2 sample parts yet).
    bend: (v) => engine.current?.bend(bendCents(v)),
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
        else if (target === "scene") recallSceneAt(sceneFromCc(value));
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

  const applyScenePress = (i: number, store: boolean) => {
    const r = pressScene(scenes, i, store, { levels, mutes, knob });
    setScenes(r.scenes);
    setScene(i);
    const s = r.recall;
    if (!s) return;
    setLevels((l) => l.map((v, p) => s.levels[p] ?? v));
    setMutes((m) => m.map((v, p) => s.mutes[p] ?? v));
    setKnob(s.knob);
  };
  const recallScene = (i: number) => {
    applyScenePress(i, shift);
    setShift(false);
  };
  // A SCENE button on the keyboard only ever recalls here; the page's [SHIFT] is left alone.
  function recallSceneAt(i: number) {
    applyScenePress(i, false);
  }

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

  // [SHIFT] + [SPLIT] opens the Part - Note view; [SPLIT] alone opens Split Job (Operation Manual p. 19).
  const pressSplit = () => {
    setKeyEntry(false);
    if (shift) {
      setSplitJob(null);
      setRangeView("note");
      setRangeFieldName("low");
    } else if (!splitJob) {
      setRangeView(null);
      setSplitJob(newSplitJob(perf.parts.length));
      setSplitIndex(0);
    }
    setShift(false);
  };
  // Done or [EXIT] confirms; × at the top left closes without confirming (p. 389).
  const closeSplitJob = (confirm: boolean) => {
    if (confirm && splitJob) setRanges((r) => applySplitJob(r, splitJob));
    setSplitJob(null);
    setKeyEntry(false);
    setShift(false);
  };
  const chooseRangeView = (view: RangeView) => {
    setRangeView(view);
    setRangeFieldName(RANGE_VIEWS[view].fields[0]);
    setKeyEntry(false);
  };

  // Another page of the rack is showing: let every note go.
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

  const part = shown.parts[selected];
  const rangeValue = ranges[selected]?.[rangeField] ?? 0;
  const readyOn = hasReadyMap(learn, READY_MAP);
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
            {splitJob ? (
              <div className="flex flex-col gap-2">
                <div className="rack-lcd sim-display">
                  <div className="rack-lcd-row">
                    <span className="flex items-center gap-2">
                      <button type="button" className="sim-range-cell sim-split-btn" aria-label="ปิดหน้า Split Job โดยไม่ยืนยัน" onClick={() => closeSplitJob(false)}>
                        ×
                      </button>
                      Split Job
                    </span>
                    <span className="rack-lcd-small">{perf.name}</span>
                  </div>
                  <div className="sim-split-keys rack-lcd-small">
                    {splitGroupRanges(splitJob).map((k, g) => (
                      <span key={g}>
                        {SPLIT_GROUPS[g]} {noteName(k.low)}–{noteName(k.high)}
                      </span>
                    ))}
                  </div>
                  <ol className="sim-ranges">
                    {shown.parts.map((p, i) => (
                      <li key={i} className="sim-split">
                        <span>{i + 1}</span>
                        <span className="truncate">{p.name}</span>
                        {SPLIT_GROUPS.map((name, g) => (
                          <button
                            key={name}
                            type="button"
                            className={`sim-range-cell sim-split-btn ${splitJob.groups[i]?.includes(g) ? "is-sel" : ""}`}
                            aria-pressed={splitJob.groups[i]?.includes(g) ?? false}
                            aria-label={`PART ${i + 1} Group ${name}`}
                            disabled={g > splitJob.count}
                            onClick={() => setSplitJob((j) => j && pressSplitGroup(j, i, g, shift))}
                          >
                            {name}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="sim-range-cell sim-split-btn"
                          aria-label={`ยกเลิก Group ของ PART ${i + 1}`}
                          onClick={() => setSplitJob((j) => j && clearSplitGroups(j, i))}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rack-hint">Split Points</span>
                  {SPLIT_POINT_COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="rack-mini"
                      aria-pressed={splitJob.count === n}
                      aria-label={`Split Points ${n}`}
                      onClick={() => {
                        setSplitJob((j) => j && setSplitCount(j, n));
                        setSplitIndex((i) => Math.min(i, n - 1));
                      }}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="rack-hint ml-1">Split Point</span>
                  {splitJob.points.slice(0, splitJob.count).map((note, i) => (
                    <button key={i} type="button" className="rack-mini px-1.5" aria-pressed={splitIndex === i} aria-label={`Split Point ${i + 1} ${noteName(note)}`} onClick={() => setSplitIndex(i)}>
                      {noteName(note)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Knob
                    label="DATA"
                    hint={noteName(splitJob.points[splitIndex])}
                    value={pointToKnob(splitJob.points[splitIndex])}
                    onChange={(k) => setSplitJob((j) => j && setSplitPoint(j, splitIndex, pointFromKnob(k)))}
                  />
                  <button type="button" className="rack-mini" onClick={() => setSplitJob((j) => j && setSplitPoint(j, splitIndex, j.points[splitIndex] - 1))}>
                    DEC
                  </button>
                  <button type="button" className="rack-mini" onClick={() => setSplitJob((j) => j && setSplitPoint(j, splitIndex, j.points[splitIndex] + 1))}>
                    INC
                  </button>
                  <button type="button" className="rack-mini" aria-pressed={keyEntry} onClick={() => setKeyEntry((v) => !v)}>
                    KEYBOARD
                  </button>
                  <button type="button" className={`rack-mini ${shift ? "sim-shift-on" : ""}`} aria-pressed={shift} onClick={() => setShift((v) => !v)}>
                    SHIFT
                  </button>
                  <span className="ml-auto flex gap-1.5">
                    <button type="button" className="rack-mini" onClick={() => closeSplitJob(true)}>
                      EXIT
                    </button>
                    <button type="button" className="rack-mini" onClick={() => closeSplitJob(true)}>
                      Done
                    </button>
                  </span>
                </div>
                <p className="rack-hint leading-snug">
                  {keyEntry
                    ? "กดคีย์เพื่อตั้ง Split Point ที่เลือก (ตอนนี้คีย์จะไม่มีเสียง) · จากคีย์บอร์ด USB ยังไม่ได้ทดสอบกับเครื่องจริง"
                    : "แตะ Group ให้แต่ละ Part · SHIFT + Group = เพิ่มอีก Group · Done หรือ EXIT = ใช้ค่า · × มุมซ้ายบน = ปิดโดยไม่ใช้ค่า"}
                </p>
                <p className="rack-hint leading-snug">คู่มือไม่ได้บอกว่า Group ไหนอยู่ช่วงคีย์ไหน หน้านี้เรียง A จากคีย์ต่ำขึ้นไป และให้คีย์ Split Point อยู่กลุ่มบน เป็นการตีความของร้าน</p>
              </div>
            ) : rangeView ? (
              <div className="flex flex-col gap-2">
                <div className="rack-lcd sim-display">
                  <div className="rack-lcd-row">
                    <span className="truncate">{RANGE_VIEWS[rangeView].limit}</span>
                    <span className="rack-lcd-small">PART {selected + 1}</span>
                  </div>
                  <ol className="sim-ranges">
                    {shown.parts.map((p, i) => (
                      <li key={i} className="sim-range">
                        <span>{i + 1}</span>
                        <span className="truncate">{p.name}</span>
                        {RANGE_VIEWS[rangeView].fields.map((field, f) => (
                          <button
                            key={field}
                            type="button"
                            className={`sim-range-cell ${i === selected && field === rangeField ? "is-sel" : ""}`}
                            aria-pressed={i === selected && field === rangeField}
                            aria-label={`PART ${i + 1} ${RANGE_VIEWS[rangeView].limit} ${f === 0 ? "ค่าแรก" : "ค่าที่สอง"} ${rangeText(field, ranges[i]?.[field] ?? 0)}`}
                            onClick={() => {
                              setSelected(i);
                              setRangeFieldName(field);
                            }}
                          >
                            {rangeText(field, ranges[i]?.[field] ?? 0)}
                          </button>
                        ))}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Knob
                    label="DATA"
                    hint={rangeText(rangeField, rangeValue)}
                    value={rangeToKnob(rangeField, rangeValue)}
                    onChange={(k) => setRanges((r) => setRangeField(r, selected, rangeField, rangeFromKnob(rangeField, k)))}
                  />
                  <button type="button" className="rack-mini" onClick={() => setRanges((r) => stepRangeField(r, selected, rangeField, -1))}>
                    DEC
                  </button>
                  <button type="button" className="rack-mini" onClick={() => setRanges((r) => stepRangeField(r, selected, rangeField, 1))}>
                    INC
                  </button>
                  {rangeView === "note" && (
                    <button type="button" className="rack-mini" aria-pressed={keyEntry} onClick={() => setKeyEntry((v) => !v)}>
                      KEYBOARD
                    </button>
                  )}
                  {(Object.keys(RANGE_VIEWS) as RangeView[]).map((v) => (
                    <button key={v} type="button" className="rack-mini" aria-pressed={rangeView === v} onClick={() => chooseRangeView(v)}>
                      {RANGE_VIEWS[v].label}
                    </button>
                  ))}
                  <button type="button" className="rack-mini ml-auto" onClick={() => setRangeView(null)}>
                    EXIT
                  </button>
                </div>
                <p className="rack-hint leading-snug">
                  {rangeView === "note"
                    ? keyEntry
                      ? "กดคีย์เพื่อใส่โน้ตในช่องที่เลือก (ตอนนี้คีย์จะไม่มีเสียง) · จากคีย์บอร์ด USB ยังไม่ได้ทดสอบกับเครื่องจริง"
                      : "แตะช่องแล้วหมุน DATA หรือกด INC / DEC · KEYBOARD = กดคีย์เพื่อใส่โน้ต · ค่าแรกสูงกว่าค่าที่สอง = เล่นนอกช่วง"
                    : `แตะช่องแล้วหมุน DATA หรือกด INC / DEC · คีย์บนจอเล่นที่ velocity ${midiVelocity(SCREEN_VELOCITY)} เสมอ แรงกดอื่นต้องเล่นจากคีย์บอร์ด USB`}
                </p>
              </div>
            ) : (
              <div className="rack-lcd sim-display" aria-live="polite">
                <div className="rack-lcd-row">
                  <span className="truncate">{perf.name}</span>
                  <span className="rack-lcd-small">SCENE {scene + 1}</span>
                </div>
                <ol className="sim-parts">
                  {shown.parts.map((p, i) => (
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
                <div className="rack-lcd-row rack-lcd-small flex-wrap gap-x-2">
                  <span>
                    PART {selected + 1} {part ? `${part.engine} ${noteName(part.low)}–${noteName(part.high)} VEL ${part.velLow ?? VEL_MIN}–${part.velHigh ?? VEL_MAX}` : "—"}
                    {mutes[selected] ? " MUTE" : ""}
                  </span>
                  <span>{statusText}</span>
                </div>
              </div>
            )}
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
            <button
              type="button"
              className={`rack-mini h-auto px-1.5 py-1 text-[0.6rem] leading-snug ${readyOn ? "sim-shift-on" : ""}`}
              aria-pressed={readyOn}
              disabled={midi.state !== "on"}
              title={midi.state === "on" ? undefined : "ต่อคีย์บอร์ด USB ก่อน"}
              onClick={() => setLearn(toggleReadyMap(learnRef.current, READY_MAP))}
            >
              ใช้เลข CC ตามเอกสาร Yamaha
            </button>
            <details className="rack-hint leading-snug">
              <summary className="cursor-pointer">เลข CC ค่าเริ่มต้น · ยังไม่ได้ทดสอบกับเครื่องจริง</summary>
              <ul className="mt-1 flex flex-col gap-0.5">
                <li>Super Knob = CC {MODX_DEFAULT_CC.superKnob}</li>
                <li>SCENE 1–8 = CC {MODX_DEFAULT_CC.scene} (ค่า 0–15 = Scene 1 … 112–127 = Scene 8)</li>
                <li>
                  Knob 1–8 = CC {MODX_DEFAULT_CC.assignKnobs[0]}–{MODX_DEFAULT_CC.assignKnobs[7]} (หน้านี้ยังไม่มีปุ่มชุดนี้)
                </li>
                <li>Control slider: ยังไม่พบเลข CC ในเอกสาร ใช้ LEARN</li>
                <li>ถ้าเปลี่ยนเลขบนเครื่องไว้ ใช้ LEARN แทน</li>
              </ul>
            </details>
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
            <div className="mt-auto flex flex-wrap items-center gap-1.5">
              <button type="button" className="rack-preset shrink-0" aria-pressed={shift} onClick={() => setShift((v) => !v)}>
                SHIFT
              </button>
              <button
                type="button"
                className={`rack-preset shrink-0 ${shift ? "sim-shift-on" : ""}`}
                onClick={pressSplit}
                aria-label={shift ? "เปิดหน้า Part - Note ตั้งช่วงโน้ตของแต่ละ Part" : "SPLIT เปิดหน้า Split Job"}
              >
                SPLIT
              </button>
              <p className="rack-hint w-full leading-snug">
                {shift ? "กด SCENE เพื่อเก็บ · KNOB POSITION เพื่อเก็บค่า · PART SELECT เพื่อ MUTE · SPLIT เพื่อตั้งช่วงโน้ต" : "SPLIT = แบ่งคีย์ · SHIFT + SCENE = STORE · SHIFT + SPLIT = ช่วงโน้ต"}
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
        (CC BY 3.0) ส่วน AN-X ใช้ซินธ์อนาล็อกที่ร้านเขียนเอง ส่วน FM-X ใช้ FM 8 operator ที่ร้านเขียนเอง (ไม่ใช่ algorithm ของ Yamaha) MODX เป็นเครื่องหมายการค้าของ Yamaha Corporation ร้านไม่ได้เกี่ยวข้องกับ Yamaha
      </p>
      <p className="text-sm">
        <Link href={packsHref("modx-m") ?? "/packs"} className="font-semibold text-ink underline underline-offset-2">
          ดูแพ็กเสียงสำหรับ MODX M
        </Link>
      </p>
    </section>
  );
}
