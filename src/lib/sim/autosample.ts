/**
 * The store's own auto-sampler (docs/SIMULATOR.md A1), pure logic only: which notes to record,
 * finding where each recorded note starts, trimming, one gain for the whole set, fade-out,
 * WAV encoding, and the manifest / .sfz text saved with the set.
 * Nothing here talks to a keyboard or a sound card; the /sampler page (later step) does that.
 * All defaults and numbers are the store's own choice, not Yamaha's or Roland's.
 */

export type SamplerSettings = {
  /** Lowest note to record (MIDI number). Default 36 = C1 in Yamaha names (middle C = C3). */
  low: number;
  /** Highest note to record (MIDI number). Default 96 = C6 in Yamaha names. */
  high: number;
  /** Semitones between recorded notes. */
  step: number;
  /** One velocity per layer, lowest first. */
  velocities: number[];
  /** Seconds the note is held. */
  hold: number;
  /** Seconds recorded after note off. */
  tail: number;
  /** Seconds of silence between notes. */
  gap: number;
};

export const DEFAULT_SETTINGS: SamplerSettings = {
  low: 36,
  high: 96,
  step: 3,
  velocities: [100],
  hold: 3,
  tail: 2,
  gap: 0.5,
};

/** Phone/computer-safe cap on how many notes one run records. */
export const MAX_TAKES = 256;

export type Take = { note: number; velocity: number };

const isInt = (n: number, lo: number, hi: number) => Number.isInteger(n) && n >= lo && n <= hi;

/** Problems with the settings, in Thai for the page; empty when they are fine. */
export function checkSettings(s: SamplerSettings): string[] {
  const out: string[] = [];
  if (!isInt(s.low, 0, 127) || !isInt(s.high, 0, 127)) out.push("โน้ตต้องอยู่ระหว่าง 0–127");
  else if (s.low > s.high) out.push("โน้ตต่ำสุดต้องไม่สูงกว่าโน้ตสูงสุด");
  if (!isInt(s.step, 1, 12)) out.push("ระยะห่างต้องเป็น 1–12 เซมิโทน");
  if (s.velocities.length < 1 || s.velocities.length > 4) out.push("ชั้น velocity ต้องมี 1–4 ชั้น");
  else if (!s.velocities.every((v) => isInt(v, 1, 127))) out.push("velocity ต้องเป็น 1–127");
  else if (s.velocities.some((v, i) => i > 0 && v <= s.velocities[i - 1])) out.push("velocity ต้องเรียงจากเบาไปแรง ไม่ซ้ำ");
  if (!(s.hold >= 0.1 && s.hold <= 30)) out.push("เวลากดค้างต้องเป็น 0.1–30 วินาที");
  if (!(s.tail >= 0 && s.tail <= 30)) out.push("เวลาหางเสียงต้องเป็น 0–30 วินาที");
  if (!(s.gap >= 0 && s.gap <= 10)) out.push("ช่วงพักต้องเป็น 0–10 วินาที");
  if (out.length === 0 && planNotes(s).length > MAX_TAKES) out.push(`บันทึกได้ไม่เกิน ${MAX_TAKES} โน้ตต่อครั้ง`);
  return out;
}

/** Notes from low to high every `step` semitones, the highest note always included; each at every velocity layer. */
export function planNotes(s: Pick<SamplerSettings, "low" | "high" | "step" | "velocities">): Take[] {
  const notes: number[] = [];
  for (let n = s.low; n <= s.high; n += s.step) notes.push(n);
  if (notes[notes.length - 1] !== s.high) notes.push(s.high);
  const out: Take[] = [];
  for (const note of notes) for (const velocity of s.velocities) out.push({ note, velocity });
  return out;
}

/** Seconds one take lasts, and the whole run. */
export function takeSeconds(s: Pick<SamplerSettings, "hold" | "tail" | "gap">): number {
  return s.hold + s.tail + s.gap;
}
export function runSeconds(s: SamplerSettings): number {
  return planNotes(s).length * takeSeconds(s);
}

/** "note 7/21" style progress, in Thai. */
export function progressLabel(done: number, total: number): string {
  return `โน้ต ${Math.min(done, total)}/${total}`;
}

/** Loudest absolute sample over all channels. */
export function peakOf(channels: readonly Float32Array[]): number {
  let p = 0;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) {
    const a = Math.abs(ch[i]);
    if (a > p) p = a;
  }
  return p;
}

/** At or above this the input is treated as clipping (warn on the test note). */
export const CLIP_LEVEL = 0.99;
export const isClipping = (peak: number) => peak >= CLIP_LEVEL;

/** Default onset threshold: −50 dBFS. */
export const ONSET_THRESHOLD = Math.pow(10, -50 / 20);

/** First sample index where any channel reaches the threshold; null when the take is silent. */
export function findOnset(channels: readonly Float32Array[], threshold = ONSET_THRESHOLD): number | null {
  const len = Math.max(0, ...channels.map((c) => c.length));
  for (let i = 0; i < len; i++) for (const ch of channels) if (i < ch.length && Math.abs(ch[i]) >= threshold) return i;
  return null;
}

/**
 * Cuts the take from a little before the onset (`preroll` samples, so the attack is not lost)
 * to at most `length` samples. Returns new arrays; the input is not changed.
 */
export function trimTake(channels: readonly Float32Array[], onset: number, preroll: number, length: number): Float32Array[] {
  const start = Math.max(0, onset - Math.max(0, preroll));
  return channels.map((ch) => ch.slice(start, Math.min(ch.length, start + Math.max(0, length))));
}

/** Last index above the threshold + 1 (so silence at the end can be dropped); 0 when silent. */
export function soundEnd(channels: readonly Float32Array[], threshold = ONSET_THRESHOLD): number {
  let end = 0;
  for (const ch of channels) for (let i = ch.length - 1; i >= end; i--) if (Math.abs(ch[i]) >= threshold) { end = i + 1; break; }
  return end;
}

/** Target peak for the loudest note of the set: −1 dBFS. */
export const TARGET_PEAK = Math.pow(10, -1 / 20);

/**
 * One gain for the whole set, so the notes keep their level relative to each other:
 * the loudest take ends at TARGET_PEAK. Never more than ×1000 (+60 dB); 1 for a silent set.
 */
export function setGain(peaks: readonly number[], target = TARGET_PEAK): number {
  const max = Math.max(0, ...peaks);
  if (max <= 0) return 1;
  return Math.min(1000, target / max);
}

/** Multiplies in place. */
export function applyGain(channels: Float32Array[], gain: number): void {
  for (const ch of channels) for (let i = 0; i < ch.length; i++) ch[i] *= gain;
}

/** Linear fade to silence over the last `samples` samples, in place. */
export function fadeOut(channels: Float32Array[], samples: number): void {
  for (const ch of channels) {
    const n = Math.min(ch.length, Math.max(0, Math.floor(samples)));
    for (let k = 0; k < n; k++) ch[ch.length - n + k] *= (n - 1 - k) / n;
  }
}

/** PCM WAV (RIFF, format 1), 16 or 24 bit, channels interleaved. */
export function encodeWav(channels: readonly Float32Array[], sampleRate: number, bits: 16 | 24 = 24): Uint8Array {
  const nCh = channels.length;
  const frames = nCh ? Math.min(...channels.map((c) => c.length)) : 0;
  const bytes = bits / 8;
  const dataLen = frames * nCh * bytes;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + dataLen, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nCh, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * nCh * bytes, true);
  v.setUint16(32, nCh * bytes, true); v.setUint16(34, bits, true);
  str(36, "data"); v.setUint32(40, dataLen, true);
  const max = bits === 16 ? 32767 : 8388607;
  let o = 44;
  for (let i = 0; i < frames; i++) for (let c = 0; c < nCh; c++) {
    const x = Math.max(-1, Math.min(1, channels[c][i]));
    const q = Math.round(x * max);
    if (bits === 16) v.setInt16(o, q, true);
    else { v.setUint8(o, q & 0xff); v.setUint8(o + 1, (q >> 8) & 0xff); v.setUint8(o + 2, (q >> 16) & 0xff); }
    o += bytes;
  }
  return new Uint8Array(buf);
}

/** Yamaha numbering (middle C = C3), matching the MODX M page. */
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function yamahaNoteName(note: number): string {
  return `${NAMES[note % 12]}${Math.floor(note / 12) - 2}`;
}

/** File name inside the zip, e.g. "060_C3_v100.wav" (MIDI number first so files sort by pitch). */
export function sampleFileName(note: number, velocity: number): string {
  return `${String(note).padStart(3, "0")}_${yamahaNoteName(note).replace("#", "s")}_v${velocity}.wav`;
}

/** Key range each recorded root covers, the same split the store's voice uses (nearest root, the lower on a tie). */
export function keyRanges(roots: readonly number[]): { root: number; lo: number; hi: number }[] {
  const r = [...new Set(roots)].sort((a, b) => a - b);
  return r.map((root, i) => ({
    root,
    lo: i === 0 ? 0 : Math.floor((r[i - 1] + root) / 2) + 1,
    hi: i === r.length - 1 ? 127 : Math.floor((root + r[i + 1]) / 2),
  }));
}

/** Velocity range of each layer: from just above the softer layer to its own velocity; the top layer goes to 127. */
export function velocityRanges(velocities: readonly number[]): { velocity: number; lo: number; hi: number }[] {
  const v = [...new Set(velocities)].sort((a, b) => a - b);
  return v.map((velocity, i) => ({ velocity, lo: i === 0 ? 1 : v[i - 1] + 1, hi: i === v.length - 1 ? 127 : velocity }));
}

export const MANIFEST_KIND = "mcky-sample-set";
export const MANIFEST_VERSION = 1;

export type ManifestSample = {
  file: string;
  root: number;
  velocity: number;
  loVel: number;
  hiVel: number;
  /** Loop in seconds; absent when the sample is played once. */
  loopStart?: number;
  loopEnd?: number;
};

export type Manifest = {
  kind: typeof MANIFEST_KIND;
  version: typeof MANIFEST_VERSION;
  name: string;
  sampleRate: number;
  bits: 16 | 24;
  /** The one gain applied to the whole set before saving. */
  gain: number;
  samples: ManifestSample[];
};

export type SavedTake = { note: number; velocity: number; loopStart?: number; loopEnd?: number };

export function buildManifest(name: string, sampleRate: number, bits: 16 | 24, gain: number, takes: readonly SavedTake[]): Manifest {
  const vr = velocityRanges(takes.map((t) => t.velocity));
  const samples = [...takes]
    .sort((a, b) => a.note - b.note || a.velocity - b.velocity)
    .map((t) => {
      const r = vr.find((x) => x.velocity === t.velocity)!;
      const s: ManifestSample = { file: sampleFileName(t.note, t.velocity), root: t.note, velocity: t.velocity, loVel: r.lo, hiVel: r.hi };
      if (t.loopStart !== undefined && t.loopEnd !== undefined) { s.loopStart = t.loopStart; s.loopEnd = t.loopEnd; }
      return s;
    });
  return { kind: MANIFEST_KIND, version: MANIFEST_VERSION, name: name.trim() || "MCKY sample set", sampleRate, bits, gain, samples };
}

/** Problems with a manifest read from a zip (for A2); empty when it can be played. */
export function checkManifest(m: unknown): string[] {
  const out: string[] = [];
  const x = m as Partial<Manifest> | null;
  if (!x || typeof x !== "object") return ["ไม่ใช่ไฟล์ manifest"];
  if (x.kind !== MANIFEST_KIND || x.version !== MANIFEST_VERSION) out.push("ไม่ใช่ชุดเสียงจากหน้าอัดเสียงของร้าน");
  if (!Array.isArray(x.samples) || x.samples.length === 0) out.push("ไม่มีเสียงในชุด");
  else for (const s of x.samples) {
    if (!s || typeof s.file !== "string" || !/^[\w.-]+\.wav$/.test(s.file)) { out.push("ชื่อไฟล์เสียงไม่ถูกต้อง"); break; }
    if (!isInt(s.root, 0, 127) || !isInt(s.loVel, 1, 127) || !isInt(s.hiVel, 1, 127) || s.loVel > s.hiVel) { out.push("ค่าโน้ตหรือ velocity ไม่ถูกต้อง"); break; }
    if ((s.loopStart === undefined) !== (s.loopEnd === undefined) || (s.loopStart !== undefined && !(s.loopEnd! > s.loopStart && s.loopStart >= 0))) { out.push("จุดวนเสียง (loop) ไม่ถูกต้อง"); break; }
  }
  return out;
}

/** .sfz text so the set also opens in other samplers. Loop points in samples. */
export function buildSfz(m: Manifest): string {
  const kr = keyRanges(m.samples.map((s) => s.root));
  const lines = [`// ${m.name.replace(/[\r\n]/g, " ")} — recorded with the Mcky Vintage Key auto-sampler`, "<control> default_path=", ""];
  for (const s of m.samples) {
    const r = kr.find((k) => k.root === s.root)!;
    let line = `<region> sample=${s.file} pitch_keycenter=${s.root} lokey=${r.lo} hikey=${r.hi} lovel=${s.loVel} hivel=${s.hiVel}`;
    if (s.loopStart !== undefined && s.loopEnd !== undefined) {
      line += ` loop_mode=loop_continuous loop_start=${Math.round(s.loopStart * m.sampleRate)} loop_end=${Math.round(s.loopEnd * m.sampleRate) - 1}`;
    } else line += " loop_mode=no_loop";
    lines.push(line);
  }
  return lines.join("\n") + "\n";
}
