import { test } from "node:test";
import assert from "node:assert/strict";
import { BEND_RANGE, bendCents, emptyLearn, forget, handleCc, hasReadyMap, listenAll, parseMidi, RESERVED_CCS, toggleLearn, toggleReadyMap, type MidiEvent, type MidiInputLike } from "../src/lib/sim/midi.ts";
import { MODX_DEFAULT_CC, sceneFromCc } from "../src/lib/sim/modx.ts";

test("parseMidi reads note on/off, CC and pitch bend on any channel", () => {
  assert.deepEqual(parseMidi([0x90, 60, 127]), { type: "noteOn", channel: 0, note: 60, velocity: 1 });
  assert.deepEqual(parseMidi([0x93, 60, 0]), { type: "noteOff", channel: 3, note: 60 });
  assert.deepEqual(parseMidi([0x80, 61, 40]), { type: "noteOff", channel: 0, note: 61 });
  assert.deepEqual(parseMidi([0xb1, 74, 100]), { type: "cc", channel: 1, cc: 74, value: 100 });
  assert.deepEqual(parseMidi([0xe0, 0, 64]), { type: "bend", channel: 0, value: 0 });
  assert.deepEqual(parseMidi([0xe0, 0, 0]), { type: "bend", channel: 0, value: -1 });
  const up = parseMidi([0xe0, 127, 127]) as { value: number };
  assert.ok(up.value > 0.999 && up.value < 1);
});

test("parseMidi ignores short, system and program change messages", () => {
  assert.equal(parseMidi(null), null);
  assert.equal(parseMidi([0x90, 60]), null);
  assert.equal(parseMidi([0xc0, 5]), null);
  assert.equal(parseMidi([0xf8, 0, 0]), null);
  assert.equal(parseMidi([60, 100, 0]), null);
});

test("learn: the next CC goes to the waiting control and then moves it", () => {
  let s = toggleLearn(emptyLearn<"super">(), "super");
  assert.equal(s.learning, "super");
  const r = handleCc(s, 20, 127);
  s = r.state;
  assert.deepEqual(s, { learning: null, map: { super: 20 } });
  assert.deepEqual(r.set, [{ target: "super", value: 1 }]);
  const r2 = handleCc<"super">(s, 20, 0);
  assert.deepEqual(r2.set, [{ target: "super", value: 0 }]);
  assert.deepEqual(handleCc(s, 21, 64).set, []);
  assert.deepEqual(forget(s, "super").map, {});
});

test("learn skips Bank Select, sustain and channel mode CCs", () => {
  const s = toggleLearn(emptyLearn<"super">(), "super");
  for (const cc of [0, 32, 64, 120, 123, 127]) {
    const r = handleCc(s, cc, 100);
    assert.equal(r.state.learning, "super", `CC ${cc} is not learnt`);
    assert.deepEqual(r.set, []);
  }
});

test("learning a CC already in use moves it to the new control", () => {
  let s = { learning: null, map: { a: 7 } } as ReturnType<typeof emptyLearn<"a" | "b">>;
  s = toggleLearn(s, "b");
  const r = handleCc(s, 7, 10);
  assert.deepEqual(r.state.map, { b: 7 });
  assert.deepEqual(toggleLearn(toggleLearn(s, "a"), "a").learning, null);
});

test("listenAll with a mocked navigator.requestMIDIAccess: events from every input, hot-plug, stop", async () => {
  const a: MidiInputLike = { name: "Keyboard A", onmidimessage: null };
  const b: MidiInputLike = { name: null, onmidimessage: null };
  const inputs = new Map<string, MidiInputLike>([["a", a]]);
  const access = { inputs, onstatechange: null as ((e: unknown) => void) | null };
  const nav = { requestMIDIAccess: async (opts: { sysex: boolean }) => (assert.equal(opts.sysex, false), access) };
  const got = await nav.requestMIDIAccess({ sysex: false });

  const events: MidiEvent[] = [];
  const ports: string[][] = [];
  const stop = listenAll(got, (e) => events.push(e), (n) => ports.push(n));
  assert.deepEqual(ports, [["Keyboard A"]]);
  a.onmidimessage!({ data: new Uint8Array([0x90, 64, 64]) });
  a.onmidimessage!({ data: new Uint8Array([0xfe]) });
  assert.equal(events.length, 1);

  inputs.set("b", b);
  access.onstatechange!({});
  assert.deepEqual(ports.at(-1), ["Keyboard A", "MIDI"]);
  b.onmidimessage!({ data: new Uint8Array([0xb0, 1, 90]) });
  assert.deepEqual(events.at(-1), { type: "cc", channel: 0, cc: 1, value: 90 });

  stop();
  assert.equal(a.onmidimessage, null);
  assert.equal(b.onmidimessage, null);
  assert.equal(access.onstatechange, null);
});

test("bendCents: ±2 semitones, centre is 0, out-of-range values are clamped", () => {
  assert.equal(BEND_RANGE, 2);
  assert.equal(bendCents(0), 0);
  assert.equal(bendCents(1), 200);
  assert.equal(bendCents(-1), -200);
  assert.equal(bendCents(0.5), 100);
  assert.equal(bendCents(3), 200);
  assert.equal(bendCents(Number.NaN), 0);
  assert.equal(bendCents(1, 12), 1200);
  const ev = parseMidi([0xe0, 0, 96]) as { value: number };
  assert.equal(bendCents(ev.value), 100);
});

test("listenAll passes pitch bend from a mocked keyboard", () => {
  const input: MidiInputLike = { name: "Mock", onmidimessage: null };
  const access = { inputs: { values: () => [input][Symbol.iterator]() }, onstatechange: null };
  const got: MidiEvent[] = [];
  const stop = listenAll(access, (e) => got.push(e), () => {});
  input.onmidimessage?.({ data: new Uint8Array([0xe0, 0, 0x60]) });
  assert.deepEqual(got, [{ type: "bend", channel: 0, value: 0.5 }]);
  stop();
  assert.equal(input.onmidimessage, null);
});

test("MODX M default CCs are the printed numbers and none is reserved", () => {
  assert.equal(MODX_DEFAULT_CC.superKnob, 0x5f);
  assert.equal(MODX_DEFAULT_CC.scene, 0x5c);
  assert.deepEqual([...MODX_DEFAULT_CC.assignKnobs], [17, 18, 19, 20, 21, 22, 23, 24]);
  for (const cc of [MODX_DEFAULT_CC.superKnob, MODX_DEFAULT_CC.scene, ...MODX_DEFAULT_CC.assignKnobs]) assert.equal(RESERVED_CCS.has(cc), false);
});

test("sceneFromCc follows the 16-value blocks of Scene CC", () => {
  const edges: [number, number][] = [[0, 0], [15, 0], [16, 1], [31, 1], [32, 2], [47, 2], [48, 3], [63, 3], [64, 4], [79, 4], [80, 5], [95, 5], [96, 6], [111, 6], [112, 7], [127, 7]];
  for (const [value, scene] of edges) assert.equal(sceneFromCc(value), scene, `value ${value}`);
  assert.equal(sceneFromCc(-1), 0);
  assert.equal(sceneFromCc(200), 7);
  assert.equal(sceneFromCc(Number.NaN), 0);
});

test("ready map: goes on, moves its controls, and comes off leaving learnt controls", () => {
  type T = "super" | "scene" | "part1";
  const ready = { super: 95, scene: 92 };
  let s = handleCc(toggleLearn(emptyLearn<T>(), "part1"), 7, 10).state;
  assert.equal(hasReadyMap(s, ready), false);
  s = toggleReadyMap(s, ready);
  assert.equal(hasReadyMap(s, ready), true);
  assert.deepEqual(s.map, { part1: 7, super: 95, scene: 92 });
  assert.deepEqual(handleCc(s, 95, 127).set, [{ target: "super", value: 1 }]);
  assert.deepEqual(handleCc(s, 92, 127).set, [{ target: "scene", value: 1 }]);
  s = toggleReadyMap(s, ready);
  assert.deepEqual(s, { learning: null, map: { part1: 7 } });
});

test("ready map: takes its CC from another control, and learning that CC elsewhere breaks it", () => {
  type T = "super" | "scene" | "part1";
  const ready = { super: 95, scene: 92 };
  let s = handleCc(toggleLearn(emptyLearn<T>(), "part1"), 95, 0).state;
  s = toggleReadyMap(s, ready);
  assert.deepEqual(s.map, { super: 95, scene: 92 });
  s = handleCc(toggleLearn(s, "part1"), 92, 0).state;
  assert.deepEqual(s.map, { super: 95, part1: 92 });
  assert.equal(hasReadyMap(s, ready), false);
  assert.equal(hasReadyMap(emptyLearn<T>(), {}), false);
});
