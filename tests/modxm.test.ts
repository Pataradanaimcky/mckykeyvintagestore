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
