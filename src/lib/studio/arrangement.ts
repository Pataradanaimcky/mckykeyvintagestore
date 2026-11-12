/**
 * A layered sound being arranged on the studio page: which parts it has, the
 * sound each part plays, and where on the keyboard each part sounds.
 * Pure data and rules, shared by the page and the tests.
 */

import { getMachine, keyboardRange, noteName, type Machine, type MachineId } from "./machines.ts";

/** What the browser plays for a part when previewing without the keyboard. */
export type PreviewSource =
  | { engine: "fm"; preset: number }
  /** A voice from the visitor's own .syx file: 155 bytes, base64. */
  | { engine: "syx"; name: string; data: string }
  | { engine: "poly"; program: number }
  | { engine: "none" };

export interface Part {
  id: string;
  /** Name of the sound chosen on the keyboard itself (what to look for in its sound list). */
  sound: string;
  /** Category shown on the part, such as Piano or Pad. Free text. */
  category: string;
  preview: PreviewSource;
  on: boolean;
  /** 0..machine.levelMax */
  level: number;
  /** -64 (left) .. 0 (centre) .. 63 (right) */
  pan: number;
  /** -3..3 */
  octave: number;
  /** Lowest and highest MIDI note the part plays. */
  lo: number;
  hi: number;
  /** 1..127 */
  velLo: number;
  velHi: number;
  /** MIDI channel 1..16 used when playing the keyboard from this page. */
  channel: number;
}

export interface Arrangement {
  version: 1;
  machine: MachineId;
  keys: number;
  title: string;
  parts: Part[];
}

export const PREVIEW_PROGRAM_COUNT = 5;
export const FM_PRESET_COUNT = 6;

const clampInt = (n: unknown, lo: number, hi: number, fallback: number) => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(hi, Math.max(lo, v));
};
const text = (s: unknown, max: number) => (typeof s === "string" ? s.slice(0, max) : "");

let counter = 0;
export const newId = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`;

export function newPart(machine: Machine, keys: number, index: number, preview: PreviewSource = { engine: "fm", preset: 0 }): Part {
  const { lo, hi } = keyboardRange(keys);
  return {
    id: newId(),
    sound: "",
    category: "",
    preview,
    on: true,
    level: Math.round(machine.levelMax * 0.8),
    pan: 0,
    octave: 0,
    lo,
    hi,
    velLo: 1,
    velHi: 127,
    channel: Math.min(16, index + 1),
  };
}

/** A starting arrangement: a piano-like sound on the right hand and a pad on the left. */
export function starterArrangement(machineId: MachineId = "modx-m"): Arrangement {
  const machine = getMachine(machineId);
  const keys = machine.keySizes[0];
  const { lo, hi } = keyboardRange(keys);
  const split = 60;
  const upper = { ...newPart(machine, keys, 0, { engine: "fm", preset: 0 }), sound: "", category: "E.Piano", lo: split, hi };
  const lower = { ...newPart(machine, keys, 1, { engine: "poly", program: 2 }), sound: "", category: "Pad", lo, hi: split - 1 };
  return { version: 1, machine: machine.id, keys, title: "เสียงใหม่", parts: [upper, lower] };
}

/** Every part that sounds when `note` is played at `velocity`, with the note it plays after its octave shift. */
export function routeNote(arrangement: Arrangement, note: number, velocity: number) {
  return arrangement.parts
    .filter((p) => p.on && note >= p.lo && note <= p.hi && velocity >= p.velLo && velocity <= p.velHi)
    .map((part) => ({ part, note: Math.min(127, Math.max(0, note + part.octave * 12)) }));
}

/** Moves the part at `from` to position `to`. */
export function movePart(parts: Part[], from: number, to: number): Part[] {
  if (from === to || from < 0 || to < 0 || from >= parts.length || to >= parts.length) return parts;
  const next = [...parts];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Fits an arrangement to another keyboard: keeps the first parts it has room for and clamps ranges and levels. */
export function fitToMachine(arrangement: Arrangement, machineId: MachineId, keys?: number): Arrangement {
  const machine = getMachine(machineId);
  const size = keys && machine.keySizes.includes(keys) ? keys : machine.keySizes.includes(arrangement.keys) ? arrangement.keys : machine.keySizes[0];
  const before = getMachine(arrangement.machine);
  const parts = arrangement.parts.slice(0, machine.maxParts).map((p) => ({
    ...p,
    lo: Math.min(127, Math.max(0, p.lo)),
    hi: Math.min(127, Math.max(0, p.hi)),
    level: Math.round((p.level / before.levelMax) * machine.levelMax),
  }));
  return { ...arrangement, machine: machine.id, keys: size, parts };
}

/** Split, Dual or Whole, for keyboards that combine two sounds. */
export function twoPartMode(parts: Part[]): { mode: "Whole" | "Dual" | "Split"; splitPoint?: number } {
  const active = parts.filter((p) => p.on);
  if (active.length < 2) return { mode: "Whole" };
  const [a, b] = active;
  if (a.hi < b.lo) return { mode: "Split", splitPoint: b.lo };
  if (b.hi < a.lo) return { mode: "Split", splitPoint: a.lo };
  return { mode: "Dual" };
}

const sourceOf = (raw: unknown): PreviewSource => {
  const s = raw as Record<string, unknown> | null;
  if (s && s.engine === "fm") return { engine: "fm", preset: clampInt(s.preset, 0, FM_PRESET_COUNT - 1, 0) };
  if (s && s.engine === "poly") return { engine: "poly", program: clampInt(s.program, 0, PREVIEW_PROGRAM_COUNT - 1, 0) };
  if (s && s.engine === "syx" && typeof s.data === "string" && /^[A-Za-z0-9+/=]{200,212}$/.test(s.data)) {
    return { engine: "syx", name: text(s.name, 10), data: s.data };
  }
  return { engine: "none" };
};

/** Reads an arrangement from a file or link, rejecting anything malformed. Returns null when it is not one. */
export function parseArrangement(raw: unknown): Arrangement | null {
  const a = raw as Record<string, unknown> | null;
  if (!a || typeof a !== "object" || a.version !== 1 || !Array.isArray(a.parts)) return null;
  const machine = getMachine(String(a.machine));
  const keys = machine.keySizes.includes(Number(a.keys)) ? Number(a.keys) : machine.keySizes[0];
  const parts: Part[] = (a.parts as unknown[]).slice(0, machine.maxParts).map((raw, index) => {
    const p = (raw ?? {}) as Record<string, unknown>;
    const lo = clampInt(p.lo, 0, 127, 0);
    const velLo = clampInt(p.velLo, 1, 127, 1);
    return {
      id: newId(),
      sound: text(p.sound, 40),
      category: text(p.category, 20),
      preview: sourceOf(p.preview),
      on: p.on !== false,
      level: clampInt(p.level, 0, machine.levelMax, 100),
      pan: clampInt(p.pan, -64, 63, 0),
      octave: clampInt(p.octave, -3, 3, 0),
      lo,
      hi: clampInt(p.hi, lo, 127, 127),
      velLo,
      velHi: clampInt(p.velHi, velLo, 127, 127),
      channel: clampInt(p.channel, 1, 16, index + 1),
    };
  });
  return { version: 1, machine: machine.id, keys, title: text(a.title, 40) || "เสียงใหม่", parts };
}

/** Arrangement as a short string for a share link. */
export function encodeArrangement(a: Arrangement): string {
  const json = JSON.stringify({ ...a, parts: a.parts.map((p) => ({ ...p, id: undefined })) });
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeArrangement(code: string): Arrangement | null {
  if (code.length > 20000) return null;
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return parseArrangement(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

const panText = (pan: number) => (pan === 0 ? "C" : pan < 0 ? `L${-pan}` : `R${pan}`);

/** Step-by-step setup in the keyboard's own words, to follow on the instrument. */
export function setupSheet(a: Arrangement): string {
  const m = getMachine(a.machine);
  const t = m.terms;
  const lines = [`${a.title}`, `${m.name} · ${a.keys} คีย์ · ${t.set}`, ""];
  if (m.maxParts === 2) {
    const mode = twoPartMode(a.parts);
    lines.push(
      mode.mode === "Split"
        ? `โหมด: Split · จุดแบ่ง ${noteName(mode.splitPoint!, m.naming)}`
        : `โหมด: ${mode.mode}`,
      "",
    );
  }
  a.parts.forEach((p, i) => {
    const label = m.partNames?.[i] ?? `${t.part} ${i + 1}`;
    lines.push(`${label}${p.on ? "" : " (ปิด)"}`);
    lines.push(`  เสียง: ${p.sound || "(ยังไม่ได้ใส่ชื่อ)"}${p.category ? ` · ${p.category}` : ""}`);
    lines.push(`  ${t.level}: ${p.level}   ${t.pan}: ${panText(p.pan)}   ${t.octave}: ${p.octave > 0 ? `+${p.octave}` : p.octave}`);
    lines.push(`  ${t.keyRange}: ${noteName(p.lo, m.naming)} – ${noteName(p.hi, m.naming)}`);
    if (p.velLo > 1 || p.velHi < 127) lines.push(`  ${t.velocityRange}: ${p.velLo} – ${p.velHi}`);
    if (m.multiChannel) lines.push(`  MIDI ch: ${p.channel}`);
    lines.push("");
  });
  lines.push("ทำบน Mcky Vintage Key Studio");
  return lines.join("\n");
}
