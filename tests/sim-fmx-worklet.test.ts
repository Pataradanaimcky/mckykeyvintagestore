import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { FM_MAX_VOICES, FM_PATCHES, FmPoly, checkAlgorithm, ALGORITHMS, OP_COUNT } from "../src/lib/sim/fmx.ts";
import { PERFORMANCES } from "../src/lib/sim/modx.ts";

const SR = 48000;
const peak = (x: Float32Array) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

test("FmPoly keeps to the voice limit and takes the oldest voice", () => {
  const poly = new FmPoly(FM_PATCHES.tine);
  for (let n = 0; n < FM_MAX_VOICES + 3; n++) poly.noteOn(60 + n, 0.8);
  assert.equal(poly.voices.length, FM_MAX_VOICES);
  assert.equal(poly.voices[0].note, 63);
  poly.noteOn(70, 0.8); // same note again replaces it, no extra voice
  assert.equal(poly.voices.length, FM_MAX_VOICES);
});

test("FmPoly sounds, stays within -1..1, and drops voices after release", () => {
  const poly = new FmPoly(FM_PATCHES.bell);
  for (const n of [60, 64, 67, 72, 76, 79]) poly.noteOn(n, 1);
  const out = new Float32Array(128);
  poly.render(out, SR);
  let max = peak(out);
  for (let i = 0; i < 100; i++) {
    poly.render(out, SR);
    max = Math.max(max, peak(out));
  }
  assert.ok(max > 0.01 && max <= 1, String(max));
  poly.allOff();
  for (let i = 0; i < Math.ceil((SR * 2) / 128); i++) poly.render(out, SR);
  assert.equal(poly.voices.length, 0);
  assert.equal(peak(out), 0);
});

test("store FM patches are complete and use valid store algorithms", () => {
  for (const p of Object.values(FM_PATCHES)) {
    assert.equal(p.ops.length, OP_COUNT);
    assert.deepEqual(checkAlgorithm(ALGORITHMS[p.algorithm]), []);
  }
  const fmParts = PERFORMANCES.flatMap((p) => p.parts).filter((p) => p.engine === "FM-X");
  assert.ok(fmParts.length >= 2);
  for (const p of fmParts) assert.ok(p.fm);
});

test("built fmx-poly.js worklet registers, plays a note and stops on request", () => {
  execFileSync(process.execPath, ["scripts/build-worklets.mjs"], { stdio: "ignore" });
  const code = readFileSync("public/worklets/fmx-poly.js", "utf8");
  let Processor: new (o: unknown) => { port: { onmessage: (e: { data: unknown }) => void }; process: (i: unknown, o: Float32Array[][]) => boolean } = null!;
  runInNewContext(code, {
    sampleRate: SR,
    AudioWorkletProcessor: class {
      port = { onmessage: null };
    },
    registerProcessor: (name: string, cls: typeof Processor) => {
      assert.equal(name, "fmx-poly");
      Processor = cls;
    },
  });
  const node = new Processor({ processorOptions: { patch: FM_PATCHES.tine } });
  const out = [[new Float32Array(128), new Float32Array(128)]];
  node.port.onmessage({ data: { type: "on", note: 60, velocity: 1 } });
  let max = 0;
  for (let i = 0; i < 20; i++) {
    assert.equal(node.process([], out), true);
    max = Math.max(max, peak(out[0][0]));
  }
  assert.ok(max > 0.01);
  assert.deepEqual(out[0][1], out[0][0]);
  node.port.onmessage({ data: { type: "bend", cents: 200 } });
  node.port.onmessage({ data: { type: "stop" } });
  assert.equal(node.process([], out), false);
});
