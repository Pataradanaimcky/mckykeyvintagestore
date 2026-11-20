import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AWM_ENV,
  base64Body,
  heldLevel,
  noteNameToMidi,
  parseMidiJs,
  pickFormat,
  recordedNotes,
  releaseSteps,
  smplrMatchedPeak,
  soundfontUrl,
} from "../src/lib/sim/sampler.ts";

test("note names in midi-js files map to MIDI numbers", () => {
  assert.equal(noteNameToMidi("C4"), 60);
  assert.equal(noteNameToMidi("A0"), 21);
  assert.equal(noteNameToMidi("Bb0"), 22);
  assert.equal(noteNameToMidi("Db4"), 61);
  assert.equal(noteNameToMidi("C#4"), 61);
  assert.equal(noteNameToMidi("C8"), 108);
  assert.equal(noteNameToMidi("C-1"), 0);
  assert.equal(noteNameToMidi("Cb-1"), null);
  assert.equal(noteNameToMidi("H2"), null);
  assert.equal(noteNameToMidi(""), null);
});

const FILE = `if (typeof(MIDI) === 'undefined') var MIDI = {};
if (typeof(MIDI.Soundfont) === 'undefined') MIDI.Soundfont = {};
MIDI.Soundfont.acoustic_grand_piano = {
"A0": "data:audio/ogg;base64,AAAA",
"Bb0": "data:audio/ogg;base64,BBBB",
"C4": "data:audio/ogg;base64,CCCC",
}
`;

test("a midi-js soundfont file is read, trailing comma included", () => {
  const f = parseMidiJs(FILE);
  assert.deepEqual(Object.keys(f), ["A0", "Bb0", "C4"]);
  assert.equal(base64Body(f.C4), "CCCC");
  assert.deepEqual(recordedNotes(f).map((n) => n.midi), [21, 22, 60]);
});

test("a file without a trailing comma also reads; other text throws", () => {
  assert.deepEqual(Object.keys(parseMidiJs('MIDI.Soundfont.x = {"C4": "data:a;base64,QQ=="}')), ["C4"]);
  assert.throws(() => parseMidiJs("<html>404</html>"));
  assert.throws(() => parseMidiJs("MIDI.Soundfont.x = [1,2]"));
});

test("unknown names and non-text entries are left out", () => {
  const f = parseMidiJs('MIDI.Soundfont.x = {"C4": "data:a;base64,QQ==", "meta": "x", "n": 3}');
  assert.deepEqual(Object.keys(f), ["C4", "meta"]);
  assert.deepEqual(recordedNotes(f), [{ midi: 60, name: "C4" }]);
});

test("same file and format choice as smplr", () => {
  assert.equal(pickFormat(true, false), "ogg");
  assert.equal(pickFormat(true, true), "mp3");
  assert.equal(pickFormat(false, false), "mp3");
  assert.equal(
    soundfontUrl("acoustic_grand_piano", "ogg"),
    "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-ogg.js",
  );
  assert.throws(() => soundfontUrl("../x", "ogg"));
  assert.throws(() => soundfontUrl("piano", "mp3", "a/b"));
});

test("peak level matches the smplr path (note gain v²/127² × channel volume 90 × centred panner 1/√2)", () => {
  for (const v of [1, 30, 64, 102, 127]) {
    const smplr = ((v * v) / 16129) * ((90 * 90) / 16129) * Math.SQRT1_2;
    assert.ok(Math.abs(smplrMatchedPeak(v) - smplr) < 1e-12);
  }
  assert.equal(smplrMatchedPeak(200), smplrMatchedPeak(127));
  assert.equal(smplrMatchedPeak(-5), 0);
});

test("AWM2 envelope: full level within a few ms, 0.3 s release like smplr", () => {
  assert.equal(heldLevel(0.01, AWM_ENV), 1);
  assert.equal(heldLevel(5, AWM_ENV), 1);
  const steps = releaseSteps(2, 0, 0.5, AWM_ENV);
  assert.deepEqual(steps[0], { at: 2, value: 0.5, ramp: "set" });
  assert.equal(steps[1].value, 0);
  assert.ok(Math.abs(steps[1].at - 2.3) < 1e-9);
});
