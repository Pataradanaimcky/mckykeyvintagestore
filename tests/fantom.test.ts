import assert from "node:assert/strict";
import { test } from "node:test";
import { SceneNameCollector, readSceneNameReply, rolandChecksum, sceneNameRequest } from "../src/lib/studio/fantom.ts";

const hex = (u: ArrayLike<number>) => Array.from(u, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");

test("checksum matches Roland's worked example (scene level 74 → 24H)", () => {
  assert.equal(rolandChecksum([0x02, 0x00, 0x00, 0x10, 0x4a]), 0x24);
  assert.equal(rolandChecksum([0x40, 0x40]), 0x00);
});

test("RQ1 asks for 16 Scene Name bytes of the Temporary Scene", () => {
  assert.equal(hex(sceneNameRequest()), "F0 41 10 00 00 00 5B 11 02 00 00 00 00 00 00 10 6E F7");
  assert.throws(() => sceneNameRequest(0x20));
});

function dt1(start: number, text: string, dev = 0x10) {
  const addr = [0x02, 0x00, 0x00, start];
  const data = Array.from(text, (c) => c.charCodeAt(0));
  return [0xf0, 0x41, dev, 0x00, 0x00, 0x00, 0x5b, 0x12, ...addr, ...data, rolandChecksum([...addr, ...data]), 0xf7];
}

test("reads a DT1 Scene Name reply and builds the name", () => {
  const r = readSceneNameReply(dt1(0, "Stage Piano     "));
  assert.deepEqual(r?.start, 0);
  const c = new SceneNameCollector();
  c.add(r!);
  assert.equal(c.name(), "Stage Piano");
});

test("name waits for all 16 characters, sent in parts", () => {
  const c = new SceneNameCollector();
  c.add(readSceneNameReply(dt1(0, "Warm Pad"))!);
  assert.equal(c.name(), undefined);
  c.add(readSceneNameReply(dt1(8, " Layer 2", 0x11))!);
  assert.equal(c.name(), "Warm Pad Layer 2");
});

test("rejects bad checksum, other addresses, other models and too-long data", () => {
  const ok = dt1(0, "Scene");
  const bad = [...ok];
  bad[bad.length - 2] = (bad[bad.length - 2] + 1) & 0x7f;
  assert.equal(readSceneNameReply(bad), null);
  const level = [0xf0, 0x41, 0x10, 0x00, 0x00, 0x00, 0x5b, 0x12, 0x02, 0x00, 0x00, 0x10, 0x4a, 0x24, 0xf7];
  assert.equal(readSceneNameReply(level), null);
  const other = [...ok];
  other[6] = 0x5c;
  assert.equal(readSceneNameReply(other), null);
  assert.equal(readSceneNameReply(dt1(10, "TooLongName")), null);
});
