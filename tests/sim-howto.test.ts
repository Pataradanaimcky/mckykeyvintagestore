import { test } from "node:test";
import assert from "node:assert/strict";
import { computerKeysText, FANTOM_HOW_TO, MODX_HOW_TO, UNTESTED } from "../src/components/rack/sim/howto.ts";
import { KEYS } from "../src/components/rack/patch.ts";

const all = (s: { lines: string[] }[]) => s.flatMap((x) => x.lines).join("\n");

test("computer keys in the fold come from the rack's own key map", () => {
  const text = computerKeysText();
  for (const k of KEYS) assert.ok(text.includes(k.key.toUpperCase()), k.key);
  assert.match(text, /^คีย์คอมพิวเตอร์: A S D F G H J K = คีย์ขาว C ถึง C · W E T Y U = คีย์ดำ$/);
});

for (const [name, sections, model] of [
  ["MODX M", MODX_HOW_TO, "MODX M"],
  ["FANTOM-0", FANTOM_HOW_TO, "FANTOM-0"],
] as const) {
  test(`${name} fold: says it is an emulation, USB is untested, and names Chrome / Edge`, () => {
    const text = all(sections);
    assert.ok(text.includes(`จำลองการทำงานแบบ ${model} ไม่ใช่เสียงจริงของเครื่อง`));
    assert.ok(text.includes("Chrome หรือ Edge"));
    assert.ok(text.includes("ไม่มี Web MIDI"));
    const usb = sections.flatMap((s) => s.lines).filter((l) => /^คีย์บอร์ดจริง:|^LEARN:/.test(l));
    assert.ok(usb.length >= 2);
    for (const l of usb) assert.ok(l.includes(UNTESTED), l);
  });

  test(`${name} fold: no empty or duplicate lines, short enough for a phone`, () => {
    const lines = sections.flatMap((s) => s.lines);
    assert.equal(new Set(lines).size, lines.length);
    assert.equal(new Set(sections.map((s) => s.heading)).size, sections.length);
    for (const l of lines) {
      assert.ok(l.trim().length > 0);
      assert.ok(l.length <= 220, l);
    }
  });
}

test("store-made parts are said to be the store's reading", () => {
  assert.match(all(MODX_HOW_TO), /ASSIGN.*การอ่านของร้าน/);
  assert.match(all(MODX_HOW_TO), /Split Point.*การอ่านของร้าน/);
  assert.match(all(FANTOM_HOW_TO), /Pad เลือก Scene \(ทางลัดของร้าน/);
});
