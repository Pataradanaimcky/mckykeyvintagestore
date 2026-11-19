/**
 * MODX M-style simulator: the rules, kept apart from audio so they can be tested.
 *
 * Works the way the keyboard is described (docs/SIMULATOR.md, sources there): a Performance of
 * parts, each part with a key range and its own engine (AWM2 sample, AN-X analog style and an
 * FM-X-style 8-operator FM voice of the store's own, src/lib/sim/fmx.ts), eight faders for part levels, a Super Knob with Left / Mid / Right position
 * buttons, and Scene buttons that recall settings. Every sound here is the store's own; the
 * sample part plays openly licensed General MIDI samples, not Yamaha's waveforms.
 */

import { FM_PATCHES, type FmPatch } from "./fmx.ts";

export type Engine = "AWM2" | "AN-X" | "FM-X";

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
  /** FM-X parts: the store's own FM patch (not a Yamaha voice). */
  fm?: FmPatch;
  /** Note Limit: lowest and highest MIDI note this part plays (inclusive). Low above high plays outside the gap. */
  low: number;
  high: number;
  /** Velocity Limit, 1..127 (default the full range). Low above high plays outside the gap. */
  velLow?: number;
  velHigh?: number;
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

/** Velocity Limit range printed by Yamaha (MONTAGE M Operation Manual, Part Settings; docs/SIMULATOR.md, S1). */
export const VEL_MIN = 1;
export const VEL_MAX = 127;
/** The on-screen keys have no touch strength; they always play at this velocity (0..1). */
export const SCREEN_VELOCITY = 0.8;

/** Velocity 0..1 as used by the page and the audio, as a MIDI value 1..127. */
export const midiVelocity = (v: number) => Math.min(VEL_MAX, Math.max(VEL_MIN, Math.round(v * VEL_MAX)));

/**
 * Note Limit / Velocity Limit test. With the first value above the second the part plays outside
 * the gap: C5 to C4 plays up to C4 and from C5; 93 to 34 plays 1–34 and 93–127 (same manual).
 */
export const inLimit = (value: number, low: number, high: number) =>
  low <= high ? value >= low && value <= high : value <= high || value >= low;

/**
 * Parts that sound for `note`: inside the Note Limit and not muted. With `velocity` (MIDI 1..127)
 * the part's Velocity Limit counts too.
 */
export function partsForNote(perf: Performance, note: number, mutes: readonly boolean[] = [], velocity?: number): number[] {
  const out: number[] = [];
  perf.parts.forEach((p, i) => {
    if (i >= MAX_PARTS || mutes[i] || !inLimit(note, p.low, p.high)) return;
    if (velocity !== undefined && !inLimit(velocity, p.velLow ?? VEL_MIN, p.velHigh ?? VEL_MAX)) return;
    out.push(i);
  });
  return out;
}

/** Note Limit range printed by Yamaha, C−2 to G8 (MODX M Operation Manual p. 75; docs/SIMULATOR.md, S1b). */
export const NOTE_MIN = 0;
export const NOTE_MAX = 127;

/** One Part's limits as the player has set them on the page. */
export interface PartRange {
  low: number;
  high: number;
  velLow: number;
  velHigh: number;
}
export type RangeField = keyof PartRange;

/** Lowest and highest value of each limit. */
export const RANGE_BOUNDS: Record<RangeField, { min: number; max: number }> = {
  low: { min: NOTE_MIN, max: NOTE_MAX },
  high: { min: NOTE_MIN, max: NOTE_MAX },
  velLow: { min: VEL_MIN, max: VEL_MAX },
  velHigh: { min: VEL_MIN, max: VEL_MAX },
};

/** The limits a Performance starts with. */
export const rangesOf = (perf: Performance): PartRange[] =>
  perf.parts.map((p) => ({ low: p.low, high: p.high, velLow: p.velLow ?? VEL_MIN, velHigh: p.velHigh ?? VEL_MAX }));

/** Sets one limit of one Part, kept to whole numbers inside its printed range. Non-numbers and unknown Parts change nothing. */
export function setRangeField(ranges: readonly PartRange[], part: number, field: RangeField, value: number): PartRange[] {
  const next = ranges.slice();
  const current = next[part];
  if (!current || !Number.isFinite(value)) return next;
  const { min, max } = RANGE_BOUNDS[field];
  next[part] = { ...current, [field]: Math.min(max, Math.max(min, Math.round(value))) };
  return next;
}

/** [INC] / [DEC]: moves one limit by `delta`, stopping at the ends of its range. */
export const stepRangeField = (ranges: readonly PartRange[], part: number, field: RangeField, delta: number) =>
  setRangeField(ranges, part, field, (ranges[part]?.[field] ?? 0) + delta);

/** A limit's value as a 0..1 position for the page's DATA knob, and back. */
export const rangeToKnob = (field: RangeField, value: number) => {
  const { min, max } = RANGE_BOUNDS[field];
  return (value - min) / (max - min);
};
export const rangeFromKnob = (field: RangeField, knob: number) => {
  const { min, max } = RANGE_BOUNDS[field];
  return Math.round(min + clamp01(knob) * (max - min));
};

/** The Performance with the player's limits in place of the store's. */
export const withRanges = (perf: Performance, ranges: readonly PartRange[]): Performance => ({
  ...perf,
  parts: perf.parts.map((p, i) => ({ ...p, ...ranges[i] })),
});

/**
 * Split Job ([SPLIT], MODX M Operation Manual pp. 19, 389): 1–3 Split Points, C#−2 to G8, and Parts
 * put into Groups A–D ([SHIFT] + a Group button adds another Group). The manual's "Off" is not
 * offered because the manual does not say what it does. Yamaha's manuals also do not say which
 * keys each Group plays. The page's reading (docs/SIMULATOR.md, S1c): Groups run upward from A, a
 * Split Point is the lowest key of the next Group, and a Part in several Groups plays them and any
 * Group between them.
 */
export const SPLIT_GROUPS = ["A", "B", "C", "D"] as const;
export const SPLIT_POINT_MIN = 1;
export const SPLIT_POINT_MAX = NOTE_MAX;
export const SPLIT_POINT_COUNTS = [1, 2, 3] as const;
export type SplitPointCount = (typeof SPLIT_POINT_COUNTS)[number];

export interface SplitJob {
  count: SplitPointCount;
  /** Split Points 1–3 as MIDI notes; only the first `count` are in use. */
  points: number[];
  /** For each Part, the Groups it is in (0 = A … 3 = D), lowest first. */
  groups: number[][];
}

/** Keeps the Split Points in use rising, one key apart at least, inside C#−2 to G8. */
function orderedPoints(points: readonly number[], count: number): number[] {
  const next = points.slice();
  for (let i = 0; i < count; i++) next[i] = Math.max(next[i], SPLIT_POINT_MIN + i, i > 0 ? next[i - 1] + 1 : SPLIT_POINT_MIN);
  for (let i = count - 1; i >= 0; i--) next[i] = Math.min(next[i], SPLIT_POINT_MAX - (count - 1 - i), i < count - 1 ? next[i + 1] - 1 : SPLIT_POINT_MAX);
  return next;
}

/** The screen as it opens: one Split Point at C3 (the store's starting values) and no Part in a Group. */
export const newSplitJob = (partCount: number): SplitJob => ({
  count: 1,
  points: [60, 72, 84],
  groups: Array.from({ length: partCount }, () => []),
});

export const setSplitCount = (job: SplitJob, count: SplitPointCount): SplitJob => ({
  ...job,
  count,
  points: orderedPoints(job.points, count),
});

/** Sets one Split Point; it stops at its neighbours so every Group keeps at least one key. */
export function setSplitPoint(job: SplitJob, index: number, note: number): SplitJob {
  if (index < 0 || index >= job.count || !Number.isFinite(note)) return job;
  const low = index > 0 ? job.points[index - 1] + 1 : SPLIT_POINT_MIN;
  const high = index < job.count - 1 ? job.points[index + 1] - 1 : SPLIT_POINT_MAX - (job.count - 1 - index);
  const points = job.points.slice();
  points[index] = Math.min(high, Math.max(low, Math.round(note)));
  return { ...job, points };
}

/** The keys of each Group in use: one more Group than Split Points, from C−2 up to G8. */
export function splitGroupRanges(job: SplitJob): { low: number; high: number }[] {
  const edges = job.points.slice(0, job.count);
  return [...edges, NOTE_MAX + 1].map((next, i) => ({ low: i === 0 ? NOTE_MIN : edges[i - 1], high: next - 1 }));
}

/** A Group button: puts the Part in that Group alone, or with [SHIFT] adds or removes it. */
export function pressSplitGroup(job: SplitJob, part: number, group: number, shift: boolean): SplitJob {
  const current = job.groups[part];
  if (!current || group < 0 || group > job.count) return job;
  const groups = job.groups.slice();
  if (!shift) groups[part] = [group];
  else groups[part] = current.includes(group) ? current.filter((g) => g !== group) : [...current, group].sort((a, b) => a - b);
  return { ...job, groups };
}

/** × on a Part's row: cancels its Group assignment. */
export function clearSplitGroups(job: SplitJob, part: number): SplitJob {
  if (!job.groups[part]) return job;
  const groups = job.groups.slice();
  groups[part] = [];
  return { ...job, groups };
}

/** Done / [EXIT]: Parts in a Group get that key range as their Note Limit; other Parts stay as they were. */
export function applySplitJob(ranges: readonly PartRange[], job: SplitJob): PartRange[] {
  const keys = splitGroupRanges(job);
  return ranges.map((range, part) => {
    const inUse = (job.groups[part] ?? []).filter((g) => g < keys.length);
    if (inUse.length === 0) return range;
    return { ...range, low: keys[Math.min(...inUse)].low, high: keys[Math.max(...inUse)].high };
  });
}

/** The value one assignment gives at Super Knob position `knob` (straight line from `from` to `to`). */
export const morph = (a: KnobAssign, knob: number) => a.from + (a.to - a.from) * clamp01(knob);

/**
 * Knobs 1–4 (5–8): the keyboard's eight Assign knobs (MODX M Quick Guide, top panel 5-3; default
 * CC 17–24, Data List note *4). What each moves in a Performance is set per Performance; these are
 * the store's own settings, not Yamaha's. A level target scales the part (1 = as it was); a cutoff
 * target is added to the part's cutoff (0 = as it was), on AN-X parts only.
 */
export const ASSIGN_KNOB_COUNT = 8;
export interface AssignKnob {
  /** Short name shown under the knob, or "—" when the knob moves nothing. */
  name: string;
  targets: KnobAssign[];
  /** Position the knob starts at; at this position the Performance sounds as written. */
  start: number;
}

const EMPTY_KNOB: AssignKnob = { name: "—", targets: [], start: 0.5 };

/**
 * The store's Knob 1–8 settings for a Performance: Knob 1 CUTOFF opens or closes every AN-X part
 * (±0.3), Knob 2 LAYER turns down every part but Part 1. Knobs 3–8 move nothing yet.
 */
export function assignKnobsOf(perf: Performance): AssignKnob[] {
  const out: AssignKnob[] = Array.from({ length: ASSIGN_KNOB_COUNT }, () => EMPTY_KNOB);
  const an = perf.parts.flatMap((p, i) => (p.engine === "AN-X" && i < MAX_PARTS ? [i] : []));
  if (an.length > 0) out[0] = { name: "CUTOFF", start: 0.5, targets: an.map((part) => ({ part, param: "cutoff", from: -0.3, to: 0.3 })) };
  const layers = perf.parts.flatMap((_, i) => (i > 0 && i < MAX_PARTS ? [i] : []));
  if (layers.length > 0) out[1] = { name: "LAYER", start: 1, targets: layers.map((part) => ({ part, param: "level", from: 0, to: 1 })) };
  return out;
}

/** Knob positions a Performance starts with. */
export const assignStartsOf = (knobs: readonly AssignKnob[]) => knobs.map((k) => k.start);

/**
 * A part's level and cutoff after its fader, the Super Knob and Knobs 1–8. The Super Knob's level
 * assignment scales the fader; its cutoff assignment replaces the part's cutoff. Knobs 1–8 then
 * scale the level and move the cutoff (see AssignKnob).
 */
export function partControls(
  perf: Performance,
  index: number,
  fader: number,
  knob: number,
  assigns: readonly AssignKnob[] = [],
  assignValues: readonly number[] = [],
): { level: number; cutoff?: number } {
  const part = perf.parts[index];
  let level = clamp01(fader);
  let cutoff = part.an?.cutoff;
  for (const a of perf.knob) {
    if (a.part !== index) continue;
    if (a.param === "level") level *= clamp01(morph(a, knob));
    else cutoff = clamp01(morph(a, knob));
  }
  assigns.forEach((k, n) => {
    const value = assignValues[n] ?? k.start;
    for (const a of k.targets) {
      if (a.part !== index) continue;
      if (a.param === "level") level *= clamp01(morph(a, value));
      else if (cutoff !== undefined) cutoff = clamp01(cutoff + morph(a, value));
    }
  });
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

/** Super Knob values the KNOB POSITION buttons start with (store's own choice; Yamaha's defaults are not printed). */
export const KNOB_POSITION_DEFAULTS: readonly number[] = KNOB_POSITIONS.map((k) => k.value);

/**
 * One press of a KNOB POSITION button ([LEFT] [MID] [RIGHT]). On the keyboard the button recalls
 * a stored Super Knob setting and [SHIFT] + the button saves the current value to it (MODX M
 * Quick Guide, p. 23, top panel 5-6). Returns the stored values after the press and the knob
 * value to recall (null when it saved).
 */
export function pressKnobPosition(
  positions: readonly number[],
  slot: number,
  shift: boolean,
  knob: number,
): { positions: number[]; recall: number | null } {
  const next = positions.slice();
  if (slot < 0 || slot >= KNOB_POSITIONS.length) return { positions: next, recall: null };
  if (shift) {
    next[slot] = clamp01(knob);
    return { positions: next, recall: null };
  }
  return { positions: next, recall: next[slot] ?? KNOB_POSITIONS[slot].value };
}

/**
 * One press of [PART SELECT]. The guide prints it as "[PART SELECT] (MUTE)": with [SHIFT] it
 * turns the selected Part's MUTE on or off (Quick Guide, p. 25, top panel 5-12). What the button
 * does without [SHIFT] is not used here, so a plain press changes nothing.
 */
export function pressPartSelect(mutes: readonly boolean[], selected: number, shift: boolean): boolean[] {
  const next = mutes.slice();
  if (shift && selected >= 0 && selected < next.length) next[selected] = !next[selected];
  return next;
}

/**
 * Control Change numbers a MODX M uses unless the player changed them (MODX M Data List: MIDI
 * Parameter Change Table, SYSTEM, defaults 5F and 5C; MIDI Data Format note *4 for the knobs).
 * The keyboard lets the player change them, so LEARN stays. No number is printed for the Control
 * sliders as far as read. Sources in docs/SIMULATOR.md, S8c.
 */
export const MODX_DEFAULT_CC = {
  superKnob: 95,
  scene: 92,
  assignKnobs: [17, 18, 19, 20, 21, 22, 23, 24],
} as const;

/**
 * The Scene a Scene CC value selects: 0–15 is Scene 1, 16–31 Scene 2 … 112–127 Scene 8
 * (MODX M Operation Manual, Scene CC). Returns 0…7.
 */
export function sceneFromCc(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(SCENE_COUNT - 1, Math.max(0, Math.floor(value / 16)));
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
      { name: "FM Tine", engine: "FM-X", fm: FM_PATCHES.tine, ...ALL, velLow: 80, velHigh: 127, level: 0.45 },
    ],
    knob: [
      { part: 1, param: "level", from: 0.1, to: 1 },
      { part: 2, param: "level", from: 1, to: 0.3 },
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
      { name: "FM Bell", engine: "FM-X", fm: FM_PATCHES.bell, low: 60, high: 127, level: 0.35 },
    ],
    knob: [
      { part: 0, param: "cutoff", from: 0.1, to: 0.8 },
      { part: 1, param: "level", from: 0, to: 1 },
      { part: 2, param: "level", from: 0.2, to: 1 },
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
      { name: "Pizz", engine: "AWM2", gm: "pizzicato_strings", ...ALL, velLow: 90, velHigh: 127, level: 0.4 },
      { name: "AN Strings", engine: "AN-X", an: AN.strings, ...ALL, level: 0.3 },
    ],
    knob: [
      { part: 1, param: "level", from: 1, to: 0 },
      { part: 2, param: "level", from: 0, to: 1 },
    ],
    knobStart: 0.5,
  },
];
