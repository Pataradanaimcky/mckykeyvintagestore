/**
 * One plain link from a /studio keyboard tab to that keyboard's packs (PM decision 2026-11-16).
 * Only MODX M and FANTOM-0: the store has no DX7 packs page, so the DX7 tab gets no link.
 * Values are the instrument ids in src/lib/catalog/instruments.ts (checked in tests/packs-link.test.ts).
 */
const PACKS_INSTRUMENT: Record<string, string> = {
  "modx-m": "yamaha-modx-m",
  "fantom-0": "roland-fantom-0",
};

/** `/packs?inst=<id>` for the organizer target, or null when that tab gets no link. */
export function packsHref(targetId: string): string | null {
  const inst = PACKS_INSTRUMENT[targetId];
  return inst ? `/packs?inst=${inst}` : null;
}
