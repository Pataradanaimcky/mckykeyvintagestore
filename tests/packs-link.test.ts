import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { packsHref, simHref } from "../src/components/studio/packsLink.ts";
import { instruments } from "../src/lib/catalog/instruments.ts";

test("/studio links MODX M and FANTOM-0 to their packs, DX7 gets no link (PM decision 2026-11-16)", () => {
  assert.equal(packsHref("modx-m"), "/packs?inst=yamaha-modx-m");
  assert.equal(packsHref("fantom-0"), "/packs?inst=roland-fantom-0");
  assert.equal(packsHref("dx7"), null);
  const ids = new Set<string>(instruments.map((i) => i.id));
  for (const t of ["modx-m", "fantom-0"]) {
    const inst = packsHref(t)!.split("inst=")[1];
    assert.ok(ids.has(inst), inst);
  }
});

test("/studio demo banks link MODX M and FANTOM-0 to their simulator page, DX7 gets none (PM decision 2026-11-17)", () => {
  assert.equal(simHref("modx-m"), "/#play-modxm");
  assert.equal(simHref("fantom-0"), "/#play-fantom");
  assert.equal(simHref("dx7"), null);
  const rack = readFileSync(new URL("../src/components/rack/RackCarousel.tsx", import.meta.url), "utf8");
  for (const t of ["modx-m", "fantom-0"]) {
    const page = simHref(t)!.replace("/#play-", "");
    assert.ok(rack.includes(`id: "${page}"`), page);
  }
});
