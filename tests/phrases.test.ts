import assert from "node:assert/strict";
import { test } from "node:test";
import { getPhrase, PHRASES, phraseFor } from "../src/lib/demo/phrases.ts";

test("every phrase fits inside its loop and uses playable notes", () => {
  for (const p of PHRASES) {
    assert.ok(p.events.length > 0, p.id);
    for (const e of p.events) {
      assert.ok(e.at >= 0 && e.at + e.len <= p.beats + 0.01, `${p.id} ${e.at}`);
      for (const n of e.notes) assert.ok(n >= 24 && n <= 96);
    }
  }
});

test("each patch gets the phrase that suits it", () => {
  assert.equal(phraseFor("Bass"), "bass");
  assert.equal(phraseFor("SYN BASS"), "bass");
  assert.equal(phraseFor("Ld"), "melody");
  assert.equal(phraseFor("KHLUI"), "melody");
  assert.equal(phraseFor("Pf"), "ballad");
  assert.equal(phraseFor("TUBE BELL"), "ballad");
  assert.equal(phraseFor("Key"), "chords");
  assert.equal(phraseFor("Pad"), "chords");
  assert.equal(getPhrase("nope").id, "chords");
});
