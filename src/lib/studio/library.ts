/**
 * The sound organizer: put the sounds someone already made on their keyboard
 * into the order they want to find them in. Sounds are edited on the keyboard,
 * not here; this only arranges them.
 *
 * Pure data and rules, shared by the page and the tests.
 */

export type TargetId = "dx7" | "modx-m" | "fantom-0";

export interface Target {
  id: TargetId;
  /** Maker and model, as plain text. */
  name: string;
  short: string;
  /** What one grid is called on the keyboard. */
  pageName: string;
  /** What one place in the grid is called. */
  slotName: string;
  slotsPerPage: number;
  columns: number;
  maxPages: number;
  /** Sounds come from a file that can be saved again in the new order. */
  usesFile: boolean;
  /** Slot colors can be chosen on the keyboard. */
  colors: boolean;
  about: string;
  /** How to put the result on the keyboard. */
  howTo: string;
  verified: boolean;
  sources: string[];
}

export const TARGETS: Target[] = [
  {
    id: "dx7",
    name: "Yamaha DX7",
    short: "DX7",
    pageName: "Cartridge",
    slotName: "Voice",
    slotsPerPage: 32,
    columns: 8,
    maxPages: 1,
    usesFile: true,
    colors: false,
    about: "เปิดไฟล์ .syx (แบงก์ 32 เสียงหรือเสียงเดี่ยว) ลากเรียงใหม่ ฟังได้ แล้วดาวน์โหลดแบงก์ที่เรียงแล้ว",
    howTo: "ส่งไฟล์ .syx เข้าเครื่องด้วยโปรแกรม MIDI ที่ใช้อยู่ หรือเปิดใน Dexed",
    verified: true,
    sources: [],
  },
  {
    id: "modx-m",
    name: "Yamaha MODX M",
    short: "MODX M",
    pageName: "Live Set Page",
    slotName: "Slot",
    slotsPerPage: 16,
    columns: 4,
    maxPages: 16,
    usesFile: false,
    colors: true,
    about: "ใส่ชื่อ Performance ที่ทำไว้ในเครื่อง แล้วจัดลง Live Set หน้าละ 16 ช่อง",
    howTo: "บนเครื่อง: เปิด Live Set แล้วกด Edit วาง Performance ลงช่องตามใบจัดเรียง",
    verified: false,
    sources: ["https://files.kraftmusic.com/media/ownersmanual/Yamaha_MODX_M6_Operation_Manual.pdf"],
  },
  {
    id: "fantom-0",
    name: "Roland FANTOM-0",
    short: "FANTOM-0",
    pageName: "Scene Bank",
    slotName: "Scene",
    slotsPerPage: 16,
    columns: 4,
    maxPages: 16,
    usesFile: false,
    colors: false,
    about: "ใส่ชื่อ Scene ที่ทำไว้ในเครื่อง แล้วจัดลำดับทีละแบงก์ แบงก์ละ 16 ช่อง",
    howTo: "บนเครื่อง: ใช้ Scene Write เก็บแต่ละ Scene ลงหมายเลขตามใบจัดเรียง",
    verified: false,
    sources: ["https://static.roland.com/assets/media/pdf/FANTOM-06_07_08_Parameter_eng01_W.pdf"],
  },
];

export function getTarget(id: string): Target {
  return TARGETS.find((t) => t.id === id) ?? TARGETS[0];
}

/** Slot colors use the store's two line colors and neutral tones. */
export const SLOT_COLORS = ["none", "blue", "red", "light-blue", "light-red", "gray"] as const;
export type SlotColor = (typeof SLOT_COLORS)[number];

export interface Item {
  id: string;
  name: string;
  note: string;
  color: SlotColor;
  /** DX7 only: the voice data (155 bytes), base64. */
  patch?: string;
}

export interface Layout {
  version: 1;
  target: TargetId;
  title: string;
  /** pages[p][s] is the item in slot s of page p, or null for an empty slot. */
  pages: (Item | null)[][];
  /** Sounds not placed yet. */
  pool: Item[];
}

/** Where an item sits: in a slot, or in the pool. */
export type Place = { kind: "slot"; page: number; slot: number } | { kind: "pool"; index: number };

let counter = 0;
export const newId = () => `i${Date.now().toString(36)}${(counter++).toString(36)}`;

export const emptyPage = (t: Target) => Array.from({ length: t.slotsPerPage }, () => null as Item | null);

export function newItem(name: string, patch?: string): Item {
  return { id: newId(), name: name.trim().slice(0, 40), note: "", color: "none", ...(patch ? { patch } : {}) };
}

export function emptyLayout(target: TargetId): Layout {
  const t = getTarget(target);
  return { version: 1, target: t.id, title: t.id === "dx7" ? "MY CARTRIDGE" : "My Live Set", pages: [emptyPage(t)], pool: [] };
}

/** Names pasted one per line (numbers, bullets and tabs at the start are ignored) become pool items. */
export function itemsFromText(text: string, limit = 256): Item[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.):\s-]+)?\s*/, "").trim())
    .filter(Boolean)
    .slice(0, limit)
    .map((name) => newItem(name));
}

const get = (layout: Layout, at: Place) => (at.kind === "slot" ? layout.pages[at.page]?.[at.slot] ?? null : layout.pool[at.index] ?? null);

/**
 * Moves the item at `from` to `to`. Dropping on a filled slot swaps the two;
 * dropping in the pool takes the item out of the grid.
 */
export function moveItem(layout: Layout, from: Place, to: Place): Layout {
  const item = get(layout, from);
  if (!item) return layout;
  if (from.kind === "slot" && to.kind === "slot" && from.page === to.page && from.slot === to.slot) return layout;
  const pages = layout.pages.map((p) => [...p]);
  let pool = [...layout.pool];
  const target = to.kind === "slot" ? (pages[to.page]?.[to.slot] ?? null) : null;
  if (to.kind === "slot" && !pages[to.page]) return layout;

  // Take the item out of where it was, leaving what was at the target in its place.
  if (from.kind === "slot") pages[from.page][from.slot] = target;
  else {
    pool.splice(from.index, 1);
    if (target) pool.splice(from.index, 0, target);
  }

  if (to.kind === "slot") pages[to.page][to.slot] = item;
  else {
    if (from.kind === "pool") pool = pool.filter((x) => x.id !== item.id);
    pool.splice(Math.min(to.index, pool.length), 0, item);
  }
  return { ...layout, pages, pool };
}

/** Fills the empty slots, in order from the current page on, with pool items. */
export function fillEmpty(layout: Layout, fromPage = 0): Layout {
  const pages = layout.pages.map((p) => [...p]);
  const pool = [...layout.pool];
  for (let p = fromPage; p < pages.length && pool.length; p++) {
    for (let s = 0; s < pages[p].length && pool.length; s++) if (!pages[p][s]) pages[p][s] = pool.shift()!;
  }
  return { ...layout, pages, pool };
}

/** Sorts the filled slots of one page by name, keeping the empty ones at the end. */
export function sortPage(layout: Layout, page: number): Layout {
  const items = (layout.pages[page] ?? []).filter((x): x is Item => !!x).sort((a, b) => a.name.localeCompare(b.name));
  const pages = layout.pages.map((p, i) => (i === page ? p.map((_, s) => items[s] ?? null) : p));
  return { ...layout, pages };
}

export function updateItem(layout: Layout, id: string, change: Partial<Omit<Item, "id">>): Layout {
  const fix = (x: Item | null) => (x && x.id === id ? { ...x, ...change } : x);
  return { ...layout, pages: layout.pages.map((p) => p.map(fix)), pool: layout.pool.map((x) => fix(x)!) };
}

export function removeItem(layout: Layout, id: string): Layout {
  return {
    ...layout,
    pages: layout.pages.map((p) => p.map((x) => (x?.id === id ? null : x))),
    pool: layout.pool.filter((x) => x.id !== id),
  };
}

/** Slot label as the keyboard counts: DX7 voices 1–32, Live Set slots 1–16 on each page, FANTOM scenes numbered through. */
export function slotLabel(t: Target, page: number, slot: number) {
  if (t.id === "fantom-0") return String(page * t.slotsPerPage + slot + 1).padStart(3, "0");
  return String(slot + 1);
}

/** Order sheet in the keyboard's own words. */
export function orderSheet(layout: Layout): string {
  const t = getTarget(layout.target);
  const lines = [layout.title, `${t.name} · ${t.pageName}`, ""];
  layout.pages.forEach((page, p) => {
    if (t.maxPages > 1) lines.push(`${t.pageName} ${p + 1}`);
    page.forEach((item, s) => {
      if (!item) return;
      const extra = [item.color !== "none" ? item.color : "", item.note].filter(Boolean).join(" · ");
      lines.push(`  ${t.slotName} ${slotLabel(t, p, s)}: ${item.name}${extra ? `  (${extra})` : ""}`);
    });
    lines.push("");
  });
  if (layout.pool.length) lines.push(`ยังไม่ได้วาง: ${layout.pool.map((x) => x.name).join(", ")}`, "");
  lines.push(t.howTo, "", "จัดบน Mcky Vintage Key");
  return lines.join("\n");
}

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u001f]/g, "").slice(0, max) : "");

function parseItem(raw: unknown, allowPatch: boolean): Item | null {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return null;
  const name = clean(r.name, 40);
  if (!name) return null;
  const color = SLOT_COLORS.includes(r.color as SlotColor) ? (r.color as SlotColor) : "none";
  const patch = allowPatch && typeof r.patch === "string" && /^[A-Za-z0-9+/]{206}[A-Za-z0-9+/=]{2}$/.test(r.patch) ? r.patch : undefined;
  return { id: newId(), name, note: clean(r.note, 60), color, ...(patch ? { patch } : {}) };
}

/** Reads a layout from a file or link, rejecting anything malformed. */
export function parseLayout(raw: unknown): Layout | null {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== "object" || r.version !== 1 || !Array.isArray(r.pages)) return null;
  const t = getTarget(String(r.target));
  if (t.id !== r.target) return null;
  const pages = (r.pages as unknown[]).slice(0, t.maxPages).map((page) => {
    const list = Array.isArray(page) ? page : [];
    return Array.from({ length: t.slotsPerPage }, (_, s) => parseItem(list[s], t.usesFile));
  });
  const pool = (Array.isArray(r.pool) ? r.pool : [])
    .slice(0, 512)
    .map((x) => parseItem(x, t.usesFile))
    .filter((x): x is Item => !!x);
  return { version: 1, target: t.id, title: clean(r.title, 40) || emptyLayout(t.id).title, pages: pages.length ? pages : [emptyPage(t)], pool };
}

const strip = (layout: Layout) => ({
  ...layout,
  pages: layout.pages.map((p) => p.map((x) => (x ? { ...x, id: undefined } : null))),
  pool: layout.pool.map((x) => ({ ...x, id: undefined })),
});

export const layoutToJson = (layout: Layout) => JSON.stringify(strip(layout), null, 2);

/** Layout as a short string for a share link. */
export function encodeLayout(layout: Layout): string {
  const bytes = new TextEncoder().encode(JSON.stringify(strip(layout)));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeLayout(code: string): Layout | null {
  if (code.length > 60000) return null;
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    return parseLayout(JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))));
  } catch {
    return null;
  }
}
