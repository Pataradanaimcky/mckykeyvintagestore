import assert from "node:assert/strict";
import { test } from "node:test";
import { duplicateVoices, emptyLayout, fillEmpty, newItem, shelveDuplicates, swapHalves, type Layout } from "../src/lib/studio/library.ts";

const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
function voice(fill: number, name: string) {
  const p = new Uint8Array(155).fill(fill);
  for (let i = 0; i < 10; i++) p[145 + i] = (name.padEnd(10, " ")).charCodeAt(i);
  return b64(p);
}

function cart(): Layout {
  const pool = [
    newItem("PIANO", voice(1, "PIANO")),
    newItem("BASS", voice(2, "BASS")),
    newItem("PIANO 2", voice(1, "PIANO 2")), // same sound, other name
    newItem("BRASS", voice(3, "BRASS")),
  ];
  return fillEmpty({ ...emptyLayout("dx7"), pool: [...pool, newItem("BASS", voice(2, "BASS"))] });
}

test("duplicate voices are found by sound, not by name", () => {
  const l = cart();
  const dups = duplicateVoices(l);
  const s = l.pages[0];
  assert.equal(dups.size, 2);
  assert.equal(dups.get(s[2]!.id), s[0]!.id);
  assert.equal(dups.get(s[4]!.id), s[1]!.id);
});

test("shelving duplicates keeps the first copy in the cartridge", () => {
  const l = shelveDuplicates(cart());
  assert.deepEqual(l.pages[0].slice(0, 5).map((x) => x?.name ?? "-"), ["PIANO", "BASS", "-", "BRASS", "-"]);
  assert.deepEqual(l.pool.map((x) => x.name), ["PIANO 2", "BASS"]);
  assert.equal(duplicateVoices(shelveDuplicates(l)).size, 2, "copies on the shelf are still known");
  assert.strictEqual(shelveDuplicates(l), l, "nothing left to move");
});

test("swapping halves puts voices 17–32 first and keeps their order", () => {
  const l = cart();
  const s = swapHalves(l, 0);
  assert.equal(s.pages[0][16]?.name, "PIANO");
  assert.equal(s.pages[0][20]?.name, "BASS");
  assert.equal(s.pages[0][0], null);
  assert.deepEqual(swapHalves(s, 0).pages[0], l.pages[0]);
});
