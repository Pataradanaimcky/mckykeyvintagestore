import assert from "node:assert/strict";
import { test } from "node:test";
import { safeNextPath } from "../src/lib/security/paths.ts";

test("keeps paths on this site", () => {
  assert.equal(safeNextPath("/packs?inst=yamaha-modx-m"), "/packs?inst=yamaha-modx-m");
});

test("rejects anything that could leave the site", () => {
  for (const bad of ["//evil.example", "https://evil.example", "/\\evil.example", "evil", "", undefined, ["/a"]]) {
    assert.equal(safeNextPath(bad), "/account");
  }
});
