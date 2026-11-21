/**
 * The simulator pages' output stage (MODX M and FANTOM-0 only; MODULAR, FM 6-OP and POLY keep theirs):
 * a hard-knee limiter, then a soft clipper as a last guard, so a 16-note chord at full velocity
 * cannot go over full scale (docs/SIMULATOR.md S7b). The store's own settings, not a keyboard's.
 */

/** DynamicsCompressorNode settings for the limiter. A knee of 0 keeps the static curve simple. */
export const SIM_LIMITER = { threshold: -6, knee: 0, ratio: 20, attack: 0.002, release: 0.25 } as const;

/** Soft clip: untouched up to `linear`, then bends smoothly to never pass `ceiling`. */
export const SIM_CLIP = { linear: 0.8, ceiling: 0.98, size: 2048 } as const;

const toDb = (x: number) => 20 * Math.log10(x);
const fromDb = (db: number) => 10 ** (db / 20);

/**
 * Steady-state output level (linear) of a DynamicsCompressorNode with knee 0, for a steady input
 * level (linear), as the Web Audio API specification describes it: the static curve, then the
 * automatic makeup gain of (1 / curve(1))^0.6. Attack overshoot is not included.
 */
export function limiterOut(input: number, s: { threshold: number; knee: number; ratio: number } = SIM_LIMITER): number {
  if (s.knee !== 0) throw new Error("limiterOut models knee 0 only");
  if (input <= 0) return 0;
  const curveDb = (db: number) => (db <= s.threshold ? db : s.threshold + (db - s.threshold) / s.ratio);
  const makeupDb = -0.6 * curveDb(0);
  return fromDb(curveDb(toDb(input)) + makeupDb);
}

/** The soft clip shape for one sample value (any sign). */
export function softClip(x: number, linear: number = SIM_CLIP.linear, ceiling: number = SIM_CLIP.ceiling): number {
  const a = Math.abs(x);
  if (a <= linear) return x;
  const room = ceiling - linear;
  return Math.sign(x) * (linear + room * Math.tanh((a - linear) / room));
}

/** The WaveShaperNode curve for `softClip` over −1 … +1 (the node holds the end values beyond that). */
export function softClipCurve(size: number = SIM_CLIP.size): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i++) curve[i] = softClip((i / (size - 1)) * 2 - 1);
  return curve;
}

/**
 * FANTOM-0 reverb send (docs/SIMULATOR.md S7d): a zone's send joins the shared reverb only once its
 * REVERB knob is above 0, then stays joined so a ringing tail is never cut. Chromium keeps a
 * convolver working while any input is joined, even a silent one (about 3% of real time measured
 * on the agent's machine), so Scenes whose REVERB knobs are all at 0 pay nothing for it.
 */
export function joinReverbSend(joined: boolean, level: number): boolean {
  return !joined && level > 0;
}
