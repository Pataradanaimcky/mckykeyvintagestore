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

/**
 * What the pads do. ZONE MUTE and ZONE SOLO are the keyboard's Pad Mode values (FANTOM-06/07/08
 * Parameter Guide p. 4; Reference Manual p. 106). SYSTEM uses the system's pad setting (p. 107);
 * on this page that setting is the store's shortcut of picking Scenes with the pads.
 */
export type PadMode = "SYSTEM" | "ZONE MUTE" | "ZONE SOLO";

/** On the PAD screen a pad picks the mode: pad [5], [6] and [16] (Reference Manual pp. 106–107), as indexes. */
export const PAD_MODE_PADS: Readonly<Record<number, PadMode>> = { 4: "ZONE MUTE", 5: "ZONE SOLO", 15: "SYSTEM" };

export interface PadState {
  mode: PadMode;
  /** [PAD MODE] was pressed: the next pad picks the mode. */
  choosing: boolean;
  /** Zones muted with the pads; several may be muted. */
  mutes: boolean[];
  /** The one soloed zone, or null. */
  solo: number | null;
}

export const PAD_START: PadState = { mode: "SYSTEM", choosing: false, mutes: [], solo: null };

/** [PAD MODE]: shows the PAD screen, or leaves it when pressed again (leaving is the store's choice). */
export const pressPadMode = (state: PadState): PadState => ({ ...state, choosing: !state.choosing });

/** A new Scene starts with no pad mutes or solo and keeps the pad mode (store's choice; the manual does not say). */
export const padsForNewScene = (state: PadState): PadState => ({ ...state, choosing: false, mutes: [], solo: null });

/**
 * One press of a pad. Pad number = zone number in ZONE MUTE (each press turns that zone's mute on
 * or off) and ZONE SOLO (only that zone is heard, one zone at a time, the same pad again cancels;
 * Reference Manual p. 106). `scene` is the Scene to select, or null.
 */
export function pressPad(state: PadState, pad: number, zoneCount: number, sceneCount: number): { state: PadState; scene: number | null } {
  if (state.choosing) {
    const mode = PAD_MODE_PADS[pad];
    return { state: mode ? { ...state, mode, choosing: false } : state, scene: null };
  }
  if (state.mode === "SYSTEM") return { state, scene: pad >= 0 && pad < sceneCount ? pad : null };
  if (pad < 0 || pad >= zoneCount) return { state, scene: null };
  if (state.mode === "ZONE SOLO") return { state: { ...state, solo: state.solo === pad ? null : pad }, scene: null };
  const mutes = Array.from({ length: zoneCount }, (_, i) => !!state.mutes[i]);
  mutes[pad] = !mutes[pad];
  return { state: { ...state, mutes }, scene: null };
}

/**
 * Zones that can be heard: lit with ZONE INT/EXT, not muted, and the soloed zone when there is one.
 * A solo does not turn on a zone that is off or undo a mute (store's reading; the manual does not say).
 */
export const audibleZones = (on: readonly boolean[], pads: PadState): boolean[] =>
  on.map((v, i) => v && !pads.mutes[i] && (pads.solo === null || pads.solo === i));

/** How a pad looks and reads in the current state. */
export function padFace(state: PadState, pad: number, zoneCount: number, sceneNames: readonly string[], sceneIndex: number): { label: string; enabled: boolean; pressed: boolean; aria: string } {
  const n = pad + 1;
  if (state.choosing) {
    const mode = PAD_MODE_PADS[pad];
    return { label: mode ?? String(n), enabled: !!mode, pressed: mode === state.mode, aria: mode ? `Pad ${n}: เลือกโหมด ${mode}` : `Pad ${n} (โหมดนี้ยังไม่มีในหน้านี้)` };
  }
  if (state.mode === "SYSTEM") {
    const name = sceneNames[pad];
    return { label: String(n), enabled: name !== undefined, pressed: pad === sceneIndex, aria: name !== undefined ? `Pad ${n}: Scene ${name}` : `Pad ${n} (ว่าง)` };
  }
  const exists = pad < zoneCount;
  const word = state.mode === "ZONE MUTE" ? "MUTE" : "SOLO";
  return { label: String(n), enabled: exists, pressed: exists && (state.mode === "ZONE MUTE" ? !!state.mutes[pad] : state.solo === pad), aria: exists ? `Pad ${n}: ${word} ZONE ${n}` : `Pad ${n} (Scene นี้ไม่มี ZONE ${n})` };
}

/** What a keyboard knob or slider can be learnt to on the page: a zone's slider (LEVEL) or knob (PAN). */
export type ZoneControl = "level" | "pan";
export type FantomLearnTarget = `${ZoneControl}${number}`;

/**
 * Learn targets on the panel: SLIDER (LEVEL) 1… for the Scene's zones, then KNOB 1–8. All eight knobs
 * can be learnt whatever the zone count, because with CTRL on, knobs [1]–[8] are the current zone's
 * eight jobs (Owner's Manual p. 19), so knobs 5–8 (LOW / MID / HIGH GAIN, EQ ON) are needed even in a
 * 4-zone Scene. With PAN/LEVEL on, a knob of a zone the Scene does not have moves nothing.
 */
export function learnTargets(zoneCount: number): FantomLearnTarget[] {
  const n = Math.max(0, Math.min(PANEL_ZONES, Math.floor(zoneCount)));
  const zones = Array.from({ length: n }, (_, i) => i + 1);
  const knobs = Array.from({ length: PANEL_ZONES }, (_, i) => i + 1);
  return [...zones.map((z) => `level${z}` as const), ...knobs.map((k) => `pan${k}` as const)];
}

/** The page's name for a learn target; a knob past the Scene's zones only has its CTRL job. */
export function learnTargetLabel(target: FantomLearnTarget, zoneCount: number): string {
  const t = readLearnTarget(target);
  if (!t) return target;
  const n = t.zone + 1;
  if (t.control === "level") return `SLIDER ${n} (LEVEL)`;
  return t.zone < zoneCount ? `KNOB ${n} (PAN / CTRL)` : `KNOB ${n} (CTRL)`;
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

/**
 * What knobs [1]–[8] do. PAN/LEVEL: each zone's pan (sliders set each zone's volume in both modes).
 * CTRL: the knobs control the current zone (Owner's Manual pp. 8, 19).
 */
export type KnobMode = "PAN/LEVEL" | "CTRL";

/** With CTRL on, knobs [1]–[8] control these for the current zone, in this order (Owner's Manual p. 19). */
export const CTRL_KNOBS = ["ATTACK", "RELEASE", "REVERB", "CHORUS", "LOW GAIN", "MID GAIN", "HIGH GAIN", "EQ ON"] as const;
export type CtrlJob = (typeof CTRL_KNOBS)[number];

/**
 * A zone's CTRL knob positions (each 0..1). The manual does not print values or ranges, so these are
 * the store's: ATTACK and RELEASE change the tone's own times (centre = as the tone is), REVERB and
 * CHORUS are sends from 0, the three gains are ±EQ_RANGE_DB (centre = 0 dB), EQ ON is off in the
 * left half and on in the right half.
 */
export type ZoneCtrl = Record<CtrlJob, number>;

/** Store's starting positions: tone as it is, no sends, flat EQ, EQ on. */
export const CTRL_START: ZoneCtrl = { ATTACK: 0.5, RELEASE: 0.5, REVERB: 0, CHORUS: 0, "LOW GAIN": 0.5, "MID GAIN": 0.5, "HIGH GAIN": 0.5, "EQ ON": 1 };
/** Store's EQ gain range in dB either side of 0 (not a keyboard fact). */
export const EQ_RANGE_DB = 12;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Fresh CTRL settings for each zone of a Scene. */
export const ctrlsForScene = (scene: FantomScene): ZoneCtrl[] => scene.zones.map(() => ({ ...CTRL_START }));

/** Knob `knob` (0–7) of the current zone in CTRL mode moves its job. Other zones and bad indexes are left alone. */
export function setCtrl(ctrls: readonly ZoneCtrl[], zone: number, knob: number, value: number): ZoneCtrl[] {
  const job = CTRL_KNOBS[knob];
  return ctrls.map((c, i) => (job && i === zone ? { ...c, [job]: clamp01(value) } : c));
}

export const eqOn = (c: ZoneCtrl) => c["EQ ON"] >= 0.5;

/** EQ gains in dB for the audio; all 0 when EQ ON is off. */
export function eqGainsDb(c: ZoneCtrl): { low: number; mid: number; high: number } {
  const db = (v: number) => (eqOn(c) ? Math.round((v - 0.5) * 2 * EQ_RANGE_DB * 10) / 10 : 0);
  return { low: db(c["LOW GAIN"]), mid: db(c["MID GAIN"]), high: db(c["HIGH GAIN"]) };
}

/** A VA partial's settings with the zone's ATTACK and RELEASE applied (store's offsets, ±0.5 of the knob range). */
export function vaWithCtrl(settings: AnSettings, c: ZoneCtrl): AnSettings {
  return { ...settings, attack: clamp01(settings.attack + c.ATTACK - 0.5), release: clamp01(settings.release + c.RELEASE - 0.5) };
}

/** Release time in seconds for PCM partials: 0.3 s at centre (the sample player's own default), ×8 or ÷8 at the ends (store's range). */
export const pcmReleaseS = (c: ZoneCtrl) => Math.round(0.3 * 2 ** ((clamp01(c.RELEASE) - 0.5) * 6) * 1000) / 1000;

/**
 * Attack time in seconds for PCM partials (S5j), played by the store's own sample voice. Centre and
 * the left half = as the tone is (no audible attack, the recordings start at once and cannot start
 * sooner); the right half fades in, up to 2 s at the end on a squared curve (store's range).
 */
export const PCM_MAX_ATTACK_S = 2;
export const pcmAttackS = (c: ZoneCtrl) => {
  const v = clamp01(c.ATTACK);
  return v <= 0.5 ? 0 : Math.round(PCM_MAX_ATTACK_S * ((v - 0.5) / 0.5) ** 2 * 1000) / 1000;
};

/** Text under a CTRL knob. */
export function ctrlText(job: CtrlJob, c: ZoneCtrl): string {
  const v = clamp01(c[job]);
  if (job === "EQ ON") return eqOn(c) ? "ON" : "OFF";
  if (job === "REVERB" || job === "CHORUS") return String(Math.round(v * 127));
  if (job === "ATTACK" || job === "RELEASE") {
    const n = Math.round((v - 0.5) * 100);
    return n > 0 ? `+${n}` : String(n);
  }
  const db = Math.round((v - 0.5) * 2 * EQ_RANGE_DB);
  return `${db > 0 ? "+" : ""}${db}dB`;
}

/**
 * [ZONE SELECT] selects the current zone (Owner's Manual p. 8). On this page: press [ZONE SELECT], then
 * a ZONE INT/EXT button picks that zone (the store's reading of the steps). Returns the new current
 * zone, or the old one when `index` is not a zone of the Scene.
 */
export const pickCurrentZone = (current: number, index: number, zoneCount: number): number =>
  Number.isInteger(index) && index >= 0 && index < Math.min(zoneCount, PANEL_ZONES) ? index : current;

/**
 * Octave and Transpose for the keys (Owner's Manual p. 18): octave ±3, transpose −5 to +6 semitones.
 * Here they shift only the on-screen and computer keys; a USB keyboard plays the notes it sends.
 * Which buttons the keyboard uses for each step is not in the stored notes, so the page's −/+ pairs
 * are the store's own.
 */
export const OCTAVE_RANGE = { min: -3, max: 3 } as const;
export const TRANSPOSE_RANGE = { min: -5, max: 6 } as const;

export const stepKeyShift = (value: number, delta: number, range: { min: number; max: number }) =>
  Math.min(range.max, Math.max(range.min, Math.round(value + delta)));

/** Text for the display, e.g. "+2", "0", "−5". */
export const signedText = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");
