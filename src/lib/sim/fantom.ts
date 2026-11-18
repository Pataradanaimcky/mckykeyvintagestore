/**
 * FANTOM-0-style simulator: the rules, kept apart from audio so they can be tested.
 *
 * Works the way Roland's FANTOM-06/07/08 Owner's Manual describes the keyboard (docs/SIMULATOR.md,
 * sources there): a Scene holds zones, each zone plays one tone with its own volume and pan;
 * zones whose ZONE INT/EXT button is lit sound together (layer); hold [SPLIT] and press a key to
 * split, with zone 1 above the split (the split key included) and zone 4 below it. A tone is made of
 * up to 4 partials, each switched on or off (ZEN-Core, ZENOLOGY Owner's Manual). Tones here are the
 * store's own (PCM = openly licensed FluidR3_GM samples, VA = the store's analog-style voice), never
 * Roland's ZEN-Core sounds.
 */

import type { AnSettings, Performance } from "./modx";

/** Partial types used here; the ZEN-Core names PCM and VA (ZENOLOGY Owner's Manual). */
export type PartialType = "PCM" | "VA";

/** One partial of a tone. */
export interface TonePartial {
  type: PartialType;
  /** The partial's on/off switch. */
  on: boolean;
  /** PCM: General MIDI instrument name in the FluidR3_GM set. */
  gm?: string;
  /** VA: analog-style settings, same meaning as the POLY page (each 0..1). */
  va?: AnSettings;
  /** Partial level 0..1 inside the tone. */
  level: number;
  /** Pitch offset in semitones (store's own setting). */
  coarse?: number;
}

export interface Tone {
  name: string;
  /** 1 to PARTIAL_COUNT partials. */
  partials: TonePartial[];
}

export interface Zone {
  tone: Tone;
  /** Lowest and highest MIDI note this zone plays (inclusive). */
  low: number;
  high: number;
  /** Slider position 0..1. */
  level: number;
  /** Knob position 0..1, 0.5 = centre. */
  pan: number;
  /** ZONE INT/EXT lit: the zone sounds. */
  on: boolean;
  /** Transpose in semitones. */
  shift?: number;
}

export interface FantomScene {
  name: string;
  /** Zones 1.. of the Scene (the keyboard has 16; the store's Scenes use the first four). */
  zones: Zone[];
}

/** Zones in a FANTOM-0 Scene (Owner's Manual p. 16). */
export const ZONE_COUNT = 16;
/** Zone sliders, knobs and ZONE INT/EXT buttons on the panel: [1]–[8] (Owner's Manual pp. 8–9). */
export const PANEL_ZONES = 8;
/** Partials in a ZEN-Core tone (ZENOLOGY Owner's Manual; the FANTOM-0 manual does not print it). */
export const PARTIAL_COUNT = 4;
/**
 * Most partial channels a Scene may load at once (all zones together). The store's own limit so a
 * phone keeps up; not a keyboard fact.
 */
export const MAX_SCENE_PARTIALS = 8;
/** Pads [1]–[16] (Owner's Manual p. 9). */
export const PAD_COUNT = 16;
/** With [SPLIT]: the upper zone and the lower zone (Owner's Manual p. 17), as indexes. */
export const SPLIT_UPPER = 0;
export const SPLIT_LOWER = 3;

export interface SplitState {
  /** Split key, or null when [SPLIT] is off. */
  key: number | null;
}

/** A zone's key range after [SPLIT]: zone 1 from the split key up, zone 4 below it, others as written. */
export function zoneRange(zone: Zone, index: number, split: SplitState): { low: number; high: number } {
  if (split.key === null) return { low: zone.low, high: zone.high };
  if (index === SPLIT_UPPER) return { low: split.key, high: 127 };
  if (index === SPLIT_LOWER) return { low: 0, high: split.key - 1 };
  return { low: zone.low, high: zone.high };
}

/** Zones that sound for `note`: lit (INT), and the note inside the zone's range. */
export function zonesForNote(scene: FantomScene, note: number, on: readonly boolean[], split: SplitState = { key: null }): number[] {
  const out: number[] = [];
  scene.zones.forEach((z, i) => {
    if (i >= ZONE_COUNT || !(on[i] ?? z.on)) return;
    const r = zoneRange(z, i, split);
    if (note >= r.low && note <= r.high) out.push(i);
  });
  return out;
}

/**
 * A key press while [SPLIT] is held sets the split point and turns zones 1 and 4 on, so the
 * split sounds at once (the manual's two sides; that other zones stay as they are is the store's
 * reading, the manual does not say). Returns the new split and zone switches.
 */
export function setSplit(on: readonly boolean[], key: number): { split: SplitState; on: boolean[] } {
  const next = on.slice();
  if (SPLIT_UPPER < next.length) next[SPLIT_UPPER] = true;
  if (SPLIT_LOWER < next.length) next[SPLIT_LOWER] = true;
  return { split: { key: Math.min(127, Math.max(1, Math.round(key))) }, on: next };
}

/** One press of a ZONE INT/EXT button: turns that zone on or off. */
export function toggleZone(on: readonly boolean[], index: number): boolean[] {
  const next = on.slice();
  if (index >= 0 && index < next.length) next[index] = !next[index];
  return next;
}

/** What a keyboard knob or slider can be learnt to on the page: a zone's slider (LEVEL) or knob (PAN). */
export type ZoneControl = "level" | "pan";
export type FantomLearnTarget = `${ZoneControl}${number}`;

/** Learn targets for the zones on the panel: LEVEL 1… then PAN 1…, at most [1]–[8]. */
export function learnTargets(zoneCount: number): FantomLearnTarget[] {
  const n = Math.max(0, Math.min(PANEL_ZONES, Math.floor(zoneCount)));
  const zones = Array.from({ length: n }, (_, i) => i + 1);
  return [...zones.map((z) => `level${z}` as const), ...zones.map((z) => `pan${z}` as const)];
}

/** Reads a learn target back: which control of which zone (index from 0), or null if not valid. */
export function readLearnTarget(target: string): { control: ZoneControl; zone: number } | null {
  const m = /^(level|pan)([1-9]\d*)$/.exec(target);
  if (!m) return null;
  const zone = Number(m[2]) - 1;
  if (zone >= PANEL_ZONES) return null;
  return { control: m[1] as ZoneControl, zone };
}

/** Moves a zone's slider or knob to `value` (0..1). Zones the Scene does not have are left alone. */
export function applyZoneControl(
  levels: readonly number[],
  pans: readonly number[],
  target: string,
  value: number,
): { levels: number[]; pans: number[] } {
  const t = readLearnTarget(target);
  const v = Math.min(1, Math.max(0, value));
  const set = (list: readonly number[], on: boolean) => list.map((x, i) => (on && t && i === t.zone ? v : x));
  return { levels: set(levels, t?.control === "level"), pans: set(pans, t?.control === "pan") };
}

/** The partials of a tone that sound: switched on, at most PARTIAL_COUNT. */
export function activePartials(tone: Tone): TonePartial[] {
  return tone.partials.slice(0, PARTIAL_COUNT).filter((p) => p.on && (p.type === "PCM" ? !!p.gm : !!p.va));
}

/** One audio channel per sounding partial: which zone it belongs to and the partial itself. */
export interface PartialChannel {
  zone: number;
  partial: TonePartial;
}

/** The Scene's partial channels in zone order, then partial order, capped at MAX_SCENE_PARTIALS. */
export function partialChannels(scene: FantomScene): PartialChannel[] {
  const out: PartialChannel[] = [];
  scene.zones.slice(0, ZONE_COUNT).forEach((z, zone) => {
    for (const partial of activePartials(z.tone)) if (out.length < MAX_SCENE_PARTIALS) out.push({ zone, partial });
  });
  return out;
}

/** For each zone, the indexes of its channels in `partialChannels`. */
export function zoneChannels(scene: FantomScene): number[][] {
  const map: number[][] = scene.zones.map(() => []);
  partialChannels(scene).forEach((c, i) => map[c.zone].push(i));
  return map;
}

/** Channel level: the zone's slider times the partial's level, silent when the zone is off. */
export function channelLevel(ch: PartialChannel, levels: readonly number[], on: readonly boolean[]): number {
  return on[ch.zone] ? (levels[ch.zone] ?? 0) * ch.partial.level : 0;
}

/** [channel, note] pairs for a key: every partial of every zone that sounds, with zone transpose and partial coarse. */
export function noteTargets(scene: FantomScene, note: number, on: readonly boolean[], split: SplitState = { key: null }): [number, number][] {
  const map = zoneChannels(scene);
  const chans = partialChannels(scene);
  const out: [number, number][] = [];
  for (const z of zonesForNote(scene, note, on, split))
    for (const c of map[z]) {
      const n = note + (scene.zones[z].shift ?? 0) + (chans[c].partial.coarse ?? 0);
      if (n >= 0 && n <= 127) out.push([c, n]);
    }
  return out;
}

/** Partial types of a tone for the display, e.g. "PCM+VA". */
export function partialText(tone: Tone): string {
  return activePartials(tone).map((p) => p.type).join("+") || "—";
}

/** The Scene as a Performance for the shared audio engine: one part per partial channel (PCM as a sample part, VA as an analog part). */
export function asPerformance(scene: FantomScene): Performance {
  return {
    name: scene.name,
    parts: partialChannels(scene).map(({ zone, partial }) => {
      const z = scene.zones[zone];
      return {
        name: z.tone.name,
        engine: partial.type === "PCM" ? "AWM2" : "AN-X",
        gm: partial.gm,
        an: partial.va,
        low: z.low,
        high: z.high,
        level: z.level * partial.level,
        shift: (z.shift ?? 0) + (partial.coarse ?? 0),
      };
    }),
    knob: [],
    knobStart: 0,
  };
}

/** Pan for the display: L50…C…R50. */
export function panText(pan: number): string {
  const v = Math.round((Math.min(1, Math.max(0, pan)) - 0.5) * 100);
  return v === 0 ? "C" : v < 0 ? `L${-v}` : `R${v}`;
}

/** Note name for the display, middle C (MIDI 60) = C4 (store's choice; the manual's numbering is not in docs/SIMULATOR.md). */
export function noteName(note: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[((note % 12) + 12) % 12]}${Math.floor(note / 12) - 1}`;
}

const VA = {
  pad: { saw: 0.6, pulse: 0.4, sub: 0.2, cutoff: 0.4, res: 0.25, env: 0.25, attack: 0.55, release: 0.7 },
  saw: { saw: 1, pulse: 0.1, sub: 0.25, cutoff: 0.55, res: 0.2, env: 0.45, attack: 0.02, release: 0.3 },
  bass: { saw: 0.5, pulse: 0.5, sub: 1, cutoff: 0.22, res: 0.4, env: 0.6, attack: 0, release: 0.08 },
  lead: { saw: 0.3, pulse: 0.85, sub: 0.2, cutoff: 0.65, res: 0.35, env: 0.3, attack: 0.03, release: 0.2 },
  brass: { saw: 0.9, pulse: 0.15, sub: 0.3, cutoff: 0.3, res: 0.15, env: 0.75, attack: 0.12, release: 0.25 },
} satisfies Record<string, AnSettings>;

type Extra = Partial<Omit<TonePartial, "type" | "gm" | "va">>;
const pcmP = (gm: string, extra: Extra = {}): TonePartial => ({ type: "PCM", on: true, gm, level: 1, ...extra });
const vaP = (settings: AnSettings, extra: Extra = {}): TonePartial => ({ type: "VA", on: true, va: settings, level: 1, ...extra });
const tone = (name: string, ...partials: TonePartial[]): Tone => ({ name, partials });
const pcm = (name: string, gm: string): Tone => tone(name, pcmP(gm));
const va = (name: string, settings: AnSettings): Tone => tone(name, vaP(settings));
const zone = (t: Tone, level: number, on: boolean, extra: Partial<Zone> = {}): Zone => ({ tone: t, low: 0, high: 127, level, pan: 0.5, on, ...extra });

/** The store's own Scenes for the simulator (not Roland presets). Zones 1 and 4 are ready for [SPLIT]. */
export const FANTOM_SCENES: FantomScene[] = [
  {
    name: "MCKY Concert Grand",
    zones: [zone(pcm("Grand", "acoustic_grand_piano"), 0.85, true), zone(va("Soft Pad", VA.pad), 0.3, true), zone(tone("Strings+Pad", pcmP("string_ensemble_1"), vaP(VA.pad, { level: 0.35 })), 0.4, false), zone(pcm("Upright Bass", "acoustic_bass"), 0.8, false, { shift: -12 })],
  },
  {
    name: "MCKY EP Layer",
    zones: [zone(tone("Tine EP Bell", pcmP("electric_piano_1"), pcmP("vibraphone", { level: 0.25, coarse: 12 })), 0.8, true), zone(va("Warm Pad", VA.pad), 0.4, true, { pan: 0.35 }), zone(pcm("Vibes", "vibraphone"), 0.35, false, { pan: 0.65 }), zone(pcm("Finger Bass", "electric_bass_finger"), 0.8, false, { shift: -12 })],
  },
  {
    name: "MCKY Split Bass/EP",
    zones: [zone(pcm("Tine EP", "electric_piano_1"), 0.8, true, { low: 55 }), zone(va("Pad", VA.pad), 0.3, false), zone(pcm("Strings", "string_ensemble_1"), 0.4, false), zone(tone("Finger+Sub Bass", pcmP("electric_bass_finger"), vaP(VA.bass, { level: 0.35 })), 0.85, true, { high: 54, shift: -12 })],
  },
  {
    name: "MCKY Supersaw Stack",
    zones: [zone(tone("Saw Stack", vaP(VA.saw), vaP(VA.saw, { level: 0.45, coarse: 7 })), 0.7, true, { pan: 0.4 }), zone(va("Saw Stack +12", VA.saw), 0.4, true, { pan: 0.6, shift: 12 }), zone(pcm("Choir", "choir_aahs"), 0.35, false), zone(va("Sub Bass", VA.bass), 0.8, false, { shift: -12 })],
  },
  {
    name: "MCKY Organ & Bass",
    zones: [zone(pcm("Organ", "drawbar_organ"), 0.8, true, { low: 48 }), zone(pcm("Rock Organ", "rock_organ"), 0.4, false), zone(va("Pad", VA.pad), 0.3, false), zone(va("VA Bass", VA.bass), 0.85, true, { high: 47, shift: -12 })],
  },
  {
    name: "MCKY Brass Hits",
    zones: [zone(tone("Brass+Synth", pcmP("brass_section"), vaP(VA.brass, { level: 0.3 })), 0.75, true), zone(va("Synth Brass", VA.brass), 0.45, true), zone(pcm("Strings", "string_ensemble_1"), 0.35, false), zone(pcm("Trombone", "trombone"), 0.6, false, { shift: -12 })],
  },
  {
    name: "MCKY Lead & Pad",
    zones: [zone(va("Square Lead", VA.lead), 0.7, true, { low: 60 }), zone(pcm("Choir", "choir_aahs"), 0.35, false), zone(va("Saw Pad", VA.pad), 0.35, false), zone(va("Pad Low", VA.pad), 0.6, true, { high: 59 })],
  },
  {
    name: "MCKY Strings & Harp",
    zones: [zone(pcm("Strings", "string_ensemble_1"), 0.8, true), zone(pcm("Harp", "orchestral_harp"), 0.45, true, { pan: 0.7 }), zone(pcm("Pizz", "pizzicato_strings"), 0.4, false, { pan: 0.3 }), zone(pcm("Cello", "cello"), 0.7, false, { shift: -12 })],
  },
];
