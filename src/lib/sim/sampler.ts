/**
 * The store's own sample voice for the simulator pages (docs/SIMULATOR.md S2a): pure logic only,
 * no Web Audio here. It picks the recorded note to play, its playback rate (bend included, so a
 * held note can follow the bend wheel, S8e), the amplitude envelope with a real attack (S5j),
 * a velocity-following filter, loop checks and a phone-safe voice pool.
 * All numbers are the store's own choices, not Yamaha's or Roland's.
 */

/** Most sample voices one sample part may hold at once (the store's phone limit, like FM_MAX_VOICES). */
export const SAMPLE_MAX_VOICES = 8;

/** Furthest a recording is stretched, in semitones, before the note is left silent. */
export const MAX_STRETCH = 12;

export type SamplePick = { root: number; offset: number };

/**
 * The recorded note to play for `note`, from the sorted or unsorted `roots` that have a recording.
 * Exact match first; otherwise the nearest root, and on a tie the lower one (pitched up).
 * Null when nothing is recorded or the nearest root is further than `maxStretch` semitones.
 */
export function pickSample(note: number, roots: readonly number[], maxStretch: number = MAX_STRETCH): SamplePick | null {
  let best: SamplePick | null = null;
  for (const root of roots) {
    const offset = note - root;
    if (
      !best ||
      Math.abs(offset) < Math.abs(best.offset) ||
      (Math.abs(offset) === Math.abs(best.offset) && root < best.root)
    )
      best = { root, offset };
  }
  if (!best || Math.abs(best.offset) > maxStretch) return null;
  return best;
}

/** Playback rate for a recording at `root` to sound `note`, plus bend and fine tune in cents. */
export function playbackRate(note: number, root: number, cents = 0): number {
  return 2 ** ((note - root) / 12 + cents / 1200);
}

/** Times in seconds, sustain 0..1. */
export type Adsr = { attack: number; decay: number; sustain: number; release: number };

/** Shortest time used for any envelope stage, so a 0 never clicks. */
export const MIN_STAGE_S = 0.003;

const stage = (s: number) => Math.max(MIN_STAGE_S, Number.isFinite(s) ? s : MIN_STAGE_S);

/** Envelope level `t` seconds after the note started, while the key is held (peak 1). */
export function heldLevel(t: number, env: Adsr): number {
  const a = stage(env.attack);
  const d = stage(env.decay);
  const s = Math.min(1, Math.max(0, env.sustain));
  if (t <= 0) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 + (s - 1) * ((t - a) / d);
  return s;
}

/**
 * Envelope level `t` seconds after the key was let go, from the level it had then.
 * Linear to 0 over the release time (matches `linearRampToValueAtTime`).
 */
export function releasedLevel(t: number, from: number, env: Adsr): number {
  const r = stage(env.release);
  if (t <= 0) return from;
  if (t >= r) return 0;
  return from * (1 - t / r);
}

/** Gain automation as plain steps, applied by the audio code to a GainNode's gain. */
export type EnvStep = { at: number; value: number; ramp: "set" | "linear" };

/** Steps for a note starting at `start` with peak `peak` (velocity gain already applied). */
export function attackSteps(start: number, peak: number, env: Adsr): EnvStep[] {
  const a = stage(env.attack);
  const d = stage(env.decay);
  const s = Math.min(1, Math.max(0, env.sustain));
  return [
    { at: start, value: 0, ramp: "set" },
    { at: start + a, value: peak, ramp: "linear" },
    { at: start + a + d, value: peak * s, ramp: "linear" },
  ];
}

/** Steps for a key let go at `at`, `startedAt` being when the note started; ends at 0. */
export function releaseSteps(at: number, startedAt: number, peak: number, env: Adsr): EnvStep[] {
  const from = peak * heldLevel(at - startedAt, env);
  return [
    { at, value: from, ramp: "set" },
    { at: at + stage(env.release), value: 0, ramp: "linear" },
  ];
}

/** Velocity 1..127 to a gain 0..1: a gentle curve, the store's own. */
export function velocityGain(velocity: number): number {
  const v = Math.min(127, Math.max(1, Math.round(velocity))) / 127;
  return v ** 1.6;
}

/**
 * Low-pass cutoff in Hz: `base` at velocity 64, opened or closed by up to `amount` octaves at
 * velocity 127 / 1, kept between 40 Hz and 20 kHz.
 */
export function velocityCutoff(base: number, velocity: number, amount: number): number {
  const v = Math.min(127, Math.max(1, velocity));
  const octaves = ((v - 64) / 63) * amount;
  return Math.min(20000, Math.max(40, base * 2 ** octaves));
}

/** Loop points in seconds against the recording's length; reason when they cannot be used. */
export function checkLoop(start: number, end: number, duration: number): string | null {
  if (![start, end, duration].every(Number.isFinite)) return "not a number";
  if (start < 0 || end > duration) return "outside the recording";
  if (end - start < 0.005) return "loop too short";
  return null;
}

export type PoolVoice = { id: number; note: number; startedAt: number; released: boolean };

/**
 * Which voices a sample part holds. Pure bookkeeping: the audio code starts and stops the sound.
 * A new note takes a free place; a repeated note replaces its own voice; when full, the oldest
 * released voice goes first, then the oldest held one.
 */
export class VoicePool {
  private voices: PoolVoice[] = [];
  private next = 1;
  readonly max: number;
  constructor(max: number = SAMPLE_MAX_VOICES) {
    if (!(max >= 1)) throw new Error("max must be at least 1");
    this.max = max;
  }

  get active(): readonly PoolVoice[] {
    return this.voices;
  }

  /** Starts `note`; returns the new voice and the voices the audio code must cut. */
  noteOn(note: number, now: number): { voice: PoolVoice; cut: PoolVoice[] } {
    const cut = this.voices.filter((v) => v.note === note);
    this.voices = this.voices.filter((v) => v.note !== note);
    while (this.voices.length >= this.max) {
      const released = this.voices.filter((v) => v.released);
      const pool = released.length ? released : this.voices;
      const oldest = pool.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
      cut.push(oldest);
      this.voices = this.voices.filter((v) => v !== oldest);
    }
    const voice: PoolVoice = { id: this.next++, note, startedAt: now, released: false };
    this.voices.push(voice);
    return { voice, cut };
  }

  /** Marks held voices of `note` released; returns them. */
  noteOff(note: number): PoolVoice[] {
    const hit = this.voices.filter((v) => v.note === note && !v.released);
    for (const v of hit) v.released = true;
    return hit;
  }

  /** Forgets a voice whose sound has ended. */
  ended(id: number) {
    this.voices = this.voices.filter((v) => v.id !== id);
  }

  /** Forgets every voice; returns them so the audio code can cut them. */
  clear(): PoolVoice[] {
    const all = this.voices;
    this.voices = [];
    return all;
  }
}

/* ---- S2b: feeding the voice from the FluidR3_GM files the pages already load ---- */

const NOTE_STEPS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C4" = 60, "Db4" / "C#4" = 61, "A0" = 21, "C-1" = 0 (the names used in midi-js soundfont files). Null if not a note. */
export function noteNameToMidi(name: string): number | null {
  const m = /^([A-G])(b|#)?(-?\d)$/.exec(name.trim());
  if (!m) return null;
  const midi = NOTE_STEPS[m[1]] + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0) + (Number(m[3]) + 1) * 12;
  return midi >= 0 && midi <= 127 ? midi : null;
}

/**
 * Reads a midi-js soundfont file (`MIDI.Soundfont.<name> = { "A0": "data:audio/...;base64,...", ... }`),
 * the format smplr reads for the same files. Returns note name → data URL; throws when it is not one.
 */
export function parseMidiJs(source: string): Record<string, string> {
  const header = source.indexOf("MIDI.Soundfont.");
  if (header < 0) throw new Error("not a midi-js soundfont file");
  const open = source.indexOf("{", header);
  const close = source.lastIndexOf("}");
  if (open < 0 || close <= open) throw new Error("not a midi-js soundfont file");
  // The files end their last entry with a comma before "}", which JSON does not allow.
  const body = source.slice(open, close + 1).replace(/,\s*}$/, "}");
  const json: unknown = JSON.parse(body);
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error("not a midi-js soundfont file");
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(json)) if (typeof v === "string") out[k] = v;
  return out;
}

/** The base64 part of a data URL ("data:audio/ogg;base64,AAAA" → "AAAA"). */
export function base64Body(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

/** Recorded notes of a parsed file as MIDI numbers with their names, low to high; unknown names are skipped. */
export function recordedNotes(file: Record<string, string>): { midi: number; name: string }[] {
  const out: { midi: number; name: string }[] = [];
  for (const name of Object.keys(file)) {
    const midi = noteNameToMidi(name);
    if (midi !== null) out.push({ midi, name });
  }
  return out.sort((a, b) => a.midi - b.midi);
}

/** Same choice as smplr: ogg where the browser plays it, but never on Safari; else mp3. */
export function pickFormat(canPlayOgg: boolean, isSafari: boolean): "ogg" | "mp3" {
  return canPlayOgg && !isSafari ? "ogg" : "mp3";
}

/** The file smplr loads for a General MIDI instrument, so both voices use the same recordings. */
export function soundfontUrl(instrument: string, format: "ogg" | "mp3", kit = "FluidR3_GM"): string {
  if (!/^[a-z0-9_]+$/.test(instrument) || !/^[A-Za-z0-9_]+$/.test(kit)) throw new Error("bad instrument name");
  return `https://gleitz.github.io/midi-js-soundfonts/${kit}/${instrument}-${format}.js`;
}

/**
 * Peak gain of a sample note at MIDI velocity 1..127, the same level the pages had with smplr
 * (its note gain velocity²/127², times its channel volume 90, i.e. 90²/127², times the −3 dB
 * (1/√2) its centred stereo panner puts on each side of a mono recording), so switching to the
 * store's voice is neither louder nor softer. Measured in Chromium against smplr 1.1.0 (S2b).
 */
export function smplrMatchedPeak(velocity: number): number {
  const v = Math.min(127, Math.max(0, velocity));
  return ((v * v) / 16129) * ((90 * 90) / 16129) * Math.SQRT1_2;
}

/** The MODX M AWM2 envelope: no audible attack, held at full level, 0.3 s release, as smplr played them. */
export const AWM_ENV: Adsr = { attack: MIN_STAGE_S, decay: MIN_STAGE_S, sustain: 1, release: 0.3 };

/** Time constant in seconds for a held sample note to follow the bend wheel: quick, but no zipper steps. */
export const BEND_GLIDE_S = 0.005;

/**
 * New playback rates for held sample notes when the bend changes (docs/SIMULATOR.md S8e): each voice
 * keeps the recording it started on (`root`), so a bend never jumps to another sample mid-note.
 */
export function bendRates(held: readonly { id: number; note: number; root: number }[], cents: number): { id: number; rate: number }[] {
  return held.map(({ id, note, root }) => ({ id, rate: playbackRate(note, root, cents) }));
}
