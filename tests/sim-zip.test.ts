import { test } from "node:test";
import assert from "node:assert/strict";
import { crc32 as zlibCrc32 } from "node:zlib";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildZip, checkEntries, crc32, dosDateTime, readZip, sampleSetEntries, setZipName, SET_MANIFEST, SET_SFZ } from "../src/lib/sim/zip.ts";
import { buildManifest, checkManifest, encodeWav } from "../src/lib/sim/autosample.ts";

const enc = new TextEncoder();
const when = new Date(2026, 10, 24, 19, 30, 46);

test("crc32 matches zlib", () => {
  assert.equal(crc32(new Uint8Array()), 0);
  assert.equal(crc32(enc.encode("123456789")), 0xcbf43926);
  const big = new Uint8Array(70000);
  for (let i = 0; i < big.length; i++) big[i] = (i * 31 + 7) & 0xff;
  assert.equal(crc32(big), zlibCrc32(big));
});

test("dos date and time", () => {
  const { time, date } = dosDateTime(when);
  assert.equal(time, (19 << 11) | (30 << 5) | 23);
  assert.equal(date, (46 << 9) | (11 << 5) | 24);
  assert.equal(dosDateTime(new Date(1970, 0, 1)).date >> 9, 0);
});

test("bad names are refused in Thai", () => {
  const d = new Uint8Array(1);
  assert.deepEqual(checkEntries([{ name: "a.wav", data: d }]), []);
  assert.ok(checkEntries([]).length);
  for (const name of ["", "/a.wav", "../a.wav", "a//b", "a\\b", "./a"]) assert.ok(checkEntries([{ name, data: d }]).length, name);
  assert.match(checkEntries([{ name: "a", data: d }, { name: "a", data: d }])[0], /ซ้ำ/);
  assert.throws(() => buildZip([]), /ไม่มีไฟล์/);
});

test("round trip with the store reader, header fields as written", () => {
  const files = [
    { name: "manifest.json", data: enc.encode('{"a":1}\n') },
    { name: "060_C3_v100.wav", data: new Uint8Array([1, 2, 3, 4, 5]) },
    { name: "ชุดเสียง/empty.txt", data: new Uint8Array() },
  ];
  const zip = buildZip(files, when);
  const v = new DataView(zip.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  assert.equal(v.getUint16(8, true), 0, "stored");
  assert.equal(v.getUint16(6, true) & 0x0800, 0x0800, "UTF-8 names");
  assert.equal(v.getUint32(zip.length - 22, true), 0x06054b50);
  assert.equal(v.getUint16(zip.length - 12, true), 3);
  const back = readZip(zip);
  assert.deepEqual(back.map((e) => e.name), files.map((e) => e.name));
  back.forEach((e, i) => assert.deepEqual(e.data, files[i].data));
});

test("reader refuses broken, compressed and corrupted files", () => {
  assert.throws(() => readZip(enc.encode("not a zip at all, just text")), /เสียหรือไม่ใช่/);
  const zip = buildZip([{ name: "a.wav", data: enc.encode("hello") }], when);
  const bad = zip.slice();
  bad[30 + 5] ^= 0xff; // flip a data byte
  assert.throws(() => readZip(bad), /CRC/);
  const comp = zip.slice();
  const cd = new DataView(comp.buffer).getUint32(comp.length - 6, true);
  new DataView(comp.buffer).setUint16(cd + 10, 8, true); // claims deflate
  assert.throws(() => readZip(comp), /บีบอัด/);
});

test("a recorded set zips with manifest, sfz and every WAV, and reads back", () => {
  const takes = [{ note: 60, velocity: 100 }, { note: 63, velocity: 100, loopStart: 0.5, loopEnd: 1.2 }];
  const m = buildManifest("My MODX set", 48000, 24, 1.3, takes);
  const wav = encodeWav([new Float32Array(480).fill(0.25)], 48000, 24);
  const wavs = new Map(m.samples.map((s) => [s.file, wav]));
  const entries = sampleSetEntries(m, wavs);
  assert.deepEqual(entries.map((e) => e.name), [SET_MANIFEST, SET_SFZ, "060_C3_v100.wav", "063_Ds3_v100.wav"]);
  const back = readZip(buildZip(entries, when));
  const manifest = JSON.parse(new TextDecoder().decode(back.find((e) => e.name === SET_MANIFEST)!.data));
  assert.deepEqual(checkManifest(manifest), []);
  assert.deepEqual(manifest, m);
  assert.match(new TextDecoder().decode(back[1].data), /pitch_keycenter=63 .*loop_start=24000/);
  assert.throws(() => sampleSetEntries(m, new Map([["060_C3_v100.wav", wav]])), /063_Ds3_v100\.wav/);
});

test("zip name is ASCII and dated", () => {
  assert.equal(setZipName("My MODX set", when), "my-modx-set-2026-11-24.zip");
  assert.equal(setZipName("ชุดเปียโน", when), "mcky-set-2026-11-24.zip");
  assert.equal(setZipName("  ", when), "mcky-set-2026-11-24.zip");
});

test("python's zipfile reads the store zip (outside check, skipped without python3)", (t) => {
  let ok = true;
  try { execFileSync("python3", ["-c", "1"]); } catch { ok = false; }
  if (!ok) return t.skip("no python3");
  const dir = mkdtempSync(join(tmpdir(), "mcky-zip-"));
  try {
    const f = join(dir, "set.zip");
    writeFileSync(f, buildZip([{ name: "a.wav", data: enc.encode("abc") }, { name: "ชุด/b.txt", data: enc.encode("ไทย") }], when));
    const out = execFileSync("python3", ["-I", "-c", "import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print('|'.join(n+':'+z.read(n).decode() for n in z.namelist()))", f]).toString().trim();
    assert.equal(out, "a.wav:abc|ชุด/b.txt:ไทย");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
