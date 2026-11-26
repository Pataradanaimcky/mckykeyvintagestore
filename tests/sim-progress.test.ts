/** S16 (docs/SIMULATOR.md): loading progress on the MODX M and FANTOM-0 displays, with slowed mocked loads. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadingText, settleWithProgress } from "../src/lib/sim/progress.ts";

const later = <T,>(ms: number, value: T, fail = false) =>
  new Promise<T>((resolve, reject) => setTimeout(() => (fail ? reject(new Error("sample file 503")) : resolve(value)), ms));

test("display text counts sounds ready out of sounds loading", () => {
  assert.equal(loadingText(0, 3), "LOADING 0/3");
  assert.equal(loadingText(2, 3), "LOADING 2/3");
  assert.equal(loadingText(3, 3), "LOADING 3/3");
  assert.equal(loadingText(5, 3), "LOADING 3/3");
  assert.equal(loadingText(-1, 2), "LOADING 0/2");
});

test("nothing to count keeps the old LOADING… text", () => {
  assert.equal(loadingText(0, 0), "LOADING…");
  assert.equal(loadingText(0, Number.NaN), "LOADING…");
});

test("progress starts at 0 and steps up as slow loads finish, failures included", async () => {
  const seen: string[] = [];
  const results = await settleWithProgress(
    [later(60, "piano"), later(20, "strings", true), later(40, "fm")],
    (d, t) => seen.push(loadingText(d, t)),
  );
  assert.deepEqual(seen, ["LOADING 0/3", "LOADING 1/3", "LOADING 2/3", "LOADING 3/3"]);
  assert.deepEqual(
    results.map((r) => r.status),
    ["fulfilled", "rejected", "fulfilled"],
  );
});

test("results keep the order given, not the order loads finished", async () => {
  const results = await settleWithProgress([later(30, 1), later(5, 2)]);
  assert.deepEqual(
    results.map((r) => (r.status === "fulfilled" ? r.value : null)),
    [1, 2],
  );
});

test("an empty Performance (no samples, no FM) reports 0/0 once", async () => {
  const seen: [number, number][] = [];
  await settleWithProgress([], (d, t) => seen.push([d, t]));
  assert.deepEqual(seen, [[0, 0]]);
});
