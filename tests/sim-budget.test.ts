import { test } from "node:test";
import assert from "node:assert/strict";
import { PERFORMANCES, type Performance } from "../src/lib/sim/modx.ts";
import { asPerformance, FANTOM_SCENES } from "../src/lib/sim/fantom.ts";

/**
 * The heaviest store presets measured for docs/SIMULATOR.md (S7). A new preset above these numbers
 * has not been measured: run the S7 check again before raising them.
 */
const BUDGET = { channels: 5, fmParts: 1, synthParts: 4 };

const count = (p: Performance) => ({
  channels: p.parts.length,
  fmParts: p.parts.filter((x) => x.engine === "FM-X").length,
  synthParts: p.parts.filter((x) => x.engine !== "AWM2").length,
});

test("store Performances and Scenes stay within the measured phone budget", () => {
  for (const p of [...PERFORMANCES, ...FANTOM_SCENES.map(asPerformance)]) {
    const c = count(p);
    assert.ok(c.channels <= BUDGET.channels, `${p.name}: ${c.channels} channels`);
    assert.ok(c.fmParts <= BUDGET.fmParts, `${p.name}: ${c.fmParts} FM-X parts`);
    assert.ok(c.synthParts <= BUDGET.synthParts, `${p.name}: ${c.synthParts} AN-X / VA / FM-X parts`);
  }
});
