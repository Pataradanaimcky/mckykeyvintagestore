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
  howToSteps,
  sheetStepLines,
  splitSteps,
  chainLines,
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


/** Steps and the folded manual notes together, as on the order sheet. */
const full = (t: { howTo: string; notes?: string[] }) => [t.howTo, ...(t.notes ?? [])].join(" · ");

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
    pages: [[{ name: "Grand", color: "Sakura", volume: 300 }, { name: "Pad", color: "Neon", volume: -5 }, { name: "EP", volume: 63.6 }]],
    pool: [],
  });
  assert.ok(l);
  assert.equal(l.pages[0][0]?.color, "Sakura");
  // MODX M Operation Manual p. 360: slot Volume 0–127.
  assert.equal(l.pages[0][0]?.volume, 127);
  assert.equal(l.pages[0][1]?.volume, 0);
  assert.equal(l.pages[0][2]?.volume, 64);
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

test("DX7 points to Yamaha FM Converter, names MODX M from Yamaha's compatibility page but not as tested", () => {
  const t = getTarget("dx7");
  assert.match(full(t), /FM Converter/);
  assert.match(full(t), /MONTAGE M \/ MODX M ใช้แปลงเป็นไฟล์ User ของ MONTAGE/);
  assert.match(full(t), /ยังไม่ได้ทดสอบโหลดบน MODX M จริง/);
  assert.ok(t.sources.some((s) => s.includes("FM-Converter-User-Guide")));
  assert.ok(t.sources.some((s) => s.includes("montage-portal/essentials/compatibility")));
});

test("DX7 tells players to back up before loading a converted file (MONTAGE M manual: Load overwrites User data)", () => {
  const t = getTarget("dx7");
  assert.match(full(t), /เซฟ Backup ทั้งเครื่องลง USB flash drive ไว้ก่อน/);
  assert.match(full(t), /\[UTILITY\] → Contents → Load/);
  assert.ok(t.sources.some((s) => s.includes("montage_m/en/om01basicoperation0260")));
});

test("DX7 gives the receive settings from the DX7 manual before sending the file (pp. 20, 56–57)", () => {
  const t = getTarget("dx7");
  for (const w of ["MIDI ช่อง 1", "SYS INFO AVAIL", "SYS INFO UNAVAIL", "MEMORY PROTECT", "ยังไม่ได้ทดสอบกับ DX7 จริง"]) {
    assert.ok(full(t).includes(w), w);
  }
  assert.ok(full(t).indexOf("SYS INFO AVAIL") < full(t).indexOf("FM Converter"));
  assert.ok(t.sources.some((s) => s.includes("manualowl.com/m/Yamaha/DX7")));
});

test("DX7 says what the screen shows after receiving the file (manual p. 56)", () => {
  const t = getTarget("dx7");
  assert.ok(full(t).includes("FUNCTION CONTROL / MIDI RECEIVED"));
  assert.ok(full(t).indexOf("MIDI RECEIVED") > full(t).indexOf("MEMORY PROTECT"));
  assert.ok(full(t).indexOf("MIDI RECEIVED") < full(t).indexOf("FM Converter"));
  assert.ok(t.sources.some((s) => s.includes("dx7-man.pdf")));
});

test("DX7 says how to keep the old voices on a RAM cartridge before receiving (manual p. 49)", () => {
  const t = getTarget("dx7");
  for (const text of ["RAM cartridge", "[FUNCTION] → [SAVE]", "SAVE MEMORY ALL OF MEMORY?", "ARE YOU SURE?", "UNDER WRITING!"]) {
    assert.ok(full(t).includes(text), text);
  }
  assert.ok(full(t).indexOf("[SAVE]") < full(t).lastIndexOf("ยังไม่ได้ทดสอบกับ DX7 จริง"));
  assert.ok(t.sources.some((s) => s.includes("416114?page=54")));
});

test("DX7 lists the file types MODX M can load, from Yamaha's compatibility page and MONTAGE M manual", () => {
  const t = getTarget("dx7");
  for (const ext of [".Y2U", ".Y2L", ".Y2A", ".X7U", ".X7L", ".X7A", ".X8U", ".X8L", ".X8A"]) {
    assert.ok(full(t).includes(ext), ext);
  }
  assert.match(full(t), /คู่มือ FM Converter ไม่ได้บอกนามสกุลไฟล์ที่ได้/);
  assert.ok(t.sources.some((s) => s.includes("montage_m/en/om01basicoperation0240")));
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

test("FANTOM-0 Scene Chain: order sheet lists placed scenes in grid order, 16 per chain page", () => {
  const t = getTarget("fantom-0");
  assert.equal(t.chain?.max, 512);
  for (const w of ["[CHAIN]", "<CHAIN SET>", "<EDIT>", "<Select Scene>", "[E6] OK", "<Next>", "<WRITE>"]) assert.ok(t.chain?.howTo.includes(w), w);
  const l = emptyLayout("fantom-0");
  assert.deepEqual(chainLines(l), []);
  const item = (name: string) => ({ id: name, name, note: "", color: "" });
  l.pages = [Array.from({ length: 16 }, (_, i) => (i === 1 ? null : item(`S${i + 1}`))), [item("B1"), item("B2")]];
  const lines = chainLines(l);
  assert.equal(lines[0], "  หน้า 1");
  assert.equal(lines[1], "    1. S1");
  assert.equal(lines[2], "    2. S3");
  assert.equal(lines[16], "    16. B1");
  assert.equal(lines[17], "  หน้า 2");
  assert.equal(lines[18], "    17. B2");
  const sheet = orderSheet(l);
  assert.ok(sheet.includes("ลำดับสำหรับ Scene Chain:"));
  assert.ok(sheet.indexOf("[WRITE]") < sheet.indexOf("[CHAIN]"));
  assert.deepEqual(chainLines(emptyLayout("modx-m")), []);
  assert.ok(!orderSheet(emptyLayout("dx7")).includes("Scene Chain"));
});

test("MODX M: order sheet says how to rearrange registered slots with Job → Exchange (manual p. 38)", () => {
  const t = getTarget("modx-m");
  for (const w of ["[LIVE SET]", "[EDIT]", "USER", "Job", "Exchange", "Done", "Copy"]) assert.ok(t.rearrange?.includes(w), w);
  const sheet = orderSheet(emptyLayout("modx-m"));
  const r = splitSteps(t.rearrange!);
  for (const part of r) assert.ok(sheet.includes(part), part);
  assert.ok(sheet.indexOf(splitSteps(t.howTo)[0]) < sheet.indexOf(r[0]));
  assert.equal(getTarget("dx7").rearrange, undefined);
  assert.equal(getTarget("fantom-0").rearrange, undefined);
});

test("MODX M: rearrange steps say [SHIFT] + [EDIT] copies or exchanges a whole page or bank (MONTAGE M manual)", () => {
  const t = getTarget("modx-m");
  assert.ok(t.rearrange?.includes("ให้เลือกแบงก์ USER แล้วกด [SHIFT] ค้างไว้แล้วกด [EDIT]"));
  assert.ok(t.rearrange?.includes("ทั้งหน้า (Page)"));
  // MONTAGE M online manual, Shortcut operations (om02screenparameters0460): [SHIFT] + [EDIT] "Calls up the Copy/Exchange screen."
  assert.ok(t.rearrange?.endsWith("จะเปิดหน้าจอ Copy/Exchange"));
  assert.ok(t.sources.includes("https://manual.yamaha.com/mi/synth/montage_m/en/om01basicoperation0120.html"));
});

test("MODX M: rearrange steps say Delete & Move closes the gap, Delete leaves it empty (MONTAGE M online manual, Live Set Edit)", () => {
  const t = getTarget("modx-m");
  // Live Set Edit: "Delete & Move … delete a Performance and move the subsequent Performance and related settings up to the current slot."
  assert.ok(t.rearrange?.includes("แตะ Delete & Move"));
  assert.ok(t.rearrange?.includes("ถ้าแตะ Delete จะเหลือช่องว่างไว้"));
  assert.ok(t.rearrange!.indexOf("Delete & Move") < t.rearrange!.indexOf("[SHIFT]"));
  assert.ok(t.rearrange?.endsWith("จะเปิดหน้าจอ Copy/Exchange"));
  assert.ok(t.sources.includes("https://manual.yamaha.com/mi/synth/montage_m/en/om02screenparameters0310.html"));
});

test("MODX M: register step names the Live Set Register buttons (MONTAGE M online manual, Live Set Register)", () => {
  const t = getTarget("modx-m");
  for (const w of ["[SHIFT] + [LIVE SET]", "Live Set Register", "USER", "Register", "Store as New Perf. and Register", "Overwrite Current Perf. and Register"])
    assert.ok(full(t).includes(w), w);
  assert.ok(t.sources.some((s) => s.endsWith("om02screenparameters0300.html")));
  assert.ok(orderSheet(emptyLayout("modx-m")).includes("Store as New Perf. and Register"));
});

test("save-and-use: steps come first, longer manual notes are separate and follow the steps on the order sheet (PM 2026-11-14)", () => {
  const dx7 = getTarget("dx7");
  assert.ok(dx7.notes && dx7.notes.length >= 3);
  assert.ok(dx7.howTo.length < 700, `DX7 steps too long: ${dx7.howTo.length}`);
  for (const w of ["MIDI ช่อง 1", "SYS INFO AVAIL", "MIDI RECEIVED", "ยังไม่ได้ทดสอบกับ DX7 จริง"]) assert.ok(dx7.howTo.includes(w), w);
  for (const w of ["RAM cartridge", "FM Converter", ".Y2U"]) assert.ok(!dx7.howTo.includes(w), w);
  const modx = getTarget("modx-m");
  assert.ok(modx.howTo.includes("Register") && modx.howTo.includes("Done"));
  assert.ok(!modx.howTo.includes("Store as New"));
  assert.equal(getTarget("fantom-0").notes, undefined);
  for (const id of ["dx7", "modx-m"] as const) {
    const t = getTarget(id);
    const sheet = orderSheet(emptyLayout(id));
    assert.ok(sheet.includes("หมายเหตุจากคู่มือ:"));
    for (const n of t.notes!) assert.ok(sheet.includes(`- ${n}`), n);
    assert.ok(sheet.indexOf("บันทึกและนำไปใช้:") < sheet.indexOf("หมายเหตุจากคู่มือ:"));
  }
  assert.ok(!orderSheet(emptyLayout("fantom-0")).includes("หมายเหตุจากคู่มือ:"));
});

test("save-and-use steps split into a numbered list, warnings kept apart, nothing lost (STUDIO.md 7a)", () => {
  for (const id of ["dx7", "modx-m", "fantom-0"] as const) {
    const t = getTarget(id);
    const { steps, warnings } = howToSteps(t);
    assert.ok(steps.length >= 1, id);
    for (const part of [...steps, ...warnings]) assert.ok(t.howTo.includes(part), part);
    assert.equal(steps.length + warnings.length, t.howTo.split(" · ").length, id);
    const sheet = orderSheet(emptyLayout(id));
    // The order sheet prints the same steps, numbered one per line, warnings after (STUDIO.md 7e).
    steps.forEach((st, i) => assert.ok(sheet.includes(`\n${steps.length > 1 ? `${i + 1}. ` : ""}${st}\n`), `${id} ${i + 1}`));
    for (const w of warnings) assert.ok(sheet.includes(`\n${w}\n`), w);
  }
  const dx7 = howToSteps(getTarget("dx7"));
  assert.ok(dx7.steps.length >= 3);
  assert.deepEqual(dx7.warnings, ["ยังไม่ได้ทดสอบกับ DX7 จริง"]);
  // In the order the player does them: back up first, then receive settings, send, check the screen (STUDIO.md 7b).
  assert.ok(dx7.steps[0].includes("ดาวน์โหลดเก็บไว้ก่อน"));
  assert.ok(dx7.steps[1].startsWith("ก่อนส่งเข้า DX7"));
  assert.ok(dx7.steps[2].includes("Dexed"));
  assert.ok(dx7.steps[3].includes("MIDI RECEIVED"));
  // MODX M and FANTOM-0 in the order they are done too (STUDIO.md 7c).
  const modx = howToSteps(getTarget("modx-m"));
  assert.equal(modx.steps.length, 3);
  assert.ok(modx.steps[0].includes("[SHIFT] + [LIVE SET]"));
  assert.ok(modx.steps[1].includes("Register"));
  assert.ok(modx.steps[2].includes("Edit") && modx.steps[2].includes("Done"));
  const fantom = howToSteps(getTarget("fantom-0"));
  assert.equal(fantom.steps.length, 3);
  assert.deepEqual(fantom.warnings, []);
  // Keep the scene at the destination before writing over it (Owner's Manual p. 22).
  assert.ok(fantom.steps[0].startsWith("ก่อนเขียน") && fantom.steps[0].includes("ถูกเขียนทับ"));
  assert.ok(fantom.steps[1].includes("[WRITE]") && fantom.steps[1].includes("<SCENE>"));
  assert.ok(fantom.steps[2].includes("<OK>"));
});

test("MODX M Live Set layout follows Yamaha's manual: USER 1–8, 16 pages, 16 slots, 16 colors", () => {
  const t = getTarget("modx-m");
  // MONTAGE M online manual, Live Set: Bank "Preset, User 1–8", "Live Set Slot 1–16";
  // MODX M Data List: Page Name 03 1p 00 00, p = 0–15.
  assert.equal(t.slotsPerPage, 16);
  assert.equal(t.pagesPerBank, 16);
  assert.equal(t.maxPages / (t.pagesPerBank ?? 1), 8);
  // MONTAGE M online manual, Live Set Edit: slot Color settings, in the manual's order.
  assert.deepEqual(t.colors, ["Black", "Red", "Yellow", "Green", "Blue", "Azure", "Pink", "Orange", "Purple", "Sakura", "Cream", "Lime", "Aqua", "Beige", "Mint", "Lilac"]);
  assert.ok(t.sources.some((s) => s.endsWith("om02screenparameters0290.html")));
});

test("folded rearrange and Scene Chain texts split into steps in order, text unchanged", () => {
  const modx = getTarget("modx-m");
  const fantom = getTarget("fantom-0");
  assert.ok(modx.rearrange && fantom.chain);
  const r = splitSteps(modx.rearrange);
  assert.equal(r.length, 4);
  assert.match(r[0], /Exchange/);
  assert.match(r[2], /Delete & Move/);
  assert.match(r[3], /\[SHIFT\]/);
  assert.equal(r.join(" · "), modx.rearrange);
  const c = splitSteps(fantom.chain.howTo);
  assert.equal(c.length, 2);
  assert.match(c[0], /\[CHAIN\]/);
  assert.equal(c.join(" · "), fantom.chain.howTo);
  assert.deepEqual(splitSteps(" a ·  · b "), ["a", "b"]);
});

test("order sheet numbers the steps like /studio, folded steps too, nothing lost (STUDIO.md 7e)", () => {
  assert.deepEqual(sheetStepLines("a · ระวัง x · b"), ["1. a", "2. b", "ระวัง x"]);
  assert.deepEqual(sheetStepLines("only one"), ["only one"]);
  const modx = getTarget("modx-m");
  const sheet = orderSheet(emptyLayout("modx-m")).split("\n");
  const at = sheet.indexOf("บันทึกและนำไปใช้:");
  assert.ok(at >= 0);
  assert.deepEqual(sheet.slice(at + 1, at + 4), splitSteps(modx.howTo).map((s, i) => `${i + 1}. ${s}`));
  for (const [i, s] of splitSteps(modx.rearrange!).entries()) assert.ok(sheet.includes(`${i + 1}. ${s}`), s);
  const fantom = getTarget("fantom-0");
  let l = { ...emptyLayout("fantom-0"), pool: itemsFromText("S1") };
  l = moveItem(l, { kind: "pool", index: 0 }, { kind: "slot", page: 0, slot: 0 });
  const fs = orderSheet(l);
  for (const [i, s] of splitSteps(fantom.chain!.howTo).entries()) assert.ok(fs.includes(`\n${i + 1}. ${s}\n`), s);
});

test("MODX M: [SHIFT] + [EDIT] screen uses Yamaha's own name Copy/Exchange (MONTAGE M online manual, Shortcut operations)", () => {
  const t = getTarget("modx-m");
  assert.ok(t.rearrange?.includes("Copy/Exchange"));
  assert.ok(!t.rearrange?.includes("Exchange/Copy"));
  assert.ok(t.sources.includes("https://manual.yamaha.com/mi/synth/montage_m/en/om02screenparameters0460.html"));
});
