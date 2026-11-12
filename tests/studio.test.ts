import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeArrangement,
  encodeArrangement,
  fitToMachine,
  movePart,
  parseArrangement,
  routeNote,
  setupSheet,
  starterArrangement,
  twoPartMode,
} from "../src/lib/studio/arrangement.ts";
import { keyboardRange, noteName } from "../src/lib/studio/machines.ts";

test("note names follow each maker's convention for middle C", () => {
  assert.equal(noteName(60, "yamaha"), "C3");
  assert.equal(noteName(60, "roland"), "C4");
  assert.equal(noteName(21, "roland"), "A0");
});

test("keyboard sizes map to the usual note ranges", () => {
  assert.deepEqual(keyboardRange(61), { lo: 36, hi: 96 });
  assert.deepEqual(keyboardRange(88), { lo: 21, hi: 108 });
});

test("a split sends each hand to its own part", () => {
  const a = starterArrangement("modx-m");
  const [upper, lower] = a.parts;
  assert.deepEqual(routeNote(a, 72, 100).map((r) => r.part.id), [upper.id]);
  assert.deepEqual(routeNote(a, 48, 100).map((r) => r.part.id), [lower.id]);
});

test("muted parts, velocity limits and octave shift are applied", () => {
  const a = starterArrangement();
  a.parts[0] = { ...a.parts[0], velLo: 100, octave: 1 };
  assert.equal(routeNote(a, 72, 80).length, 0);
  assert.equal(routeNote(a, 72, 110)[0].note, 84);
  a.parts[0] = { ...a.parts[0], on: false };
  assert.equal(routeNote(a, 72, 110).length, 0);
});

test("moving a part reorders without losing any", () => {
  const a = starterArrangement();
  const moved = movePart(a.parts, 0, 1);
  assert.deepEqual(moved.map((p) => p.id), [a.parts[1].id, a.parts[0].id]);
  assert.equal(movePart(a.parts, 0, 9), a.parts);
});

test("two-part keyboards report Split or Dual", () => {
  const a = starterArrangement("xps-10");
  assert.deepEqual(twoPartMode(a.parts), { mode: "Split", splitPoint: 60 });
  const dual = a.parts.map((p) => ({ ...p, lo: 36, hi: 96 }));
  assert.equal(twoPartMode(dual).mode, "Dual");
});

test("switching keyboards keeps only the parts it has room for", () => {
  const a = starterArrangement("modx-m");
  a.parts.push({ ...a.parts[0], id: "x" });
  const fitted = fitToMachine(a, "xps-10");
  assert.equal(fitted.parts.length, 2);
  assert.equal(fitted.keys, 61);
});

test("share links round-trip and reject junk", () => {
  const a = starterArrangement("fantom-0");
  const back = decodeArrangement(encodeArrangement(a));
  assert.ok(back);
  assert.equal(back.machine, "fantom-0");
  assert.equal(back.parts.length, 2);
  assert.equal(back.parts[0].lo, a.parts[0].lo);
  assert.equal(decodeArrangement("not-a-link"), null);
  assert.equal(parseArrangement({ version: 2, parts: [] }), null);
});

test("imported values are clamped to safe ranges", () => {
  const a = parseArrangement({
    version: 1,
    machine: "modx-m",
    keys: 61,
    title: "x",
    parts: [{ level: 999, pan: -500, octave: 9, lo: 90, hi: 10, channel: 40, sound: "<b>".repeat(50), preview: { engine: "syx", data: "!!" } }],
  });
  assert.ok(a);
  const p = a.parts[0];
  assert.equal(p.level, 127);
  assert.equal(p.pan, -64);
  assert.equal(p.octave, 3);
  assert.ok(p.hi >= p.lo);
  assert.equal(p.channel, 16);
  assert.equal(p.sound.length, 40);
  assert.equal(p.preview.engine, "none");
});

test("setup sheet uses the keyboard's own words", () => {
  const sheet = setupSheet(starterArrangement("modx-m"));
  assert.match(sheet, /Note Limit: C3 – C6/);
  assert.match(sheet, /Part 2/);
  const roland = setupSheet(starterArrangement("xps-10"));
  assert.match(roland, /Split · จุดแบ่ง C4/);
  assert.match(roland, /Upper/);
});
