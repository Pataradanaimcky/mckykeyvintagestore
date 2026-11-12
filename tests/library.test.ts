import assert from "node:assert/strict";
import { test } from "node:test";
import {
  demoBank,
  demoOf,
  bankPage,
  copyItem,
  deleteAndMove,
  getTarget,
  unsupportedNameChars,
  slotTypeNote,
  bankPageNameProblems,
  nameProblemLines,
  decodeLayout,
  emptyLayout,
  pageTitle,
  slotLabel,
  encodeLayout,
  fillEmpty,
  itemsFromText,
  moveItem,
  newItem,
  orderSheet,
  parseLayout,
  parseSssTime,
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
  assert.match(orderSheet(modx), /USER 1 · Page 1\n  Slot 1: Grand\n  Slot 2: Pad/);
  let fantom = emptyLayout("fantom-0");
  fantom = { ...fantom, pages: [fantom.pages[0], fantom.pages[0].map(() => null)], pool: itemsFromText("Scene X") };
  fantom = moveItem(fantom, { kind: "pool", index: 0 }, { kind: "slot", page: 1, slot: 0 });
  assert.match(orderSheet(fantom), /Scene A017: Scene X/);
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
    pages: Array.from({ length: 200 }, () => [{ name: "x".repeat(99), color: "purple", patch: "AAAA" }]),
    pool: [{ name: "" }, { name: "ok" }],
  });
  assert.ok(l);
  assert.equal(l.pages.length, 128);
  assert.equal(l.pages[0][0]?.name.length, 20);
  assert.equal(l.pages[0][0]?.color, "");
  assert.equal(l.pages[0][0]?.patch, undefined);
  assert.deepEqual(l.pool.map((x) => x.name), ["ok"]);
});

test("MODX M Live Set: banks of 16 pages, page names and keyboard jobs", () => {
  const t = getTarget("modx-m");
  assert.deepEqual(bankPage(t, 0), { bank: 1, page: 1 });
  assert.deepEqual(bankPage(t, 17), { bank: 2, page: 2 });
  assert.deepEqual(bankPage(t, 127), { bank: 8, page: 16 });
  let l = fillEmpty({ ...emptyLayout("modx-m"), pool: itemsFromText("A\nB\nC\nD") });
  l = deleteAndMove(l, 0, 1);
  assert.deepEqual(names(l).slice(0, 4), ["A", "C", "D", "-"]);
  assert.deepEqual(l.pool.map((x) => x.name), ["B"]);
  l = copyItem(l, { kind: "slot", page: 0, slot: 0 }, { page: 0, slot: 5 });
  assert.equal(names(l)[5], "A");
  assert.notEqual(l.pages[0][5]?.id, l.pages[0][0]?.id);
  l = { ...l, pageNames: ["Opening"], bankNames: ["Tour 2026"] };
  assert.match(orderSheet(l), /USER 1 "Tour 2026" · Page 1 "Opening"/);
});

test("slot colors and volume follow the keyboard's own list and range", () => {
  const l = parseLayout({
    version: 1,
    target: "modx-m",
    title: "t",
    pages: [[{ name: "Grand", color: "Sakura", volume: 300 }, { name: "Pad", color: "Neon" }]],
    pool: [],
  });
  assert.ok(l);
  assert.equal(l.pages[0][0]?.color, "Sakura");
  assert.equal(l.pages[0][0]?.volume, 127);
  assert.equal(l.pages[0][1]?.color, "");
  assert.match(orderSheet(l), /Slot 1: Grand {2}\(Color: Sakura · Volume: 127\)/);
});

test("a demo bank holds a pack's sounds in order and is marked as a demo", () => {
  const pack = {
    slug: "thai-pop-keys-vol-1",
    name: "Thai Pop Keys Vol.1",
    target: "modx-m" as const,
    patches: [
      { tag: "Key", name: "Sukhumvit EP", clip: "/demos/thai-pop-keys-vol-1/sukhumvit-ep.m4a" },
      { tag: "Bass", name: "City Slap FM" },
    ],
  };
  const l = demoBank(pack, (n) => (n.includes("Bass") ? "bass" : "epiano"));
  assert.deepEqual(names(l).slice(0, 3), ["Sukhumvit EP", "City Slap FM", "-"]);
  assert.equal(l.pages[0][0]?.sound, "epiano");
  assert.equal(l.pages[0][1]?.sound, "bass");
  assert.equal(demoOf(l), "thai-pop-keys-vol-1");
  assert.equal(demoOf(emptyLayout("modx-m")), undefined);
  // Survives saving and reopening, but only safe clip paths are kept.
  const back = parseLayout(JSON.parse(JSON.stringify(l)));
  assert.equal(back?.pages[0][0]?.clip, "/demos/thai-pop-keys-vol-1/sukhumvit-ep.m4a");
  const bad = parseLayout({ ...JSON.parse(JSON.stringify(l)), pages: [[{ name: "x", demo: "p", clip: "https://evil.example/a.mp3" }]] });
  assert.equal(bad?.pages[0][0]?.clip, undefined);
});

test("DX7 order sheet is the plain voice list: Voice 1–32 in cartridge order, then the shelf", () => {
  let l = { ...emptyLayout("dx7"), title: "My Cart", pool: itemsFromText("E.PIANO 1\nBRASS 2\nSPARE") };
  l = moveItem(l, { kind: "pool", index: 0 }, { kind: "slot", page: 0, slot: 0 });
  l = moveItem(l, { kind: "pool", index: 0 }, { kind: "slot", page: 0, slot: 31 });
  const sheet = orderSheet(l);
  assert.match(sheet, /^My Cart\nYamaha DX7 · Cartridge\n\n {2}Voice 1: E\.PIANO 1\n {2}Voice 32: BRASS 2\n/);
  assert.match(sheet, /ยังไม่ได้วาง: SPARE/);
});

test("DX7 points to Yamaha FM Converter for MONTAGE/MODX without claiming MODX M", () => {
  const t = getTarget("dx7");
  assert.match(t.howTo, /FM Converter/);
  assert.match(t.howTo, /MODX M ยังไม่ได้ยืนยัน/);
  assert.ok(t.sources.some((s) => s.includes("FM-Converter-User-Guide")));
});

test("MODX M slots keep an SSS Time from the manual's settings (0.0sec–30sec, Hold, System)", () => {
  assert.equal(parseSssTime("Hold"), "Hold");
  assert.equal(parseSssTime("System"), "System");
  assert.equal(parseSssTime(2.54), "2.5");
  assert.equal(parseSssTime("45"), "30.0");
  assert.equal(parseSssTime(-1), "0.0");
  assert.equal(parseSssTime("Long"), undefined);
  const l = parseLayout({
    version: 1,
    target: "modx-m",
    title: "t",
    pages: [[{ name: "Grand", sss: "Hold" }, { name: "Pad", sss: 3 }, { name: "Lead", sss: "x" }]],
    pool: [],
  });
  assert.ok(l);
  assert.equal(l.pages[0][2]?.sss, undefined);
  const sheet = orderSheet(l);
  assert.match(sheet, /Slot 1: Grand {2}\(SSS Time: Hold\)/);
  assert.match(sheet, /Slot 2: Pad {2}\(SSS Time: 3\.0sec\)/);
  const dx = parseLayout({ version: 1, target: "dx7", title: "t", pages: [[{ name: "EP", sss: "Hold" }]], pool: [] });
  assert.equal(dx?.pages[0][0]?.sss, undefined);
});

test("MODX M names: only printable ASCII fits, per the MODX M Data List", () => {
  const modx = getTarget("modx-m");
  assert.equal(modx.asciiNames, true);
  assert.deepEqual(unsupportedNameChars(modx, "Grand Piano 1 (Live)"), []);
  assert.deepEqual(unsupportedNameChars(modx, "เปียโน Piano"), ["เ", "ป", "ี", "ย", "โ", "น"]);
  assert.deepEqual(unsupportedNameChars(modx, "Pad\tA é é"), ["\t", "é"]);
  // FANTOM-0 Scene Name is ASCII too (MIDI Implementation, Scene Common: 32 - 127 [ASCII]).
  assert.deepEqual(unsupportedNameChars(getTarget("fantom-0"), "เปียโน Pad"), ["เ", "ป", "ี", "ย", "โ", "น"]);
  assert.deepEqual(unsupportedNameChars(getTarget("fantom-0"), "Strings & Pad"), []);
});

test("MODX M Bank Name and Page Name: non-ASCII characters are flagged per bank and page", () => {
  const modx = getTarget("modx-m");
  const base = { version: 1 as const, target: "modx-m" as const, title: "t", pages: [], pool: [] };
  const problems = bankPageNameProblems(modx, { ...base, bankNames: ["Gig", "งานแต่ง"], pageNames: ["Set 1", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Café"] });
  assert.deepEqual(
    problems.map((x) => [x.where, x.chars.join("")]),
    [
      ["Bank Name USER 2", "งานแต่"],
      ["Page Name USER 2 · Page 1", "é"],
    ],
  );
  assert.deepEqual(bankPageNameProblems(modx, { ...base, bankNames: ["Gig"], pageNames: ["Ballads"] }), []);
  assert.deepEqual(bankPageNameProblems(getTarget("fantom-0"), { ...base, target: "fantom-0", pageNames: ["เปียโน"] }), []);
});

test("MODX M order sheet lists the names the keyboard cannot take; ASCII-only sheets list none", () => {
  const l = parseLayout({
    version: 1,
    target: "modx-m",
    title: "t",
    pages: [[{ name: "Grand" }, null, { name: "เปียโน" }]],
    pool: [],
    bankNames: ["Café"],
  });
  assert.ok(l);
  assert.deepEqual(nameProblemLines(getTarget("modx-m"), l), ["Bank Name USER 1: é", 'USER 1 · Page 1 · Slot 3 "เปียโน": เ ป ี ย โ น']);
  const sheet = orderSheet(l);
  assert.match(sheet, /ชื่อที่ MODX M พิมพ์ไม่ได้/);
  assert.match(sheet, /  USER 1 · Page 1 · Slot 3 "เปียโน": เ ป ี ย โ น/);
  const ok = parseLayout({ version: 1, target: "modx-m", title: "t", pages: [[{ name: "Grand" }]], pool: [] });
  assert.ok(ok);
  assert.doesNotMatch(orderSheet(ok), /พิมพ์ไม่ได้/);
  const fantom = parseLayout({ version: 1, target: "fantom-0", title: "t", pages: [[{ name: "เปียโน" }]], pool: [] });
  assert.ok(fantom);
  assert.match(orderSheet(fantom), /ชื่อที่ FANTOM-0 พิมพ์ไม่ได้/);
  assert.match(orderSheet(fantom), /Scene A001 "เปียโน"/);
});

test("FANTOM-0 scenes are numbered A001–D128, 16 to a screen, as on the keyboard", () => {
  const t = getTarget("fantom-0");
  assert.equal(t.slotsPerPage, 16);
  assert.equal(t.maxPages, 32);
  assert.equal(t.nameMax, 16);
  assert.equal(slotLabel(t, 0, 0), "A001");
  assert.equal(slotLabel(t, 0, 15), "A016");
  assert.equal(slotLabel(t, 7, 15), "A128");
  assert.equal(slotLabel(t, 8, 0), "B001");
  assert.equal(slotLabel(t, 31, 15), "D128");
  const l = { ...emptyLayout("fantom-0") };
  assert.equal(pageTitle(t, l, 0), "BANK A · A001–A016");
  assert.equal(pageTitle(t, l, 9), "BANK B · B017–B032");
  // Pages beyond D128 are dropped when a work file is opened.
  const big = parseLayout({ version: 1, target: "fantom-0", title: "t", pages: Array.from({ length: 40 }, () => []), pool: [] });
  assert.ok(big);
  assert.equal(big.pages.length, 32);
});

test("slot type note: MODX M arranges Perform slots, other keyboards get no note", () => {
  const note = slotTypeNote(getTarget("modx-m"));
  assert.match(note, /Slot Type: Perform/);
  for (const w of ["Song", "Audio", "Pattern", "Live Set Edit"]) assert.ok(note.includes(w), w);
  assert.equal(slotTypeNote(getTarget("dx7")), "");
  assert.equal(slotTypeNote(getTarget("fantom-0")), "");
});
