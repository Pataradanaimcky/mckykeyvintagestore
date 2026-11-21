import { test } from "node:test";
import assert from "node:assert/strict";
import { ASSIGN_KNOB_COUNT, assignKnobsOf, assignStartsOf, MODX_DEFAULT_CC, PERFORMANCES, partControls, pressAssign } from "../src/lib/sim/modx.ts";

test("[ASSIGN] switches the four knobs between Assign 1–4 and Assign 5–8", () => {
  assert.equal(pressAssign(0), 4);
  assert.equal(pressAssign(4), 0);
  assert.equal(pressAssign(pressAssign(0)), 0);
  // Two sets of four cover all eight knobs.
  assert.equal(pressAssign(0) + 4, ASSIGN_KNOB_COUNT);
});

test("every Performance has Knobs 1–8, one per default CC 17–24", () => {
  assert.equal(MODX_DEFAULT_CC.assignKnobs.length, ASSIGN_KNOB_COUNT);
  for (const perf of PERFORMANCES) assert.equal(assignKnobsOf(perf).length, ASSIGN_KNOB_COUNT);
});

test("at their start positions Knobs 1–8 leave every Performance sounding as before", () => {
  for (const perf of PERFORMANCES) {
    const knobs = assignKnobsOf(perf);
    const starts = assignStartsOf(knobs);
    perf.parts.forEach((p, i) => {
      for (const sk of [0, 0.4, 1]) {
        const before = partControls(perf, i, p.level, sk);
        const after = partControls(perf, i, p.level, sk, knobs, starts);
        assert.ok(Math.abs(before.level - after.level) < 1e-12, `${perf.name} part ${i + 1} level`);
        assert.equal(after.cutoff === undefined, before.cutoff === undefined);
        if (before.cutoff !== undefined) assert.ok(Math.abs(before.cutoff - after.cutoff!) < 1e-12);
        assert.equal(after.bright, p.engine === "AWM2" ? 1 : undefined, `${perf.name} part ${i + 1} bright`);
      }
    });
  }
});

test("Knob 1 CUTOFF moves AN-X parts only, within 0..1", () => {
  const perf = PERFORMANCES.find((p) => p.name === "MCKY Bass & Lead")!;
  const knobs = assignKnobsOf(perf);
  assert.equal(knobs[0].name, "CUTOFF");
  const at = (v: number) => partControls(perf, 0, 1, 0.4, knobs, [v, 1]).cutoff!;
  assert.ok(at(0) < at(0.5) && at(0.5) < at(1));
  for (const v of [0, 1]) assert.ok(at(v) >= 0 && at(v) <= 1);
  const piano = PERFORMANCES.find((p) => p.name === "MCKY Split Bass/Piano")!;
  const pk = assignKnobsOf(piano);
  assert.equal(pk[0].targets.length, 0);
  assert.equal(partControls(piano, 1, 0.8, 0.8, pk, [0, 1]).cutoff, undefined);
});

test("Knob 2 LAYER turns down every part but Part 1", () => {
  const perf = PERFORMANCES.find((p) => p.name === "MCKY EP & Strings")!;
  const knobs = assignKnobsOf(perf);
  assert.equal(knobs[1].name, "LAYER");
  const values = [0.5, 0];
  assert.equal(partControls(perf, 0, 0.8, 0.4, knobs, values).level, partControls(perf, 0, 0.8, 0.4).level);
  assert.equal(partControls(perf, 1, 0.8, 0.4, knobs, values).level, 0);
  assert.equal(partControls(perf, 2, 0.8, 0.4, knobs, values).level, 0);
});

test("Knob 3 BRIGHT closes the low-pass of AWM2 parts only, from open at its start", () => {
  const perf = PERFORMANCES.find((p) => p.parts.some((x) => x.engine === "AWM2") && p.parts.some((x) => x.engine !== "AWM2"))!;
  const knobs = assignKnobsOf(perf);
  assert.equal(knobs[2].name, "BRIGHT");
  assert.equal(knobs[2].start, 1);
  perf.parts.forEach((p, i) => {
    const at = (v: number) => partControls(perf, i, 0.8, 0.4, knobs, [0.5, 1, v]);
    if (p.engine === "AWM2") {
      assert.equal(at(1).bright, 1);
      assert.equal(at(0.25).bright, 0.25);
      assert.equal(at(0).bright, 0);
      assert.equal(at(0).level, at(1).level, "BRIGHT does not change the level");
    } else {
      assert.equal(at(0).bright, undefined);
      assert.deepEqual(at(0), at(1));
    }
  });
  for (const perf of PERFORMANCES) {
    const hasAwm = perf.parts.some((p) => p.engine === "AWM2");
    assert.equal(assignKnobsOf(perf)[2].targets.length > 0, hasAwm, perf.name);
  }
});

test("Knobs 4–8 move nothing in the store's Performances", () => {
  for (const perf of PERFORMANCES) for (const k of assignKnobsOf(perf).slice(3)) assert.equal(k.targets.length, 0);
});
