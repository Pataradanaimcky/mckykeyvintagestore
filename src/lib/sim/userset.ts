/**
 * A2a: opening a set recorded with the store's auto-sampler (/sampler, A1) so the simulator pages can
 * play it in place of a part's FluidR3_GM sample (docs/SIMULATOR.md A2). Pure logic only: the zip or
 * folder is read in the visitor's browser, nothing is uploaded. Audio decoding is the page's job.
 * All limits are the store's own choices; no keyboard facts used.
 */
import { checkManifest, type Manifest, type ManifestSample } from "./autosample.ts";
import { pickRecording, checkLoop, type SamplePick } from "./sampler.ts";
import { readZip, SET_MANIFEST } from "./zip.ts";

/** Largest zip or folder the pages open (the store's limit; A1 sets of 256 long stereo notes stay under it). */
export const MAX_SET_BYTES = 256 * 1024 * 1024;

/** Above this many bytes of decoded audio the page warns that a phone may run out of memory. */
export const PHONE_WARN_BYTES = 120 * 1024 * 1024;

export type WavInfo = { channels: number; sampleRate: number; bits: number; frames: number; seconds: number };

const ascii = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

/**
 * Reads the header of a PCM WAV (format 1, 16 or 24 bit, like `encodeWav` writes; extra chunks are
 * skipped). Null when it is not one, so the page can say which file is wrong before decoding.
 */
export function wavInfo(bytes: Uint8Array): WavInfo | null {
  if (bytes.length < 44 || ascii(bytes, 0) !== "RIFF" || ascii(bytes, 8) !== "WAVE") return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let fmt: { channels: number; sampleRate: number; bits: number } | null = null;
  let p = 12;
  while (p + 8 <= bytes.length) {
    const id = ascii(bytes, p);
    const size = v.getUint32(p + 4, true);
    const body = p + 8;
    if (id === "fmt ") {
      if (size < 16 || body + 16 > bytes.length) return null;
      if (v.getUint16(body, true) !== 1) return null;
      fmt = { channels: v.getUint16(body + 2, true), sampleRate: v.getUint32(body + 4, true), bits: v.getUint16(body + 14, true) };
      if (fmt.channels < 1 || fmt.channels > 2 || fmt.sampleRate < 8000 || fmt.sampleRate > 192000 || (fmt.bits !== 16 && fmt.bits !== 24)) return null;
    } else if (id === "data") {
      if (!fmt) return null;
      const len = Math.min(size, bytes.length - body);
      const frames = Math.floor(len / (fmt.channels * (fmt.bits / 8)));
      if (frames < 1) return null;
      return { ...fmt, frames, seconds: frames / fmt.sampleRate };
    }
    p = body + size + (size & 1);
  }
  return null;
}

/** One velocity layer: its range and the recordings in it by root note. */
export type SetLayer = { loVel: number; hiVel: number; roots: number[]; byRoot: Map<number, ManifestSample> };

export type OpenedSet = {
  manifest: Manifest;
  /** WAV bytes by file name, only the files the manifest names. */
  files: Map<string, Uint8Array>;
  layers: SetLayer[];
  /** Loops dropped because they do not fit their recording (the note then plays once). */
  droppedLoops: string[];
  /** Decoded size estimate in bytes (32-bit float, as Web Audio keeps it). */
  decodedBytes: number;
};

/** Velocity layers, soft to loud; samples of one layer share loVel/hiVel as `buildManifest` writes them. */
export function setLayers(samples: readonly ManifestSample[]): SetLayer[] {
  const map = new Map<string, SetLayer>();
  for (const s of samples) {
    const key = `${s.loVel}-${s.hiVel}`;
    let l = map.get(key);
    if (!l) map.set(key, (l = { loVel: s.loVel, hiVel: s.hiVel, roots: [], byRoot: new Map() }));
    if (!l.byRoot.has(s.root)) l.roots.push(s.root);
    l.byRoot.set(s.root, s);
  }
  const out = [...map.values()].sort((a, b) => a.loVel - b.loVel);
  for (const l of out) l.roots.sort((a, b) => a - b);
  return out;
}

/** The layer for `velocity`: the one whose range holds it, else the nearest by range. */
export function layerFor(velocity: number, layers: readonly SetLayer[]): SetLayer | null {
  if (!layers.length) return null;
  const v = Math.min(127, Math.max(1, Math.round(velocity)));
  const hit = layers.find((l) => v >= l.loVel && v <= l.hiVel);
  if (hit) return hit;
  const dist = (l: SetLayer) => (v < l.loVel ? l.loVel - v : v - l.hiVel);
  return layers.reduce((a, b) => (dist(b) < dist(a) ? b : a));
}

/** The recording to play for `note` at `velocity`: layer first, then the same key split as the store's voice. */
export function pickSetSample(note: number, velocity: number, layers: readonly SetLayer[]): (SamplePick & { sample: ManifestSample }) | null {
  const layer = layerFor(velocity, layers);
  if (!layer) return null;
  const pick = pickRecording(note, layer.roots);
  if (!pick) return null;
  return { ...pick, sample: layer.byRoot.get(pick.root)! };
}

/** Drops a common top folder ("my-set/manifest.json" → "manifest.json"), e.g. a folder picked whole. */
export function flattenNames(files: ReadonlyMap<string, Uint8Array>): Map<string, Uint8Array> {
  const names = [...files.keys()].map((n) => n.replace(/\\/g, "/"));
  const first = names[0]?.split("/") ?? [];
  const prefix = first.length > 1 && names.every((n) => n.startsWith(first[0] + "/")) ? first[0] + "/" : "";
  const out = new Map<string, Uint8Array>();
  for (const [name, data] of files) out.set(name.replace(/\\/g, "/").slice(prefix.length), data);
  return out;
}

/**
 * Checks a set given as files (a picked folder, or the entries of a zip) and readies it for playing.
 * Throws a Thai message the page shows as it is.
 */
export function openSampleSetFiles(input: ReadonlyMap<string, Uint8Array>): OpenedSet {
  const total = [...input.values()].reduce((a, d) => a + d.length, 0);
  if (total > MAX_SET_BYTES) throw new Error(`ชุดเสียงใหญ่เกิน ${MAX_SET_BYTES / 1024 / 1024} MB`);
  const files = flattenNames(input);
  const raw = files.get(SET_MANIFEST);
  if (!raw) throw new Error("ไม่พบ manifest.json ให้เลือกไฟล์ zip หรือโฟลเดอร์ที่บันทึกจากหน้าอัดเสียง");
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw new Error("manifest.json อ่านไม่ได้");
  }
  const problems = checkManifest(json);
  if (problems.length) throw new Error(problems.join(" · "));
  const manifest = json as Manifest;
  const wavs = new Map<string, Uint8Array>();
  const missing: string[] = [];
  const droppedLoops: string[] = [];
  let decodedBytes = 0;
  const samples: ManifestSample[] = [];
  for (const s of manifest.samples) {
    const data = files.get(s.file);
    if (!data) {
      missing.push(s.file);
      continue;
    }
    const info = wavInfo(data);
    if (!info) throw new Error(`ไฟล์ "${s.file}" ไม่ใช่ WAV แบบ PCM 16/24 bit`);
    decodedBytes += info.frames * info.channels * 4;
    wavs.set(s.file, data);
    const clean: ManifestSample = { ...s };
    if (s.loopStart !== undefined && s.loopEnd !== undefined && checkLoop(s.loopStart, s.loopEnd, info.seconds) !== null) {
      delete clean.loopStart;
      delete clean.loopEnd;
      droppedLoops.push(s.file);
    }
    samples.push(clean);
  }
  if (missing.length) throw new Error(`ไม่พบไฟล์เสียง: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ` และอีก ${missing.length - 5} ไฟล์` : ""}`);
  const m: Manifest = { ...manifest, samples };
  return { manifest: m, files: wavs, layers: setLayers(samples), droppedLoops, decodedBytes };
}

/** Same as `openSampleSetFiles` for a zip saved by /sampler (stored, not compressed). */
export function openSampleSetZip(bytes: Uint8Array): OpenedSet {
  if (bytes.length > MAX_SET_BYTES) throw new Error(`ชุดเสียงใหญ่เกิน ${MAX_SET_BYTES / 1024 / 1024} MB`);
  const entries = readZip(bytes);
  return openSampleSetFiles(new Map(entries.map((e) => [e.name, e.data])));
}

/** Short Thai line for the page after opening, e.g. "MCKY Rhodes · 21 โน้ต · 2 ชั้น velocity". */
export function setSummary(set: OpenedSet): string {
  const notes = new Set(set.manifest.samples.map((s) => s.root)).size;
  let line = `${set.manifest.name} · ${notes} โน้ต`;
  if (set.layers.length > 1) line += ` · ${set.layers.length} ชั้น velocity`;
  if (set.decodedBytes > PHONE_WARN_BYTES) line += " · อาจหนักเกินไปสำหรับมือถือ";
  return line;
}
