"use client";

import { parse } from "@audio/synth-dx7";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Knob } from "../Knob";
import { LiveScope } from "../LiveScope";
import { OctaveSwitch, RackKeys } from "../RackKeys";
import { FM_PRESETS } from "./presets";

/** Largest .syx file accepted. A 32-voice cartridge is 4104 bytes. */
const MAX_SYX_BYTES = 64 * 1024;

interface FmVoice {
  name: string;
  patch: Uint8Array;
}

/**
 * Applies the page's knobs to a voice: vibrato depth (LFO pitch depth and
 * sensitivity) and release time (R4 of every operator).
 */
function tweak(base: Uint8Array, vibrato: number, release: number) {
  const p = Uint8Array.from(base);
  p[139] = Math.round(vibrato * 40);
  if (vibrato > 0) p[143] = Math.max(p[143], 3);
  // 0.5 keeps the voice as written; lower is a longer release, higher a shorter one.
  const shift = Math.round((release - 0.5) * 90);
  for (let op = 0; op < 6; op++) {
    const r4 = op * 21 + 3;
    p[r4] = Math.min(99, Math.max(10, p[r4] + shift));
  }
  return p;
}

interface Engine {
  ctx: AudioContext;
  node: AudioWorkletNode;
  out: GainNode;
  analyser: AnalyserNode;
}

/**
 * The FM 6-OP page of the rack: a six-operator FM synth that plays DX7 voice
 * files (.syx). The engine is @audio/synth-dx7 (Apache-2.0), a port of the
 * Music Synthesizer for Android core that Dexed is also built on. It runs in
 * an AudioWorklet built by scripts/build-worklets.mjs.
 */
export function FmPage({ active }: { active: boolean }) {
  const [bank, setBank] = useState<FmVoice[]>(FM_PRESETS);
  const [bankName, setBankName] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [vibrato, setVibrato] = useState(0);
  const [release, setRelease] = useState(0.5);
  const [octave, setOctave] = useState(0);
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dragging, setDragging] = useState(false);
  const engine = useRef<Engine | null>(null);
  const starting = useRef<Promise<Engine | null> | null>(null);
  const heldRef = useRef(new Set<number>());
  const fileRef = useRef<HTMLInputElement>(null);

  const voice = bank[Math.min(index, bank.length - 1)];
  const patch = useMemo(() => tweak(voice.patch, vibrato, release), [voice, vibrato, release]);
  const patchRef = useRef(patch);
  useEffect(() => {
    patchRef.current = patch;
    engine.current?.node.port.postMessage({ type: "patch", patch });
  }, [patch]);

  useEffect(() => {
    if (engine.current) engine.current.out.gain.value = volume * 3;
  }, [volume]);

  /** Starts audio on the first key press: browsers only allow sound after a tap or key. */
  const start = useCallback(() => {
    if (engine.current) {
      if (engine.current.ctx.state === "suspended") void engine.current.ctx.resume();
      return Promise.resolve(engine.current);
    }
    if (starting.current) return starting.current;
    setStatus("loading");
    starting.current = (async () => {
      try {
        const ctx = new AudioContext({ latencyHint: "interactive" });
        await ctx.audioWorklet.addModule("/worklets/dx7-poly.js");
        const node = new AudioWorkletNode(ctx, "dx7-poly", { numberOfInputs: 0, outputChannelCount: [2] });
        const out = ctx.createGain();
        out.gain.value = volume * 3;
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -10;
        limiter.ratio.value = 8;
        const scope = ctx.createAnalyser();
        scope.fftSize = 2048;
        node.connect(out).connect(limiter).connect(scope).connect(ctx.destination);
        node.port.postMessage({ type: "patch", patch: patchRef.current });
        engine.current = { ctx, node, out, analyser: scope };
        setAnalyser(scope);
        setStatus("ready");
        // Notes pressed while the engine was loading.
        heldRef.current.forEach((note) => node.port.postMessage({ type: "on", note, velocity: 100 }));
        return engine.current;
      } catch {
        setStatus("error");
        setMessage("เบราว์เซอร์นี้เล่นเสียง FM ไม่ได้ ลองเปิดด้วย Chrome, Safari หรือ Firefox รุ่นใหม่");
        return null;
      } finally {
        starting.current = null;
      }
    })();
    return starting.current;
    // `volume` is read once at start; later changes go through the effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noteOn = useCallback(
    (note: number) => {
      heldRef.current.add(note);
      setHeld(new Set(heldRef.current));
      if (engine.current) engine.current.node.port.postMessage({ type: "on", note, velocity: 100 });
      else void start();
    },
    [start],
  );
  const noteOff = useCallback((note: number) => {
    heldRef.current.delete(note);
    setHeld(new Set(heldRef.current));
    engine.current?.node.port.postMessage({ type: "off", note });
  }, []);

  // Another page of the rack is showing: let every note go.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) setHeld(new Set());
  }
  useEffect(() => {
    if (active) return;
    heldRef.current.clear();
    engine.current?.node.port.postMessage({ type: "allOff" });
  }, [active]);

  useEffect(
    () => () => {
      void engine.current?.ctx.close();
      engine.current = null;
    },
    [],
  );

  const loadFile = async (file: File) => {
    if (file.size > MAX_SYX_BYTES) {
      setMessage("ไฟล์ใหญ่เกินไป ไฟล์ .syx ของ DX7 ปกติไม่เกิน 4 KB");
      return;
    }
    try {
      const voices = parse(new Uint8Array(await file.arrayBuffer())).map((v) => ({
        name: v.name || "(ไม่มีชื่อ)",
        patch: v.patch,
      }));
      setBank(voices);
      setBankName(file.name);
      setIndex(0);
      setMessage(`โหลด ${voices.length} เสียงจาก ${file.name} แล้ว`);
    } catch {
      setMessage("อ่านไฟล์นี้ไม่ได้ ใช้ไฟล์ .syx ของ DX7 (เสียงเดียว หรือแบงก์ 32 เสียง)");
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void loadFile(file);
  };

  const step = (by: number) => setIndex((i) => (i + by + bank.length) % bank.length);

  return (
    <section aria-label="ซินธ์ FM 6 ออปเปอเรเตอร์" className="flex flex-col gap-3">
      <div
        className={`rack-case relative select-none rounded-3xl p-2 sm:p-3 ${dragging ? "rack-drop" : ""}`}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="grid grid-cols-6 gap-1.5 md:grid-cols-12 md:gap-2">
          <div className="rack-panel col-span-6 md:col-span-5">
            <p className="rack-title">FM 6-OP</p>
            <div className="rack-lcd" aria-live="polite">
              <span className="rack-lcd-row">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{voice.name.toUpperCase()}</span>
              </span>
              <span className="rack-lcd-row rack-lcd-small">
                <span>{bankName ? bankName.slice(0, 18) : "MCKY BANK"}</span>
                <span>{status === "loading" ? "LOADING" : `${index + 1}/${bank.length}`}</span>
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                <button type="button" className="rack-mini" onClick={() => step(-1)} aria-label="เสียงก่อนหน้า">
                  ◀
                </button>
                <button type="button" className="rack-mini" onClick={() => step(1)} aria-label="เสียงถัดไป">
                  ▶
                </button>
              </div>
              <button type="button" className="rack-switch" onClick={() => fileRef.current?.click()}>
                โหลด .syx
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".syx,application/octet-stream"
                className="sr-only"
                tabIndex={-1}
                aria-label="เลือกไฟล์ .syx"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void loadFile(file);
                  event.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="rack-panel col-span-6 md:col-span-4">
            <p className="rack-title">VOICE</p>
            {bank === FM_PRESETS ? (
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="เสียงของร้าน">
                {FM_PRESETS.map((preset, i) => (
                  <button
                    key={preset.name}
                    type="button"
                    aria-pressed={i === index}
                    onClick={() => setIndex(i)}
                    className="rack-preset"
                  >
                    {preset.name.replace("MCKY ", "")}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <select
                  className="rack-select"
                  value={index}
                  onChange={(event) => setIndex(Number(event.target.value))}
                  aria-label="เลือกเสียงในแบงก์"
                >
                  {bank.map((v, i) => (
                    <option key={i} value={i}>
                      {String(i + 1).padStart(2, "0")} {v.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rack-hint self-start underline underline-offset-2"
                  onClick={() => {
                    setBank(FM_PRESETS);
                    setBankName(null);
                    setIndex(0);
                    setMessage(null);
                  }}
                >
                  กลับไปใช้เสียงของร้าน
                </button>
              </div>
            )}
            <div className="mt-auto flex items-end justify-around gap-2">
              <Knob label="VOLUME" hint={`${Math.round(volume * 100)}%`} value={volume} onChange={setVolume} />
              <Knob label="VIBRATO" hint={`${Math.round(vibrato * 100)}%`} value={vibrato} onChange={setVibrato} />
              <Knob
                label="RELEASE"
                hint={release < 0.45 ? "ยาว" : release > 0.55 ? "สั้น" : "ตามเสียง"}
                value={release}
                onChange={setRelease}
              />
            </div>
          </div>

          <div className="rack-panel col-span-6 md:col-span-3">
            <p className="rack-title">OUT</p>
            <LiveScope analyser={analyser} />
            <div className="mt-auto flex items-center justify-between gap-2">
              <OctaveSwitch octave={octave} onChange={setOctave} />
              <span className={`rack-led ${held.size > 0 ? "is-on" : ""}`} aria-hidden="true" />
            </div>
          </div>

          <div className="rack-panel rack-keys col-span-6 md:col-span-12">
            <div className="flex items-center justify-between gap-3">
              <p className="rack-title">KEYS</p>
              <p className="rack-hint hidden sm:block">เล่นคอร์ดได้ · ลากไฟล์ .syx มาวางบนแร็คได้</p>
            </div>
            <RackKeys active={active} held={held} octave={octave} onNoteOn={noteOn} onNoteOff={noteOff} />
          </div>
        </div>
      </div>

      <p className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm text-muted">
        <span aria-live="polite">
          {message ??
            "ซินธ์ FM 6 ออปเปอเรเตอร์ เปิดไฟล์เสียง DX7 (.syx) ของคุณเองได้ ไฟล์อยู่ในเครื่องคุณ ไม่ถูกส่งขึ้นเว็บ"}
        </span>
        <span className="text-xs">
          เอนจิน{" "}
          <a className="underline underline-offset-2" href="https://www.npmjs.com/package/@audio/synth-dx7">
            @audio/synth-dx7
          </a>{" "}
          (Apache-2.0) พอร์ตจาก MSFA เอนจินเดียวกับ Dexed
        </span>
      </p>
    </section>
  );
}
