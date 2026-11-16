/**
 * MODX M-style simulator: the rules, kept apart from audio so they can be tested.
 *
 * Works the way the keyboard is described (docs/SIMULATOR.md, sources there): a Performance of
 * parts, each part with a key range and its own engine (AWM2 sample, AN-X analog style here;
 * FM-X comes later), eight faders for part levels, a Super Knob with Left / Mid / Right position
 * buttons, and Scene buttons that recall settings. Every sound here is the store's own; the
 * sample part plays openly licensed General MIDI samples, not Yamaha's waveforms.
 */

export type Engine = "AWM2" | "AN-X";

/** Analog-style part settings, same meaning as the POLY page (each 0..1). */
export interface AnSettings {
  saw: number;
  pulse: number;
  sub: number;
  cutoff: number;
  res: number;
  env: number;
  attack: number;
  release: number;
}

export interface Part {
  name: string;
  engine: Engine;
  /** AWM2 parts: General MIDI instrument name in the FluidR3_GM set. */
  gm?: string;
  /** AN-X parts. */
  an?: AnSettings;
  /** Lowest and highest MIDI note this part plays (inclusive). */
  low: number;
  high: number;
  /** Fader position 0..1. */
  level: number;
  /** Transpose in semitones. */
  shift?: number;
}

/** What the Super Knob does to one part as it turns from 0 to 1. */
export interface KnobAssign {
  part: number;
  param: "level" | "cutoff";
  from: number;
  to: number;
}

export interface Scene {
  /** Fader positions for parts 1..8 (missing = keep). */
  levels: number[];
  /** Muted parts. */
  mutes: boolean[];
  knob: number;
}

export interface Performance {
  name: string;
  /** Up to eight keyboard parts. */
  parts: Part[];
  knob: KnobAssign[];
  /** Initial Super Knob position. */
  knobStart: number;
  scenes?: Scene[];
}

export const MAX_PARTS = 8;
export const SCENE_COUNT = 8;
/** Super Knob position buttons. */
export const KNOB_POSITIONS = [
  { label: "LEFT", value: 0 },
  { label: "MID", value: 0.5 },
  { label: "RIGHT", value: 1 },
] as const;

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Parts that sound for `note`: in range, not muted, fader up. */
export function partsForNote(perf: Performance, note: number, mutes: readonly boolean[] = []): number[] {
  const out: number[] = [];
  perf.parts.forEach((p, i) => {
    if (i >= MAX_PARTS || mutes[i]) return;
    if (note >= p.low && note <= p.high) out.push(i);
  });
  return out;
}

/** The value one assignment gives at Super Knob position `knob` (straight line from `from` to `to`). */
export const morph = (a: KnobAssign, knob: number) => a.from + (a.to - a.from) * clamp01(knob);

/**
 * A part's level and cutoff after its fader and the Super Knob. The knob's level assignment
 * scales the fader; its cutoff assignment replaces the part's cutoff.
 */
export function partControls(perf: Performance, index: number, fader: number, knob: number): { level: number; cutoff?: number } {
  const part = perf.parts[index];
  let level = clamp01(fader);
  let cutoff = part.an?.cutoff;
  for (const a of perf.knob) {
    if (a.part !== index) continue;
    if (a.param === "level") level *= clamp01(morph(a, knob));
    else cutoff = clamp01(morph(a, knob));
  }
  return { level, cutoff };
}

/** Default scenes: Scene 1 is the Performance as written; the others are filled from the knob positions. */
export function scenesOf(perf: Performance): Scene[] {
  const base: Scene = { levels: perf.parts.map((p) => p.level), mutes: perf.parts.map(() => false), knob: perf.knobStart };
  const out: Scene[] = [];
  for (let i = 0; i < SCENE_COUNT; i++) out.push(perf.scenes?.[i] ?? { ...base, knob: i === 0 ? perf.knobStart : i / (SCENE_COUNT - 1) });
  return out;
}

/** Stores the current faders, mutes and knob into one scene slot. */
export function storeScene(scenes: readonly Scene[], slot: number, levels: readonly number[], mutes: readonly boolean[], knob: number): Scene[] {
  const next = scenes.slice();
  next[slot] = { levels: levels.slice(), mutes: mutes.slice(), knob: clamp01(knob) };
  return next;
}

/**
 * One press of a SCENE button. On the keyboard, SCENE recalls and [SHIFT] + SCENE stores
 * ("SCENE buttons (STORE)", MODX M Quick Guide, top panel 5-15). Returns the scenes after the
 * press and the scene to recall (null when it stored).
 */
export function pressScene(
  scenes: readonly Scene[],
  slot: number,
  shift: boolean,
  now: { levels: readonly number[]; mutes: readonly boolean[]; knob: number },
): { scenes: Scene[]; recall: Scene | null } {
  if (shift) return { scenes: storeScene(scenes, slot, now.levels, now.mutes, now.knob), recall: null };
  return { scenes: scenes.slice(), recall: scenes[slot] ?? null };
}

/** Name of a note for the display, e.g. 60 → "C3" (Yamaha numbering: middle C is C3). */
export function noteName(note: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[((note % 12) + 12) % 12]}${Math.floor(note / 12) - 2}`;
}

const AN = {
  pad: { saw: 0.5, pulse: 0.6, sub: 0.3, cutoff: 0.45, res: 0.3, env: 0.3, attack: 0.6, release: 0.7 },
  brass: { saw: 0.9, pulse: 0.2, sub: 0.3, cutoff: 0.35, res: 0.2, env: 0.7, attack: 0.15, release: 0.25 },
  bass: { saw: 0.6, pulse: 0.35, sub: 1, cutoff: 0.25, res: 0.35, env: 0.55, attack: 0, release: 0.1 },
  lead: { saw: 0.2, pulse: 0.9, sub: 0.3, cutoff: 0.6, res: 0.3, env: 0.35, attack: 0.05, release: 0.25 },
  sweep: { saw: 0.8, pulse: 0.3, sub: 0.2, cutoff: 0.15, res: 0.6, env: 0.9, attack: 0.55, release: 0.6 },
  strings: { saw: 0.85, pulse: 0, sub: 0.15, cutoff: 0.55, res: 0.1, env: 0.2, attack: 0.45, release: 0.5 },
} satisfies Record<string, AnSettings>;

const ALL = { low: 0, high: 127 };

/** The store's own Performances for the simulator (not Yamaha presets). */
export const PERFORMANCES: Performance[] = [
  {
    name: "MCKY Stage Piano",
    parts: [
      { name: "Grand", engine: "AWM2", gm: "acoustic_grand_piano", ...ALL, level: 0.85 },
      { name: "Warm Pad", engine: "AN-X", an: AN.pad, ...ALL, level: 0.35 },
    ],
    knob: [{ part: 1, param: "level", from: 0, to: 1 }],
    knobStart: 0.3,
  },
  {
    name: "MCKY EP & Strings",
    parts: [
      { name: "Tine EP", engine: "AWM2", gm: "electric_piano_1", ...ALL, level: 0.8 },
      { name: "Strings", engine: "AN-X", an: AN.strings, ...ALL, level: 0.5 },
    ],
    knob: [
      { part: 1, param: "level", from: 0.1, to: 1 },
      { part: 1, param: "cutoff", from: 0.35, to: 0.75 },
    ],
    knobStart: 0.4,
  },
  {
    name: "MCKY Split Bass/Piano",
    parts: [
      { name: "Fingered Bass", engine: "AWM2", gm: "electric_bass_finger", low: 0, high: 53, level: 0.85, shift: -12 },
      { name: "Grand", engine: "AWM2", gm: "acoustic_grand_piano", low: 54, high: 127, level: 0.8 },
    ],
    knob: [{ part: 0, param: "level", from: 0.6, to: 1 }],
    knobStart: 0.8,
  },
  {
    name: "MCKY Brass Section",
    parts: [
      { name: "Brass", engine: "AWM2", gm: "brass_section", ...ALL, level: 0.75 },
      { name: "Synth Brass", engine: "AN-X", an: AN.brass, ...ALL, level: 0.5 },
    ],
    knob: [{ part: 1, param: "cutoff", from: 0.2, to: 0.7 }],
    knobStart: 0.4,
  },
  {
    name: "MCKY Organ Gospel",
    parts: [
      { name: "Organ", engine: "AWM2", gm: "drawbar_organ", ...ALL, level: 0.8 },
      { name: "Organ Low", engine: "AWM2", gm: "rock_organ", low: 0, high: 59, level: 0.5 },
    ],
    knob: [{ part: 1, param: "level", from: 0, to: 1 }],
    knobStart: 0.5,
  },
  {
    name: "MCKY Sweep Pad",
    parts: [
      { name: "Sweep", engine: "AN-X", an: AN.sweep, ...ALL, level: 0.7 },
      { name: "Choir", engine: "AWM2", gm: "choir_aahs", ...ALL, level: 0.4 },
    ],
    knob: [
      { part: 0, param: "cutoff", from: 0.1, to: 0.8 },
      { part: 1, param: "level", from: 0, to: 1 },
    ],
    knobStart: 0.2,
  },
  {
    name: "MCKY Bass & Lead",
    parts: [
      { name: "AN Bass", engine: "AN-X", an: AN.bass, low: 0, high: 59, level: 0.85, shift: -12 },
      { name: "AN Lead", engine: "AN-X", an: AN.lead, low: 60, high: 127, level: 0.7 },
    ],
    knob: [
      { part: 0, param: "cutoff", from: 0.15, to: 0.6 },
      { part: 1, param: "cutoff", from: 0.4, to: 0.9 },
    ],
    knobStart: 0.4,
  },
  {
    name: "MCKY Strings Layer",
    parts: [
      { name: "Strings", engine: "AWM2", gm: "string_ensemble_1", ...ALL, level: 0.8 },
      { name: "Pizz", engine: "AWM2", gm: "pizzicato_strings", ...ALL, level: 0.4 },
      { name: "AN Strings", engine: "AN-X", an: AN.strings, ...ALL, level: 0.3 },
    ],
    knob: [
      { part: 1, param: "level", from: 1, to: 0 },
      { part: 2, param: "level", from: 0, to: 1 },
    ],
    knobStart: 0.5,
  },
];
