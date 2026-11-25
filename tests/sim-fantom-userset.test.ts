import { test } from "node:test";
import assert from "node:assert/strict";
import { FANTOM_SCENES, partialChannels, zoneSetChannel } from "../src/lib/sim/fantom.ts";

test("A2d: a zone's own set goes on its first PCM partial channel", () => {
  let pcmZones = 0;
  for (const s of FANTOM_SCENES) {
    const chans = partialChannels(s);
    s.zones.forEach((_, zone) => {
      const i = zoneSetChannel(s, zone);
      const pcm = chans.map((c, n) => [c, n] as const).filter(([c]) => c.zone === zone && c.partial.type === "PCM");
      if (pcm.length === 0) {
        assert.equal(i, null, `${s.name} zone ${zone + 1}`);
        return;
      }
      pcmZones++;
      assert.equal(i, pcm[0][1], `${s.name} zone ${zone + 1}`);
      assert.equal(chans[i!].zone, zone);
      assert.equal(chans[i!].partial.type, "PCM");
    });
  }
  assert.ok(pcmZones > 0, "the store Scenes have PCM zones");
});

test("A2d: VA-only zones and zones out of range have no set channel", () => {
  const vaOnly = FANTOM_SCENES.flatMap((s) => s.zones.map((z, zone) => ({ s, zone, z }))).find(({ z }) => z.tone.partials.every((p) => p.type !== "PCM"));
  if (vaOnly) assert.equal(zoneSetChannel(vaOnly.s, vaOnly.zone), null);
  assert.equal(zoneSetChannel(FANTOM_SCENES[0], 99), null);
  assert.equal(zoneSetChannel(FANTOM_SCENES[0], -1), null);
});
