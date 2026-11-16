import { test } from "node:test";
import assert from "node:assert/strict";
import { fileInfoUrl, filePhotos, leadImages, loadPhotos, plainText } from "../src/lib/history/commons.ts";

test("lead images follow normalisation and redirects", () => {
  const map = leadImages(["Yamaha DX7", "minimoog", "Nope"], {
    query: {
      normalized: [{ from: "minimoog", to: "Minimoog" }],
      redirects: [{ from: "Minimoog", to: "Minimoog Model D" }],
      pages: [
        { title: "Yamaha DX7", pageimage: "Yamaha_DX7.jpg" },
        { title: "Minimoog Model D", pageimage: "Minimoog.JPG" },
        { title: "Nope", missing: true },
      ],
    },
  });
  assert.equal(map.get("Yamaha DX7"), "Yamaha DX7.jpg");
  assert.equal(map.get("minimoog"), "Minimoog.JPG");
  assert.equal(map.has("Nope"), false);
});

test("only Commons files with a licence become photos, credit as plain text", () => {
  const map = filePhotos({
    query: {
      pages: [
        {
          title: "File:Yamaha DX7.jpg",
          imageinfo: [
            {
              thumburl: "https://upload.wikimedia.org/x.jpg",
              descriptionurl: "https://commons.wikimedia.org/wiki/File:Yamaha_DX7.jpg",
              extmetadata: {
                Artist: { value: '<a href="//x">Jane &amp; Co</a>' },
                LicenseShortName: { value: "CC BY-SA 4.0" },
                LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" },
              },
            },
          ],
        },
        { title: "File:Nonfree.jpg", missing: true },
        { title: "File:NoLicence.jpg", imageinfo: [{ thumburl: "a", descriptionurl: "b", extmetadata: {} }] },
      ],
    },
  });
  assert.deepEqual([...map.keys()], ["Yamaha DX7.jpg"]);
  assert.equal(map.get("Yamaha DX7.jpg")?.author, "Jane & Co");
  assert.equal(map.get("Yamaha DX7.jpg")?.licence, "CC BY-SA 4.0");
});

test("plainText strips tags and entities", () => {
  assert.equal(plainText("<span>A&nbsp;B</span>\n <i>C</i>"), "A B C");
});

test("fileInfoUrl asks Commons with origin=*", () => {
  const u = new URL(fileInfoUrl(["A b.jpg"]));
  assert.equal(u.hostname, "commons.wikimedia.org");
  assert.equal(u.searchParams.get("origin"), "*");
  assert.equal(u.searchParams.get("titles"), "File:A b.jpg");
});

test("loadPhotos joins both replies and survives a failed fetch", async () => {
  const replies = [
    { query: { pages: [{ title: "Polymoog", pageimage: "Poly_moog.jpg" }] } },
    {
      query: {
        pages: [
          {
            title: "File:Poly moog.jpg",
            imageinfo: [{ thumburl: "t", descriptionurl: "d", extmetadata: { LicenseShortName: { value: "Public domain" } } }],
          },
        ],
      },
    },
  ];
  let i = 0;
  const fake = (async () => ({ json: async () => replies[i++] })) as unknown as typeof fetch;
  const photos = await loadPhotos(["Polymoog"], fake);
  assert.equal(photos.get("Polymoog")?.licence, "Public domain");
  const failing = (async () => {
    throw new Error("offline");
  }) as unknown as typeof fetch;
  assert.equal((await loadPhotos(["Polymoog"], failing)).size, 0);
});
