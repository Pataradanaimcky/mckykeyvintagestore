/**
 * Short looping phrases for the demo page. Each patch plays the phrase that
 * suits it (chords for keys and pads, a bass line for basses, a tune for leads),
 * so swapping patches while it loops compares them on the same music.
 */

export interface NoteEvent {
  /** Start, in beats from the top of the loop. */
  at: number;
  notes: number[];
  /** Length in beats. */
  len: number;
  velocity?: number;
}

export interface Phrase {
  id: "chords" | "ballad" | "bass" | "melody";
  label: string;
  bpm: number;
  /** Loop length in beats. */
  beats: number;
  events: NoteEvent[];
}

// City pop: Fmaj7 – Em7 – Dm7 – G7sus, a bar each, with a push on the "and" of 4.
const chordShapes = [
  [53, 57, 60, 64],
  [52, 55, 59, 62],
  [50, 53, 57, 60],
  [55, 60, 62, 65],
];

// Ballad arpeggio: C – G/B – Am – F, eighth notes.
const balladShapes = [
  [48, 55, 60, 64, 67, 64, 60, 55],
  [47, 55, 59, 62, 67, 62, 59, 55],
  [45, 52, 57, 60, 64, 60, 57, 52],
  [41, 48, 53, 57, 60, 57, 53, 48],
];

// Bass line under the city pop chords.
const bassLine = [41, 41, 53, 41, 40, 40, 52, 40, 38, 38, 50, 38, 43, 43, 55, 45];

// A short tune over the same chords.
const tune: [number, number, number][] = [
  [72, 0, 1.5], [69, 1.5, 0.5], [72, 2, 1], [74, 3, 1],
  [71, 4, 1.5], [67, 5.5, 0.5], [71, 6, 2],
  [69, 8, 1], [72, 9, 1], [77, 10, 1.5], [76, 11.5, 0.5],
  [74, 12, 1], [72, 13, 1], [74, 14, 2],
];

export const PHRASES: Phrase[] = [
  {
    id: "chords",
    label: "คอร์ดซิตี้ป๊อป",
    bpm: 92,
    beats: 16,
    events: chordShapes.flatMap((notes, bar) => [
      { at: bar * 4, notes, len: 2.5, velocity: 92 },
      { at: bar * 4 + 3.5, notes, len: 0.5, velocity: 70 },
    ]),
  },
  {
    id: "ballad",
    label: "บัลลาดอาร์เปจโจ",
    bpm: 76,
    beats: 16,
    events: balladShapes.flatMap((notes, bar) => notes.map((n, i) => ({ at: bar * 4 + i * 0.5, notes: [n], len: Math.min(0.9, 16 - (bar * 4 + i * 0.5)), velocity: i % 2 ? 72 : 90 }))),
  },
  {
    id: "bass",
    label: "เบสไลน์",
    bpm: 96,
    beats: 16,
    events: bassLine.map((n, i) => ({ at: i, notes: [n], len: 0.7, velocity: i % 4 === 0 ? 110 : 88 })),
  },
  {
    id: "melody",
    label: "เมโลดี้",
    bpm: 92,
    beats: 16,
    events: tune.map(([n, at, len]) => ({ at, notes: [n], len: len * 0.95, velocity: 96 })),
  },
];

export function getPhrase(id: string) {
  return PHRASES.find((p) => p.id === id) ?? PHRASES[0];
}

/** The phrase that suits a patch, from its tag (e.g. "Bass", "Ld") or name. */
export function phraseFor(tagOrName: string): Phrase["id"] {
  const s = tagOrName.toLowerCase();
  if (/\bbass\b|\bbs\b|sub/.test(s)) return "bass";
  if (/\bld\b|lead|solo|flute|khlui|sax/.test(s)) return "melody";
  if (/\bpf\b|piano|grand|harp|koto|pluck|bell|mallet|marimba|ranat|vibes|glock/.test(s)) return "ballad";
  return "chords";
}
