import assert from "node:assert/strict";
import { test } from "node:test";
import { getSound, guessSound, PREVIEW_SOUNDS } from "../src/lib/studio/sounds.ts";

test("guesses the type of sound from a Performance or Scene name", () => {
  assert.equal(guessSound("CFX Concert"), "piano");
  assert.equal(guessSound("City Pop EP"), "epiano");
  assert.equal(guessSound("Warm Strings"), "strings");
  assert.equal(guessSound("Syn Brass"), "synthbrass");
  assert.equal(guessSound("Brass Section"), "brass");
  assert.equal(guessSound("SLAP BASS"), "bass");
  assert.equal(guessSound("Sub Bass 808"), "synthbass");
  assert.equal(guessSound("Lead 80s"), "lead");
  assert.equal(guessSound("Ranat Thai"), "mallet");
  assert.equal(guessSound("B3 Rock Organ"), "organ");
  assert.equal(guessSound("Something odd"), "piano");
  // Short words only match whole words.
  assert.equal(guessSound("Deep Space"), "piano");
});

test("every preview sound has a unique key and a General MIDI name", () => {
  assert.equal(new Set(PREVIEW_SOUNDS.map((s) => s.key)).size, PREVIEW_SOUNDS.length);
  for (const s of PREVIEW_SOUNDS) assert.match(s.gm, /^[a-z0-9_]+$/);
  assert.equal(getSound("nope").key, "piano");
});
