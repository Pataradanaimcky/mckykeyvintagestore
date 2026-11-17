import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALGORITHMS,
  checkAlgorithm,
  newVoice,
  OP_COUNT,
  releaseVoice,
  renderOrder,
  renderVoice,
  usedOperators,
  voiceDone,
  type Algorithm,
  type FmPatch,
  type Operator,
} from "../src/lib/sim/fmx.ts";

const SR = 48000;
const op = (o: Partial<Operator> = {}): Operator => ({ ratio: 1, level: 0, attack: 0, decay: 0, sustain: 1, release: 0.01, ...o });
const patch = (algorithm: number, ops: Partial<Operator>[] = [], feedback = 0): FmPatch => ({
  algorithm,
  ops: Array.from({ length: OP_COUNT }, (_, i) => op(ops[i])),
  feedback,
});

/** Energy at `freq` (one DFT bin). */
const energy = (x: Float32Array, freq: number) => {
  let re = 0;
  let im = 0;
  for (let n = 0; n < x.length; n++) {
    re += x[n] * Math.cos((2 * Math.PI * freq * n) / SR);
    im += x[n] * Math.sin((2 * Math.PI * freq * n) / SR);
  }
  return Math.hypot(re, im) / x.length;
};

test("every store algorithm is valid: no loops, known operators, at least one carrier", () => {
  assert.ok(ALGORITHMS.length >= 4);
  for (const a of ALGORITHMS) assert.deepEqual(checkAlgorithm(a), [], a.name);
  assert.equal(new Set(ALGORITHMS.map((a) => a.name)).size, ALGORITHMS.length);
});

test("checkAlgorithm rejects loops, unknown operators and no carriers", () => {
  const empty = (): number[][] => Array.from({ length: OP_COUNT }, () => []);
  const loop: Algorithm = { name: "x", mods: empty(), carriers: [0], feedbackOp: -1 };
  loop.mods[2] = [1];
  assert.ok(checkAlgorithm(loop).some((e) => e.includes("no loops")));
  const unknown: Algorithm = { name: "x", mods: empty(), carriers: [0], feedbackOp: -1 };
  unknown.mods[0] = [9];
  assert.ok(checkAlgorithm(unknown).some((e) => e.includes("unknown modulator")));
  assert.ok(checkAlgorithm({ name: "x", mods: empty(), carriers: [], feedbackOp: -1 }).includes("no carrier"));
  assert.ok(checkAlgorithm({ name: "x", mods: [], carriers: [0], feedbackOp: -1 }).length > 0);
});

test("render order computes every modulator before its target", () => {
  const order = renderOrder();
  const pos = (i: number) => order.indexOf(i);
  for (const a of ALGORITHMS) a.mods.forEach((list, i) => list.forEach((m) => assert.ok(pos(m) < pos(i), `${a.name}: ${m + 1} before ${i + 1}`)));
});

test("routing: the stacks algorithm hears operators 1 and 5, and all 8 operators are used", () => {
  const stacks = ALGORITHMS.find((a) => a.name === "2 STACKS")!;
  assert.deepEqual(stacks.carriers, [0, 4]);
  assert.deepEqual(stacks.mods[0], [1]);
  assert.deepEqual(stacks.mods[3], []);
  assert.ok(usedOperators(stacks).every(Boolean));
  const lone: Algorithm = { name: "x", mods: Array.from({ length: OP_COUNT }, () => []), carriers: [0], feedbackOp: -1 };
  assert.deepEqual(usedOperators(lone), [true, false, false, false, false, false, false, false]);
});

test("a lone carrier plays a sine at the note frequency", () => {
  const organ = ALGORITHMS.findIndex((a) => a.name === "ORGAN");
  const v = newVoice(440);
  const out = new Float32Array(480);
  renderVoice(v, patch(organ, [{ level: 1 }]), out, SR);
  for (let n = 1; n < out.length; n++) assert.ok(Math.abs(out[n] - Math.sin((2 * Math.PI * 440 * n) / SR) / 8) < 1e-6, `sample ${n}`);
});

test("a modulator adds overtones, and more level adds more", () => {
  const stack = ALGORITHMS.findIndex((a) => a.name === "1 STACK");
  const render = (modLevel: number) => {
    const out = new Float32Array(SR / 10);
    renderVoice(newVoice(200), patch(stack, [{ level: 1 }, { level: modLevel }]), out, SR);
    return out;
  };
  const clean = render(0);
  const some = render(0.2);
  const lots = render(0.6);
  assert.ok(energy(clean, 400) < 1e-3);
  assert.ok(energy(some, 400) > energy(clean, 400) + 0.01);
  assert.ok(energy(lots, 600) > energy(some, 600));
});

test("feedback on the feedback operator changes the sound; output stays within -1..1", () => {
  const organ = ALGORITHMS.findIndex((a) => a.name === "ORGAN");
  const ops = Array.from({ length: OP_COUNT }, () => ({ level: 1 }));
  const plain = new Float32Array(4800);
  const fed = new Float32Array(4800);
  renderVoice(newVoice(300), patch(organ, ops, 0), plain, SR);
  renderVoice(newVoice(300), patch(organ, ops, 1), fed, SR);
  assert.ok(plain.some((x, i) => Math.abs(x - fed[i]) > 0.01));
  for (const x of fed) assert.ok(Math.abs(x) <= 1);
});

test("velocity scales the output and pitch bend scales the frequency", () => {
  const organ = ALGORITHMS.findIndex((a) => a.name === "ORGAN");
  const p = patch(organ, [{ level: 1 }]);
  const loud = new Float32Array(480);
  const soft = new Float32Array(480);
  renderVoice(newVoice(440, 1), p, loud, SR);
  renderVoice(newVoice(440, 0.5), p, soft, SR);
  assert.ok(Math.abs(soft[50] - loud[50] / 2) < 1e-6);
  const bent = new Float32Array(SR / 10);
  renderVoice(newVoice(440), p, bent, SR, 2);
  assert.ok(energy(bent, 880) > 10 * energy(bent, 440));
});

test("a released voice fades to silence and reports done", () => {
  const organ = ALGORITHMS.findIndex((a) => a.name === "ORGAN");
  const p = patch(organ, [{ level: 1, release: 0.05 }]);
  const v = newVoice(440);
  renderVoice(v, p, new Float32Array(480), SR);
  assert.equal(voiceDone(v, ALGORITHMS[organ]), false);
  releaseVoice(v);
  renderVoice(v, p, new Float32Array(SR / 10), SR);
  assert.equal(voiceDone(v, ALGORITHMS[organ]), true);
  const after = new Float32Array(100);
  renderVoice(v, p, after, SR);
  assert.ok(after.every((x) => x === 0));
});
