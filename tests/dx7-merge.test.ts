import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyLayout, fillEmpty, newItem, shelfIntoSlots, swapHalves } from "../src/lib/studio/library.ts";

const names = (prefix: string) => Array.from({ length: 32 }, (_, i) => newItem(`${prefix}${i + 1}`));

// Cartridge B is in the slots, cartridge A went to the shelf when B was inserted.
const merged = () => fillEmpty({ ...emptyLayout("dx7"), pool: [...names("B"), ...names("A")] });

test("shelf 1–16 replaces slots 17–32 and the replaced voices go to the shelf", () => {
  const l = merged();
  assert.equal(l.pool[0].name, "A1");
  const m = shelfIntoSlots(l, 0, 16, 0);
  assert.deepEqual(m.pages[0].map((x) => x?.name), [...Array.from({ length: 16 }, (_, i) => `B${i + 1}`), ...Array.from({ length: 16 }, (_, i) => `A${i + 1}`)]);
  assert.equal(m.pool.length, 32);
  assert.equal(m.pool[0].name, "A17");
  assert.equal(m.pool[16].name, "B17");
});

test("shelf 17–32 can be chosen, and swapping halves after gives A first", () => {
  const m = swapHalves(shelfIntoSlots(merged(), 0, 16, 16), 0);
  assert.equal(m.pages[0][0]?.name, "A17");
  assert.equal(m.pages[0][16]?.name, "B1");
  assert.equal(m.pool.length, 32);
});

test("fewer shelf voices fill only what there is; nothing to take changes nothing", () => {
  const l = { ...emptyLayout("dx7"), pool: [newItem("X"), newItem("Y")] };
  const m = shelfIntoSlots(l, 0, 16, 0);
  assert.equal(m.pages[0][16]?.name, "X");
  assert.equal(m.pages[0][17]?.name, "Y");
  assert.equal(m.pages[0][18], null);
  assert.equal(m.pool.length, 0);
  assert.strictEqual(shelfIntoSlots(m, 0, 16, 0), m);
  assert.strictEqual(shelfIntoSlots(l, 0, 40, 0), l);
});
