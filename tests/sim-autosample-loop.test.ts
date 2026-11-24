import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildManifest,
  buildSfz,
  checkManifest,
  defaultLoopOptions,
  findLoop,
  loopScore,
  loopSeconds,
  risingZeroCrossings,
} from "../src/lib/sim/autosample.ts";
import { checkLoop } from "../src/lib/sim/sampler.ts";

const SR = 44100;

function sine(freq: number, seconds: number, amp = 0.5, decayPerSec = 0, phase = 0.3): Float32Array {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.exp(-decayPerSec * (i / SR)) * Math.sin(2 * Math.PI * freq * (i / SR) + phase);
  return out;
}

/** Seeded noise so the test is the same every run. */
function noise(seconds: number, seed = 1): Float32Array {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out[i] = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  }
  return out;
}

test("rising zero crossings: from below zero to zero or above only", () => {
  const x = Float32Array.from([1, -1, 0, 1, -0.5, 0.5, 0.2, -0.1]);
  assert.deepEqual(risingZeroCrossings(x), [2, 5]);
  assert.deepEqual(risingZeroCrossings(x, 3), [5]);
  assert.deepEqual(risingZeroCrossings(x, 0, 5), [2]);
});

test("loop score: 0 for identical surroundings, high for unrelated ones", () => {
  const x = sine(441, 0.5); // exactly 100 samples per cycle
  assert.ok(loopScore(x, 1000, 3000, 200) < 1e-6);
  const n = noise(0.5);
  assert.ok(loopScore(n, 1000, 3000, 200) > 0.5);
  assert.equal(loopScore(new Float32Array(5000), 1000, 3000, 200), 1);
});

test("steady tone: loop on rising zero crossings, near-perfect match, inside the region, end in its last quarter", () => {
  const ch = sine(440, 3);
  const opts = defaultLoopOptions(SR);
  const from = Math.round(0.5 * SR);
  const to = Math.round(2.5 * SR);
  const loop = findLoop([ch], from, to, opts);
  assert.ok(loop, "a loop is found");
  assert.ok(loop.start >= from && loop.end <= to);
  assert.ok(loop.end >= to - (to - from) / 4 - 1);
  assert.ok(loop.end - loop.start >= opts.minLength);
  assert.ok(ch[loop.start - 1] < 0 && ch[loop.start] >= 0);
  assert.ok(ch[loop.end - 1] < 0 && ch[loop.end] >= 0);
  assert.ok(loop.score < 0.01, `score ${loop.score}`);
  // the loop holds a whole number of cycles (within a sample)
  const cycles = ((loop.end - loop.start) * 440) / SR;
  assert.ok(Math.abs(cycles - Math.round(cycles)) * (SR / 440) <= 1.01, `cycles ${cycles}`);
});

test("slowly fading tone with an overtone still gets a good loop", () => {
  const a = sine(220, 3, 0.4, 0.2);
  const b = sine(660, 3, 0.15, 0.3, 1.1);
  const ch = a.map((v, i) => v + b[i]);
  const loop = findLoop([ch], Math.round(0.3 * SR), Math.round(2.8 * SR), defaultLoopOptions(SR));
  assert.ok(loop);
  assert.ok(loop.score <= 0.05);
});

test("stereo: one pair of points for both channels", () => {
  const l = sine(330, 2, 0.5);
  const r = sine(330, 2, 0.3, 0, 0.9);
  const loop = findLoop([l, r], Math.round(0.2 * SR), Math.round(1.8 * SR), defaultLoopOptions(SR));
  assert.ok(loop);
  assert.ok(loop.score < 0.01);
});

test("no loop for noise, silence, a region that is too short or no channels", () => {
  const opts = defaultLoopOptions(SR);
  assert.equal(findLoop([noise(2)], 1000, 80000, opts), null);
  assert.equal(findLoop([new Float32Array(SR * 2)], 1000, 80000, opts), null);
  assert.equal(findLoop([sine(440, 2)], 10000, 10000 + opts.minLength - 1, opts), null);
  assert.equal(findLoop([], 0, 1000, opts), null);
});

test("region beyond the recording is clipped, and the input is not changed", () => {
  const ch = sine(440, 1);
  const copy = ch.slice();
  const loop = findLoop([ch], -500, 10 * SR, defaultLoopOptions(SR));
  assert.ok(loop);
  assert.ok(loop.start > 0 && loop.end < ch.length);
  assert.deepEqual(ch, copy);
});

test("loop in seconds passes the store voice's loop check and goes into the manifest and .sfz", () => {
  const ch = sine(440, 3);
  const loop = findLoop([ch], Math.round(0.5 * SR), Math.round(2.5 * SR), defaultLoopOptions(SR))!;
  const secs = loopSeconds(loop, SR);
  assert.equal(checkLoop(secs.loopStart, secs.loopEnd, ch.length / SR), null);
  const m = buildManifest("Test", SR, 24, 1, [{ note: 60, velocity: 100, ...secs }]);
  assert.deepEqual(checkManifest(m), []);
  const sfz = buildSfz(m);
  assert.match(sfz, new RegExp(`loop_start=${loop.start} loop_end=${loop.end - 1}\\b`));
});
