/**
 * FANTOM-0-style simulator: the rules, kept apart from audio so they can be tested.
 *
 * Works the way Roland's FANTOM-06/07/08 Owner's Manual describes the keyboard (docs/SIMULATOR.md,
 * sources there): a Scene holds zones, each zone plays one tone with its own volume and pan;
 * zones whose ZONE INT/EXT button is lit sound together (layer); hold [SPLIT] and press a key to
 * split, with zone 1 above the split (the split key included) and zone 4 below it. Tones here are
 * the store's own, built from one partial each (PCM = openly licensed FluidR3_GM samples, VA = the
 * store's analog-style voice), never Roland's ZEN-Core sounds.
 */

import type { AnSettings, Performance } from "./modx";

/** Partial types used here; the ZEN-Core names PCM and VA (ZENOLOGY Owner's Manual). */
export type PartialType = "PCM" | "VA";

export interface Tone {
  name: string;
  partial: PartialType;
  /** PCM: General MIDI instrument name in the FluidR3_GM set. */
  gm?: string;
  /** VA: analog-style settings, same meaning as the POLY page (each 0..1). */
  va?: AnSettings;
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

/** The Scene as a Performance for the shared audio engine (PCM plays as a sample part, VA as an analog part). */
export function asPerformance(scene: FantomScene): Performance {
  return {
    name: scene.name,
    parts: scene.zones.map((z) => ({
      name: z.tone.name,
      engine: z.tone.partial === "PCM" ? "AWM2" : "AN-X",
      gm: z.tone.gm,
      an: z.tone.va,
      low: z.low,
      high: z.high,
      level: z.level,
      shift: z.shift,
    })),
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

const pcm = (name: string, gm: string): Tone => ({ name, partial: "PCM", gm });
const va = (name: string, settings: AnSettings): Tone => ({ name, partial: "VA", va: settings });
const zone = (tone: Tone, level: number, on: boolean, extra: Partial<Zone> = {}): Zone => ({ tone, low: 0, high: 127, level, pan: 0.5, on, ...extra });

/** The store's own Scenes for the simulator (not Roland presets). Zones 1 and 4 are ready for [SPLIT]. */
export const FANTOM_SCENES: FantomScene[] = [
  {
    name: "MCKY Concert Grand",
    zones: [zone(pcm("Grand", "acoustic_grand_piano"), 0.85, true), zone(va("Soft Pad", VA.pad), 0.3, true), zone(pcm("Strings", "string_ensemble_1"), 0.4, false), zone(pcm("Upright Bass", "acoustic_bass"), 0.8, false, { shift: -12 })],
  },
  {
    name: "MCKY EP Layer",
    zones: [zone(pcm("Tine EP", "electric_piano_1"), 0.8, true), zone(va("Warm Pad", VA.pad), 0.4, true, { pan: 0.35 }), zone(pcm("Vibes", "vibraphone"), 0.35, false, { pan: 0.65 }), zone(pcm("Finger Bass", "electric_bass_finger"), 0.8, false, { shift: -12 })],
  },
  {
    name: "MCKY Split Bass/EP",
    zones: [zone(pcm("Tine EP", "electric_piano_1"), 0.8, true, { low: 55 }), zone(va("Pad", VA.pad), 0.3, false), zone(pcm("Strings", "string_ensemble_1"), 0.4, false), zone(pcm("Finger Bass", "electric_bass_finger"), 0.85, true, { high: 54, shift: -12 })],
  },
  {
    name: "MCKY Supersaw Stack",
    zones: [zone(va("Saw Stack", VA.saw), 0.7, true, { pan: 0.4 }), zone(va("Saw Stack +12", VA.saw), 0.4, true, { pan: 0.6, shift: 12 }), zone(pcm("Choir", "choir_aahs"), 0.35, false), zone(va("Sub Bass", VA.bass), 0.8, false, { shift: -12 })],
  },
  {
    name: "MCKY Organ & Bass",
    zones: [zone(pcm("Organ", "drawbar_organ"), 0.8, true, { low: 48 }), zone(pcm("Rock Organ", "rock_organ"), 0.4, false), zone(va("Pad", VA.pad), 0.3, false), zone(va("VA Bass", VA.bass), 0.85, true, { high: 47, shift: -12 })],
  },
  {
    name: "MCKY Brass Hits",
    zones: [zone(pcm("Brass", "brass_section"), 0.75, true), zone(va("Synth Brass", VA.brass), 0.45, true), zone(pcm("Strings", "string_ensemble_1"), 0.35, false), zone(pcm("Trombone", "trombone"), 0.6, false, { shift: -12 })],
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
