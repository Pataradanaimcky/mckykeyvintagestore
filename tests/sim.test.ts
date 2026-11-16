import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_PARTS, morph, noteName, PERFORMANCES, partControls, partsForNote, SCENE_COUNT, scenesOf, storeScene } from "../src/lib/sim/modx.ts";

const split = PERFORMANCES.find((p) => p.name.includes("Split"))!;

test("split Performance sends each note to the part whose range holds it", () => {
  assert.deepEqual(partsForNote(split, 40), [0]);
  assert.deepEqual(partsForNote(split, 72), [1]);
  assert.deepEqual(partsForNote(split, 72, [false, true]), []);
});

test("layer Performance sends a note to every part", () => {
  assert.deepEqual(partsForNote(PERFORMANCES[0], 60), [0, 1]);
});

test("Super Knob moves level and cutoff in a straight line", () => {
  assert.equal(morph({ part: 0, param: "level", from: 0, to: 1 }, 0.25), 0.25);
  const ep = PERFORMANCES[1];
  const left = partControls(ep, 1, 1, 0);
  const right = partControls(ep, 1, 1, 1);
  assert.ok(Math.abs(left.level - 0.1) < 1e-9 && Math.abs(right.level - 1) < 1e-9);
  assert.ok(left.cutoff! < right.cutoff!);
  assert.equal(partControls(ep, 0, 0.5, 1).level, 0.5);
});

test("scenes: eight per Performance, and storing replaces one slot only", () => {
  const scenes = scenesOf(PERFORMANCES[0]);
  assert.equal(scenes.length, SCENE_COUNT);
  const next = storeScene(scenes, 3, [0.1, 0.2], [false, true], 2);
  assert.deepEqual(next[3], { levels: [0.1, 0.2], mutes: [false, true], knob: 1 });
  assert.equal(next[2], scenes[2]);
});

test("store Performances stay within the keyboard's eight keyboard parts and have store names", () => {
  assert.equal(PERFORMANCES.length, 8);
  for (const p of PERFORMANCES) {
    assert.ok(p.parts.length >= 1 && p.parts.length <= MAX_PARTS);
    assert.ok(p.name.startsWith("MCKY "));
    for (const part of p.parts) assert.ok(part.engine === "AWM2" ? !!part.gm : !!part.an);
  }
});

test("note names use middle C = C3", () => {
  assert.equal(noteName(60), "C3");
  assert.equal(noteName(53), "F2");
});
