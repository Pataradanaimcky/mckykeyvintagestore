import { test } from "node:test";
import assert from "node:assert/strict";
import { CTRL_KNOBS, CTRL_START, ctrlsForScene, ctrlText, eqGainsDb, EQ_RANGE_DB, FANTOM_SCENES, pcmAttackS, PCM_MAX_ATTACK_S, pcmReleaseS, pickCurrentZone, setCtrl, vaWithCtrl } from "../src/lib/sim/fantom.ts";

test("CTRL knobs [1]–[8] in the Owner's Manual order", () => {
  assert.deepEqual([...CTRL_KNOBS], ["ATTACK", "RELEASE", "REVERB", "CHORUS", "LOW GAIN", "MID GAIN", "HIGH GAIN", "EQ ON"]);
});

test("a CTRL knob moves only the current zone's job", () => {
  const start = ctrlsForScene(FANTOM_SCENES[0]);
  assert.equal(start.length, FANTOM_SCENES[0].zones.length);
  const next = setCtrl(start, 1, 2, 0.8);
  assert.equal(next[1].REVERB, 0.8);
  assert.deepEqual(next[0], CTRL_START);
  assert.deepEqual(setCtrl(start, 1, 8, 0.8), start);
  assert.equal(setCtrl(start, 0, 0, 3)[0].ATTACK, 1);
});

test("EQ: centre is flat, ends are ±range, EQ ON off makes it flat", () => {
  assert.deepEqual(eqGainsDb(CTRL_START), { low: 0, mid: 0, high: 0 });
  const c = { ...CTRL_START, "LOW GAIN": 1, "HIGH GAIN": 0 };
  assert.deepEqual(eqGainsDb(c), { low: EQ_RANGE_DB, mid: 0, high: -EQ_RANGE_DB });
  assert.deepEqual(eqGainsDb({ ...c, "EQ ON": 0.2 }), { low: 0, mid: 0, high: 0 });
  assert.equal(ctrlText("EQ ON", { ...c, "EQ ON": 0.2 }), "OFF");
  assert.equal(ctrlText("LOW GAIN", c), `+${EQ_RANGE_DB}dB`);
});

test("ATTACK and RELEASE: centre leaves the tone as it is", () => {
  const va = FANTOM_SCENES[0].zones[1].tone.partials[0].va!;
  assert.deepEqual(vaWithCtrl(va, CTRL_START), va);
  const longer = vaWithCtrl(va, { ...CTRL_START, ATTACK: 1, RELEASE: 0 });
  assert.ok(longer.attack > va.attack && longer.release < va.release);
  assert.ok(longer.attack <= 1 && longer.release >= 0);
  assert.equal(pcmReleaseS(CTRL_START), 0.3);
  assert.ok(pcmReleaseS({ ...CTRL_START, RELEASE: 0 }) < 0.05 && pcmReleaseS({ ...CTRL_START, RELEASE: 1 }) > 2);
  assert.equal(ctrlText("ATTACK", CTRL_START), "0");
  assert.equal(ctrlText("REVERB", { ...CTRL_START, REVERB: 1 }), "127");
});

test("ZONE SELECT then a zone button picks the current zone; bad presses keep it", () => {
  assert.equal(pickCurrentZone(0, 2, 4), 2);
  assert.equal(pickCurrentZone(2, 5, 4), 2);
  assert.equal(pickCurrentZone(2, -1, 4), 2);
});

test("PCM ATTACK (S5j): as the tone is at centre and to the left, a fade-in to the right", () => {
  assert.equal(pcmAttackS(CTRL_START), 0);
  assert.equal(pcmAttackS({ ...CTRL_START, ATTACK: 0 }), 0);
  assert.equal(pcmAttackS({ ...CTRL_START, ATTACK: 0.75 }), 0.5);
  assert.equal(pcmAttackS({ ...CTRL_START, ATTACK: 1 }), PCM_MAX_ATTACK_S);
  assert.equal(pcmAttackS({ ...CTRL_START, ATTACK: 7 }), PCM_MAX_ATTACK_S);
  let last = 0;
  for (let v = 0.5; v <= 1; v += 0.05) {
    const a = pcmAttackS({ ...CTRL_START, ATTACK: v });
    assert.ok(a >= last);
    last = a;
  }
});
