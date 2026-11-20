import {
  AWM_ENV,
  BEND_GLIDE_S,
  base64Body,
  bendRates,
  pickFormat,
  pickSample,
  playbackRate,
  recordedNotes,
  releaseSteps,
  smplrMatchedPeak,
  soundfontUrl,
  attackSteps,
  parseMidiJs,
  VoicePool,
  type Adsr,
  type EnvStep,
} from "@/lib/sim/sampler";

/** What the engine needs from a sample part; the store's voice and the smplr fallback both give it. */
export interface SampleVoice {
  noteOn(note: number, velocity: number, release?: number): void;
  noteOff(note: number): void;
  allOff(): void;
  /** Pitch bend in cents for held and new notes; the smplr fallback has none (held notes cannot bend there). */
  bend?(cents: number): void;
}

type Live = { src: AudioBufferSourceNode; env: GainNode; startedAt: number; peak: number; release: number; note: number; root: number };

function applySteps(param: AudioParam, steps: EnvStep[]) {
  for (const s of steps) {
    if (s.ramp === "set") param.setValueAtTime(s.value, s.at);
    else param.linearRampToValueAtTime(s.value, s.at);
  }
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function browserFormat(): "ogg" | "mp3" {
  if (typeof document === "undefined") return "mp3";
  const ua = navigator.userAgent;
  const safari = ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Chromium");
  const can = document.createElement("audio").canPlayType("audio/ogg");
  return pickFormat(can === "probably" || can === "maybe", safari);
}

/**
 * The store's own sample voice (docs/SIMULATOR.md S2b) for one AWM2 part: one AudioBufferSourceNode
 * and gain envelope per note, from the same FluidR3_GM file smplr loads, at the same level.
 * Logic (sample pick, rate, envelope, 8-voice pool) is src/lib/sim/sampler.ts.
 */
export class SamplePart implements SampleVoice {
  private buffers = new Map<number, AudioBuffer>();
  private roots: number[] = [];
  private pool = new VoicePool();
  private live = new Map<number, Live>();
  private env: Adsr;
  private bendCents = 0;

  constructor(
    private ctx: BaseAudioContext,
    private dest: AudioNode,
    env: Adsr = AWM_ENV,
  ) {
    this.env = env;
  }

  /** Fetches and decodes every recorded note; throws when none could be decoded. */
  async load(instrument: string, kit = "FluidR3_GM") {
    const res = await fetch(soundfontUrl(instrument, browserFormat(), kit));
    if (!res.ok) throw new Error(`sample file ${res.status}`);
    const file = parseMidiJs(await res.text());
    await Promise.allSettled(
      recordedNotes(file).map(async ({ midi, name }) => {
        const buf = await this.ctx.decodeAudioData(base64ToBuffer(base64Body(file[name])));
        this.buffers.set(midi, buf);
      }),
    );
    this.roots = [...this.buffers.keys()].sort((a, b) => a - b);
    if (!this.roots.length) throw new Error("no sample could be decoded");
  }

  get recorded(): readonly number[] {
    return this.roots;
  }

  noteOn(note: number, velocity: number, release?: number) {
    const pick = pickSample(note, this.roots);
    if (!pick) return;
    const buffer = this.buffers.get(pick.root);
    if (!buffer) return;
    const now = this.ctx.currentTime;
    const { voice, cut } = this.pool.noteOn(note, now);
    for (const v of cut) this.cut(v.id, now);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = playbackRate(note, pick.root, this.bendCents);
    const env = this.ctx.createGain();
    const peak = smplrMatchedPeak(velocity);
    applySteps(env.gain, attackSteps(now, peak, this.env));
    src.connect(env).connect(this.dest);
    src.start(now);
    const id = voice.id;
    src.onended = () => {
      env.disconnect();
      src.disconnect();
      this.live.delete(id);
      this.pool.ended(id);
    };
    this.live.set(id, { src, env, startedAt: now, peak, release: release ?? this.env.release, note, root: pick.root });
  }

  noteOff(note: number) {
    const now = this.ctx.currentTime;
    for (const v of this.pool.noteOff(note)) {
      const l = this.live.get(v.id);
      if (!l) continue;
      const steps = releaseSteps(now, l.startedAt, l.peak, { ...this.env, release: l.release });
      l.env.gain.cancelScheduledValues(now);
      applySteps(l.env.gain, steps);
      try {
        l.src.stop(steps[steps.length - 1].at);
      } catch {
        /* already stopped */
      }
    }
  }

  /** S8e: held notes follow the bend wheel on the recording they started on; new notes start bent. */
  bend(cents: number) {
    this.bendCents = cents;
    const now = this.ctx.currentTime;
    const held = [...this.live].map(([id, l]) => ({ id, note: l.note, root: l.root }));
    for (const { id, rate } of bendRates(held, cents)) {
      const param = this.live.get(id)?.src.playbackRate;
      if (!param) continue;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(rate, now, BEND_GLIDE_S);
    }
  }

  allOff() {
    const now = this.ctx.currentTime;
    for (const v of this.pool.clear()) this.cut(v.id, now);
  }

  /** Quick 10 ms fade for a voice taken by the pool or by allOff. */
  private cut(id: number, now: number) {
    const l = this.live.get(id);
    if (!l) return;
    l.env.gain.cancelScheduledValues(now);
    l.env.gain.setValueAtTime(l.env.gain.value, now);
    l.env.gain.linearRampToValueAtTime(0, now + 0.01);
    try {
      l.src.stop(now + 0.01);
    } catch {
      /* already stopped */
    }
  }
}
