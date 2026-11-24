import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyGain,
  buildManifest,
  buildSfz,
  checkManifest,
  checkSettings,
  DEFAULT_SETTINGS,
  encodeWav,
  fadeOut,
  findOnset,
  isClipping,
  keyRanges,
  MAX_TAKES,
  peakOf,
  planNotes,
  progressLabel,
  runSeconds,
  sampleFileName,
  setGain,
  soundEnd,
  TARGET_PEAK,
  trimTake,
  velocityRanges,
  yamahaNoteName,
} from "../src/lib/sim/autosample.ts";
import { pickRecording } from "../src/lib/sim/sampler.ts";

test("default settings are valid: C1–C6 every 3 semitones, one layer at 100", () => {
  assert.deepEqual(checkSettings(DEFAULT_SETTINGS), []);
  const plan = planNotes(DEFAULT_SETTINGS);
  assert.equal(plan.length, 21);
  assert.deepEqual(plan[0], { note: 36, velocity: 100 });
  assert.deepEqual(plan[20], { note: 96, velocity: 100 });
  assert.equal(yamahaNoteName(36), "C1");
  assert.equal(yamahaNoteName(96), "C6");
  assert.equal(yamahaNoteName(60), "C3");
  assert.equal(runSeconds(DEFAULT_SETTINGS), 21 * 5.5);
  assert.equal(progressLabel(7, 21), "โน้ต 7/21");
});

test("plan always ends on the highest note and repeats each note per velocity layer", () => {
  const plan = planNotes({ low: 60, high: 65, step: 4, velocities: [40, 100] });
  assert.deepEqual(plan.map((t) => `${t.note}/${t.velocity}`), ["60/40", "60/100", "64/40", "64/100", "65/40", "65/100"]);
  assert.deepEqual(planNotes({ low: 60, high: 60, step: 3, velocities: [100] }), [{ note: 60, velocity: 100 }]);
});

test("bad settings are refused", () => {
  const s = DEFAULT_SETTINGS;
  assert.ok(checkSettings({ ...s, low: 97 }).length > 0);
  assert.ok(checkSettings({ ...s, high: 128 }).length > 0);
  assert.ok(checkSettings({ ...s, step: 0 }).length > 0);
  assert.ok(checkSettings({ ...s, velocities: [100, 60] }).length > 0);
  assert.ok(checkSettings({ ...s, velocities: [] }).length > 0);
  assert.ok(checkSettings({ ...s, velocities: [0] }).length > 0);
  assert.ok(checkSettings({ ...s, hold: 0 }).length > 0);
  assert.ok(checkSettings({ ...s, low: 0, high: 127, step: 1, velocities: [30, 60, 90, 127] }).some((e) => e.includes(String(MAX_TAKES))));
});

test("onset, end of sound, trim and peak", () => {
  const l = new Float32Array(100);
  const r = new Float32Array(100);
  r[30] = 0.5; l[40] = -0.8; r[70] = 0.01;
  assert.equal(findOnset([l, r]), 30);
  assert.equal(findOnset([new Float32Array(10)]), null);
  assert.equal(soundEnd([l, r]), 71);
  assert.equal(peakOf([l, r]), Math.fround(0.8));
  const [tl, tr] = trimTake([l, r], 30, 5, 20);
  assert.equal(tl.length, 20);
  assert.equal(tr[5], r[30]);
  assert.equal(l[40], Math.fround(-0.8), "input untouched");
  assert.equal(trimTake([l], 2, 10, 500)[0].length, 100, "preroll and length stay inside the take");
  assert.ok(isClipping(1) && !isClipping(0.5));
});

test("one gain for the set keeps notes' relative level and puts the loudest at −1 dBFS", () => {
  const g = setGain([0.2, 0.5, 0.1]);
  assert.ok(Math.abs(0.5 * g - TARGET_PEAK) < 1e-9);
  const a = new Float32Array([0.2]);
  const b = new Float32Array([0.5]);
  applyGain([a], g); applyGain([b], g);
  assert.ok(Math.abs(b[0] / a[0] - 2.5) < 1e-5);
  assert.equal(setGain([0, 0]), 1);
  assert.equal(setGain([1e-9]), 1000);
});

test("fade-out ends at silence and leaves the start alone", () => {
  const ch = new Float32Array(10).fill(1);
  fadeOut([ch], 4);
  assert.deepEqual([...ch], [1, 1, 1, 1, 1, 1, 0.75, 0.5, 0.25, 0]);
});

test("WAV header and data, 16 and 24 bit", () => {
  const l = new Float32Array([0, 1, -1]);
  const r = new Float32Array([0.5, 0, 2]);
  const w16 = encodeWav([l, r], 48000, 16);
  const v = new DataView(w16.buffer);
  assert.equal(String.fromCharCode(...w16.slice(0, 4)), "RIFF");
  assert.equal(String.fromCharCode(...w16.slice(8, 12)), "WAVE");
  assert.equal(v.getUint16(22, true), 2);
  assert.equal(v.getUint32(24, true), 48000);
  assert.equal(v.getUint16(34, true), 16);
  assert.equal(v.getUint32(40, true), 12);
  assert.equal(w16.length, 44 + 12);
  assert.equal(v.getInt16(44 + 2, true), 16384, "R frame 0 = 0.5");
  assert.equal(v.getInt16(44 + 4, true), 32767);
  assert.equal(v.getInt16(44 + 8, true), -32767);
  assert.equal(v.getInt16(44 + 10, true), 32767, "clamped above 1");
  const w24 = encodeWav([l], 44100, 24);
  assert.equal(w24.length, 44 + 9);
  const b = w24.slice(44 + 6, 44 + 9);
  assert.deepEqual([...b], [0x01, 0x00, 0x80], "−1 → −8388607");
});

test("key ranges match the store's sample voice for every note", () => {
  for (const roots of [[36, 39, 42, 96], [60], [40, 50, 51, 90], [0, 127]]) {
    const kr = keyRanges(roots);
    assert.equal(kr[0].lo, 0);
    assert.equal(kr[kr.length - 1].hi, 127);
    for (let n = 0; n <= 127; n++) {
      const owner = kr.find((k) => n >= k.lo && n <= k.hi);
      assert.equal(owner?.root, pickRecording(n, roots)?.root, `note ${n} roots ${roots}`);
    }
  }
});

test("velocity ranges cover 1–127 without gaps", () => {
  assert.deepEqual(velocityRanges([100]), [{ velocity: 100, lo: 1, hi: 127 }]);
  assert.deepEqual(velocityRanges([40, 80, 120]), [
    { velocity: 40, lo: 1, hi: 40 },
    { velocity: 80, lo: 41, hi: 80 },
    { velocity: 120, lo: 81, hi: 127 },
  ]);
});

test("manifest and .sfz from a run", () => {
  assert.equal(sampleFileName(61, 100), "061_Cs3_v100.wav");
  const m = buildManifest("  MODX M piano  ", 48000, 24, 2, [
    { note: 63, velocity: 100 },
    { note: 60, velocity: 100, loopStart: 1, loopEnd: 1.5 },
  ]);
  assert.equal(m.name, "MODX M piano");
  assert.deepEqual(m.samples.map((s) => s.root), [60, 63]);
  assert.deepEqual(checkManifest(m), []);
  assert.deepEqual(checkManifest(JSON.parse(JSON.stringify(m))), [], "survives JSON");
  assert.ok(checkManifest({ ...m, kind: "x" }).length > 0);
  assert.ok(checkManifest({ ...m, samples: [{ ...m.samples[0], file: "../x.wav" }] }).length > 0);
  assert.ok(checkManifest({ ...m, samples: [{ ...m.samples[0], loopEnd: undefined }] }).length > 0);
  assert.ok(checkManifest(null).length > 0);
  const sfz = buildSfz(m);
  assert.match(sfz, /<region> sample=060_C3_v100\.wav pitch_keycenter=60 lokey=0 hikey=61 lovel=1 hivel=127 loop_mode=loop_continuous loop_start=48000 loop_end=71999/);
  assert.match(sfz, /sample=063_Ds3_v100\.wav pitch_keycenter=63 lokey=62 hikey=127 .* loop_mode=no_loop/);
});
