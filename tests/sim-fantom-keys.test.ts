import { test } from "node:test";
import assert from "node:assert/strict";
import { OCTAVE_RANGE, signedText, stepKeyShift, TRANSPOSE_RANGE } from "../src/lib/sim/fantom.ts";

test("Octave ±3 and Transpose −5 to +6, as the Owner's Manual p. 18 prints", () => {
  assert.deepEqual(OCTAVE_RANGE, { min: -3, max: 3 });
  assert.deepEqual(TRANSPOSE_RANGE, { min: -5, max: 6 });
});

test("steps stop at the ends of the range", () => {
  let t = 0;
  for (let i = 0; i < 10; i++) t = stepKeyShift(t, 1, TRANSPOSE_RANGE);
  assert.equal(t, 6);
  for (let i = 0; i < 20; i++) t = stepKeyShift(t, -1, TRANSPOSE_RANGE);
  assert.equal(t, -5);
  assert.equal(stepKeyShift(3, 1, OCTAVE_RANGE), 3);
  assert.equal(stepKeyShift(-3, -1, OCTAVE_RANGE), -3);
  assert.equal(stepKeyShift(0, 1, OCTAVE_RANGE), 1);
});

test("display text", () => {
  assert.equal(signedText(2), "+2");
  assert.equal(signedText(0), "0");
  assert.equal(signedText(-5), "−5");
});
