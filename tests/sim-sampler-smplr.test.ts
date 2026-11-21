/**
 * S2e (docs/SIMULATOR.md): the store's own sample voice and its smplr 1.1.0 fallback must pick the
 * same recording and the same level for every note of every store preset, so a fallback never
 * sounds different or silent. smplr's own exported `soundfontToPreset` (the key spread it plays
 * FluidR3_GM files with) and `getSoundfontNames` are the reference.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getSoundfontNames, soundfontToPreset } from "smplr";
import { noteNameToMidi, pickRecording, smplrMatchedPeak } from "../src/lib/sim/sampler.ts";
import { PERFORMANCES, type Performance } from "../src/lib/sim/modx.ts";
import { FANTOM_SCENES, asPerformance } from "../src/lib/sim/fantom.ts";

/** The recording smplr plays for `note` from files named `names`, or null when it plays nothing. */
function smplrRoot(note: number, names: readonly string[]): number | null {
  const preset = soundfontToPreset([...names]);
  for (const g of preset.groups)
    for (const r of g.regions) {
      const [low, high] = r.keyRange ?? [0, 127];
      if (note >= low && note <= high) return r.pitch ?? note;
    }
  return null;
}

const NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const nameOf = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
/** The notes a FluidR3_GM midi-js file names: A0..C8, flats written "Bb0", "Db1". */
const FULL = Array.from({ length: 88 }, (_, i) => nameOf(21 + i));

const rootsOf = (names: readonly string[]) => names.map((n) => noteNameToMidi(n)).filter((m): m is number => m !== null);

const SETS: [string, string[]][] = [
  ["A0..C8", FULL],
  ["A0..C8 with C4 failed to decode", FULL.filter((n) => n !== "C4")],
  ["every third note", FULL.filter((_, i) => i % 3 === 0)],
  ["one octave apart (even gaps, ties)", FULL.filter((n) => n.startsWith("C"))],
  ["odd gaps", ["A0", "E2", "Bb3", "Db5", "C8"]],
  ["one note", ["A4"]],
];

test("note names are read the same as smplr reads them", () => {
  const preset = soundfontToPreset(FULL);
  const pitches = preset.groups.flatMap((g) => g.regions.map((r) => [r.sample, r.pitch]));
  for (const [name, pitch] of pitches) assert.equal(noteNameToMidi(String(name)), pitch, String(name));
});

test("for every note, the store's voice picks the recording smplr picks (or is silent where smplr is)", () => {
  for (const [label, names] of SETS) {
    const roots = rootsOf(names);
    for (let note = -24; note <= 151; note++) {
      const own = pickRecording(note, roots);
      assert.equal(own?.root ?? null, smplrRoot(note, names), `${label}, note ${note}`);
      if (own) assert.equal(own.offset, note - own.root);
    }
  }
});

type Part = Performance["parts"][number];
const presets: { name: string; parts: Part[] }[] = [
  ...PERFORMANCES.map((p) => ({ name: `MODX M ${p.name}`, parts: p.parts })),
  ...FANTOM_SCENES.map((s) => ({ name: `FANTOM-0 ${s.name}`, parts: asPerformance(s).parts })),
];
const samples = presets.flatMap((p) => p.parts.filter((x) => x.gm).map((x) => ({ preset: p.name, part: x })));

test("the presets have sample parts to check", () => {
  assert.ok(samples.some((s) => s.preset.startsWith("MODX M")));
  assert.ok(samples.some((s) => s.preset.startsWith("FANTOM-0")));
});

test("every sample part names a file smplr can load (so the fallback is never silent)", () => {
  const known = new Set(getSoundfontNames());
  for (const { preset, part } of samples) assert.ok(known.has(part.gm!), `${preset}: ${part.name} → ${part.gm}`);
});

test("every key a sample part plays, after its shift, sounds on both voices from the same recording", () => {
  const roots = rootsOf(FULL);
  for (const { preset, part } of samples) {
    for (let key = part.low; key <= part.high; key++) {
      const note = key + (part.shift ?? 0);
      const own = pickRecording(note, roots);
      const ref = smplrRoot(note, FULL);
      assert.equal(own?.root ?? null, ref, `${preset}: ${part.name}, key ${key}`);
      if (note >= 0 && note <= 127) assert.ok(own, `${preset}: ${part.name}, key ${key} silent`);
    }
  }
});

test("every velocity a sample part takes gets smplr's level (v²/127² × volume 90 × centred pan)", () => {
  for (const { part } of samples) {
    for (let v = part.velLow ?? 1; v <= (part.velHigh ?? 127); v++) {
      const smplr = ((v * v) / 16129) * ((90 * 90) / 16129) * Math.SQRT1_2;
      assert.ok(Math.abs(smplrMatchedPeak(v) - smplr) < 1e-12);
      assert.ok(smplrMatchedPeak(v) > 0);
    }
  }
});
