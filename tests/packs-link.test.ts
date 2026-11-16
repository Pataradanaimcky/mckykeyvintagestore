import assert from "node:assert/strict";
import { test } from "node:test";
import { packsHref } from "../src/components/studio/packsLink.ts";
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
