import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attackSteps,
  checkLoop,
  heldLevel,
  MAX_STRETCH,
  MIN_STAGE_S,
  pickSample,
  playbackRate,
  bendRates,
  releasedLevel,
  releaseSteps,
  SAMPLE_MAX_VOICES,
  velocityCutoff,
  velocityGain,
  VoicePool,
} from "../src/lib/sim/sampler.ts";

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test("pickSample takes the exact note, else the nearest, lower on a tie", () => {
  const roots = [72, 48, 60];
  assert.deepEqual(pickSample(60, roots), { root: 60, offset: 0 });
  assert.deepEqual(pickSample(62, roots), { root: 60, offset: 2 });
  assert.deepEqual(pickSample(58, roots), { root: 60, offset: -2 });
  assert.deepEqual(pickSample(66, roots), { root: 60, offset: 6 }, "tie goes to the lower root");
  assert.deepEqual(pickSample(20, [36], 20), { root: 36, offset: -16 });
});

test("pickSample leaves a note silent when nothing is near enough", () => {
  assert.equal(pickSample(60, []), null);
  assert.equal(pickSample(60 + MAX_STRETCH + 1, [60]), null);
  assert.deepEqual(pickSample(60 + MAX_STRETCH, [60]), { root: 60, offset: MAX_STRETCH });
});

test("playbackRate: octave doubles, bend in cents adds on", () => {
  near(playbackRate(60, 60), 1);
  near(playbackRate(72, 60), 2);
  near(playbackRate(48, 60), 0.5);
  near(playbackRate(60, 60, 200), playbackRate(62, 60));
  near(playbackRate(64, 60, -400), 1);
});

test("held envelope rises, decays to sustain and stays", () => {
  const env = { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.4 };
  assert.equal(heldLevel(0, env), 0);
  near(heldLevel(0.05, env), 0.5);
  near(heldLevel(0.1, env), 1);
  near(heldLevel(0.2, env), 0.75);
  near(heldLevel(0.3, env), 0.5);
  near(heldLevel(5, env), 0.5);
});

test("zero or bad stage times never jump straight to full level", () => {
  const env = { attack: 0, decay: Number.NaN, sustain: 2, release: -1 };
  near(heldLevel(MIN_STAGE_S / 2, env), 0.5);
  near(heldLevel(1, env), 1, 1e-9);
  near(releasedLevel(MIN_STAGE_S / 2, 1, env), 0.5);
  assert.equal(releasedLevel(1, 1, env), 0);
});

test("release starts from the level the note had and ends at 0", () => {
  const env = { attack: 0.5, decay: 0.1, sustain: 0.8, release: 1 };
  near(releasedLevel(0, 0.3, env), 0.3);
  near(releasedLevel(0.5, 0.3, env), 0.15);
  assert.equal(releasedLevel(1, 0.3, env), 0);
  const steps = releaseSteps(2.25, 2, 0.8, env); // let go half-way through the attack
  assert.deepEqual(steps[0], { at: 2.25, value: 0.8 * 0.5, ramp: "set" });
  assert.deepEqual(steps[1], { at: 3.25, value: 0, ramp: "linear" });
});

test("attack steps go 0 → peak → peak × sustain in time order", () => {
  const steps = attackSteps(1, 0.6, { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.2 });
  assert.equal(steps.length, 3);
  assert.deepEqual(steps[0], { at: 1, value: 0, ramp: "set" });
  near(steps[1].at, 1.02);
  near(steps[1].value, 0.6);
  near(steps[2].at, 1.32);
  near(steps[2].value, 0.3);
});

test("velocity gain rises from near 0 to 1 and clamps", () => {
  assert.equal(velocityGain(127), 1);
  assert.equal(velocityGain(200), 1);
  assert.ok(velocityGain(1) > 0 && velocityGain(1) < 0.01);
  assert.equal(velocityGain(0), velocityGain(1));
  let prev = 0;
  for (let v = 1; v <= 127; v++) {
    assert.ok(velocityGain(v) > prev);
    prev = velocityGain(v);
  }
});

test("velocity cutoff opens with velocity and stays in range", () => {
  near(velocityCutoff(1000, 64, 2), 1000);
  near(velocityCutoff(1000, 127, 2), 4000);
  near(velocityCutoff(1000, 1, 2), 250);
  near(velocityCutoff(1000, 127, 0), 1000);
  assert.equal(velocityCutoff(15000, 127, 3), 20000);
  assert.equal(velocityCutoff(50, 1, 3), 40);
});

test("checkLoop accepts loops inside the recording only", () => {
  assert.equal(checkLoop(0.5, 1.5, 2), null);
  assert.equal(checkLoop(-0.1, 1, 2), "outside the recording");
  assert.equal(checkLoop(0.5, 2.1, 2), "outside the recording");
  assert.equal(checkLoop(1, 1.001, 2), "loop too short");
  assert.equal(checkLoop(1.5, 0.5, 2), "loop too short");
  assert.equal(checkLoop(Number.NaN, 1, 2), "not a number");
});

test("voice pool: repeated note replaces itself, never holds more than max", () => {
  const pool = new VoicePool(3);
  const a = pool.noteOn(60, 0);
  assert.deepEqual(a.cut, []);
  const again = pool.noteOn(60, 0.1);
  assert.deepEqual(again.cut.map((v) => v.id), [a.voice.id]);
  pool.noteOn(62, 0.2);
  pool.noteOn(64, 0.3);
  assert.equal(pool.active.length, 3);
  const full = pool.noteOn(65, 0.4);
  assert.deepEqual(full.cut.map((v) => v.note), [60], "oldest held voice goes when none is released");
  assert.equal(pool.active.length, 3);
});

test("voice pool takes released voices first, then forgets ended ones", () => {
  const pool = new VoicePool(2);
  pool.noteOn(60, 0);
  const b = pool.noteOn(62, 1);
  assert.equal(pool.noteOff(62).length, 1);
  assert.equal(pool.noteOff(62).length, 0, "already released");
  const c = pool.noteOn(64, 2);
  assert.deepEqual(c.cut.map((v) => v.id), [b.voice.id]);
  pool.ended(c.voice.id);
  assert.deepEqual(pool.active.map((v) => v.note), [60]);
  assert.equal(pool.clear().length, 1);
  assert.equal(pool.active.length, 0);
});

test("default pool size is the phone limit and a bad size is refused", () => {
  assert.equal(new VoicePool().max, SAMPLE_MAX_VOICES);
  assert.throws(() => new VoicePool(0));
  const pool = new VoicePool();
  for (let i = 0; i < 40; i++) pool.noteOn(40 + i, i);
  assert.equal(pool.active.length, SAMPLE_MAX_VOICES);
});

test("bendRates: held sample notes bend on their own recording and come back at 0", () => {
  const held = [
    { id: 1, note: 60, root: 60 },
    { id: 2, note: 65, root: 64 },
  ];
  const up = bendRates(held, 200);
  assert.deepEqual(up.map((r) => r.id), [1, 2]);
  near(up[0].rate, playbackRate(62, 60));
  near(up[1].rate, playbackRate(67, 64));
  const down = bendRates(held, -200);
  near(down[0].rate, playbackRate(58, 60));
  const back = bendRates(held, 0);
  near(back[0].rate, 1);
  near(back[1].rate, playbackRate(65, 64));
  assert.deepEqual(bendRates([], 200), []);
});
