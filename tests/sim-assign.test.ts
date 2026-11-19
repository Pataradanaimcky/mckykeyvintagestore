import { test } from "node:test";
import assert from "node:assert/strict";
import { ASSIGN_KNOB_COUNT, assignKnobsOf, assignStartsOf, MODX_DEFAULT_CC, PERFORMANCES, partControls } from "../src/lib/sim/modx.ts";

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

test("Knobs 3–8 move nothing in the store's Performances", () => {
  for (const perf of PERFORMANCES) for (const k of assignKnobsOf(perf).slice(2)) assert.equal(k.targets.length, 0);
});
