import { test } from "node:test";
import assert from "node:assert/strict";
import { asPerformance, FANTOM_SCENES, noteName, PAD_COUNT, panText, setSplit, SPLIT_LOWER, SPLIT_UPPER, toggleZone, ZONE_COUNT, zoneRange, zonesForNote } from "../src/lib/sim/fantom.ts";

const grand = FANTOM_SCENES[0];
const onOf = (s: (typeof FANTOM_SCENES)[number]) => s.zones.map((z) => z.on);

test("store Scenes: at least 8, each with zones 1 and 4 for SPLIT, within 16 zones and 16 pads", () => {
  assert.ok(FANTOM_SCENES.length >= 8 && FANTOM_SCENES.length <= PAD_COUNT);
  for (const s of FANTOM_SCENES) {
    assert.ok(s.zones.length > SPLIT_LOWER && s.zones.length <= ZONE_COUNT, s.name);
    assert.ok(s.name.startsWith("MCKY"), s.name);
    for (const z of s.zones) assert.ok(z.tone.partial === "PCM" ? !!z.tone.gm : !!z.tone.va, z.tone.name);
  }
  assert.equal(new Set(FANTOM_SCENES.map((s) => s.name)).size, FANTOM_SCENES.length);
});

test("layer: every lit zone sounds; a zone switched off with ZONE INT/EXT does not", () => {
  assert.deepEqual(zonesForNote(grand, 60, onOf(grand)), [0, 1]);
  const off = toggleZone(onOf(grand), 1);
  assert.deepEqual(zonesForNote(grand, 60, off), [0]);
  assert.deepEqual(toggleZone(off, 1), onOf(grand));
  assert.deepEqual(toggleZone(off, 99), off);
});

test("SPLIT + key: zone 1 from the split key up (key included), zone 4 below it", () => {
  const r = setSplit(onOf(grand), 60);
  assert.equal(r.split.key, 60);
  assert.ok(r.on[SPLIT_UPPER] && r.on[SPLIT_LOWER]);
  assert.deepEqual(zoneRange(grand.zones[0], SPLIT_UPPER, r.split), { low: 60, high: 127 });
  assert.deepEqual(zoneRange(grand.zones[3], SPLIT_LOWER, r.split), { low: 0, high: 59 });
  assert.ok(zonesForNote(grand, 60, r.on, r.split).includes(0));
  assert.ok(!zonesForNote(grand, 60, r.on, r.split).includes(3));
  assert.ok(zonesForNote(grand, 59, r.on, r.split).includes(3));
  assert.ok(!zonesForNote(grand, 59, r.on, r.split).includes(0));
  // Zone 2 keeps its written range and keeps layering.
  assert.ok(zonesForNote(grand, 59, r.on, r.split).includes(1));
});

test("written key ranges split without SPLIT", () => {
  const s = FANTOM_SCENES.find((x) => x.name.includes("Split"))!;
  assert.deepEqual(zonesForNote(s, 40, onOf(s)), [3]);
  assert.deepEqual(zonesForNote(s, 72, onOf(s)), [0]);
});

test("Scene as a Performance for the audio engine", () => {
  const p = asPerformance(grand);
  assert.equal(p.parts.length, grand.zones.length);
  assert.equal(p.parts[0].engine, "AWM2");
  assert.equal(p.parts[1].engine, "AN-X");
  assert.equal(p.parts[3].shift, -12);
});

test("display text", () => {
  assert.equal(panText(0.5), "C");
  assert.equal(panText(0), "L50");
  assert.equal(panText(1), "R50");
  assert.equal(noteName(60), "C4");
});
