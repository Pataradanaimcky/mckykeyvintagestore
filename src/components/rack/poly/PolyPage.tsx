"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Knob } from "../Knob";
import { LiveScope } from "../LiveScope";
import { midiToHz, OctaveSwitch, RackKeys } from "../RackKeys";

const MAX_VOICES = 8;
const CHORUS = ["OFF", "I", "II"] as const;

interface Settings {
  cutoff: number;
  res: number;
  env: number;
  attack: number;
  release: number;
  sub: number;
}

interface Voice {
  note: number;
  oscs: OscillatorNode[];
  filter: BiquadFilterNode;
  vca: GainNode;
}

interface Engine {
  ctx: AudioContext;
  bus: GainNode;
  analyser: AnalyserNode;
  chorusWet: GainNode;
  chorusLfo: OscillatorNode;
  chorusDepth: GainNode;
}

const cutoffHz = (v: number) => 80 * 2 ** (v * 7.5);
const attackS = (v: number) => 0.003 + v * v * 2;
const releaseS = (v: number) => 0.05 + v * v * 4;

/**
 * The POLY page of the rack: an eight-voice analog-style polysynth written for
 * this store with Web Audio. Each voice has a saw, a pulse and a sub oscillator
 * into a low-pass filter with its own envelope, then a chorus on the mix.
 */
export function PolyPage({ active }: { active: boolean }) {
  const [settings, setSettings] = useState<Settings>({
    cutoff: 0.55,
    res: 0.25,
    env: 0.45,
    attack: 0.05,
    release: 0.35,
    sub: 0.4,
  });
  const [chorus, setChorus] = useState(1);
  const [octave, setOctave] = useState(0);
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const engine = useRef<Engine | null>(null);
  const voices = useRef<Voice[]>([]);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    const e = engine.current;
    if (!e) return;
    // Filter knobs move the notes already sounding too.
    for (const v of voices.current) {
      v.filter.Q.setTargetAtTime(0.7 + settings.res * 18, e.ctx.currentTime, 0.02);
      v.filter.frequency.setTargetAtTime(cutoffHz(settings.cutoff), e.ctx.currentTime, 0.05);
    }
  }, [settings]);

  const set = (key: keyof Settings) => (value: number) => setSettings((s) => ({ ...s, [key]: value }));

  const ensure = useCallback(() => {
    if (engine.current) {
      if (engine.current.ctx.state === "suspended") void engine.current.ctx.resume();
      return engine.current;
    }
    const ctx = new AudioContext({ latencyHint: "interactive" });
    const bus = ctx.createGain();
    bus.gain.value = 0.32;
    // Chorus: one delay line swept by a slow LFO, mixed with the dry signal.
    const delay = ctx.createDelay(0.05);
    delay.delayTime.value = 0.012;
    const chorusLfo = ctx.createOscillator();
    chorusLfo.type = "triangle";
    const chorusDepth = ctx.createGain();
    chorusLfo.connect(chorusDepth).connect(delay.delayTime);
    chorusLfo.start();
    const chorusWet = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.ratio.value = 6;
    const scope = ctx.createAnalyser();
    scope.fftSize = 2048;
    bus.connect(limiter);
    bus.connect(delay).connect(chorusWet).connect(limiter);
    limiter.connect(scope).connect(ctx.destination);
    engine.current = { ctx, bus, analyser: scope, chorusWet, chorusLfo, chorusDepth };
    setAnalyser(scope);
    return engine.current;
  }, []);

  // Chorus mode: I is slow and shallow, II faster and deeper.
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    const t = e.ctx.currentTime;
    e.chorusWet.gain.setTargetAtTime(chorus === 0 ? 0 : 0.7, t, 0.05);
    e.chorusLfo.frequency.setTargetAtTime(chorus === 2 ? 0.83 : 0.5, t, 0.05);
    e.chorusDepth.gain.setTargetAtTime(chorus === 2 ? 0.004 : 0.0025, t, 0.05);
  }, [chorus, analyser]);

  const stopVoice = useCallback((v: Voice, fast = false) => {
    const e = engine.current;
    if (!e) return;
    const t = e.ctx.currentTime;
    const r = fast ? 0.02 : releaseS(settingsRef.current.release);
    v.vca.gain.cancelScheduledValues(t);
    v.vca.gain.setValueAtTime(v.vca.gain.value, t);
    v.vca.gain.setTargetAtTime(0, t, r / 4);
    v.filter.frequency.cancelScheduledValues(t);
    v.filter.frequency.setTargetAtTime(cutoffHz(settingsRef.current.cutoff), t, r / 4);
    for (const osc of v.oscs) osc.stop(t + r * 1.5 + 0.05);
  }, []);

  const noteOn = useCallback(
    (note: number) => {
      const e = ensure();
      const s = settingsRef.current;
      const { ctx } = e;
      const t = ctx.currentTime;
      // Same note again, or too many notes: let the oldest go quickly.
      for (const v of voices.current.filter((x) => x.note === note)) stopVoice(v, true);
      voices.current = voices.current.filter((x) => x.note !== note);
      while (voices.current.length >= MAX_VOICES) stopVoice(voices.current.shift()!, true);

      const hz = midiToHz(note);
      const mix = ctx.createGain();
      mix.gain.value = 0.5;
      const make = (type: OscillatorType, freq: number, level: number, detune = 0) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const g = ctx.createGain();
        g.gain.value = level;
        osc.connect(g).connect(mix);
        osc.start(t);
        return osc;
      };
      const oscs = [make("sawtooth", hz, 0.55, -4), make("square", hz, 0.3, 4), make("square", hz / 2, s.sub * 0.6)];

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = 0.7 + s.res * 18;
      const base = cutoffHz(s.cutoff);
      const peak = Math.min(18000, base * 2 ** (s.env * 5));
      const a = attackS(s.attack);
      filter.frequency.setValueAtTime(base, t);
      filter.frequency.linearRampToValueAtTime(peak, t + a);
      filter.frequency.setTargetAtTime(base + (peak - base) * 0.25, t + a, 0.35);

      const vca = ctx.createGain();
      vca.gain.setValueAtTime(0, t);
      vca.gain.linearRampToValueAtTime(1, t + a);
      vca.gain.setTargetAtTime(0.7, t + a, 0.3);

      mix.connect(filter).connect(vca).connect(e.bus);
      oscs[0].onended = () => vca.disconnect();
      voices.current.push({ note, oscs, filter, vca });
      setHeld((h) => new Set(h).add(note));
    },
    [ensure, stopVoice],
  );

  const noteOff = useCallback(
    (note: number) => {
      for (const v of voices.current.filter((x) => x.note === note)) stopVoice(v);
      voices.current = voices.current.filter((x) => x.note !== note);
      setHeld((h) => {
        const next = new Set(h);
        next.delete(note);
        return next;
      });
    },
    [stopVoice],
  );

  // Another page of the rack is showing: let every note go.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) setHeld(new Set());
  }
  useEffect(() => {
    if (active) return;
    for (const v of voices.current) stopVoice(v);
    voices.current = [];
  }, [active, stopVoice]);

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
      <div className="rack-case relative select-none rounded-3xl p-2 sm:p-3">
        <div className="grid grid-cols-6 gap-1.5 md:grid-cols-12 md:gap-2">
          <div className="rack-panel col-span-6 md:col-span-5">
            <p className="rack-title">VCF</p>
            <div className="mt-auto flex items-end justify-around gap-2">
              <Knob label="CUTOFF" hint={`${Math.round(cutoffHz(settings.cutoff))} Hz`} value={settings.cutoff} onChange={set("cutoff")} />
              <Knob label="RES" hint={pct(settings.res)} value={settings.res} onChange={set("res")} />
              <Knob label="ENV" hint={pct(settings.env)} value={settings.env} onChange={set("env")} />
            </div>
          </div>

          <div className="rack-panel col-span-6 md:col-span-4">
            <p className="rack-title">ENV · SUB</p>
            <div className="mt-auto flex items-end justify-around gap-2">
              <Knob label="ATTACK" hint={`${attackS(settings.attack).toFixed(2)} s`} value={settings.attack} onChange={set("attack")} />
              <Knob label="RELEASE" hint={`${releaseS(settings.release).toFixed(2)} s`} value={settings.release} onChange={set("release")} />
              <Knob label="SUB" hint={pct(settings.sub)} value={settings.sub} onChange={set("sub")} />
            </div>
          </div>

          <div className="rack-panel col-span-6 md:col-span-3">
            <p className="rack-title">CHORUS</p>
            <LiveScope analyser={analyser} />
            <div className="mt-auto flex items-center justify-between gap-2">
              <div className="flex gap-1" role="group" aria-label="คอรัส">
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
