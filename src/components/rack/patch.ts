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

/** The playable keys: one octave from middle C (MIDI 60), with the computer keys that play them. */
export const KEYS: { note: string; midi: number; black: boolean; key: string }[] = [
  { note: "C", midi: 60, black: false, key: "a" },
  { note: "C#", midi: 61, black: true, key: "w" },
  { note: "D", midi: 62, black: false, key: "s" },
  { note: "D#", midi: 63, black: true, key: "e" },
  { note: "E", midi: 64, black: false, key: "d" },
  { note: "F", midi: 65, black: false, key: "f" },
  { note: "F#", midi: 66, black: true, key: "t" },
  { note: "G", midi: 67, black: false, key: "g" },
  { note: "G#", midi: 68, black: true, key: "y" },
  { note: "A", midi: 69, black: false, key: "h" },
  { note: "A#", midi: 70, black: true, key: "u" },
  { note: "B", midi: 71, black: false, key: "j" },
  { note: "C", midi: 72, black: false, key: "k" },
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
