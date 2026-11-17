/**
 * FM-X-style part for the MODX M simulator: an 8-operator FM voice, kept apart from audio so it
 * can be tested (SIMULATOR.md S3).
 *
 * Yamaha's MODX M has an FM-X engine with 8 operators and 88 algorithms (sources in
 * docs/SIMULATOR.md). Yamaha's algorithm charts are not copied here: the algorithms below are
 * the store's own small set, named by shape, not by Yamaha's numbers. Operators are numbered
 * 1–8 on the page and 0–7 in code. Phase modulation with sine operators, as in any textbook FM
 * synth; one operator per algorithm may feed back on itself.
 */

export const OP_COUNT = 8;

export interface Algorithm {
  name: string;
  /** mods[i] = operators that modulate operator i. A modulator always has a higher index than its target. */
  mods: number[][];
  /** Operators heard at the output. */
  carriers: number[];
  /** Operator that feeds back on itself (-1 = none). */
  feedbackOp: number;
}

const chain = (from: number, to: number) => {
  const mods: number[][] = Array.from({ length: OP_COUNT }, () => []);
  for (let i = from; i < to; i++) mods[i].push(i + 1);
  return mods;
};

/** The store's own algorithms (not Yamaha's FM-X charts). */
export const ALGORITHMS: readonly Algorithm[] = [
  {
    name: "2 STACKS",
    mods: (() => {
      const m = chain(0, 3);
      for (let i = 4; i < 7; i++) m[i].push(i + 1);
      return m;
    })(),
    carriers: [0, 4],
    feedbackOp: 7,
  },
  {
    name: "4 PAIRS",
    mods: [[1], [], [3], [], [5], [], [7], []],
    carriers: [0, 2, 4, 6],
    feedbackOp: 7,
  },
  { name: "1 STACK", mods: chain(0, 7), carriers: [0], feedbackOp: 7 },
  { name: "3 TO 1 + PAIRS", mods: [[1, 2, 3], [], [], [], [5], [], [7], []], carriers: [0, 4, 6], feedbackOp: 3 },
  { name: "ORGAN", mods: [[], [], [], [], [], [], [], []], carriers: [0, 1, 2, 3, 4, 5, 6, 7], feedbackOp: 7 },
  { name: "BELL", mods: [[1], [2], [], [4], [5], [], [7], []], carriers: [0, 3, 6], feedbackOp: 2 },
];

/** Problems with an algorithm (empty = fine). Rejects loops, unknown operators and missing carriers. */
export function checkAlgorithm(a: Algorithm): string[] {
  const errors: string[] = [];
  if (a.mods.length !== OP_COUNT) errors.push(`needs ${OP_COUNT} operator lists`);
  a.mods.forEach((list, i) => {
    for (const m of list) {
      if (!Number.isInteger(m) || m < 0 || m >= OP_COUNT) errors.push(`operator ${i + 1}: unknown modulator ${m}`);
      else if (m <= i) errors.push(`operator ${i + 1}: modulator ${m + 1} must come after it (no loops)`);
    }
  });
  if (a.carriers.length === 0) errors.push("no carrier");
  for (const c of a.carriers) if (!Number.isInteger(c) || c < 0 || c >= OP_COUNT) errors.push(`unknown carrier ${c}`);
  if (a.feedbackOp < -1 || a.feedbackOp >= OP_COUNT) errors.push(`unknown feedback operator ${a.feedbackOp}`);
  return errors;
}

/** Order to compute operators in: every modulator before the operators it modulates (8 down to 1). */
export const renderOrder = (): number[] => Array.from({ length: OP_COUNT }, (_, i) => OP_COUNT - 1 - i);

/** Operators that reach the output, directly or through other operators. The others are silent and can be skipped. */
export function usedOperators(a: Algorithm): boolean[] {
  const used = Array.from({ length: OP_COUNT }, () => false);
  const visit = (op: number) => {
    if (used[op]) return;
    used[op] = true;
    for (const m of a.mods[op] ?? []) visit(m);
  };
  for (const c of a.carriers) visit(c);
  return used;
}

export interface Operator {
  /** Frequency = note frequency × ratio. */
  ratio: number;
  /** Output level 0..1 (for a modulator: how much it bends its target). */
  level: number;
  /** Envelope times in seconds, sustain 0..1. */
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface FmPatch {
  algorithm: number;
  ops: Operator[];
  /** Self-feedback amount 0..1 on the algorithm's feedback operator. */
  feedback: number;
}

/** Modulation index at full modulator level (radians). The store's own choice. */
export const MOD_INDEX = 4;
const TWO_PI = Math.PI * 2;

export interface FmVoice {
  freq: number;
  velocity: number;
  gate: boolean;
  phase: Float64Array;
  env: Float64Array;
  stage: Uint8Array; // 0 attack, 1 decay, 2 sustain, 3 release, 4 done
  out: Float64Array;
  fb: [number, number];
}

export function newVoice(freq: number, velocity = 1): FmVoice {
  return {
    freq,
    velocity: Math.min(1, Math.max(0, velocity)),
    gate: true,
    phase: new Float64Array(OP_COUNT),
    env: new Float64Array(OP_COUNT),
    stage: new Uint8Array(OP_COUNT),
    out: new Float64Array(OP_COUNT),
    fb: [0, 0],
  };
}

export function releaseVoice(v: FmVoice) {
  v.gate = false;
  for (let i = 0; i < OP_COUNT; i++) if (v.stage[i] < 3) v.stage[i] = 3;
}

/** True when every operator that is heard has finished its release. */
export function voiceDone(v: FmVoice, a: Algorithm): boolean {
  return a.carriers.every((c) => v.stage[c] === 4);
}

/** One envelope step (linear segments, the store's own simple shape). */
function stepEnv(v: FmVoice, i: number, op: Operator, dt: number) {
  switch (v.stage[i]) {
    case 0:
      v.env[i] += op.attack > 0 ? dt / op.attack : 1;
      if (v.env[i] >= 1) {
        v.env[i] = 1;
        v.stage[i] = 1;
      }
      break;
    case 1:
      v.env[i] -= op.decay > 0 ? ((1 - op.sustain) * dt) / op.decay : 1;
      if (v.env[i] <= op.sustain) {
        v.env[i] = op.sustain;
        v.stage[i] = 2;
      }
      break;
    case 3:
      v.env[i] -= op.release > 0 ? dt / op.release : 1;
      if (v.env[i] <= 0) {
        v.env[i] = 0;
        v.stage[i] = 4;
      }
      break;
  }
}

/**
 * Adds `out.length` samples of one voice to `out`. The mix of carriers is divided by the
 * carrier count so a full chord of carriers stays within -1..1. `bendRatio` scales the pitch.
 */
export function renderVoice(v: FmVoice, patch: FmPatch, out: Float32Array, sampleRate: number, bendRatio = 1) {
  const alg = ALGORITHMS[patch.algorithm] ?? ALGORITHMS[0];
  const used = usedOperators(alg);
  const order = renderOrder();
  const dt = 1 / sampleRate;
  const carrierGain = v.velocity / alg.carriers.length;
  const fbAmount = Math.min(1, Math.max(0, patch.feedback)) * Math.PI;
  for (let n = 0; n < out.length; n++) {
    for (const i of order) {
      if (!used[i]) continue;
      const op = patch.ops[i];
      let mod = 0;
      for (const m of alg.mods[i]) mod += v.out[m];
      if (i === alg.feedbackOp) mod += fbAmount * (v.fb[0] + v.fb[1]) * 0.5;
      const amp = op.level * v.env[i];
      const y = Math.sin(TWO_PI * v.phase[i] + MOD_INDEX * mod) * amp;
      if (i === alg.feedbackOp) v.fb = [v.fb[1], amp > 0 ? y / amp : 0];
      v.out[i] = y;
      v.phase[i] += v.freq * bendRatio * op.ratio * dt;
      if (v.phase[i] >= 1) v.phase[i] -= Math.floor(v.phase[i]);
      stepEnv(v, i, op, dt);
    }
    let s = 0;
    for (const c of alg.carriers) s += v.out[c];
    out[n] += s * carrierGain;
  }
}
