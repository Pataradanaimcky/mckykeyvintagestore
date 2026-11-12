import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_CART_ITEMS, parseCart } from "../src/lib/cart/parse.ts";

const buyable = new Set(["a", "b", "c"]);
const isBuyable = (slug: string) => buyable.has(slug);

test("empty or missing cookie is an empty cart", () => {
  assert.deepEqual(parseCart(undefined, isBuyable), []);
  assert.deepEqual(parseCart("", isBuyable), []);
});

test("keeps order, drops repeats, unknown and unavailable packs", () => {
  assert.deepEqual(parseCart("b,a,b,zzz, c ,,", isBuyable), ["b", "a", "c"]);
});

test("caps the number of items", () => {
  const many = Array.from({ length: 200 }, (_, i) => `p${i}`);
  const all = new Set(many);
  assert.equal(parseCart(many.join(","), (s) => all.has(s)).length, MAX_CART_ITEMS);
});
