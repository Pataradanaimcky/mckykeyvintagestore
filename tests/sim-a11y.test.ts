import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { connectLabel, FANTOM_LABELS, hasThai, MODX_LABELS } from "../src/components/rack/sim/a11y.ts";
import { CTRL_KNOBS } from "../src/lib/sim/fantom.ts";

const read = (f: string) => readFileSync(new URL(`../src/components/rack/sim/${f}`, import.meta.url), "utf8");
const PAGES = ["ModxPage.tsx", "FantomPage.tsx"] as const;

/** Every name a page can give, with sample arguments. */
const names = [
  ...Array.from({ length: 8 }, (_, i) => MODX_LABELS.assignKnob(i + 1, "Cutoff")),
  ...Array.from({ length: 8 }, (_, i) => MODX_LABELS.partFader(i + 1)),
  ...Array.from({ length: 8 }, (_, i) => MODX_LABELS.scene(i + 1, false)),
  ...Array.from({ length: 8 }, (_, i) => MODX_LABELS.scene(i + 1, true)),
  MODX_LABELS.superKnob,
  MODX_LABELS.splitData,
  MODX_LABELS.rangeData,
  MODX_LABELS.dec,
  MODX_LABELS.inc,
  MODX_LABELS.keyboardEntry,
  MODX_LABELS.shift,
  MODX_LABELS.splitExit,
  MODX_LABELS.splitDone,
  MODX_LABELS.rangeView("Part - Note"),
  MODX_LABELS.rangeView("Velocity - Note"),
  MODX_LABELS.rangeExit,
  MODX_LABELS.readyMap,
  ...Array.from({ length: 8 }, (_, i) => FANTOM_LABELS.panKnob(i + 1)),
  ...Array.from({ length: 8 }, (_, i) => FANTOM_LABELS.levelFader(i + 1)),
  ...CTRL_KNOBS.map((j) => FANTOM_LABELS.ctrlKnob(j, 1)),
  FANTOM_LABELS.knobMode("PAN/LEVEL"),
  FANTOM_LABELS.knobMode("CTRL"),
  FANTOM_LABELS.split("off"),
  FANTOM_LABELS.split("armed"),
  FANTOM_LABELS.split("on"),
  FANTOM_LABELS.padMode,
  connectLabel("ต่อคีย์บอร์ด USB"),
];

test("every screen-reader name is Thai, not empty, and different from the others", () => {
  for (const n of names) assert.ok(n.trim() && hasThai(n), n);
  assert.equal(new Set(names).size, names.length);
});

test("knob and slider names say how to move them with the arrow keys", () => {
  const moving = names.filter((n) => /^(ปุ่มหมุน |สไลเดอร์)/.test(n));
  assert.ok(moving.length >= 40);
  for (const n of moving) assert.match(n, /ใช้ลูกศรเพื่อ(หมุน|เลื่อน)$/);
});

test("USB connect names say the feature is untested with the real keyboard", () => {
  assert.ok(connectLabel("ต่อแล้ว").includes("ยังไม่ได้ทดสอบกับเครื่องจริง"));
  assert.ok(MODX_LABELS.readyMap.includes("ยังไม่ได้ทดสอบกับเครื่องจริง"));
});

for (const page of PAGES) {
  const src = read(page);

  test(`${page}: every button has a Thai aria-label or Thai text`, () => {
    const buttons = [...src.matchAll(/<button\b([\s\S]*?)(?<!=)>(?!=)([\s\S]*?)<\/button>/g)];
    assert.ok(buttons.length > 10);
    for (const [all, attrs, body] of buttons) {
      const label = attrs.match(/aria-label=(.*)/)?.[1];
      const named = label ? hasThai(label) || /_LABELS\.|connectLabel\(|face\.aria/.test(label) : hasThai(body);
      assert.ok(named, all.slice(0, 160));
    }
  });

  test(`${page}: knobs and sliders go through the named wrappers, selects are named`, () => {
    assert.doesNotMatch(src, /<(Knob|Fader)\b/);
    for (const m of src.matchAll(/<Sim(Knob|Fader)\b([\s\S]*?)\/>/g)) assert.match(m[2], /\bname=\{/, m[0].slice(0, 120));
    for (const m of src.matchAll(/<select\b([\s\S]*?)>/g)) assert.match(m[1], /aria-label=/);
  });

  test(`${page}: no clicks on plain elements and no tab order changes`, () => {
    assert.doesNotMatch(src, /<(div|span|li|p)\b[^>]*\bonClick=/);
    assert.doesNotMatch(src, /tabIndex=\{?[1-9]/);
  });
}

test("the wrappers give each knob and slider a named group", () => {
  const src = read("SimControls.tsx");
  assert.equal(src.match(/role="group" aria-label=\{name\}/g)?.length, 2);
});

test("S14b: knobs and sliders on unused PART/ZONE strips are inert (no Tab stop)", () => {
  const controls = read("SimControls.tsx");
  assert.equal([...controls.matchAll(/inert=\{empty\}/g)].length, 2);
  const strips: Record<string, RegExp[]> = {
    "ModxPage.tsx": [/<SimFader\s+name=\{MODX_LABELS\.partFader\(i \+ 1\)\}\s+empty=\{!exists\}/],
    "FantomPage.tsx": [
      /<SimKnob\s+name=\{FANTOM_LABELS\.panKnob\(i \+ 1\)\}\s+empty=\{!exists\}/,
      /<SimFader\s+name=\{FANTOM_LABELS\.levelFader\(i \+ 1\)\}\s+empty=\{!exists\}/,
    ],
  };
  for (const [page, res] of Object.entries(strips)) for (const re of res) assert.match(read(page), re, `${page} ${re}`);
});
