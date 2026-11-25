import { test } from "node:test";
import assert from "node:assert/strict";
import { buildManifest, encodeWav, keyRanges } from "../src/lib/sim/autosample.ts";
import { buildZip, sampleSetEntries } from "../src/lib/sim/zip.ts";
import { finishSet } from "../src/lib/sim/autorun.ts";
import { pickRecording, playbackRate, smplrMatchedPeak } from "../src/lib/sim/sampler.ts";
import {
  flattenNames,
  layerFor,
  MAX_SET_BYTES,
  openSampleSetFiles,
  openSampleSetZip,
  pickSetSample,
  setLayers,
  setSummary,
  wavInfo,
  planSetNote,
  setNotePeak,
  decodeCopy,
} from "../src/lib/sim/userset.ts";

const SR = 48000;
const tone = (seconds: number, ch = 2) => Array.from({ length: ch }, () => Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) => 0.5 * Math.sin(i / 10)));
const enc = new TextEncoder();

function makeSet(takes: { note: number; velocity: number; loopStart?: number; loopEnd?: number }[], seconds = 1) {
  const m = buildManifest("Test set", SR, 24, 1, takes);
  const wavs = new Map(m.samples.map((s) => [s.file, encodeWav(tone(seconds), SR, 24)]));
  return { m, entries: sampleSetEntries(m, wavs) };
}

test("wavInfo reads what encodeWav writes, and refuses other files", () => {
  const i24 = wavInfo(encodeWav(tone(0.5), SR, 24))!;
  assert.deepEqual(i24, { channels: 2, sampleRate: SR, bits: 24, frames: 24000, seconds: 0.5 });
  const i16 = wavInfo(encodeWav(tone(0.25, 1), 44100, 16))!;
  assert.equal(i16.channels, 1);
  assert.equal(i16.bits, 16);
  assert.equal(i16.sampleRate, 44100);
  assert.equal(wavInfo(enc.encode("not a wav at all, clearly not a wav file at all")), null);
  const float = encodeWav(tone(0.1), SR, 16);
  new DataView(float.buffer).setUint16(20, 3, true); // IEEE float
  assert.equal(wavInfo(float), null);
  assert.equal(wavInfo(encodeWav([new Float32Array(0)], SR, 16)), null, "no audio");
});

test("wavInfo skips extra chunks before data", () => {
  const w = encodeWav(tone(0.1), SR, 16);
  const extra = new Uint8Array(w.length + 10);
  extra.set(w.subarray(0, 36));
  extra.set(enc.encode("LIST"), 36);
  new DataView(extra.buffer).setUint32(40, 1, true); // odd size, padded to 2
  extra.set(w.subarray(36), 46);
  assert.equal(wavInfo(extra)!.frames, 4800);
});

test("a zip saved by the auto-sampler opens with layers and the store's key split", () => {
  const takes = [36, 48, 60, 72].flatMap((note) => [{ note, velocity: 64 }, { note, velocity: 127, loopStart: 0.2, loopEnd: 0.8 }]);
  const { entries } = makeSet(takes);
  const set = openSampleSetZip(buildZip(entries));
  assert.equal(set.manifest.samples.length, 8);
  assert.equal(set.files.size, 8);
  assert.deepEqual(set.droppedLoops, []);
  assert.equal(set.layers.length, 2);
  assert.deepEqual(set.layers.map((l) => [l.loVel, l.hiVel]), [[1, 64], [65, 127]]);
  assert.deepEqual(set.layers[0].roots, [36, 48, 60, 72]);
  assert.equal(set.decodedBytes, 8 * SR * 2 * 4);
  // Every note sounds from the same recording the .sfz key ranges give, in both layers.
  const kr = keyRanges([36, 48, 60, 72]);
  for (let n = 0; n <= 127; n++) {
    const p = pickSetSample(n, 100, set.layers)!;
    assert.equal(p.root, pickRecording(n, [36, 48, 60, 72])!.root);
    const r = kr.find((k) => k.root === p.root)!;
    assert.ok(n >= r.lo && n <= r.hi, `note ${n}`);
    assert.equal(p.sample.velocity, 127);
    assert.equal(p.sample.loopEnd, 0.8);
    assert.equal(pickSetSample(n, 30, set.layers)!.sample.velocity, 64);
  }
  assert.equal(pickSetSample(128, 100, set.layers), null);
  assert.match(setSummary(set), /^Test set · 4 โน้ต · 2 ชั้น velocity$/);
});

test("layerFor takes the layer holding the velocity, else the nearest", () => {
  const layers = setLayers([
    { file: "a.wav", root: 60, velocity: 40, loVel: 20, hiVel: 40 },
    { file: "b.wav", root: 60, velocity: 100, loVel: 80, hiVel: 100 },
  ]);
  assert.equal(layerFor(1, layers)!.loVel, 20);
  assert.equal(layerFor(30, layers)!.loVel, 20);
  assert.equal(layerFor(50, layers)!.loVel, 20);
  assert.equal(layerFor(75, layers)!.loVel, 80);
  assert.equal(layerFor(127, layers)!.loVel, 80);
  assert.equal(layerFor(64, []), null);
});

test("a folder picked whole opens too (common top folder dropped)", () => {
  const { entries } = makeSet([{ note: 60, velocity: 100 }]);
  const files = new Map(entries.map((e) => [`my-set/${e.name}`, e.data]));
  assert.deepEqual([...flattenNames(files).keys()].sort(), ["060_C3_v100.wav", "manifest.json", "sample-set.sfz"]);
  const win = new Map(entries.map((e) => [`my-set\\${e.name}`, e.data]));
  assert.equal(openSampleSetFiles(win).files.size, 1);
  assert.equal(openSampleSetFiles(files).layers[0].roots[0], 60);
  // Files in different folders keep their names.
  assert.ok(flattenNames(new Map([["a/x", new Uint8Array()], ["b/y", new Uint8Array()]])).has("a/x"));
});

test("loops that do not fit their recording are dropped, the note plays once", () => {
  const { entries } = makeSet([{ note: 60, velocity: 100, loopStart: 0.5, loopEnd: 3 }], 1);
  const set = openSampleSetZip(buildZip(entries));
  assert.deepEqual(set.droppedLoops, ["060_C3_v100.wav"]);
  assert.equal(set.manifest.samples[0].loopStart, undefined);
  assert.equal(set.manifest.samples[0].loopEnd, undefined);
});

test("Thai errors for files that are not a store set", () => {
  const { m, entries } = makeSet([{ note: 60, velocity: 100 }, { note: 72, velocity: 100 }]);
  const only = (names: string[]) => new Map(entries.filter((e) => names.includes(e.name)).map((e) => [e.name, e.data]));
  assert.throws(() => openSampleSetFiles(only(["060_C3_v100.wav"])), /ไม่พบ manifest\.json/);
  assert.throws(() => openSampleSetFiles(only(["manifest.json", "060_C3_v100.wav"])), /ไม่พบไฟล์เสียง: 072_C4_v100\.wav/);
  assert.throws(() => openSampleSetFiles(new Map([["manifest.json", enc.encode("{nope")]])), /อ่านไม่ได้/);
  assert.throws(() => openSampleSetFiles(new Map([["manifest.json", enc.encode('{"kind":"other"}')]])), /ไม่ใช่ชุดเสียง/);
  const bad = new Map(entries.map((e) => [e.name, e.data]));
  bad.set("060_C3_v100.wav", enc.encode("RIFF....WAVE but not really a wave file, no chunks"));
  assert.throws(() => openSampleSetFiles(bad), /ไม่ใช่ WAV/);
  assert.throws(() => openSampleSetZip(enc.encode("not a zip")), /zip/);
  const huge = new Map([["manifest.json", { length: MAX_SET_BYTES + 1 } as Uint8Array]]);
  assert.throws(() => openSampleSetFiles(huge), /ใหญ่เกิน/);
  assert.equal(m.samples.length, 2);
});

test("a set made by the page's own finishSet opens unchanged", () => {
  const take = (note: number) => ({ note, velocity: 100, channels: tone(0.6), peak: 0.5, loop: { start: 4800, end: 24000 } });
  const { zip, manifest } = finishSet("Rhodes", SR, 24, [take(48), take(60)], new Date(2026, 10, 25));
  const set = openSampleSetZip(zip);
  assert.equal(set.manifest.name, manifest.name);
  assert.deepEqual(set.layers[0].roots, [48, 60]);
  assert.deepEqual(set.droppedLoops, []);
  assert.equal(set.manifest.samples[0].loopEnd, 0.5);
});

test("planSetNote: a one-layer set plays at the store pages' level, with rate and bend", () => {
  const { entries } = makeSet([{ note: 48, velocity: 127 }, { note: 60, velocity: 127, loopStart: 0.2, loopEnd: 0.8 }]);
  const set = openSampleSetFiles(new Map(entries.map((e) => [e.name, e.data])));
  for (let v = 1; v <= 127; v++) assert.ok(Math.abs(planSetNote(60, v, set.layers)!.peak - smplrMatchedPeak(v)) < 1e-12, `velocity ${v}`);
  const n = planSetNote(62, 100, set.layers, 50)!;
  assert.equal(n.root, 60);
  assert.equal(n.file, set.layers[0].byRoot.get(60)!.file);
  assert.equal(n.rate, playbackRate(62, 60, 50));
  assert.deepEqual(n.loop, { start: 0.2, end: 0.8 });
  assert.equal(planSetNote(50, 100, set.layers)!.loop, null, "no loop: played once");
  assert.equal(planSetNote(128, 100, set.layers), null);
  assert.equal(planSetNote(60, 100, []), null);
});

test("planSetNote: velocity picks the layer; each layer reaches full level only at its top", () => {
  const takes = [40, 100].flatMap((velocity) => [48, 60].map((note) => ({ note, velocity })));
  const { entries } = makeSet(takes);
  const set = openSampleSetFiles(new Map(entries.map((e) => [e.name, e.data])));
  assert.equal(set.layers.length, 2);
  const [soft, loud] = set.layers;
  for (let v = 1; v <= 127; v++) {
    const n = planSetNote(55, v, set.layers)!;
    const layer = v <= soft.hiVel ? soft : loud;
    assert.equal(n.file, layer.byRoot.get(n.root)!.file, `velocity ${v}`);
    assert.ok(n.peak > 0 && n.peak <= smplrMatchedPeak(127) + 1e-12);
  }
  assert.ok(Math.abs(planSetNote(60, soft.hiVel, set.layers)!.peak - smplrMatchedPeak(127)) < 1e-12);
  assert.ok(Math.abs(setNotePeak(127, { hiVel: 127 }) - smplrMatchedPeak(127)) < 1e-12);
  assert.equal(setNotePeak(127, { hiVel: 40 }), smplrMatchedPeak(127), "above the layer: never louder than full");
  assert.ok(setNotePeak(20, { hiVel: 40 }) < setNotePeak(40, { hiVel: 40 }));
});

test("decodeCopy leaves the opened set's bytes whole", () => {
  const wav = encodeWav(tone(0.05), SR, 16);
  const copy = decodeCopy(wav);
  assert.notEqual(copy, wav.buffer);
  structuredClone(copy, { transfer: [copy] }); // as decodeAudioData takes it away
  assert.equal(copy.byteLength, 0);
  assert.ok(wavInfo(wav), "original still readable");
});
