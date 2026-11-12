"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Fader } from "../Fader";
import { LiveScope } from "../LiveScope";
import { OctaveSwitch, RackKeys } from "../RackKeys";
import { attackS, createChorus, cutoffHz, POLY_PROGRAMS, PolyVoices, releaseS, type PolySettings } from "./voices";

const CHORUS = ["OFF", "I", "II"] as const;
const PROGRAMS = POLY_PROGRAMS;
type Settings = PolySettings;

interface Engine {
  ctx: AudioContext;
  voices: PolyVoices;
  setChorus: (mode: number) => void;
}

/**
 * The POLY page of the rack: an eight-voice analog-style polysynth written for
 * this store with Web Audio. Each voice has a saw, a pulse and a sub oscillator
 * into a low-pass filter with its own envelope, then a chorus on the mix.
 */
export function PolyPage({ active }: { active: boolean }) {
  const [settings, setSettings] = useState<Settings>(PROGRAMS[0].settings);
  const [program, setProgram] = useState<number | null>(0);
  const [chorus, setChorus] = useState(PROGRAMS[0].chorus);
  const [octave, setOctave] = useState(0);
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const engine = useRef<Engine | null>(null);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    const e = engine.current;
    // Filter knobs move the notes already sounding too.
    e?.voices.update(settings);
  }, [settings]);

  const set = (key: keyof Settings) => (value: number) => {
    setProgram(null);
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const ensure = useCallback(() => {
    if (engine.current) {
      if (engine.current.ctx.state === "suspended") void engine.current.ctx.resume();
      return engine.current;
    }
    const ctx = new AudioContext({ latencyHint: "interactive" });
    const bus = ctx.createGain();
    bus.gain.value = 0.32;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.ratio.value = 6;
    const scope = ctx.createAnalyser();
    scope.fftSize = 2048;
    const chorusFx = createChorus(ctx, bus, limiter);
    limiter.connect(scope).connect(ctx.destination);
    engine.current = { ctx, voices: new PolyVoices(ctx, bus), setChorus: chorusFx.setMode };
    setAnalyser(scope);
    return engine.current;
  }, []);

  // Chorus mode: I is slow and shallow, II faster and deeper.
  useEffect(() => {
    engine.current?.setChorus(chorus);
  }, [chorus, analyser]);

  const noteOn = useCallback(
    (note: number) => {
      ensure().voices.noteOn(note, settingsRef.current);
      setHeld((h) => new Set(h).add(note));
    },
    [ensure],
  );

  const noteOff = useCallback((note: number) => {
    engine.current?.voices.noteOff(note, settingsRef.current);
    setHeld((h) => {
      const next = new Set(h);
      next.delete(note);
      return next;
    });
  }, []);

  // Another page of the rack is showing: let every note go.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) setHeld(new Set());
  }
  useEffect(() => {
    if (active) return;
    engine.current?.voices.allOff(settingsRef.current);
  }, [active]);

  useEffect(
    () => () => {
      void engine.current?.ctx.close();
      engine.current = null;
    },
    [],
  );

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <section aria-label="โพลีซินธ์แบบอนาล็อก" className="flex flex-col gap-3">
      <div className="rack-case rack-skin-poly relative select-none rounded-3xl p-2 sm:p-3">
        <div className="grid grid-cols-6 gap-1.5 md:grid-cols-12 md:gap-2">
          <div className="rack-panel col-span-6 md:col-span-4">
            <p className="rack-title">PROGRAM</p>
            <LiveScope analyser={analyser} />
            <div className="grid grid-cols-5 gap-1" role="group" aria-label="เสียงของร้าน">
              {PROGRAMS.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  aria-pressed={program === i}
                  onClick={() => {
                    setProgram(i);
                    setSettings(p.settings);
                    setChorus(p.chorus);
                  }}
                  className="rack-preset px-0 text-[0.6rem]"
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-1" role="group" aria-label="คอรัส">
                <span className="rack-hint mr-1">CHORUS</span>
                {CHORUS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={chorus === i}
                    onClick={() => setChorus(i)}
                    className="rack-preset px-2"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <OctaveSwitch octave={octave} onChange={setOctave} />
            </div>
          </div>

          <div className="rack-panel col-span-3 md:col-span-3">
            <p className="rack-title">DCO</p>
            <div className="mt-auto flex items-end justify-around gap-1">
              <Fader label="SAW" hint={pct(settings.saw)} value={settings.saw} onChange={set("saw")} />
              <Fader label="PULSE" hint={pct(settings.pulse)} value={settings.pulse} onChange={set("pulse")} />
              <Fader label="SUB" hint={pct(settings.sub)} value={settings.sub} onChange={set("sub")} />
            </div>
          </div>

          <div className="rack-panel col-span-3 md:col-span-3">
            <p className="rack-title">VCF</p>
            <div className="mt-auto flex items-end justify-around gap-1">
              <Fader label="FREQ" hint={`${Math.round(cutoffHz(settings.cutoff))} Hz`} value={settings.cutoff} onChange={set("cutoff")} />
              <Fader label="RES" hint={pct(settings.res)} value={settings.res} onChange={set("res")} />
              <Fader label="ENV" hint={pct(settings.env)} value={settings.env} onChange={set("env")} />
            </div>
          </div>

          <div className="rack-panel col-span-6 md:col-span-2">
            <p className="rack-title">ENV</p>
            <div className="mt-auto flex items-end justify-around gap-1">
              <Fader label="ATK" hint={`${attackS(settings.attack).toFixed(2)} s`} value={settings.attack} onChange={set("attack")} />
              <Fader label="REL" hint={`${releaseS(settings.release).toFixed(2)} s`} value={settings.release} onChange={set("release")} />
            </div>
          </div>

          <div className="rack-panel rack-keys col-span-6 md:col-span-12">
            <div className="flex items-center justify-between gap-3">
              <p className="rack-title">KEYS</p>
              <p className="rack-hint hidden sm:block">โพลี 8 เสียง · เล่นคอร์ดได้</p>
            </div>
            <RackKeys active={active} held={held} octave={octave} onNoteOn={noteOn} onNoteOff={noteOff} />
          </div>
        </div>
      </div>

      <p className="text-sm text-muted">
        โพลีซินธ์อนาล็อกแบบยุค 80 ที่ร้านเขียนเอง: ซอว์ พัลส์ และซับออสซิลเลเตอร์ ผ่านฟิลเตอร์โลว์พาสกับคอรัส
      </p>
    </section>
  );
}
