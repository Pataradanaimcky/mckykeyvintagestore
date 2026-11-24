// The store's own small zip writer and reader for the auto-sampler (SIMULATOR.md A1c).
// "Stored" entries only (no compression): WAV barely compresses, and this keeps the code
// small with no new dependency. Format from the public PKWARE APPNOTE (local file header,
// central directory, end of central directory; CRC-32 with polynomial 0xEDB88320).
// No ZIP64: a set must stay under 4 GB and 65535 files, which is far above MAX_TAKES.

import { buildSfz, type Manifest } from "./autosample.ts";

export type ZipEntry = { name: string; data: Uint8Array };

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const END_SIG = 0x06054b50;
const UTF8_FLAG = 0x0800;
const VERSION = 20; // 2.0, enough for stored entries and folders
const MAX_32 = 0xffffffff;
const MAX_ENTRIES = 0xffff;

let table: Uint32Array | null = null;
function crcTable(): Uint32Array {
  if (table) return table;
  table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

/** CRC-32 as used by zip (same result as zlib's crc32). */
export function crc32(data: Uint8Array): number {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = t[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** MS-DOS date and time (local fields of the given date, 2-second steps, years 1980–2107). */
export function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.min(2107, Math.max(1980, d.getFullYear()));
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

/** Thai problems with the entry names, empty when the set can be zipped. */
export function checkEntries(entries: readonly ZipEntry[]): string[] {
  const errors: string[] = [];
  if (entries.length === 0) errors.push("ไม่มีไฟล์ให้บันทึก");
  if (entries.length > MAX_ENTRIES) errors.push("ไฟล์มากเกินไปสำหรับไฟล์ zip เดียว");
  const seen = new Set<string>();
  for (const e of entries) {
    const n = e.name;
    if (!n || n.startsWith("/") || n.includes("\\") || n.split("/").some((p) => p === "" || p === "." || p === ".."))
      errors.push(`ชื่อไฟล์ใช้ไม่ได้: "${n}"`);
    else if (seen.has(n)) errors.push(`ชื่อไฟล์ซ้ำ: "${n}"`);
    seen.add(n);
  }
  return errors;
}

/** Builds a zip of stored (uncompressed) files. Throws with a Thai message when it cannot. */
export function buildZip(entries: readonly ZipEntry[], when: Date = new Date()): Uint8Array {
  const errors = checkEntries(entries);
  if (errors.length) throw new Error(errors.join(" · "));
  const enc = new TextEncoder();
  const { time, date } = dosDateTime(when);
  const names = entries.map((e) => enc.encode(e.name));
  const crcs = entries.map((e) => crc32(e.data));

  let localSize = 0;
  let centralSize = 0;
  for (let i = 0; i < entries.length; i++) {
    localSize += 30 + names[i].length + entries[i].data.length;
    centralSize += 46 + names[i].length;
  }
  const total = localSize + centralSize + 22;
  if (localSize > MAX_32 || total > MAX_32) throw new Error("ชุดเสียงใหญ่เกิน 4 GB สำหรับไฟล์ zip เดียว");

  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  const offsets: number[] = [];
  let p = 0;
  for (let i = 0; i < entries.length; i++) {
    const data = entries[i].data;
    offsets.push(p);
    v.setUint32(p, LOCAL_SIG, true);
    v.setUint16(p + 4, VERSION, true);
    v.setUint16(p + 6, UTF8_FLAG, true);
    v.setUint16(p + 8, 0, true); // stored
    v.setUint16(p + 10, time, true);
    v.setUint16(p + 12, date, true);
    v.setUint32(p + 14, crcs[i], true);
    v.setUint32(p + 18, data.length, true);
    v.setUint32(p + 22, data.length, true);
    v.setUint16(p + 26, names[i].length, true);
    v.setUint16(p + 28, 0, true);
    out.set(names[i], p + 30);
    out.set(data, p + 30 + names[i].length);
    p += 30 + names[i].length + data.length;
  }
  const centralStart = p;
  for (let i = 0; i < entries.length; i++) {
    const size = entries[i].data.length;
    v.setUint32(p, CENTRAL_SIG, true);
    v.setUint16(p + 4, VERSION, true); // made by (MS-DOS)
    v.setUint16(p + 6, VERSION, true);
    v.setUint16(p + 8, UTF8_FLAG, true);
    v.setUint16(p + 10, 0, true);
    v.setUint16(p + 12, time, true);
    v.setUint16(p + 14, date, true);
    v.setUint32(p + 16, crcs[i], true);
    v.setUint32(p + 20, size, true);
    v.setUint32(p + 24, size, true);
    v.setUint16(p + 28, names[i].length, true);
    // extra, comment, disk, internal attrs, external attrs: all 0
    v.setUint32(p + 42, offsets[i], true);
    out.set(names[i], p + 46);
    p += 46 + names[i].length;
  }
  v.setUint32(p, END_SIG, true);
  v.setUint16(p + 8, entries.length, true);
  v.setUint16(p + 10, entries.length, true);
  v.setUint32(p + 12, p - centralStart, true);
  v.setUint32(p + 16, centralStart, true);
  return out;
}

/**
 * Reads a zip made of stored files (for A2: opening a set made with A1).
 * Throws a Thai message for anything else (compressed entries, broken or ZIP64 files).
 */
export function readZip(bytes: Uint8Array): ZipEntry[] {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const broken = () => new Error("ไฟล์ zip เสียหรือไม่ใช่ไฟล์ zip");
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === END_SIG) {
      end = i;
      break;
    }
  }
  if (end < 0) throw broken();
  const count = v.getUint16(end + 10, true);
  const cdSize = v.getUint32(end + 12, true);
  const cdStart = v.getUint32(end + 16, true);
  if (cdStart === MAX_32 || count === MAX_ENTRIES || cdStart + cdSize > end) throw broken();
  const dec = new TextDecoder();
  const out: ZipEntry[] = [];
  let p = cdStart;
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || v.getUint32(p, true) !== CENTRAL_SIG) throw broken();
    const method = v.getUint16(p + 10, true);
    const crc = v.getUint32(p + 16, true);
    const csize = v.getUint32(p + 20, true);
    const usize = v.getUint32(p + 24, true);
    const nlen = v.getUint16(p + 28, true);
    const xlen = v.getUint16(p + 30, true);
    const clen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (name.endsWith("/")) continue; // folder
    if (method !== 0 || csize !== usize) throw new Error(`ไฟล์ "${name}" ถูกบีบอัด ให้ใช้ไฟล์ zip ที่บันทึกจากหน้านี้`);
    if (local + 30 > bytes.length || v.getUint32(local, true) !== LOCAL_SIG) throw broken();
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    if (start + usize > bytes.length) throw broken();
    const data = bytes.slice(start, start + usize);
    if (crc32(data) !== crc) throw new Error(`ไฟล์ "${name}" เสีย (CRC ไม่ตรง)`);
    out.push({ name, data });
  }
  return out;
}

/* ---------- The auto-sampler's set as one zip (A1c) ---------- */


export const SET_MANIFEST = "manifest.json";
export const SET_SFZ = "sample-set.sfz";

/**
 * Files of a recorded set, flat in the zip: manifest.json, sample-set.sfz and every WAV named
 * in the manifest. Throws a Thai message when a WAV is missing.
 */
export function sampleSetEntries(m: Manifest, wavs: ReadonlyMap<string, Uint8Array>): ZipEntry[] {
  const enc = new TextEncoder();
  const missing = m.samples.filter((s) => !wavs.has(s.file)).map((s) => s.file);
  if (missing.length) throw new Error(`ยังไม่มีไฟล์เสียง: ${missing.join(", ")}`);
  return [
    { name: SET_MANIFEST, data: enc.encode(JSON.stringify(m, null, 2) + "\n") },
    { name: SET_SFZ, data: enc.encode(buildSfz(m)) },
    ...m.samples.map((s) => ({ name: s.file, data: wavs.get(s.file)! })),
  ];
}

/** Zip file name for saving, e.g. "mcky-set-2026-11-24.zip" (ASCII only, safe on every system). */
export function setZipName(name: string, when: Date = new Date()): string {
  const slug = name.normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 40) || "mcky-set";
  const day = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
  return `${slug}-${day}.zip`;
}
