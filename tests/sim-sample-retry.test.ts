/**
 * S2f (docs/SIMULATOR.md): when the sample host fails, "โหลดเสียงอีกครั้ง" must really ask the
 * host again. A mocked fetch fails first (host down, then a 503) and works on the next call.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { canRetryLoad, fetchSampleFile, soundfontUrl, type FetchText } from "../src/lib/sim/sampler.ts";

const FILE = 'if (typeof(MIDI) === "undefined") var MIDI = {};\nMIDI.Soundfont.acoustic_grand_piano = {\n"A0": "data:audio/ogg;base64,AAAA",\n"C4": "data:audio/ogg;base64,BBBB",\n}';

function mockedFetch(results: ("down" | number | "ok")[]) {
  const calls: string[] = [];
  const f: FetchText = async (url) => {
    calls.push(url);
    const r = results[calls.length - 1] ?? "ok";
    if (r === "down") throw new TypeError("Failed to fetch");
    if (r === "ok") return { ok: true, status: 200, text: async () => FILE };
    return { ok: false, status: r, text: async () => "" };
  };
  return { f, calls };
}

const URL_PIANO = soundfontUrl("acoustic_grand_piano", "ogg");

test("a failed load throws, and the retry asks the host again and gets the file", async () => {
  const { f, calls } = mockedFetch(["down", 503, "ok"]);
  await assert.rejects(fetchSampleFile(URL_PIANO, f), /Failed to fetch/);
  await assert.rejects(fetchSampleFile(URL_PIANO, f), /sample file 503/);
  const file = await fetchSampleFile(URL_PIANO, f);
  assert.deepEqual(Object.keys(file), ["A0", "C4"]);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((u) => u === URL_PIANO));
});

test("a cut-off file is a failure too, not an empty sound", async () => {
  const f: FetchText = async () => ({ ok: true, status: 200, text: async () => FILE.slice(0, 40) });
  await assert.rejects(fetchSampleFile(URL_PIANO, f), /not a midi-js soundfont file/);
});

test("the retry button shows only after SAMPLE ERROR", () => {
  assert.equal(canRetryLoad("failed"), true);
  for (const s of ["idle", "loading", "ready"] as const) assert.equal(canRetryLoad(s), false);
});
