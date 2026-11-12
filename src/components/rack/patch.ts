/** Shared types and patch logic for the playable rack at the top of the home page. */

export type JackId =
  | "seq.out"
  | "osc.pitch"
  | "osc.out"
  | "lfo.out"
  | "vcf.in"
  | "vcf.mod"
  | "vcf.out"
  | "out.in";

export interface Cable {
  id: number;
  a: JackId;
  b: JackId;
  /** Index into the cable colors. */
  tone: number;
}

export interface Point {
  x: number;
  y: number;
}

/** What the current patch does. */
export interface Route {
  /** The oscillator reaches the output. */
  audible: boolean;
  /** It gets there through the filter. */
  filtered: boolean;
  /** The sequencer drives the pitch. */
  sequenced: boolean;
  /** The LFO moves the filter. */
  lfoToFilter: boolean;
  /** The LFO bends the pitch. */
  lfoToPitch: boolean;
}

export const WAVES: { type: "sawtooth" | "square" | "triangle"; label: string }[] = [
  { type: "sawtooth", label: "SAW" },
  { type: "square", label: "SQR" },
  { type: "triangle", label: "TRI" },
];

/** One bar of eighth notes, in Hz. */
export const STEP_NOTES = [220, 261.63, 329.63, 392, 440, 392, 329.63, 261.63];

/** The playable keys: one octave from C4, with the computer keys that play them. */
export const KEYS: { note: string; hz: number; black: boolean; key: string }[] = [
  { note: "C", hz: 261.63, black: false, key: "a" },
  { note: "C#", hz: 277.18, black: true, key: "w" },
  { note: "D", hz: 293.66, black: false, key: "s" },
  { note: "D#", hz: 311.13, black: true, key: "e" },
  { note: "E", hz: 329.63, black: false, key: "d" },
  { note: "F", hz: 349.23, black: false, key: "f" },
  { note: "F#", hz: 369.99, black: true, key: "t" },
  { note: "G", hz: 392.0, black: false, key: "g" },
  { note: "G#", hz: 415.3, black: true, key: "y" },
  { note: "A", hz: 440.0, black: false, key: "h" },
  { note: "A#", hz: 466.16, black: true, key: "u" },
  { note: "B", hz: 493.88, black: false, key: "j" },
  { note: "C", hz: 523.25, black: false, key: "k" },
];

export function connected(cables: Cable[], x: JackId, y: JackId) {
  return cables.some((c) => (c.a === x && c.b === y) || (c.a === y && c.b === x));
}

export function routeOf(cables: Cable[]): Route {
  const direct = connected(cables, "osc.out", "out.in");
  const filtered = connected(cables, "osc.out", "vcf.in") && connected(cables, "vcf.out", "out.in");
  return {
    audible: direct || filtered,
    filtered,
    sequenced: connected(cables, "seq.out", "osc.pitch"),
    lfoToFilter: filtered && connected(cables, "lfo.out", "vcf.mod"),
    lfoToPitch: connected(cables, "lfo.out", "osc.pitch"),
  };
}
