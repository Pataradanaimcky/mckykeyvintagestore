import type { Soundfont } from "smplr";
import { createChorus, PolyVoices } from "../poly/voices";
import type { AnSettings, Performance } from "@/lib/sim/modx";

interface PartChannel {
  gain: GainNode;
  pan?: StereoPannerNode;
  an?: { voices: PolyVoices; settings: AnSettings };
  awm?: Promise<Soundfont>;
}

/**
 * Audio for the MODX M-style page: one channel per part (AN-X parts use the POLY page's
 * analog-style voices, AWM2 parts play FluidR3_GM samples through smplr), a shared chorus
 * and a limiter. Built for the Performance in use; `load` swaps it.
 */
export class SimEngine {
  readonly ctx: AudioContext;
  readonly analyser: AnalyserNode;
  private bus: GainNode;
  private parts: PartChannel[] = [];
  private bendCents = 0;
  private sounding = new Map<number, { part: number; note: number }[]>();

  constructor() {
    this.ctx = new AudioContext({ latencyHint: "interactive" });
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 0.55;
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.ratio.value = 6;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    const chorus = createChorus(this.ctx, this.bus, limiter);
    chorus.setMode(1);
    limiter.connect(this.analyser).connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  /**
   * Sets up one channel per part. Sample parts start loading now; returns when all have loaded (or failed).
   * `pans` (0..1 per part) adds a pan control to each channel; without it the channels are as before.
   */
  async load(perf: Performance, pans?: readonly number[]): Promise<boolean> {
    this.allOff();
    for (const p of this.parts) setTimeout(() => p.gain.disconnect(), 1500);
    this.parts = perf.parts.map((part, i) => {
      const gain = this.ctx.createGain();
      gain.gain.value = part.level;
      const ch: PartChannel = { gain };
      if (pans) {
        ch.pan = this.ctx.createStereoPanner();
        ch.pan.pan.value = (pans[i] ?? 0.5) * 2 - 1;
        gain.connect(ch.pan).connect(this.bus);
      } else gain.connect(this.bus);
      if (part.engine === "AN-X" && part.an) {
        ch.an = { voices: new PolyVoices(this.ctx, gain, 6), settings: { ...part.an } };
        if (this.bendCents) ch.an.voices.setBend(this.bendCents);
      } else if (part.gm) {
        ch.awm = import("smplr").then(async ({ Soundfont }) => {
          const inst = new Soundfont(this.ctx, { instrument: part.gm!, kit: "FluidR3_GM", destination: gain, loadLoopData: false, extraGain: 1, volume: 90 });
          await inst.load;
          return inst;
        });
      }
      return ch;
    });
    const results = await Promise.allSettled(this.parts.map((p) => p.awm ?? Promise.resolve(null)));
    return results.every((r) => r.status === "fulfilled");
  }

  setLevel(part: number, level: number) {
    this.parts[part]?.gain.gain.setTargetAtTime(level * 0.9, this.ctx.currentTime, 0.02);
  }

  /** Pan 0..1 (0.5 = centre); only for channels loaded with `pans`. */
  setPan(part: number, pan: number) {
    this.parts[part]?.pan?.pan.setTargetAtTime(Math.min(1, Math.max(-1, pan * 2 - 1)), this.ctx.currentTime, 0.02);
  }

  setCutoff(part: number, cutoff: number) {
    const an = this.parts[part]?.an;
    if (!an) return;
    an.settings = { ...an.settings, cutoff };
    an.voices.update(an.settings);
  }

  /**
   * Pitch bend in cents. Heard on the AN-X / VA parts, held notes included. Sample (AWM2 / PCM)
   * parts do not bend yet: smplr 1.1.0 has no way to change the pitch of a note already playing.
   */
  bend(cents: number) {
    this.bendCents = cents;
    for (const ch of this.parts) ch.an?.voices.setBend(cents);
  }

  /** `targets` are [part, note after transpose] pairs from the routing rules. */
  noteOn(key: number, targets: [number, number][], velocity = 0.8) {
    this.resume();
    this.noteOff(key);
    for (const [part, note] of targets) {
      const ch = this.parts[part];
      if (!ch) continue;
      if (ch.an) ch.an.voices.noteOn(note, ch.an.settings, velocity);
      else void ch.awm?.then((inst) => inst.start({ note, velocity: Math.round(30 + velocity * 97) })).catch(() => {});
    }
    this.sounding.set(key, targets.map(([part, note]) => ({ part, note })));
  }

  noteOff(key: number) {
    for (const { part, note } of this.sounding.get(key) ?? []) {
      const ch = this.parts[part];
      if (ch?.an) ch.an.voices.noteOff(note, ch.an.settings);
      else void ch?.awm?.then((inst) => inst.stop(note)).catch(() => {});
    }
    this.sounding.delete(key);
  }

  allOff() {
    for (const key of [...this.sounding.keys()]) this.noteOff(key);
    for (const ch of this.parts) {
      if (ch.an) ch.an.voices.allOff(ch.an.settings);
      else void ch.awm?.then((inst) => inst.stop()).catch(() => {});
    }
  }

  close() {
    void this.ctx.close();
  }
}
