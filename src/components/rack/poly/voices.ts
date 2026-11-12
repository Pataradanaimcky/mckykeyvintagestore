import { midiToHz } from "../midi";

/** Sound settings of the analog-style polysynth. Every value runs from 0 to 1. */
export interface PolySettings {
  saw: number;
  pulse: number;
  sub: number;
  cutoff: number;
  res: number;
  env: number;
  attack: number;
  release: number;
}

/** The store's own starting sounds for the polysynth. */
export const POLY_PROGRAMS: { name: string; chorus: number; settings: PolySettings }[] = [
  { name: "STRINGS", chorus: 2, settings: { saw: 0.85, pulse: 0, sub: 0.15, cutoff: 0.55, res: 0.1, env: 0.2, attack: 0.45, release: 0.5 } },
  { name: "BRASS", chorus: 1, settings: { saw: 0.9, pulse: 0.2, sub: 0.3, cutoff: 0.35, res: 0.2, env: 0.7, attack: 0.15, release: 0.25 } },
  { name: "PAD", chorus: 2, settings: { saw: 0.5, pulse: 0.6, sub: 0.3, cutoff: 0.45, res: 0.3, env: 0.3, attack: 0.6, release: 0.7 } },
  { name: "STAB", chorus: 1, settings: { saw: 0.7, pulse: 0.5, sub: 0.5, cutoff: 0.3, res: 0.45, env: 0.8, attack: 0, release: 0.15 } },
  { name: "BASS", chorus: 0, settings: { saw: 0.6, pulse: 0.35, sub: 1, cutoff: 0.25, res: 0.35, env: 0.55, attack: 0, release: 0.1 } },
  { name: "KEYS", chorus: 1, settings: { saw: 0.3, pulse: 0.7, sub: 0.2, cutoff: 0.4, res: 0.15, env: 0.5, attack: 0, release: 0.3 } },
  { name: "RES BASS", chorus: 0, settings: { saw: 0.9, pulse: 0, sub: 0.7, cutoff: 0.18, res: 0.7, env: 0.7, attack: 0, release: 0.12 } },
  { name: "SOFT PAD", chorus: 2, settings: { saw: 0.3, pulse: 0.3, sub: 0.4, cutoff: 0.3, res: 0.05, env: 0.15, attack: 0.75, release: 0.8 } },
  { name: "LEAD", chorus: 1, settings: { saw: 0.2, pulse: 0.9, sub: 0.3, cutoff: 0.6, res: 0.3, env: 0.35, attack: 0.05, release: 0.25 } },
  { name: "SWEEP", chorus: 2, settings: { saw: 0.8, pulse: 0.3, sub: 0.2, cutoff: 0.15, res: 0.6, env: 0.9, attack: 0.55, release: 0.6 } },
];

export const cutoffHz = (v: number) => 80 * 2 ** (v * 7.5);
export const attackS = (v: number) => 0.003 + v * v * 2;
export const releaseS = (v: number) => 0.05 + v * v * 4;

interface Voice {
  note: number;
  oscs: OscillatorNode[];
  filter: BiquadFilterNode;
  vca: GainNode;
}

/**
 * Up to `max` analog-style voices (saw, pulse and sub oscillator into a
 * low-pass filter with its own envelope), played into `out`.
 */
export class PolyVoices {
  private voices: Voice[] = [];

  constructor(
    private ctx: AudioContext,
    private out: AudioNode,
    private max = 8,
  ) {}

  private stop(v: Voice, s: PolySettings, fast = false) {
    const t = this.ctx.currentTime;
    const r = fast ? 0.02 : releaseS(s.release);
    v.vca.gain.cancelScheduledValues(t);
    v.vca.gain.setValueAtTime(v.vca.gain.value, t);
    v.vca.gain.setTargetAtTime(0, t, r / 4);
    v.filter.frequency.cancelScheduledValues(t);
    v.filter.frequency.setTargetAtTime(cutoffHz(s.cutoff), t, r / 4);
    for (const osc of v.oscs) osc.stop(t + r * 1.5 + 0.05);
  }

  /** `velocity` runs from 0 to 1. */
  noteOn(note: number, s: PolySettings, velocity = 1) {
    const { ctx } = this;
    const t = ctx.currentTime;
    // Same note again, or too many notes: let the oldest go quickly.
    for (const v of this.voices.filter((x) => x.note === note)) this.stop(v, s, true);
    this.voices = this.voices.filter((x) => x.note !== note);
    while (this.voices.length >= this.max) this.stop(this.voices.shift()!, s, true);

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
    const oscs = [make("sawtooth", hz, s.saw * 0.6, -4), make("square", hz, s.pulse * 0.45, 4), make("square", hz / 2, s.sub * 0.6)];

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.7 + s.res * 18;
    const base = cutoffHz(s.cutoff);
    const peak = Math.min(18000, base * 2 ** (s.env * 5 * (0.5 + velocity / 2)));
    const a = attackS(s.attack);
    filter.frequency.setValueAtTime(base, t);
    filter.frequency.linearRampToValueAtTime(peak, t + a);
    filter.frequency.setTargetAtTime(base + (peak - base) * 0.25, t + a, 0.35);

    const vca = ctx.createGain();
    const level = 0.35 + velocity * 0.65;
    vca.gain.setValueAtTime(0, t);
    vca.gain.linearRampToValueAtTime(level, t + a);
    vca.gain.setTargetAtTime(level * 0.7, t + a, 0.3);

    mix.connect(filter).connect(vca).connect(this.out);
    oscs[0].onended = () => vca.disconnect();
    this.voices.push({ note, oscs, filter, vca });
  }

  noteOff(note: number, s: PolySettings) {
    for (const v of this.voices.filter((x) => x.note === note)) this.stop(v, s);
    this.voices = this.voices.filter((x) => x.note !== note);
  }

  allOff(s: PolySettings) {
    for (const v of this.voices) this.stop(v, s);
    this.voices = [];
  }

  /** Filter changes also move the notes already sounding. */
  update(s: PolySettings) {
    const t = this.ctx.currentTime;
    for (const v of this.voices) {
      v.filter.Q.setTargetAtTime(0.7 + s.res * 18, t, 0.02);
      v.filter.frequency.setTargetAtTime(cutoffHz(s.cutoff), t, 0.05);
    }
  }
}

/** A chorus (one delay line swept by a slow LFO, mixed with the dry signal) from `input` to `output`. */
export function createChorus(ctx: AudioContext, input: AudioNode, output: AudioNode) {
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = 0.012;
  const lfo = ctx.createOscillator();
  lfo.type = "triangle";
  const depth = ctx.createGain();
  lfo.connect(depth).connect(delay.delayTime);
  lfo.start();
  const wet = ctx.createGain();
  input.connect(output);
  input.connect(delay).connect(wet).connect(output);
  /** 0 = off, 1 = slow and shallow, 2 = faster and deeper. */
  const setMode = (mode: number) => {
    const t = ctx.currentTime;
    wet.gain.setTargetAtTime(mode === 0 ? 0 : 0.7, t, 0.05);
    lfo.frequency.setTargetAtTime(mode === 2 ? 0.83 : 0.5, t, 0.05);
    depth.gain.setTargetAtTime(mode === 2 ? 0.004 : 0.0025, t, 0.05);
  };
  return { setMode };
}
