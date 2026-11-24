import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allNotesOffMsg,
  captureSeconds,
  cutTake,
  finishSet,
  noteOffMsg,
  noteOnMsg,
  silentLabel,
  CAPTURE_MARGIN_S,
} from "../src/lib/sim/autorun.ts";
import { checkManifest, TARGET_PEAK } from "../src/lib/sim/autosample.ts";
import { readZip, SET_MANIFEST, SET_SFZ } from "../src/lib/sim/zip.ts";

const SR = 8000;

/** A held tone that starts after `delay` seconds, lasts `hold`, then decays over `tail`. */
function fakeTake(delay: number, hold: number, tail: number, amp: number, freq = 200, stereo = false): Float32Array[] {
  const n = Math.round(captureSeconds(hold, tail) * SR);
  const x = new Float32Array(n);
  const d = Math.round(delay * SR);
  for (let i = d; i < n; i++) {
    const t = (i - d) / SR;
    const env = t < hold ? 1 : Math.max(0, 1 - (t - hold) / (tail * 0.5));
    x[i] = amp * env * Math.sin(2 * Math.PI * freq * t);
  }
  return stereo ? [x, x.slice()] : [x];
}

test("MIDI bytes: note on/off and all notes off, channel 1–16", () => {
  assert.deepEqual(noteOnMsg(1, 60, 100), [0x90, 60, 100]);
  assert.deepEqual(noteOnMsg(16, 60, 0), [0x9f, 60, 1]);
  assert.deepEqual(noteOnMsg(2, 200, 300), [0x91, 127, 127]);
  assert.deepEqual(noteOffMsg(10, 36), [0x89, 36, 64]);
  assert.deepEqual(allNotesOffMsg(1), [0xb0, 123, 0]);
  assert.throws(() => noteOnMsg(0, 60, 100), /1–16/);
  assert.throws(() => allNotesOffMsg(17), /1–16/);
});

test("capture time covers hold, tail and the margin", () => {
  assert.equal(captureSeconds(3, 2), 5 + CAPTURE_MARGIN_S);
});

test("cutTake finds a late start, keeps hold + tail, finds a loop in the held part", () => {
  const raw = fakeTake(0.05, 1, 0.5, 0.4);
  const t = cutTake(raw, SR, { note: 60, velocity: 100, hold: 1, tail: 0.5 })!;
  assert.ok(t);
  // starts 5 ms before the onset (the onset sample is the first above −50 dBFS)
  const firstLoud = t.channels[0].findIndex((v) => Math.abs(v) > 0.003);
  assert.ok(firstLoud >= 39 && firstLoud <= 45, `onset at ${firstLoud}`);
  assert.ok(t.channels[0].length <= Math.round(1.5 * SR) + 40);
  assert.ok(Math.abs(t.peak - 0.4) < 0.01);
  assert.ok(t.loop, "a steady tone gets a loop");
  assert.ok(t.loop!.end <= Math.round(1 * SR) + 40, "loop ends before note off");
  assert.ok(t.loop!.start >= Math.round(0.15 * SR));
});

test("cutTake: silence gives null; noise gives no loop", () => {
  assert.equal(cutTake([new Float32Array(SR)], SR, { note: 60, velocity: 100, hold: 0.5, tail: 0.2 }), null);
  let seed = 1;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  const noise = new Float32Array(SR);
  for (let i = 0; i < noise.length; i++) noise[i] = 0.3 * rnd();
  const t = cutTake([noise], SR, { note: 60, velocity: 100, hold: 0.8, tail: 0.1 })!;
  assert.equal(t.loop, null);
  assert.equal(cutTake([noise], SR, { note: 60, velocity: 100, hold: 0.8, tail: 0.1 }, false)!.loop, null);
});

test("silentLabel uses Yamaha names", () => {
  assert.equal(silentLabel([{ note: 36, velocity: 100 }, { note: 61, velocity: 40 }]), "C1 v100, C#3 v40");
});

test("finishSet: one gain for the set, relative levels kept, zip readable and manifest valid", () => {
  const loud = cutTake(fakeTake(0.01, 0.5, 0.3, 0.5, 200, true), SR, { note: 60, velocity: 100, hold: 0.5, tail: 0.3 })!;
  const soft = cutTake(fakeTake(0.02, 0.5, 0.3, 0.1, 300, true), SR, { note: 48, velocity: 100, hold: 0.5, tail: 0.3 })!;
  const set = finishSet("ทดสอบ", SR, 16, [loud, soft], new Date(2026, 10, 24));
  assert.ok(Math.abs(set.gain - TARGET_PEAK / loud.peak) < 1e-6);
  assert.deepEqual(checkManifest(set.manifest), []);
  assert.deepEqual(set.manifest.samples.map((s) => s.root), [48, 60]);
  const files = readZip(set.zip);
  const names = files.map((f) => f.name);
  assert.ok(names.includes(SET_MANIFEST) && names.includes(SET_SFZ));
  assert.ok(names.includes("060_C3_v100.wav") && names.includes("048_C2_v100.wav"));
  const wav = files.find((f) => f.name === "060_C3_v100.wav")!.data;
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), "RIFF");
  assert.equal(new DataView(wav.buffer, wav.byteOffset).getUint16(22, true), 2);
  // levels kept relative: soft peak about a fifth of loud after the gain
  let pl = 0, ps = 0;
  for (const v of loud.channels[0]) pl = Math.max(pl, Math.abs(v));
  for (const v of soft.channels[0]) ps = Math.max(ps, Math.abs(v));
  assert.ok(Math.abs(ps / pl - 0.2) < 0.01);
  assert.ok(pl <= TARGET_PEAK + 1e-6);
  // a looped take is not faded before its loop end; the file still ends quiet when there is no loop
  if (loud.loop) assert.ok(Math.abs(loud.channels[0][loud.loop.end - 1]) <= 1);
  const m = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === SET_MANIFEST)!.data));
  assert.equal(m.name, "ทดสอบ");
});

test("finishSet with nothing recorded says so in Thai", () => {
  assert.throws(() => finishSet("x", SR, 24, []), /ยังไม่มีโน้ต/);
});
