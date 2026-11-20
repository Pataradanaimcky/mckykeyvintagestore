import { test } from "node:test";
import assert from "node:assert/strict";
import { activePartials, applyZoneControl, audibleZones, PAD_START, padFace, padsForNewScene, pressPad, pressPadMode, asPerformance, channelLevel, learnTargets, learnTargetLabel, MAX_SCENE_PARTIALS, noteTargets, PARTIAL_COUNT, partialChannels, partialText, zoneChannels, readLearnTarget, FANTOM_SCENES, noteName, PAD_COUNT, panText, setSplit, SPLIT_LOWER, SPLIT_UPPER, toggleZone, ZONE_COUNT, zoneRange, zonesForNote } from "../src/lib/sim/fantom.ts";

const grand = FANTOM_SCENES[0];
const onOf = (s: (typeof FANTOM_SCENES)[number]) => s.zones.map((z) => z.on);

test("store Scenes: at least 8, each with zones 1 and 4 for SPLIT, within 16 zones and 16 pads", () => {
  assert.ok(FANTOM_SCENES.length >= 8 && FANTOM_SCENES.length <= PAD_COUNT);
  for (const s of FANTOM_SCENES) {
    assert.ok(s.zones.length > SPLIT_LOWER && s.zones.length <= ZONE_COUNT, s.name);
    assert.ok(s.name.startsWith("MCKY"), s.name);
    for (const z of s.zones) {
      assert.ok(z.tone.partials.length >= 1 && z.tone.partials.length <= PARTIAL_COUNT, z.tone.name);
      for (const p of z.tone.partials) assert.ok(p.type === "PCM" ? !!p.gm : !!p.va, z.tone.name);
    }
    // Every partial gets a channel: the store's Scenes stay within the phone limit.
    assert.equal(partialChannels(s).length, s.zones.reduce((n, z) => n + activePartials(z.tone).length, 0), s.name);
    assert.ok(partialChannels(s).length <= MAX_SCENE_PARTIALS, s.name);
  }
  assert.equal(new Set(FANTOM_SCENES.map((s) => s.name)).size, FANTOM_SCENES.length);
});

test("layer: every lit zone sounds; a zone switched off with ZONE INT/EXT does not", () => {
  assert.deepEqual(zonesForNote(grand, 60, onOf(grand)), [0, 1]);
  const off = toggleZone(onOf(grand), 1);
  assert.deepEqual(zonesForNote(grand, 60, off), [0]);
  assert.deepEqual(toggleZone(off, 1), onOf(grand));
  assert.deepEqual(toggleZone(off, 99), off);
});

test("SPLIT + key: zone 1 from the split key up (key included), zone 4 below it", () => {
  const r = setSplit(onOf(grand), 60);
  assert.equal(r.split.key, 60);
  assert.ok(r.on[SPLIT_UPPER] && r.on[SPLIT_LOWER]);
  assert.deepEqual(zoneRange(grand.zones[0], SPLIT_UPPER, r.split), { low: 60, high: 127 });
  assert.deepEqual(zoneRange(grand.zones[3], SPLIT_LOWER, r.split), { low: 0, high: 59 });
  assert.ok(zonesForNote(grand, 60, r.on, r.split).includes(0));
  assert.ok(!zonesForNote(grand, 60, r.on, r.split).includes(3));
  assert.ok(zonesForNote(grand, 59, r.on, r.split).includes(3));
  assert.ok(!zonesForNote(grand, 59, r.on, r.split).includes(0));
  // Zone 2 keeps its written range and keeps layering.
  assert.ok(zonesForNote(grand, 59, r.on, r.split).includes(1));
});

test("written key ranges split without SPLIT", () => {
  const s = FANTOM_SCENES.find((x) => x.name.includes("Split"))!;
  assert.deepEqual(zonesForNote(s, 40, onOf(s)), [3]);
  assert.deepEqual(zonesForNote(s, 72, onOf(s)), [0]);
});

test("Scene as a Performance for the audio engine: one part per partial", () => {
  const p = asPerformance(grand);
  assert.equal(p.parts.length, partialChannels(grand).length);
  assert.equal(p.parts[0].engine, "AWM2");
  assert.equal(p.parts[1].engine, "AN-X");
  // Zone 3 "Strings+Pad" is two partials (PCM + VA); the bass after it keeps its -12.
  assert.deepEqual(zoneChannels(grand), [[0], [1], [2, 3], [4]]);
  assert.equal(p.parts[2].engine, "AWM2");
  assert.equal(p.parts[3].engine, "AN-X");
  assert.equal(p.parts[4].shift, -12);
});

const t = (n: number, on = true) => ({ type: "VA" as const, on, level: 0.5, va: grand.zones[1].tone.partials[0].va, coarse: n });
const fourZones = (partials: ReturnType<typeof t>[]) => ({
  name: "TEST",
  zones: [0, 1, 2, 3].map(() => ({ tone: { name: "T", partials }, low: 0, high: 127, level: 0.8, pan: 0.5, on: true })),
});

test("tone partials: switched-off partials are silent, at most 4 per tone, at most 8 channels per Scene", () => {
  const tone = { name: "T", partials: [t(0), t(12, false), t(7), t(5), t(3)] };
  assert.deepEqual(activePartials(tone).map((p) => p.coarse), [0, 7, 5]);
  assert.equal(partialText(tone), "VA+VA+VA");
  assert.equal(partialText({ name: "E", partials: [t(0, false)] }), "—");
  const big = fourZones([t(0), t(12), t(7)]);
  assert.equal(partialChannels(big).length, MAX_SCENE_PARTIALS);
  assert.deepEqual(zoneChannels(big), [[0, 1, 2], [3, 4, 5], [6, 7], []]);
});

test("a key plays every partial of every sounding zone, with zone transpose and partial coarse", () => {
  const ep = FANTOM_SCENES.find((s) => s.name === "MCKY EP Layer")!;
  // Zone 1 "Tine EP Bell": EP at the key, vibes an octave up; zone 2 pad.
  assert.deepEqual(noteTargets(ep, 60, onOf(ep)), [[0, 60], [1, 72], [2, 60]]);
  const sp = FANTOM_SCENES.find((s) => s.name.includes("Split"))!;
  // Below the split: zone 4 bass, both partials one octave down.
  assert.deepEqual(noteTargets(sp, 40, onOf(sp)).map(([, n]) => n), [28, 28]);
  // Notes outside 0..127 are dropped.
  assert.deepEqual(noteTargets(fourZones([t(12)]), 120, [true, false, false, false]), []);
});

test("zone slider and ZONE INT/EXT set the level of each partial channel", () => {
  const [c] = partialChannels(fourZones([t(0)]));
  assert.equal(channelLevel(c, [0.8], [true]), 0.4);
  assert.equal(channelLevel(c, [0.8], [false]), 0);
});

test("display text", () => {
  assert.equal(panText(0.5), "C");
  assert.equal(panText(0), "L50");
  assert.equal(panText(1), "R50");
  assert.equal(noteName(60), "C4");
});

test("CC learn targets: LEVEL then PAN for each zone on the panel, at most [1]–[8]", () => {
  // Sliders follow the Scene's zones; knobs 1–8 are always there, since CTRL uses all eight.
  assert.deepEqual(learnTargets(4), ["level1", "level2", "level3", "level4", "pan1", "pan2", "pan3", "pan4", "pan5", "pan6", "pan7", "pan8"]);
  assert.equal(learnTargets(16).length, 16);
  assert.deepEqual(learnTargets(0), ["pan1", "pan2", "pan3", "pan4", "pan5", "pan6", "pan7", "pan8"]);
  for (const s of FANTOM_SCENES) assert.equal(learnTargets(s.zones.length).filter((t) => t.startsWith("pan")).length, 8, s.name);
  assert.equal(learnTargetLabel("level2", 4), "SLIDER 2 (LEVEL)");
  assert.equal(learnTargetLabel("pan4", 4), "KNOB 4 (PAN / CTRL)");
  assert.equal(learnTargetLabel("pan5", 4), "KNOB 5 (CTRL)");
  // With PAN/LEVEL on, a knob past the Scene's zones moves no pan.
  assert.deepEqual(applyZoneControl([0.1, 0.2, 0.3, 0.4], [0.5, 0.5, 0.5, 0.5], "pan5", 0), { levels: [0.1, 0.2, 0.3, 0.4], pans: [0.5, 0.5, 0.5, 0.5] });
  assert.deepEqual(readLearnTarget("pan3"), { control: "pan", zone: 2 });
  assert.equal(readLearnTarget("pan9"), null);
  assert.equal(readLearnTarget("level0"), null);
  assert.equal(readLearnTarget("super"), null);
});

test("a learnt keyboard control moves only its zone's slider or knob", () => {
  const r = applyZoneControl([0.1, 0.2], [0.5, 0.5], "level2", 1.4);
  assert.deepEqual(r, { levels: [0.1, 1], pans: [0.5, 0.5] });
  assert.deepEqual(applyZoneControl([0.1], [0.5], "pan1", 0).pans, [0]);
  // A zone the Scene does not have, or an unknown target, changes nothing.
  assert.deepEqual(applyZoneControl([0.1], [0.5], "level5", 1), { levels: [0.1], pans: [0.5] });
  assert.deepEqual(applyZoneControl([0.1], [0.5], "bogus", 1), { levels: [0.1], pans: [0.5] });
});

const pick = (pad: number) => pressPad(pressPadMode(PAD_START), pad, 4, 8).state;

test("[PAD MODE] then pad 5, 6 or 16 picks ZONE MUTE, ZONE SOLO or SYSTEM; other pads pick nothing", () => {
  assert.equal(pick(4).mode, "ZONE MUTE");
  assert.equal(pick(5).mode, "ZONE SOLO");
  assert.equal(pressPad(pressPadMode(pick(4)), 15, 4, 8).state.mode, "SYSTEM");
  const other = pressPad(pressPadMode(PAD_START), 0, 4, 8);
  assert.equal(other.state.choosing, true);
  assert.equal(other.state.mode, "SYSTEM");
  assert.equal(other.scene, null);
  assert.equal(pressPadMode(pressPadMode(PAD_START)).choosing, false);
});

test("SYSTEM: a pad picks a Scene on this page; an empty pad does nothing", () => {
  assert.equal(pressPad(PAD_START, 3, 4, 8).scene, 3);
  assert.equal(pressPad(PAD_START, 8, 4, 8).scene, null);
});

test("ZONE MUTE: pad = zone, each press toggles, several zones may be muted, held notes follow through the level", () => {
  let s = pressPad(pick(4), 0, 4, 8).state;
  s = pressPad(s, 1, 4, 8).state;
  assert.deepEqual(s.mutes, [true, true, false, false]);
  assert.deepEqual(audibleZones([true, true, true, false], s), [false, false, true, false]);
  assert.equal(pressPad(s, 9, 4, 8).state, s);
  assert.deepEqual(pressPad(s, 1, 4, 8).state.mutes, [true, false, false, false]);
  const heard = audibleZones(onOf(grand), s);
  assert.deepEqual(noteTargets(grand, 60, heard), []);
  assert.equal(channelLevel(partialChannels(grand)[0], grand.zones.map((z) => z.level), heard), 0);
});

test("ZONE SOLO: one zone at a time, the same pad cancels, an unlit or muted zone stays silent", () => {
  let s = pressPad(pick(5), 1, 4, 8).state;
  assert.deepEqual(audibleZones([true, true, true, true], s), [false, true, false, false]);
  s = pressPad(s, 2, 4, 8).state;
  assert.equal(s.solo, 2);
  assert.deepEqual(audibleZones([true, true, false, true], s), [false, false, false, false]);
  assert.equal(pressPad(s, 2, 4, 8).state.solo, null);
  assert.deepEqual(audibleZones([true, true], { ...PAD_START, solo: 0, mutes: [true] }), [false, false]);
});

test("a new Scene clears pad mutes and solo and keeps the mode; pad faces follow the mode", () => {
  const s = pressPad(pick(4), 2, 4, 8).state;
  assert.deepEqual(padsForNewScene({ ...s, solo: 1 }), { mode: "ZONE MUTE", choosing: false, mutes: [], solo: null });
  assert.equal(padFace(s, 2, 4, ["A"], 0).pressed, true);
  assert.equal(padFace(s, 4, 4, ["A"], 0).enabled, false);
  assert.equal(padFace(pressPadMode(s), 4, 4, ["A"], 0).label, "ZONE MUTE");
  assert.equal(padFace(pressPadMode(s), 0, 4, ["A"], 0).enabled, false);
  assert.deepEqual([padFace(PAD_START, 0, 4, ["A"], 0).enabled, padFace(PAD_START, 1, 4, ["A"], 0).enabled], [true, false]);
});
