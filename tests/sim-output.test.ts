import { test } from "node:test";
import assert from "node:assert/strict";
import { limiterOut, SIM_CLIP, SIM_LIMITER, softClip, softClipCurve } from "../src/lib/sim/output.ts";

test("soft clip leaves normal levels untouched and never passes the ceiling", () => {
  for (const x of [0, 0.1, -0.4, 0.8, -0.8]) assert.equal(softClip(x), x);
  let prev = -Infinity;
  for (let x = -4; x <= 4; x += 0.01) {
    const y = softClip(x);
    assert.ok(Math.abs(y) < SIM_CLIP.ceiling, `x=${x} gave ${y}`);
    assert.ok(y >= prev, "rises with the input");
    prev = y;
  }
  assert.ok(Math.abs(softClip(0.81) - 0.81) < 0.001, "no step where the bend starts");
});

test("soft clip curve spans -1 … +1, odd, and inside the ceiling", () => {
  const c = softClipCurve();
  assert.equal(c.length, SIM_CLIP.size);
  assert.ok(Math.abs(c[0] + c[c.length - 1]) < 1e-6);
  assert.ok(Math.abs(c[c.length - 1]) < SIM_CLIP.ceiling);
  assert.ok(Math.abs(c[Math.floor(c.length / 2)]) < 0.001);
});

test("limiter's steady output stays under full scale for inputs up to +12 dB", () => {
  for (let db = -40; db <= 12; db += 1) {
    const y = limiterOut(10 ** (db / 20));
    assert.ok(y < 0.85, `${db} dB in gave ${y.toFixed(3)}`);
  }
  // Below the threshold the node only adds its makeup gain (0.6 × 5.7 dB here).
  assert.ok(Math.abs(limiterOut(0.1) / 0.1 - 10 ** ((0.6 * 5.7) / 20)) < 1e-9);
  assert.throws(() => limiterOut(1, { ...SIM_LIMITER, knee: 30 }));
});
