import { test } from "node:test";
import assert from "node:assert/strict";
import { applySplitJob, clearSplitGroups, newSplitJob, pressSplitGroup, setSplitCount, setSplitPoint, SPLIT_POINT_MAX, SPLIT_POINT_MIN, splitGroupRanges, inLimit, KNOB_POSITION_DEFAULTS, NOTE_MAX, NOTE_MIN, rangeFromKnob, rangesOf, rangeToKnob, setRangeField, stepRangeField, withRanges, MAX_PARTS, midiVelocity, morph, noteName, PERFORMANCES, partControls, partsForNote, pressKnobPosition, pressPartSelect, pressScene, SCENE_COUNT, scenesOf, SCREEN_VELOCITY, storeScene, VEL_MAX, VEL_MIN } from "../src/lib/sim/modx.ts";

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

test("Part limits start from the Performance and leave it untouched when edited", () => {
  const ep = PERFORMANCES[1];
  const start = rangesOf(ep);
  assert.deepEqual(start[0], { low: 0, high: 127, velLow: VEL_MIN, velHigh: VEL_MAX });
  assert.deepEqual(start[2], { low: 0, high: 127, velLow: 80, velHigh: 127 });
  const next = setRangeField(start, 0, "high", 59);
  assert.equal(next[0].high, 59);
  assert.equal(start[0].high, 127, "the old list is not changed");
  assert.equal(ep.parts[0].high, 127, "the store's Performance is not changed");
});

test("Part limits stay inside Yamaha's printed ranges", () => {
  const start = rangesOf(PERFORMANCES[0]);
  assert.equal(setRangeField(start, 0, "low", -5)[0].low, NOTE_MIN);
  assert.equal(setRangeField(start, 0, "high", 200)[0].high, NOTE_MAX);
  assert.equal(setRangeField(start, 0, "velLow", 0)[0].velLow, VEL_MIN, "velocity starts at 1, notes at 0");
  assert.equal(setRangeField(start, 0, "velHigh", 60.6)[0].velHigh, 61);
  assert.deepEqual(setRangeField(start, 0, "low", Number.NaN), start);
  assert.deepEqual(setRangeField(start, 9, "low", 10), start);
});

test("INC and DEC stop at the ends", () => {
  const start = rangesOf(PERFORMANCES[0]);
  assert.equal(stepRangeField(start, 0, "low", -1)[0].low, NOTE_MIN);
  assert.equal(stepRangeField(start, 0, "low", 1)[0].low, 1);
  assert.equal(stepRangeField(start, 0, "velHigh", 1)[0].velHigh, VEL_MAX);
});

test("DATA knob reaches every value of a limit and returns the same value", () => {
  for (const field of ["low", "velLow"] as const) {
    const first = field === "low" ? NOTE_MIN : VEL_MIN;
    for (let v = first; v <= 127; v++) assert.equal(rangeFromKnob(field, rangeToKnob(field, v)), v);
  }
});

test("edited limits decide which parts sound, including a first value above the second", () => {
  const perf = PERFORMANCES[0];
  let ranges = setRangeField(rangesOf(perf), 0, "high", 59);
  ranges = setRangeField(ranges, 1, "low", 60);
  const split = withRanges(perf, ranges);
  assert.deepEqual(partsForNote(split, 59), [0]);
  assert.deepEqual(partsForNote(split, 60), [1]);
  const gap = withRanges(perf, setRangeField(setRangeField(rangesOf(perf), 0, "low", 84), 0, "high", 72));
  assert.deepEqual([72, 73, 83, 84].map((n) => partsForNote(gap, n).includes(0)), [true, false, false, true]);
  const soft = withRanges(perf, setRangeField(rangesOf(perf), 1, "velHigh", 50));
  assert.deepEqual(partsForNote(soft, 60, [], 51), [0]);
  assert.deepEqual(partsForNote(soft, 60, [], 50), [0, 1]);
});

test("Split Job: Groups cover the whole keyboard with no gap, whatever the Split Points", () => {
  for (const count of [1, 2, 3] as const) {
    const keys = splitGroupRanges(setSplitCount(newSplitJob(2), count));
    assert.equal(keys.length, count + 1);
    assert.equal(keys[0].low, NOTE_MIN);
    assert.equal(keys[count].high, NOTE_MAX);
    keys.slice(1).forEach((k, i) => assert.equal(k.low, keys[i].high + 1));
  }
});

test("Split Points stay in Yamaha's printed range and keep at least one key per Group", () => {
  let job = setSplitCount(newSplitJob(1), 3);
  job = setSplitPoint(job, 0, -4);
  assert.equal(job.points[0], SPLIT_POINT_MIN, "C#-2 is the lowest");
  job = setSplitPoint(job, 2, 500);
  assert.equal(job.points[2], SPLIT_POINT_MAX, "G8 is the highest");
  job = setSplitPoint(job, 1, 200);
  assert.equal(job.points[1], SPLIT_POINT_MAX - 1, "stops under the next point");
  job = setSplitPoint(job, 0, 200);
  assert.equal(job.points[0], SPLIT_POINT_MAX - 2);
  for (const k of splitGroupRanges(job)) assert.ok(k.low <= k.high);
  assert.deepEqual(setSplitPoint(job, 0, Number.NaN), job);
  assert.deepEqual(setSplitPoint(setSplitCount(job, 1), 2, 40).points, setSplitCount(job, 1).points, "a point not in use does not move");
});

test("adding Split Points keeps them rising", () => {
  const high = setSplitPoint(newSplitJob(1), 0, SPLIT_POINT_MAX);
  const three = setSplitCount(high, 3);
  assert.deepEqual(three.points, [SPLIT_POINT_MAX - 2, SPLIT_POINT_MAX - 1, SPLIT_POINT_MAX]);
});

test("Group buttons: a press replaces, SHIFT adds or removes, × clears", () => {
  let job = setSplitCount(newSplitJob(2), 3);
  job = pressSplitGroup(job, 0, 2, false);
  job = pressSplitGroup(job, 0, 0, false);
  assert.deepEqual(job.groups[0], [0]);
  job = pressSplitGroup(job, 0, 3, true);
  assert.deepEqual(job.groups[0], [0, 3]);
  job = pressSplitGroup(job, 0, 0, true);
  assert.deepEqual(job.groups[0], [3]);
  assert.deepEqual(clearSplitGroups(job, 0).groups[0], []);
  assert.deepEqual(pressSplitGroup(newSplitJob(1), 0, 2, false).groups[0], [], "with one Split Point there are only Groups A and B");
  assert.deepEqual(pressSplitGroup(job, 9, 0, false), job);
});

test("Done writes Note Limits for Parts in a Group and leaves the rest", () => {
  const perf = PERFORMANCES[1];
  const start = rangesOf(perf);
  let job = setSplitPoint(newSplitJob(perf.parts.length), 0, 60);
  job = pressSplitGroup(job, 0, 0, false);
  job = pressSplitGroup(job, 1, 1, false);
  const done = applySplitJob(start, job);
  assert.deepEqual([done[0].low, done[0].high], [NOTE_MIN, 59]);
  assert.deepEqual([done[1].low, done[1].high], [60, NOTE_MAX]);
  assert.deepEqual(done[2], start[2], "a Part in no Group stays as it was");
  assert.equal(done[0].velLow, start[0].velLow, "Velocity Limit is not touched");
  const played = withRanges(perf, done);
  assert.deepEqual(partsForNote(played, 59), [0, 2]);
  assert.deepEqual(partsForNote(played, 60), [1, 2]);
});

test("a Part in Groups A and C also plays B between them; Groups no longer in use are dropped", () => {
  let job = setSplitCount(newSplitJob(1), 3);
  job = pressSplitGroup(pressSplitGroup(job, 0, 0, false), 0, 2, true);
  const [r] = applySplitJob(rangesOf({ ...PERFORMANCES[0], parts: [PERFORMANCES[0].parts[0]] }), job);
  assert.deepEqual([r.low, r.high], [NOTE_MIN, job.points[2] - 1]);
  const fewer = setSplitCount(pressSplitGroup(job, 0, 3, false), 1);
  const start = rangesOf({ ...PERFORMANCES[0], parts: [PERFORMANCES[0].parts[0]] });
  assert.deepEqual(applySplitJob(start, fewer), start);
});
