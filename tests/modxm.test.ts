import assert from "node:assert/strict";
import { test } from "node:test";
import { SlotNameCollector, readSlotNameReply, slotNameAddress, slotNameRequest, slotNameRequests } from "../src/lib/studio/modxm.ts";

const hex = (u: ArrayLike<number>) => Array.from(u, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");

test("Slot Name address follows the Data List: 03 2p 0s xx", () => {
  assert.deepEqual(slotNameAddress(0, 0), [0x03, 0x20, 0x00, 0x00]);
  assert.deepEqual(slotNameAddress(15, 15, 19), [0x03, 0x2f, 0x0f, 0x13]);
  assert.throws(() => slotNameAddress(16, 0));
  assert.throws(() => slotNameAddress(0, 0, 20));
});

test("Parameter Request is F0 43 3n 7F 1C 0D aa aa aa aa F7 with device 0", () => {
  assert.equal(hex(slotNameRequest(2, 5, 3)), "F0 43 30 7F 1C 0D 03 22 05 03 F7");
  const all = slotNameRequests(1, 1);
  assert.equal(all.length, 20);
  assert.equal(hex(all[19]), "F0 43 30 7F 1C 0D 03 21 01 13 F7");
});

test("reads a Parameter Change reply, any device number", () => {
  const r = readSlotNameReply([0xf0, 0x43, 0x13, 0x7f, 0x1c, 0x0d, 0x03, 0x24, 0x07, 0x02, 0x41, 0xf7]);
  assert.deepEqual(r, { page: 4, slot: 7, start: 2, bytes: [0x41] });
});

test("reads a Bulk Dump reply only when the checksum adds up", () => {
  const addr = [0x03, 0x20, 0x00, 0x00];
  const data = Array.from("Grand Piano         ", (c) => c.charCodeAt(0));
  const sum = [0x0d, ...addr, ...data].reduce((a, b) => a + b, 0);
  const cc = (128 - (sum & 0x7f)) & 0x7f;
  const msg = [0xf0, 0x43, 0x00, 0x7f, 0x1c, 0x00, data.length, 0x0d, ...addr, ...data, cc, 0xf7];
  const r = readSlotNameReply(msg);
  assert.ok(r);
  const c = new SlotNameCollector();
  c.add(r);
  assert.equal(c.name(0, 0), "Grand Piano");
  const bad = [...msg];
  bad[bad.length - 2] = (cc + 1) & 0x7f;
  assert.equal(readSlotNameReply(bad), null);
});

test("ignores other addresses, other makers and non-ASCII data", () => {
  assert.equal(readSlotNameReply([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x0d, 0x03, 0x10, 0x00, 0x00, 0x41, 0xf7]), null); // Page Name
  assert.equal(readSlotNameReply([0xf0, 0x41, 0x10, 0x7f, 0x1c, 0x0d, 0x03, 0x20, 0x00, 0x00, 0x41, 0xf7]), null);
  assert.equal(readSlotNameReply([0xf0, 0x43, 0x10, 0x7f, 0x1c, 0x0d, 0x03, 0x20, 0x00, 0x00, 0x0a, 0xf7]), null);
});

test("a name is ready only when all 20 characters have come in", () => {
  const c = new SlotNameCollector();
  const word = "Pad";
  for (let i = 0; i < 19; i++) c.add({ page: 0, slot: 3, start: i, bytes: [i < word.length ? word.charCodeAt(i) : 0x20] });
  assert.equal(c.name(0, 3), undefined);
  c.add({ page: 0, slot: 3, start: 19, bytes: [0x00] });
  assert.equal(c.name(0, 3), "Pad");
  assert.equal(c.name(1, 3), undefined);
});

test("one page asks for 16 slots × 20 characters, slot by slot", async () => {
  const { pageNameRequests } = await import("../src/lib/studio/modxm.ts");
  const all = pageNameRequests(3);
  assert.equal(all.length, 320);
  assert.equal(hex(all[0]), "F0 43 30 7F 1C 0D 03 23 00 00 F7");
  assert.equal(hex(all[20]), "F0 43 30 7F 1C 0D 03 23 01 00 F7");
  assert.equal(hex(all[319]), "F0 43 30 7F 1C 0D 03 23 0F 13 F7");
});

test("received names fill a page; old sounds go to the shelf; missing and blank names change nothing", async () => {
  const { namesOnPage, placeNames } = await import("../src/lib/studio/modxm.ts");
  const c = new SlotNameCollector();
  const bytes = (s: string) => Array.from(s.padEnd(20, " "), (ch) => ch.charCodeAt(0));
  c.add({ page: 0, slot: 0, start: 0, bytes: bytes("CP80 Stage") });
  c.add({ page: 0, slot: 1, start: 0, bytes: bytes("") });
  c.add({ page: 0, slot: 2, start: 0, bytes: bytes("Half").slice(0, 10) });
  const names = namesOnPage(c, 0);
  assert.equal(names.length, 16);
  assert.deepEqual(names.slice(0, 3), ["CP80 Stage", "", undefined]);
  const slots = [{ name: "Old A" }, { name: "Old B" }, null, ...Array(13).fill(null)];
  const r = placeNames(slots, names, (name) => ({ name }));
  assert.equal(r.placed, 1);
  assert.deepEqual(r.slots.slice(0, 3), [{ name: "CP80 Stage" }, { name: "Old B" }, null]);
  assert.deepEqual(r.shelved, [{ name: "Old A" }]);
});

test("USB help follows the Operation Manual (MIDI I/O → MIDI IN/OUT USB, Advanced → Device Number)", async () => {
  const { MODX_USB_HELP: help } = await import("../src/lib/studio/modxm.ts");
  for (const word of ["[UTILITY]", "Settings", "MIDI I/O", "MIDI IN/OUT", "USB", "Advanced", "Device Number", "All", "Off"]) {
    assert.ok(help.includes(word), word);
  }
});

test("the page only asks: every request is a Parameter Request (3n), so Bulk Receive can stay Protect", async () => {
  const { pageNameRequests, MODX_BULK_NOTE: note } = await import("../src/lib/studio/modxm.ts");
  for (let page = 0; page < 16; page++) {
    for (const m of pageNameRequests(page)) {
      assert.equal(m[0], 0xf0);
      assert.equal(m[1], 0x43);
      assert.equal(m[2] & 0xf0, 0x30, "Parameter Request, not Bulk Dump (0n) or Parameter Change (1n)");
      assert.equal(m.length, 11);
      assert.equal(m[m.length - 1], 0xf7);
    }
  }
  for (const word of ["Bulk Receive", "[UTILITY]", "Advanced", "Protect", "Bulk Dump"]) assert.ok(note.includes(word), word);
});
