import { test } from "node:test";
import assert from "node:assert/strict";
import { inLimit, KNOB_POSITION_DEFAULTS, MAX_PARTS, midiVelocity, morph, noteName, PERFORMANCES, partControls, partsForNote, pressKnobPosition, pressPartSelect, pressScene, SCENE_COUNT, scenesOf, SCREEN_VELOCITY, storeScene, VEL_MAX, VEL_MIN } from "../src/lib/sim/modx.ts";

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
    for (const part of p.parts) assert.ok(part.engine === "AWM2" ? !!part.gm : part.engine === "FM-X" ? !!part.fm : !!part.an);
  }
});

test("note names use middle C = C3", () => {
  assert.equal(noteName(60), "C3");
  assert.equal(noteName(53), "F2");
});

test("SCENE recalls; SHIFT + SCENE stores and recalls nothing", () => {
  const scenes = scenesOf(PERFORMANCES[0]);
  const now = { levels: [0.3, 0.9], mutes: [true, false], knob: 0.7 };
  const recall = pressScene(scenes, 2, false, now);
  assert.deepEqual(recall.recall, scenes[2]);
  assert.deepEqual(recall.scenes, scenes);
  const stored = pressScene(scenes, 2, true, now);
  assert.equal(stored.recall, null);
  assert.deepEqual(stored.scenes[2], { levels: [0.3, 0.9], mutes: [true, false], knob: 0.7 });
  assert.equal(stored.scenes[1], scenes[1]);
  assert.notEqual(stored.scenes[2], scenes[2]);
});

test("KNOB POSITION: a press recalls, [SHIFT] + press saves the current Super Knob value", () => {
  const start = KNOB_POSITION_DEFAULTS.slice();
  assert.deepEqual(start, [0, 0.5, 1]);
  const recall = pressKnobPosition(start, 1, false, 0.9);
  assert.equal(recall.recall, 0.5);
  assert.deepEqual(recall.positions, start);
  const saved = pressKnobPosition(start, 0, true, 0.3);
  assert.equal(saved.recall, null);
  assert.deepEqual(saved.positions, [0.3, 0.5, 1]);
  assert.equal(pressKnobPosition(saved.positions, 0, false, 1).recall, 0.3);
  assert.equal(pressKnobPosition(start, 2, true, 7).positions[2], 1);
  assert.deepEqual(start, [0, 0.5, 1], "the input is not changed");
});

test("[SHIFT] + [PART SELECT] mutes and unmutes only the selected part; a plain press does nothing", () => {
  const mutes = [false, false, false];
  assert.deepEqual(pressPartSelect(mutes, 1, false), mutes);
  const once = pressPartSelect(mutes, 1, true);
  assert.deepEqual(once, [false, true, false]);
  assert.deepEqual(pressPartSelect(once, 1, true), mutes);
  assert.deepEqual(pressPartSelect(mutes, 5, true), mutes);
});

test("Note Limit and Velocity Limit: first value above the second plays outside the gap", () => {
  assert.equal(inLimit(40, 34, 93), true);
  assert.equal(inLimit(33, 34, 93), false);
  // Yamaha's example: 93 to 34 plays 1–34 and 93–127.
  for (const [v, plays] of [[1, true], [34, true], [35, false], [92, false], [93, true], [127, true]] as const) assert.equal(inLimit(v, 93, 34), plays);
  // Yamaha's example: C5 to C4 (Yamaha names, MIDI 84 to 72) has no sound between them.
  const gap = { name: "gap", parts: [{ name: "x", engine: "AN-X" as const, low: 84, high: 72, level: 1 }], knob: [], knobStart: 0 };
  assert.deepEqual([72, 73, 83, 84].map((n) => partsForNote(gap, n).length), [1, 0, 0, 1]);
});

test("a part's Velocity Limit decides whether it joins the note", () => {
  const ep = PERFORMANCES.find((p) => p.name === "MCKY EP & Strings")!;
  assert.deepEqual(partsForNote(ep, 60, [], 79), [0, 1]);
  assert.deepEqual(partsForNote(ep, 60, [], 80), [0, 1, 2]);
  assert.deepEqual(partsForNote(ep, 60), [0, 1, 2], "without a velocity the limit is not used");
  assert.deepEqual(partsForNote(ep, 60, [false, false, true], 127), [0, 1]);
});

test("velocity converts to MIDI 1..127", () => {
  assert.equal(midiVelocity(0), 1);
  assert.equal(midiVelocity(1), 127);
  for (let v = 1; v <= 127; v++) assert.equal(midiVelocity(v / 127), v);
});

test("store parts have valid Velocity Limits and all still sound from the on-screen keys", () => {
  const screen = midiVelocity(SCREEN_VELOCITY);
  for (const perf of PERFORMANCES)
    perf.parts.forEach((p, i) => {
      for (const v of [p.velLow ?? VEL_MIN, p.velHigh ?? VEL_MAX]) assert.ok(Number.isInteger(v) && v >= VEL_MIN && v <= VEL_MAX, `${perf.name} ${p.name}`);
      assert.ok(inLimit(screen, p.velLow ?? VEL_MIN, p.velHigh ?? VEL_MAX), `${perf.name} part ${i + 1} is silent from the on-screen keys`);
    });
});
