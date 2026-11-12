import assert from "node:assert/strict";
import { test } from "node:test";
import { INIT, MAX, parse, unpack } from "@audio/synth-dx7";
import { bankSysex, checksum, packVoice, setVoiceName, voiceName, voiceSysex } from "../src/lib/studio/dx7.ts";

function randomVoice(seed: number) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const p = new Uint8Array(155);
  for (let i = 0; i < 145; i++) p[i] = Math.floor(rnd() * (MAX[i] + 1));
  for (let i = 145; i < 155; i++) p[i] = 32 + Math.floor(rnd() * 90);
  return p;
}

test("packing a voice is the exact inverse of the engine's unpack", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const v = randomVoice(seed);
    assert.deepEqual(unpack(packVoice(v)), v);
  }
});

test("single-voice dump reads back and carries a valid checksum", () => {
  const v = setVoiceName(randomVoice(7), "MCKY TEST");
  const msg = voiceSysex(v, 3);
  assert.equal(msg.length, 163);
  assert.deepEqual([...msg.subarray(0, 6)], [0xf0, 0x43, 0x02, 0x00, 0x01, 0x1b]);
  assert.equal(msg[161], checksum(v));
  assert.equal((v.reduce((a, b) => a + b, 0) + msg[161]) & 127, 0);
  const [back] = parse(msg);
  assert.equal(back.name, "MCKY TEST");
  assert.deepEqual(back.patch, v);
});

test("cartridge dump holds 32 voices and fills empty slots", () => {
  const voices = [randomVoice(1), randomVoice(2)];
  const msg = bankSysex(voices, INIT);
  assert.equal(msg.length, 4104);
  const back = parse(msg);
  assert.equal(back.length, 32);
  assert.deepEqual(back[1].patch, voices[1]);
  assert.equal(back[31].name, "INIT VOICE");
});

test("names are 10 printable characters", () => {
  const p = setVoiceName(INIT, "ไทย PIANO ยาวมากเกินไป");
  assert.equal(voiceName(p).length <= 10, true);
  assert.match(voiceName(p), /^[\x20-\x7e]*$/);
});

test("the free FM bank holds the store's 32 voices in order", async () => {
  const { FM_PRESETS } = await import("../src/components/rack/fm/presets.ts");
  assert.equal(FM_PRESETS.length, 32);
  assert.equal(new Set(FM_PRESETS.map((p) => p.name)).size, 32);
  const back = parse(bankSysex(FM_PRESETS.map((p) => p.patch), INIT));
  assert.deepEqual(back.map((v) => v.name), FM_PRESETS.map((p) => p.name));
  back.forEach((v, i) => assert.deepEqual(v.patch, FM_PRESETS[i].patch));
});

test("a cartridge received from the keyboard is checked before use", async () => {
  const { checkCartridgeDump } = await import("../src/lib/studio/dx7.ts");
  const msg = bankSysex([randomVoice(3)], INIT, 2);
  assert.deepEqual(checkCartridgeDump(msg), { ok: true, channel: 2 });
  const bad = Uint8Array.from(msg);
  bad[100] ^= 1;
  assert.equal(checkCartridgeDump(bad).ok, false);
  assert.equal(checkCartridgeDump(msg.subarray(0, 2000)).ok, false);
  assert.equal(checkCartridgeDump(voiceSysex(INIT)).ok, false);
  assert.equal(checkCartridgeDump([0xf0, 0x41, 0x10, 0x00, 0xf7]).ok, false);
  // A dump request (F0 43 2n ...) is not a dump.
  assert.equal(checkCartridgeDump([0xf0, 0x43, 0x20, 0x09, 0x20, 0x00, 0xf7]).ok, false);
});
