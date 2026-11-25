import { AWM_ENV, BEND_GLIDE_S, attackSteps, bendRates, releaseSteps, VoicePool, type Adsr, type EnvStep } from "@/lib/sim/sampler";
import { decodeCopy, planSetNote, type OpenedSet, type SetLayer } from "@/lib/sim/userset";
import type { SampleVoice } from "./samplePart";

type Live = { src: AudioBufferSourceNode; env: GainNode; startedAt: number; peak: number; adsr: Adsr; note: number; root: number };

function applySteps(param: AudioParam, steps: EnvStep[]) {
  for (const s of steps) {
    if (s.ramp === "set") param.setValueAtTime(s.value, s.at);
    else param.linearRampToValueAtTime(s.value, s.at);
  }
}

/**
 * A2b (docs/SIMULATOR.md): the store's sample voice playing a set the visitor recorded with /sampler
 * and opened in the browser (nothing uploaded). Same envelope, bend and 8-voice pool as SamplePart;
 * the note and velocity pick the recording (`planSetNote`), and a recording with a loop repeats its
 * loop while the key is held. Not used by any page until A2c.
 */
export class UserSetPart implements SampleVoice {
  private buffers = new Map<string, AudioBuffer>();
  private layers: SetLayer[] = [];
  private pool = new VoicePool();
  private live = new Map<number, Live>();
  private bendCents = 0;

  constructor(
    private ctx: BaseAudioContext,
    private dest: AudioNode,
    private env: Adsr = AWM_ENV,
  ) {}

  /** Decodes every WAV of the set once; throws a Thai message naming the first file that would not decode. */
  async load(set: OpenedSet) {
    const buffers = new Map<string, AudioBuffer>();
    for (const [file, bytes] of set.files) {
      try {
        buffers.set(file, await this.ctx.decodeAudioData(decodeCopy(bytes)));
      } catch {
        throw new Error(`เบราว์เซอร์เปิดไฟล์ "${file}" ไม่ได้`);
      }
    }
    this.allOff();
    this.buffers = buffers;
    this.layers = set.layers;
  }

  noteOn(note: number, velocity: number, release?: number, attack?: number) {
    const plan = planSetNote(note, velocity, this.layers, this.bendCents);
    if (!plan) return;
    const buffer = this.buffers.get(plan.file);
    if (!buffer) return;
    const now = this.ctx.currentTime;
    const { voice, cut } = this.pool.noteOn(note, now);
    for (const v of cut) this.cut(v.id, now);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = plan.rate;
    if (plan.loop) {
      src.loop = true;
      src.loopStart = plan.loop.start;
      src.loopEnd = plan.loop.end;
    }
    const env = this.ctx.createGain();
    const adsr: Adsr = { ...this.env, release: release ?? this.env.release, attack: attack ?? this.env.attack };
    applySteps(env.gain, attackSteps(now, plan.peak, adsr));
    src.connect(env).connect(this.dest);
    src.start(now);
    const id = voice.id;
    src.onended = () => {
      env.disconnect();
      src.disconnect();
      this.live.delete(id);
      this.pool.ended(id);
    };
    this.live.set(id, { src, env, startedAt: now, peak: plan.peak, adsr, note, root: plan.root });
  }

  /** The loop keeps playing through the release fade, so a looped note never ends with a jump. */
  noteOff(note: number) {
    const now = this.ctx.currentTime;
    for (const v of this.pool.noteOff(note)) {
      const l = this.live.get(v.id);
      if (!l) continue;
      const steps = releaseSteps(now, l.startedAt, l.peak, l.adsr);
      l.env.gain.cancelScheduledValues(now);
      applySteps(l.env.gain, steps);
      try {
        l.src.stop(steps[steps.length - 1].at);
      } catch {
        /* already stopped */
      }
    }
  }

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
