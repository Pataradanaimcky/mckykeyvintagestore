import assert from "node:assert/strict";
import { test } from "node:test";
import { DX7_RECEIVE_LABEL } from "../src/lib/studio/dx7.ts";
import { FANTOM_RECEIVE_LABEL } from "../src/lib/studio/fantom.ts";
import { MODX_RECEIVE_LABEL } from "../src/lib/studio/modxm.ts";

test("every read-only receive button says it is not tested on a real keyboard (ROADMAP Next 2)", () => {
  const labels: [string, string][] = [
    [DX7_RECEIVE_LABEL, "DX7"],
    [MODX_RECEIVE_LABEL, "MODX M"],
    [FANTOM_RECEIVE_LABEL, "FANTOM-0"],
  ];
  for (const [label, keyboard] of labels) {
    assert.ok(label.includes(keyboard), label);
    assert.ok(label.endsWith("(ยังไม่ได้ทดสอบกับเครื่องจริง)"), label);
  }
});
