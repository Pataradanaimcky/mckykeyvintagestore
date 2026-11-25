import { test } from "node:test";
import assert from "node:assert/strict";
import { buildManifest, encodeWav } from "../src/lib/sim/autosample.ts";
import { buildZip, sampleSetEntries } from "../src/lib/sim/zip.ts";
import { openPickedSet, setDisplayName } from "../src/lib/sim/userset.ts";

const SR = 48000;
const tone = (seconds: number) => [Float32Array.from({ length: Math.round(seconds * SR) }, (_, i) => 0.5 * Math.sin(i / 10))];

function entries() {
  const m = buildManifest("Pick set", SR, 16, 1, [{ note: 48, velocity: 100 }, { note: 60, velocity: 100 }]);
  const wavs = new Map(m.samples.map((s) => [s.file, encodeWav(tone(0.2), SR, 16)]));
  return sampleSetEntries(m, wavs);
}

test("one picked zip opens as a set", () => {
  const set = openPickedSet([{ name: "set.ZIP", path: "", bytes: buildZip(entries()) }]);
  assert.equal(set.manifest.name, "Pick set");
  assert.equal(set.manifest.samples.length, 2);
});

test("a picked folder opens with its top folder dropped", () => {
  const files = entries().map((e) => ({ name: e.name, path: `my-set/${e.name}`, bytes: e.data }));
  const set = openPickedSet(files);
  assert.equal(set.manifest.samples.length, 2);
  assert.equal(set.files.size, 2);
});

test("picked files without paths open by name", () => {
  const set = openPickedSet(entries().map((e) => ({ name: e.name, path: "", bytes: e.data })));
  assert.equal(set.manifest.name, "Pick set");
});

test("nothing picked, or a zip among other files, gives a Thai error", () => {
  assert.throws(() => openPickedSet([]), /ยังไม่ได้เลือกไฟล์/);
  const zip = { name: "a.zip", path: "", bytes: buildZip(entries()) };
  assert.throws(() => openPickedSet([zip, { ...zip, name: "b.zip" }]), /ทีละไฟล์/);
  assert.throws(() => openPickedSet([{ name: "x.wav", path: "", bytes: new Uint8Array(4) }]), /manifest\.json/);
});

test("setDisplayName fits the display line", () => {
  assert.equal(setDisplayName("  My   Rhodes "), "My Rhodes");
  assert.equal(setDisplayName(""), "USER SET");
  assert.equal(setDisplayName("ABCDEFGHIJKLMNOPQRST"), "ABCDEFGHIJKLMNO…");
  assert.equal([...setDisplayName("เสียงเปียโนที่อัดเองจากเครื่องจริง")].length, 16);
  assert.equal(setDisplayName("Exactly16chars!!"), "Exactly16chars!!");
});
