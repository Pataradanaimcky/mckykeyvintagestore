"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Knob } from "./Knob";
import { Scope } from "./Scope";
import { connected, routeOf, STEP_NOTES, WAVES, type Cable, type JackId, type Point } from "./patch";
import { midiToHz, RackKeys } from "./RackKeys";
import { useRackSound } from "./useRackSound";

const CABLE_TONES = ["text-blue", "text-red", "text-cable"] as const;

const START_CABLES: Cable[] = [
  { id: 1, a: "seq.out", b: "osc.pitch", tone: 0 },
  { id: 2, a: "osc.out", b: "vcf.in", tone: 1 },
  { id: 3, a: "vcf.out", b: "out.in", tone: 2 },
];

/** The store's starting patches for the modular page: cables and knob positions. */
const MODULAR_PATCHES: {
  name: string;
  cables: [JackId, JackId][];
  tempo: number;
  wave: number;
  rate: number;
  cutoff: number;
}[] = [
  { name: "BASIC", cables: START_CABLES.map((c) => [c.a, c.b]), tempo: 0.45, wave: 0, rate: 0.35, cutoff: 0.55 },
  {
    name: "ACID",
    cables: [["seq.out", "osc.pitch"], ["osc.out", "vcf.in"], ["vcf.out", "out.in"], ["lfo.out", "vcf.mod"]],
    tempo: 0.75,
    wave: 0,
    rate: 0.6,
    cutoff: 0.3,
  },
  {
    name: "WOBBLE",
    cables: [["osc.out", "vcf.in"], ["vcf.out", "out.in"], ["lfo.out", "vcf.mod"]],
    tempo: 0.4,
    wave: 0.5,
    rate: 0.25,
    cutoff: 0.4,
  },
  { name: "SIREN", cables: [["osc.out", "out.in"], ["lfo.out", "osc.pitch"]], tempo: 0.4, wave: 1, rate: 0.12, cutoff: 0.55 },
];

const JACK_LABELS: Record<JackId, string> = {
  "seq.out": "ช่องออกของ SEQ",
  "osc.pitch": "ช่องเข้า PITCH ของ OSC",
  "osc.out": "ช่องออกของ OSC",
  "lfo.out": "ช่องออกของ LFO",
  "vcf.in": "ช่องเข้าของ FILTER",
  "vcf.mod": "ช่องเข้า MOD ของ FILTER",
  "vcf.out": "ช่องออกของ FILTER",
  "out.in": "ช่องเข้าของ OUT",
};

/** A cable hangs between two points like a real patch lead. */
function cablePath(from: Point, to: Point) {
  const sag = 26 + Math.hypot(to.x - from.x, to.y - from.y) * 0.28;
  return `M${from.x} ${from.y} C${from.x} ${from.y + sag} ${to.x} ${to.y + sag} ${to.x} ${to.y}`;
}

/**
 * A small playable synth rack. Visitors re-patch the cables between jacks (drag,
 * or tap one jack then another), turn the knobs and play the keys. The scope
 * shows the result, and with sound switched on the patch is also heard.
 *
 * The panel is the store's own generic drawing. It is not a copy of any real module.
 */
export function SynthRack({ active = true }: { active?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const jackRefs = useRef(new Map<JackId, HTMLButtonElement>());
  const nextId = useRef(START_CABLES.length + 1);

  const [cables, setCables] = useState<Cable[]>(START_CABLES);
  const [points, setPoints] = useState<Partial<Record<JackId, Point>>>({});
  // The cable being moved: `held` is its plugged-in end, `loose` follows the pointer while dragging.
  const [held, setHeld] = useState<{ id: number; from: JackId; origin: JackId } | null>(null);
  const [loose, setLoose] = useState<Point | null>(null);

  const [tempo, setTempo] = useState(0.45);
  const [wave, setWave] = useState(0);
  const [rate, setRate] = useState(0.35);
  const [cutoff, setCutoff] = useState(0.55);
  const [step, setStep] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  // Held notes, newest last. The modular page is monophonic: the newest note sounds.
  const [notes, setNotes] = useState<number[]>([]);
  const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;
  const key = lastNote === null ? null : midiToHz(lastNote);
  const heldKeys = useMemo(() => new Set(lastNote === null ? [] : [lastNote]), [lastNote]);

  const waveIndex = Math.min(WAVES.length - 1, Math.round(wave * (WAVES.length - 1)));
  const heldId = held?.id;
  const route = useMemo(() => routeOf(cables.filter((cable) => cable.id !== heldId)), [cables, heldId]);
  const bpm = Math.round(70 + tempo * 90);

  const sound = useRackSound();

  // Measure where each jack sits so the cables can be drawn over the panels.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const box = root.getBoundingClientRect();
      const next: Partial<Record<JackId, Point>> = {};
      jackRefs.current.forEach((el, id) => {
        const r = el.getBoundingClientRect();
        next[id] = { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
      });
      setPoints(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    measure();
    return () => observer.disconnect();
  }, []);

  // Leaving this page of the rack silences it (state adjusted while rendering, as React advises).
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) {
      setSoundOn(false);
      setNotes([]);
    }
  }

  // The sequencer clock. It stays still for reduced-motion visitors unless they turn sound on,
  // and while another page of the rack is showing.
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches && !soundOn;
    if (still || !active) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setStep((current) => (current + 1) % STEP_NOTES.length);
    }, 30000 / bpm);
    return () => window.clearInterval(timer);
  }, [bpm, soundOn, active]);

  // Keep the sound in step with the patch, the knobs, the keys and the clock.
  useEffect(() => {
    sound.update({ route, wave: WAVES[waveIndex].type, rate, cutoff, step, on: soundOn, key });
  }, [sound, route, waveIndex, rate, cutoff, step, soundOn, key]);

  /** Pressing a key also switches the sound on: a key press is when browsers allow sound. */
  const noteOn = (note: number) => {
    if (!soundOn) {
      sound.start();
      setSoundOn(true);
    }
    setNotes((current) => [...current.filter((n) => n !== note), note]);
  };
  const noteOff = useCallback((note: number) => {
    setNotes((current) => current.filter((n) => n !== note));
  }, []);

  const [patchName, setPatchName] = useState<string | null>("BASIC");
  const loadPatch = (p: (typeof MODULAR_PATCHES)[number]) => {
    setCables(p.cables.map(([a, b], i) => ({ id: nextId.current + i, a, b, tone: i % CABLE_TONES.length })));
    nextId.current += p.cables.length;
    setTempo(p.tempo);
    setWave(p.wave);
    setRate(p.rate);
    setCutoff(p.cutoff);
    setHeld(null);
    setPatchName(p.name);
  };

  const plug = useCallback((id: number, from: JackId, into: JackId) => {
    setPatchName(null);
    setCables((current) => {
      const moving = current.find((cable) => cable.id === id);
      const tone = moving?.tone ?? (id - 1) % CABLE_TONES.length;
      // One cable per jack: whatever was in the target jack comes out.
      const rest = current.filter((cable) => cable.id !== id && cable.a !== into && cable.b !== into);
      return [...rest, { id, a: from, b: into, tone }];
    });
  }, []);

  const drop = useCallback((id: number) => {
    setCables((current) => current.filter((cable) => cable.id !== id));
  }, []);

  /** Pick up the cable in this jack, or start a new one from it. */
  const pickUp = (jack: JackId) => {
    const existing = cables.find((cable) => cable.a === jack || cable.b === jack);
    if (existing) {
      const from = existing.a === jack ? existing.b : existing.a;
      setHeld({ id: existing.id, from, origin: jack });
      return;
    }
    const id = nextId.current++;
    setCables((current) => [...current, { id, a: jack, b: jack, tone: (id - 1) % CABLE_TONES.length }]);
    setHeld({ id, from: jack, origin: jack });
  };

  /** Tap or key press on a jack: finish the held cable here, or pick one up. */
  const activate = (jack: JackId) => {
    if (!held) {
      pickUp(jack);
      return true;
    }
    if (jack === held.from) drop(held.id);
    else plug(held.id, held.from, jack);
    setHeld(null);
    setLoose(null);
    return false;
  };

  const onJackPointerDown = (jack: JackId) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const started = activate(jack);
    if (!started) return;
    const root = rootRef.current;
    if (!root) return;

    const toLocal = (e: PointerEvent) => {
      const box = root.getBoundingClientRect();
      return { x: e.clientX - box.left, y: e.clientY - box.top };
    };
    const move = (e: PointerEvent) => setLoose(toLocal(e));
    const up = (e: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setLoose(null);
      const target = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>("[data-jack]")?.dataset.jack as JackId | undefined;
      // Released on the jack it started from: keep holding it, so a second tap can place it.
      if (target === jack) return;
      setHeld((current) => {
        if (!current) return null;
        if (target && target !== current.from) plug(current.id, current.from, target);
        else drop(current.id);
        return null;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onJackKeyDown = (jack: JackId) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(jack);
    } else if (event.key === "Escape" && held) {
      drop(held.id);
      setHeld(null);
    }
  };

  const jack = (id: JackId, label: string, kind: "in" | "out") => {
    const live = cables.some((cable) => cable.id !== held?.id && (cable.a === id || cable.b === id));
    return (
      <span className="flex flex-col items-center gap-0.5">
        {/* Label above the socket: cables hang down and would cover it. */}
        <span className={`rack-label ${kind === "out" ? "rack-label-out" : ""}`}>{label}</span>
        <button
          type="button"
          ref={(el) => {
            if (el) jackRefs.current.set(id, el);
            else jackRefs.current.delete(id);
          }}
          data-jack={id}
          aria-label={`${JACK_LABELS[id]}${live ? " มีสายเสียบอยู่" : ""}`}
          aria-pressed={held?.origin === id}
          onPointerDown={onJackPointerDown(id)}
          onKeyDown={onJackKeyDown(id)}
          className="rack-jack"
        />
      </span>
    );
  };

  const heldCable = held ? cables.find((cable) => cable.id === held.id) : undefined;
  const heldFrom = held ? points[held.from] : undefined;
  const hanging = heldFrom ? { x: heldFrom.x + 18, y: heldFrom.y + 54 } : undefined;

  return (
    <section aria-label="แร็คโมดูลาร์สำหรับลองเล่น" className="flex flex-col gap-3">
      <div ref={rootRef} className="rack-case relative select-none rounded-3xl p-2 sm:p-3">
        <div className="grid grid-cols-6 gap-1.5 md:grid-cols-12 md:gap-2">
          <div className="rack-panel col-span-6 md:col-span-3">
            <p className="rack-title">SEQ</p>
            <div className="flex items-center justify-between gap-1" aria-hidden="true">
              {STEP_NOTES.map((_, index) => (
                <span key={index} className={`rack-led ${index === step ? "is-on" : ""}`} />
              ))}
            </div>
            <div className="mt-auto flex items-end justify-between gap-3">
              <Knob label="TEMPO" hint={`${bpm} BPM`} value={tempo} onChange={setTempo} />
              {jack("seq.out", "OUT", "out")}
            </div>
          </div>

          <div className="rack-panel col-span-3 md:col-span-2">
            <p className="rack-title">OSC</p>
            <Knob label="WAVE" hint={WAVES[waveIndex].label} value={wave} onChange={setWave} steps={WAVES.length} />
            <div className="mt-auto flex items-end justify-between gap-2">
              {jack("osc.pitch", "PITCH", "in")}
              {jack("osc.out", "OUT", "out")}
            </div>
          </div>

          <div className="rack-panel col-span-3 md:col-span-2">
            <p className="rack-title">LFO</p>
            <Knob label="RATE" hint={`${(0.2 + rate * 8).toFixed(1)} Hz`} value={rate} onChange={setRate} />
            <div className="mt-auto flex items-end justify-between gap-2">
              <span
                aria-hidden="true"
                className="rack-led rack-led-pulse is-on mb-4"
                style={{ "--lfo": `${(1 / (0.2 + rate * 8)).toFixed(2)}s` } as CSSProperties}
              />
              {jack("lfo.out", "OUT", "out")}
            </div>
          </div>

          <div className="rack-panel col-span-3 md:col-span-2">
            <p className="rack-title">FILTER</p>
            <Knob label="CUTOFF" hint={`${Math.round(cutoff * 100)}%`} value={cutoff} onChange={setCutoff} />
            <div className="mt-auto flex items-end justify-between gap-1">
              {jack("vcf.in", "IN", "in")}
              {jack("vcf.mod", "MOD", "in")}
              {jack("vcf.out", "OUT", "out")}
            </div>
          </div>

          <div className="rack-panel col-span-3 md:col-span-3">
            <p className="rack-title">OUT</p>
            <Scope
              route={route}
              wave={WAVES[waveIndex].type}
              cutoff={cutoff}
              rate={rate}
              note={key ?? STEP_NOTES[step]}
              playing={key !== null}
            />
            <div className="mt-auto flex items-end justify-between gap-2">
              {jack("out.in", "IN", "in")}
              <button
                type="button"
                aria-pressed={soundOn}
                onClick={() => {
                  if (!soundOn) sound.start();
                  setSoundOn(!soundOn);
                }}
                className={`rack-switch ${soundOn ? "is-on" : ""}`}
              >
                {soundOn ? "ปิดเสียง" : "เปิดเสียง"}
              </button>
            </div>
          </div>

          <div className="rack-panel rack-keys col-span-6 md:col-span-12">
            <div className="flex items-center justify-between gap-3">
              <p className="rack-title">KEYS</p>
              <p className="rack-hint hidden sm:block">กดคีย์ หรือใช้ปุ่ม A–K บนคีย์บอร์ดคอม</p>
            </div>
            <RackKeys active={active} held={heldKeys} onNoteOn={noteOn} onNoteOff={noteOff} />
          </div>
        </div>

        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          {cables.map((cable) => {
            const isHeld = cable.id === held?.id;
            const from = points[isHeld && held ? held.from : cable.a];
            const to = isHeld ? (loose ?? hanging) : points[cable.b];
            if (!from || !to) return null;
            return (
              <g key={cable.id} className={`rack-cable ${CABLE_TONES[cable.tone]} ${isHeld ? "is-held" : ""}`}>
                <path d={cablePath(from, to)} pathLength={1} />
                <circle cx={from.x} cy={from.y} r="6.5" />
                <circle cx={to.x} cy={to.y} r="6.5" />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="แพตช์ตั้งต้น">
        <span className="mr-1 text-sm text-muted">แพตช์ตั้งต้น</span>
        {MODULAR_PATCHES.map((p) => (
          <button key={p.name} type="button" aria-pressed={patchName === p.name} onClick={() => loadPatch(p)} className={`studio-pill ${patchName === p.name ? "is-on" : ""}`}>
            {p.name}
          </button>
        ))}
      </div>

      <p className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm text-muted" aria-live="polite">
        <span>
          {heldCable
            ? "แตะช่องที่อยากเสียบสายเส้นนี้ หรือแตะช่องเดิมเพื่อเสียบกลับ"
            : "ลองเล่นได้เลย: กดคีย์ ลากสายไปเสียบช่องอื่น แล้วหมุนปุ่ม"}
        </span>
        <span>
          {route.audible
            ? connected(cables, "lfo.out", "vcf.mod")
              ? "LFO กำลังขยับฟิลเตอร์"
              : "ลองต่อ LFO เข้า MOD ดู"
            : "ยังไม่มีสัญญาณถึง OUT"}
        </span>
      </p>
    </section>
  );
}
