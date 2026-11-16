/**
 * Photos for /history come from Wikimedia Commons at view time, never copied into the repo.
 * Step 1 asks English Wikipedia for each article's lead image (prop=pageimages).
 * Step 2 asks Commons for that file's thumbnail, author and licence (prop=imageinfo, extmetadata).
 * A file that is not on Commons (Wikipedia's own non-free images) comes back "missing" in step 2
 * and is not shown, so only freely licensed photos appear, each with its credit from Commons itself.
 * Both APIs allow browser requests with origin=*.
 */

export type CommonsPhoto = {
  /** Thumbnail URL on upload.wikimedia.org. */
  src: string;
  /** The file's page on Commons (credit link). */
  page: string;
  author: string;
  licence: string;
  licenceUrl?: string;
};

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

export function leadImageUrl(titles: string[]): string {
  const q = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    redirects: "1",
    prop: "pageimages",
    piprop: "name",
    titles: titles.join("|"),
  });
  return `${WIKI_API}?${q}`;
}

export function fileInfoUrl(files: string[], width = 640): string {
  const q = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: String(width),
    iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
    titles: files.map((f) => `File:${f}`).join("|"),
  });
  return `${COMMONS_API}?${q}`;
}

/** Commons and Wikipedia write titles with spaces and a capital first letter. */
export const normTitle = (t: string) => {
  const s = t.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** extmetadata values are HTML; the page shows plain text. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

type WikiReply = {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: { title: string; missing?: boolean; pageimage?: string }[];
  };
};

/** Article title as asked → lead image file name (spaces, no "File:"). */
export function leadImages(asked: string[], reply: WikiReply): Map<string, string> {
  const q = reply.query ?? {};
  const follow = (t: string) => {
    let cur = t;
    for (const step of [q.normalized ?? [], q.redirects ?? []]) {
      const hit = step.find((s) => s.from === cur);
      if (hit) cur = hit.to;
    }
    return cur;
  };
  const byTitle = new Map((q.pages ?? []).filter((p) => !p.missing && p.pageimage).map((p) => [p.title, p.pageimage!]));
  const out = new Map<string, string>();
  for (const t of asked) {
    const file = byTitle.get(follow(t));
    if (file) out.set(t, normTitle(file));
  }
  return out;
}

type CommonsReply = {
  query?: {
    pages?: {
      title: string;
      missing?: boolean;
      imageinfo?: {
        thumburl?: string;
        url?: string;
        descriptionurl?: string;
        extmetadata?: Record<string, { value?: string } | undefined>;
      }[];
    }[];
  };
};

/** File name (spaces, no "File:") → photo with credit. Files without a licence name are left out. */
export function filePhotos(reply: CommonsReply): Map<string, CommonsPhoto> {
  const out = new Map<string, CommonsPhoto>();
  for (const p of reply.query?.pages ?? []) {
    const info = p.imageinfo?.[0];
    if (p.missing || !info) continue;
    const meta = info.extmetadata ?? {};
    const licence = plainText(meta.LicenseShortName?.value ?? "");
    const src = info.thumburl ?? info.url;
    if (!licence || !src || !info.descriptionurl) continue;
    out.set(normTitle(p.title.replace(/^File:/, "")), {
      src,
      page: info.descriptionurl,
      author: plainText(meta.Artist?.value ?? "") || "ไม่ระบุชื่อผู้ถ่าย (ดูที่หน้าไฟล์)",
      licence,
      licenceUrl: meta.LicenseUrl?.value || undefined,
    });
  }
  return out;
}

/** Fetches photos for the given Wikipedia article titles. Errors give an empty map (the page shows no photo). */
export async function loadPhotos(titles: string[], fetcher: typeof fetch = fetch): Promise<Map<string, CommonsPhoto>> {
  const out = new Map<string, CommonsPhoto>();
  try {
    const lead = leadImages(titles, await (await fetcher(leadImageUrl(titles))).json());
    const files = [...new Set(lead.values())];
    if (files.length === 0) return out;
    const photos = filePhotos(await (await fetcher(fileInfoUrl(files))).json());
    for (const [title, file] of lead) {
      const photo = photos.get(file);
      if (photo) out.set(title, photo);
    }
  } catch {
    // Offline or blocked: the cards show their text-only plate.
  }
  return out;
}
