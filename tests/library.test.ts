import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeLayout,
  emptyLayout,
  encodeLayout,
  fillEmpty,
  itemsFromText,
  moveItem,
  newItem,
  orderSheet,
  parseLayout,
  sortPage,
} from "../src/lib/studio/library.ts";

const names = (l: ReturnType<typeof emptyLayout>) => l.pages[0].map((x) => x?.name ?? "-");

test("pasted lists become sounds, ignoring numbers and bullets", () => {
  const items = itemsFromText("1. Grand Piano\n- Warm Pad\n\n03) City EP\n• Strings\tA");
  assert.deepEqual(items.map((i) => i.name), ["Grand Piano", "Warm Pad", "City EP", "Strings\tA".trim()]);
});

test("fill places pool sounds into empty slots in order", () => {
  let l = emptyLayout("modx-m");
  l = { ...l, pool: itemsFromText("A\nB\nC") };
  l = fillEmpty(l);
  assert.deepEqual(names(l).slice(0, 4), ["A", "B", "C", "-"]);
  assert.equal(l.pool.length, 0);
});

test("dropping on a filled slot swaps; dropping on an empty one moves", () => {
  let l = fillEmpty({ ...emptyLayout("modx-m"), pool: itemsFromText("A\nB\nC") });
  l = moveItem(l, { kind: "slot", page: 0, slot: 0 }, { kind: "slot", page: 0, slot: 2 });
  assert.deepEqual(names(l).slice(0, 4), ["C", "B", "A", "-"]);
  l = moveItem(l, { kind: "slot", page: 0, slot: 1 }, { kind: "slot", page: 0, slot: 5 });
  assert.equal(names(l)[1], "-");
  assert.equal(names(l)[5], "B");
});

test("sounds move between the pool and the grid without getting lost", () => {
  let l = fillEmpty({ ...emptyLayout("modx-m"), pool: itemsFromText("A\nB") });
  l = { ...l, pool: [newItem("X")] };
  l = moveItem(l, { kind: "pool", index: 0 }, { kind: "slot", page: 0, slot: 0 });
  assert.equal(names(l)[0], "X");
  assert.deepEqual(l.pool.map((x) => x.name), ["A"]);
  l = moveItem(l, { kind: "slot", page: 0, slot: 1 }, { kind: "pool", index: 0 });
  assert.deepEqual(l.pool.map((x) => x.name), ["B", "A"]);
  const total = l.pages.flat().filter(Boolean).length + l.pool.length;
  assert.equal(total, 3);
});

test("sort puts names in order and empty slots last", () => {
  let l = fillEmpty({ ...emptyLayout("dx7"), pool: itemsFromText("Organ\nBass\nEP") });
  l = sortPage(l, 0);
  assert.deepEqual(names(l).slice(0, 4), ["Bass", "EP", "Organ", "-"]);
  assert.equal(l.pages[0].length, 32);
});

test("order sheet uses the keyboard's words and numbering", () => {
  const modx = fillEmpty({ ...emptyLayout("modx-m"), pool: itemsFromText("Grand\nPad") });
  assert.match(orderSheet(modx), /Live Set Page 1\n  Slot 1: Grand\n  Slot 2: Pad/);
  let fantom = emptyLayout("fantom-0");
  fantom = { ...fantom, pages: [fantom.pages[0], fantom.pages[0].map(() => null)], pool: itemsFromText("Scene X") };
  fantom = moveItem(fantom, { kind: "pool", index: 0 }, { kind: "slot", page: 1, slot: 0 });
  assert.match(orderSheet(fantom), /Scene 017: Scene X/);
});

test("share links round-trip and reject junk", () => {
  const l = fillEmpty({ ...emptyLayout("modx-m"), pool: itemsFromText("A\nB") });
  const back = decodeLayout(encodeLayout(l));
  assert.ok(back);
  assert.deepEqual(names(back).slice(0, 3), ["A", "B", "-"]);
  assert.equal(decodeLayout("garbage!"), null);
  assert.equal(parseLayout({ version: 1, target: "nope", pages: [] }), null);
});

test("imported data is cleaned and limited", () => {
  const l = parseLayout({
    version: 1,
    target: "modx-m",
    title: "t",
    pages: Array.from({ length: 40 }, () => [{ name: "x".repeat(99), color: "purple", patch: "AAAA" }]),
    pool: [{ name: "" }, { name: "ok" }],
  });
  assert.ok(l);
  assert.equal(l.pages.length, 16);
  assert.equal(l.pages[0][0]?.name.length, 40);
  assert.equal(l.pages[0][0]?.color, "none");
  assert.equal(l.pages[0][0]?.patch, undefined);
  assert.deepEqual(l.pool.map((x) => x.name), ["ok"]);
});
