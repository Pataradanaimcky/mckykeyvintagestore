/**
 * The sound organizer: put the sounds someone already made on their keyboard
 * into the order they want to find them in. Sounds are edited on the keyboard,
 * not here; this only arranges them.
 *
 * Pure data and rules, shared by the page and the tests.
 */

import { PREVIEW_SOUNDS } from "./sounds.ts";

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
  /** Slot colors the keyboard offers, by its own names; empty when slots have no color. */
  colors: string[];
  /** Pages grouped into banks on the keyboard (MODX M: 16 pages per User bank). */
  pagesPerBank?: number;
  /** Longest slot name the keyboard takes. */
  nameMax: number;
  /** Each slot has its own volume (0..127). */
  hasVolume: boolean;
  /** Each slot has its own SSS Time (MODX M: 0.0sec–30sec, Hold, System). */
  hasSssTime?: boolean;
  /** Banks and pages have names on the keyboard, up to this many characters. */
  pageNameMax?: number;
  /** Names take only printable ASCII (0x20–0x7E), per the maker's data list. */
  asciiNames?: boolean;
  /**
   * Slot types the keyboard offers, by its own names; the organizer arranges only the first
   * (MODX M Live Set: Perform, Song, Audio, Pattern).
   */
  slotTypes?: string[];
  /**
   * The keyboard can play stored sounds in a chosen order without moving them (FANTOM-0 Scene Chain,
   * Reference Manual pp. 74–77). Steps in the keyboard's own words, and how many it holds.
   */
  chain?: { howTo: string; max: number };
  /**
   * How to move sounds that are already in place on the keyboard, with the keyboard's own
   * copy or exchange job (MODX M Live Set Edit: Job → Exchange / Copy), in its own words.
   */
  rearrange?: string;
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
    colors: [],
    nameMax: 10,
    hasVolume: false,
    about: "เปิดไฟล์ .syx (แบงก์ 32 เสียงหรือเสียงเดี่ยว) ลากเรียงใหม่ ฟังได้ แล้วดาวน์โหลดแบงก์ที่เรียงแล้ว",
    howTo:
      "ส่งไฟล์ .syx เข้าเครื่องด้วยโปรแกรม MIDI ที่ใช้อยู่ หรือเปิดใน Dexed · ก่อนส่งเข้า DX7 (ตามคู่มือ DX7 หน้า 20, 56–57): ตั้ง DX7 ให้รับ MIDI ช่อง 1 (ไฟล์นี้เขียนไว้ช่อง 1) ตั้งเป็น SYS INFO AVAIL (ถ้าเป็น SYS INFO UNAVAIL เครื่องจะไม่รับข้อมูลเสียง) และปิด MEMORY PROTECT ของ INTERNAL ให้เป็น OFF แล้วเปิดกลับเป็น ON เมื่อเสร็จ · ส่งเสร็จในราว 1 วินาที จอ DX7 จะขึ้น FUNCTION CONTROL / MIDI RECEIVED ถ้าไม่ขึ้น ให้ตรวจว่า MEMORY PROTECT เป็น OFF แล้ว (คู่มือ DX7 หน้า 56) · เครื่องต้องปิด Memory Protect เพื่อรับ แปลว่าเสียงเดิมในเครื่องอาจถูกแทน ให้รับเสียงเดิมด้วยปุ่มรับบนหน้านี้แล้วดาวน์โหลดเก็บไว้ก่อน · ถ้ามี RAM cartridge ก็เก็บ 32 เสียงเดิมลงตลับได้ (คู่มือ DX7 หน้า 49): เลื่อนสวิตช์ Memory Protect บนตลับเป็น OFF กด [MEMORY PROTECT-CARTRIDGE] แล้ว [OFF] จากนั้น [FUNCTION] → [SAVE] จอถาม SAVE MEMORY ALL OF MEMORY? กด [YES] ถาม ARE YOU SURE? กด [YES] อีกครั้ง จอขึ้น UNDER WRITING! ราว 20 วินาที เสร็จแล้วเปิด Memory Protect ของตลับกลับ · ยังไม่ได้ทดสอบกับ DX7 จริง · จะเล่นบน MONTAGE หรือ MODX: แปลงไฟล์นี้ด้วย Yamaha FM Converter (Yamaha ระบุว่ารองรับ Montage และ MODX และหน้า Compatibility ของ Yamaha บอกว่าเจ้าของ MONTAGE M / MODX M ใช้แปลงเป็นไฟล์ User ของ MONTAGE ได้ · ยังไม่ได้ทดสอบโหลดบน MODX M จริง) · ก่อนโหลดไฟล์ที่แปลงแล้วเข้าเครื่อง ให้เซฟ Backup ทั้งเครื่องลง USB flash drive ไว้ก่อน เพราะคู่มือ MONTAGE M เตือนว่าการโหลดอาจเขียนทับข้อมูล User เดิม (โหลดที่ [UTILITY] → Contents → Load) · ไฟล์ที่ MODX M โหลดได้ตามหน้า Compatibility และคู่มือของ Yamaha: .Y2U .Y2L .Y2A ของ MONTAGE M / MODX M และไฟล์รุ่นก่อน .X7U .X7L .X7A (MONTAGE รุ่นแรก) .X8U .X8L .X8A (MODX / MODX+) · คู่มือ FM Converter ไม่ได้บอกนามสกุลไฟล์ที่ได้ ให้ดูนามสกุลก่อนโหลด",
    verified: true,
    sources: [
      // DX7 Owner's Manual p. 20 (FUNCTION, MIDI): "SYS INFO AVAIL" is needed to transfer voices,
      // "SYS INFO UNAVAIL" allows program changes but no voice transfer, and "memory protect must be
      // OFF in the other synthesizer"; pp. 56–57: set the Slave to receive on MIDI channel 1 and turn
      // its [MEMORY PROTECT] OFF, then back ON (manualowl.com and manualsonline.com copies, 2026-11-14).
      "https://www.manualowl.com/m/Yamaha/DX7/Manual/416114?page=25",
      "https://www.manualowl.com/m/Yamaha/DX7/Manual/416114?page=62",
      // p. 56, "Transmitting 32 voices from the Master to the Slave": the transfer takes about a second,
      // then the Slave shows "FUNCTION CONTROL, MIDI RECEIVED"; if not, check its memory protection is OFF
      // (University of Aberdeen copy of Yamaha's DX7 manual, read 2026-11-14).
      "https://homepages.abdn.ac.uk/d.j.benson/pages/dx7/manuals/dx7-man.pdf",
      // p. 49, "The internal and cartridge memories": save all 32 internal voices to a RAM cartridge:
      // cartridge switch OFF, [MEMORY PROTECT-CARTRIDGE] [OFF], [FUNCTION] [SAVE], "SAVE MEMORY ALL OF
      // MEMORY?" [YES], "ARE YOU SURE?" [YES], "UNDER WRITING!" for about 20 seconds (manualowl.com copy,
      // read 2026-11-14).
      "https://www.manualowl.com/m/Yamaha/DX7/Manual/416114?page=54",
      "https://shop.usa.yamaha.com/en/fmconverter/index/converter/",
      "https://www.yamaha.com/us/downloads/FM-Converter-User-Guide-English.pdf",
      "https://uk.yamaha.com/en/musical-instruments/keyboards/explore/montage-portal/essentials/compatibility.html",
      // MONTAGE M online manual: Load is [UTILITY] → Contents → Load and "the existing settings on
      // the instrument will be overwritten and lost" (om01basicoperation0260); Message List:
      // "Current user data will be overwritten by **." (om02screenparameters0470); Backup file
      // covers all User memory (om01basicoperation0240).
      // File types: .Y2U/.Y2L/.Y2A and older .X7*/.X8* load on MONTAGE M (om01basicoperation0240;
      // compatibility page sections 1–2: "MONTAGE M (MODX M) can load the following data formats").
      "https://manual.yamaha.com/mi/synth/montage_m/en/om01basicoperation0240.html",
      "https://manual.yamaha.com/mi/synth/montage_m/en/om01basicoperation0260.html",
      "https://manual.yamaha.com/mi/synth/montage_m/en/om02screenparameters0470.html",
    ],
  },
  {
    id: "modx-m",
    name: "Yamaha MODX M",
    short: "MODX M",
    pageName: "Live Set",
    slotName: "Slot",
    slotsPerPage: 16,
    columns: 4,
    // USER 1–8, 16 pages each.
    maxPages: 128,
    pagesPerBank: 16,
    usesFile: false,
    colors: ["Black", "Red", "Yellow", "Green", "Blue", "Azure", "Pink", "Orange", "Purple", "Sakura", "Cream", "Lime", "Aqua", "Beige", "Mint", "Lilac"],
    nameMax: 20,
    // MODX M Operation Manual p. 360 (Kraft Music copy of Yamaha's MODX M6 manual), Live Set Edit:
    // slot Volume "Settings: 0–127" (no default printed).
    hasVolume: true,
    // MODX M operation manual p. 361: "SSS Time ... Instellingen: 0.0sec – 30sec, Hold, System".
    hasSssTime: true,
    pageNameMax: 20,
    // MODX M Data List, MIDI Data Table (LIVE SET): Bank, Page and Slot Name "00, 20 – 7E … (ASCII)".
    asciiNames: true,
    // MONTAGE M online manual, Live Set Edit, and MODX M operation manual p. 361: Slot Type
    // "Perform, Song, Audio, Pattern"; Slot Name is shown only when the Slot Type is Perform.
    slotTypes: ["Perform", "Song", "Audio", "Pattern"],
    about: "Live Set แบบ USER 8 แบงก์ แบงก์ละ 16 หน้า หน้าละ 16 ช่อง ตั้งชื่อช่อง สี Volume และ SSS Time ได้เหมือนบนเครื่อง",
    // MONTAGE M online manual, Live Set Register (om02screenparameters0300): opened with
    // [SHIFT] + [LIVE SET]; registers Performances to User Live Set slots; buttons "Register",
    // "Store as New Perf. and Register" and "Overwrite Current Perf. and Register".
    howTo:
      "บนเครื่อง: เลือก Performance แล้วกด [SHIFT] + [LIVE SET] (หน้าจอ Live Set Register ลงได้เฉพาะช่องของแบงก์ USER) แตะช่องตามใบจัดเรียง → แตะ Register · ถ้าแก้เสียงไว้แต่ยังไม่ได้เก็บ ให้แตะ Store as New Perf. and Register แทน จะเก็บเป็น Performance ใหม่แล้วลงช่องเลย (ส่วน Overwrite Current Perf. and Register จะเขียนทับ Performance เดิม) จากนั้นกด Edit เพื่อตั้ง Slot Name, Color, Volume และ SSS Time แล้วกด Done",
    // MONTAGE M online manual, Live Set Edit (om02screenparameters0310): Job, Copy, Exchange,
    // "Delete & Move", Delete; MODX M operation manual p. 38 "Exchanging Performances Registered to
    // slots" (Kraft Music copy): User bank only, Job → slot → Exchange → second slot → Done.
    // MONTAGE M online manual, "Creating a Live Set" (om01basicoperation0120) NOTE: to copy or
    // exchange an entire bank or Live Set page, hold [SHIFT] and press [EDIT]; a dialog opens.
    // MODX M Operation Manual p. 356 (Kraft Music copy): this works while a User bank is selected;
    // the dialog's options are not described. Shortcuts table p. 424: [SHIFT] + [EDIT] "Calls up the
    // Exchange/Copy screen".
    rearrange:
      "ช่องที่ลงทะเบียนไว้แล้วไม่ต้องลงใหม่: กด [LIVE SET] → [EDIT] (เลือกแบงก์ USER เท่านั้น แบงก์ Preset และ Library แก้ไม่ได้) → แตะ Job ด้านล่างจอ → แตะช่องแรก → แตะ Exchange → แตะช่องที่จะสลับด้วย → Done · ทำทีละคู่ตามใบจัดเรียง ส่วน Copy ใช้ทำสำเนาช่องไปอีกช่อง · ถ้าจะเอาช่องที่ย้ายลงชั้นวางออกจากหน้า แล้วให้ช่องถัดไปเลื่อนขึ้นมาแทน ให้แตะช่องนั้นแล้วแตะ Delete & Move (ถ้าแตะ Delete จะเหลือช่องว่างไว้) · ถ้าจะคัดลอกหรือสลับทั้งหน้า (Page) หรือทั้งแบงก์ ให้เลือกแบงก์ USER แล้วกด [SHIFT] ค้างไว้แล้วกด [EDIT] จะเปิดหน้าจอ Exchange/Copy",
    verified: true,
    sources: [
      "https://yamahasynth.com/learn/modx-m/welcome-to-modx-m/",
      "https://manual.yamaha.com/mi/synth/montage_m/en/om02screenparameters0300.html",
      "https://manual.yamaha.com/mi/synth/montage_m/en/om02screenparameters0310.html",
      "https://manual.yamaha.com/mi/synth/montage_m/en/om01basicoperation0120.html",
      "https://yamahasynth.com/learn/modx-series-synthesizers/mastering-modx-performance-basics-2/",
      "https://data.yamaha.com/download/files/2584767",
      "https://data.yamaha.com/files/download/other_assets/9/2574209/MODX-M_data_list_En_B0.pdf",
    ],
  },
  {
    id: "fantom-0",
    name: "Roland FANTOM-0",
    short: "FANTOM-0",
    pageName: "Scene Bank",
    slotName: "Scene",
    // SCENE SELECT shows 16 scenes as a 4 x 4 grid (Owner's Manual p. 17).
    slotsPerPage: 16,
    columns: 4,
    // Banks A–D of 128 scenes, A001–D128 (Reference Manual p. 28): 8 screens of 16 per bank.
    maxPages: 32,
    usesFile: false,
    colors: [],
    // MIDI Implementation, Scene Common: Scene Name 1–16, "32 - 127 [ASCII]".
    nameMax: 16,
    asciiNames: true,
    hasVolume: false,
    // Reference Manual pp. 74–77: CHAIN SET 001–100, "Up to 512 scenes (16 x 32 pages)" per chain set.
    chain: {
      max: 512,
      howTo:
        "ไม่อยากเขียนทับ Scene? ใช้ Scene Chain แทน: กด [CHAIN] → แตะชื่อ <CHAIN SET> เลือกชุดที่ว่าง (001–100) → <EDIT> → <Select Scene> เลือก Scene → [E6] OK → แตะ <Next> ไปตำแหน่งถัดไป ทำซ้ำตามลำดับในใบจัดเรียง → <RENAME> ตั้งชื่อ → <WRITE> บันทึก · ชุดหนึ่งใส่ได้ถึง 512 Scene (16 x 32 หน้า) และ Scene เดิมไม่ถูกย้าย",
    },
    about: "Scene แบงก์ A–D แบงก์ละ 128 (A001–D128) หน้าจอ SCENE SELECT แสดงทีละ 16 ช่อง ใส่ชื่อ Scene ที่ทำไว้ในเครื่อง (ไม่เกิน 16 ตัวอักษรอังกฤษ) แล้วจัดลำดับ",
    howTo:
      "บนเครื่อง: เลือก Scene เดิม กด [WRITE] → แตะ <SCENE> → (แตะ <Rename> ถ้าจะแก้ชื่อ) → หมุน [VALUE] หรือกด [DEC]/[INC] เลือกหมายเลขตามใบจัดเรียง → <OK> แล้ว <OK> อีกครั้ง · ระวัง: Scene ที่อยู่ในหมายเลขปลายทางจะถูกเขียนทับ ถ้ายังต้องใช้ ให้ย้ายไปเก็บที่หมายเลขว่างก่อน",
    verified: true,
    sources: [
      "https://www.roland.com/us/support/by_product/fantom-06/owners_manuals/",
      "https://static.roland.com/assets/media/pdf/FANTOM-06_07_08_eng01_W.pdf",
      "https://static.roland.com/assets/media/pdf/FANTOM-06_07_08_Parameter_eng01_W.pdf",
    ],
  },
];

/**
 * A short note saying which slot types the organizer arranges and which stay on the keyboard,
 * or "" when the keyboard has only one kind of slot.
 */
export function slotTypeNote(t: Target): string {
  const [main, ...others] = t.slotTypes ?? [];
  if (!main || others.length === 0) return "";
  return `หน้านี้จัดเฉพาะช่อง Slot Type: ${main} · ช่องแบบ ${others.join(", ")} (Performance คู่กับ ${others.join(" / ")}) ให้ตั้งบนเครื่องในหน้า Live Set Edit`;
}

/** Characters in a name the keyboard cannot show (each listed once), or [] when all fit. */
export function unsupportedNameChars(t: Target, name: string): string[] {
  if (!t.asciiNames && !t.usesFile) return [];
  return [...new Set(Array.from(name).filter((c) => c < " " || c > "~"))];
}

export function getTarget(id: string): Target {
  return TARGETS.find((t) => t.id === id) ?? TARGETS[0];
}

export interface Item {
  id: string;
  name: string;
  note: string;
  /** One of the target's color names, or "" for none. */
  color: string;
  /** 0..127, for keyboards with a volume per slot. */
  volume?: number;
  /** SSS Time for keyboards that have it per slot: "System", "Hold" or seconds such as "2.5". */
  sss?: string;
  /** Preview sound type (see sounds.ts) chosen for this slot; guessed from the name when unset. */
  sound?: string;
  /** Set on sounds from a store pack's demo bank (the pack's slug). Demo banks can be played and arranged, not exported. */
  demo?: string;
  /** The owner's recorded demo of this sound, e.g. "/demos/<pack>/<file>.m4a". */
  clip?: string;
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
  /** Names given to pages and banks on the keyboard. */
  pageNames?: string[];
  bankNames?: string[];
}

/** Where an item sits: in a slot, or in the pool. */
export type Place = { kind: "slot"; page: number; slot: number } | { kind: "pool"; index: number };

let counter = 0;
export const newId = () => `i${Date.now().toString(36)}${(counter++).toString(36)}`;

export const emptyPage = (t: Target) => Array.from({ length: t.slotsPerPage }, () => null as Item | null);

export function newItem(name: string, patch?: string): Item {
  return { id: newId(), name: name.trim().slice(0, 40), note: "", color: "", ...(patch ? { patch } : {}) };
}

export function emptyLayout(target: TargetId): Layout {
  const t = getTarget(target);
  return { version: 1, target: t.id, title: t.id === "dx7" ? "MY CARTRIDGE" : t.id === "fantom-0" ? "My Scenes" : "My Live Set", pages: [emptyPage(t)], pool: [] };
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

/** Where page `p` sits on the keyboard: bank and page numbers (1-based). */
export function bankPage(t: Target, p: number) {
  const per = t.pagesPerBank ?? t.maxPages;
  return { bank: Math.floor(p / per) + 1, page: (p % per) + 1 };
}

/**
 * Bank Name and Page Name entries the keyboard cannot take (MODX M Data List: Live Set names are
 * printable ASCII), as "Bank Name USER 2" / "Page Name USER 1 · Page 3" with the bad characters.
 */
export function bankPageNameProblems(t: Target, layout: Layout): { where: string; page?: number; bank?: number; chars: string[] }[] {
  if (!t.asciiNames || !t.pagesPerBank) return [];
  const out: { where: string; page?: number; bank?: number; chars: string[] }[] = [];
  (layout.bankNames ?? []).forEach((n, i) => {
    const chars = unsupportedNameChars(t, n ?? "");
    if (chars.length) out.push({ where: `Bank Name USER ${i + 1}`, bank: i + 1, chars });
  });
  (layout.pageNames ?? []).forEach((n, p) => {
    const chars = unsupportedNameChars(t, n ?? "");
    if (!chars.length) return;
    const { bank, page } = bankPage(t, p);
    out.push({ where: `Page Name USER ${bank} · Page ${page}`, page: p, chars });
  });
  return out;
}

/** Page heading in the keyboard's words, with its name when it has one. */
export function pageTitle(t: Target, layout: Layout, p: number) {
  const name = layout.pageNames?.[p];
  if (t.pagesPerBank) {
    const { bank, page } = bankPage(t, p);
    const bankName = layout.bankNames?.[bank - 1];
    return `USER ${bank}${bankName ? ` "${bankName}"` : ""} · Page ${page}${name ? ` "${name}"` : ""}`;
  }
  if (t.id === "fantom-0") {
    const first = slotLabel(t, p, 0);
    return `BANK ${first[0]} · ${first}–${slotLabel(t, p, t.slotsPerPage - 1)}${name ? ` "${name}"` : ""}`;
  }
  return `${t.pageName} ${p + 1}${name ? ` "${name}"` : ""}`;
}

/** Copies the item at `from` onto a slot (the keyboard's Copy job). The copy is a new item. */
export function copyItem(layout: Layout, from: Place, to: { page: number; slot: number }): Layout {
  const item = from.kind === "slot" ? layout.pages[from.page]?.[from.slot] : layout.pool[from.index];
  if (!item || !layout.pages[to.page]) return layout;
  const pages = layout.pages.map((p) => [...p]);
  const displaced = pages[to.page][to.slot];
  pages[to.page][to.slot] = { ...item, id: newId() };
  return { ...layout, pages, pool: displaced ? [...layout.pool, displaced] : layout.pool };
}

/** Clears a slot and moves the later slots on that page up by one (the keyboard's Delete & Move job). */
export function deleteAndMove(layout: Layout, page: number, slot: number): Layout {
  const row = layout.pages[page];
  if (!row) return layout;
  const removed = row[slot];
  const next = [...row.slice(0, slot), ...row.slice(slot + 1), null];
  return {
    ...layout,
    pages: layout.pages.map((p, i) => (i === page ? next : p)),
    pool: removed ? [...layout.pool, removed] : layout.pool,
  };
}

/** FANTOM-0 scene banks A–D, 128 scenes each (Reference Manual p. 28). */
export const FANTOM_SCENE_BANKS = ["A", "B", "C", "D"];
export const FANTOM_SCENES_PER_BANK = 128;

/**
 * Slot label as the keyboard counts: DX7 voices 1–32, Live Set slots 1–16 on each page,
 * FANTOM-0 scenes A001–D128.
 */
export function slotLabel(t: Target, page: number, slot: number) {
  if (t.id === "fantom-0") {
    const n = page * t.slotsPerPage + slot;
    const bank = FANTOM_SCENE_BANKS[Math.floor(n / FANTOM_SCENES_PER_BANK)] ?? "?";
    return bank + String((n % FANTOM_SCENES_PER_BANK) + 1).padStart(3, "0");
  }
  return String(slot + 1);
}

/**
 * Cleans an SSS Time value: "System", "Hold", or seconds 0.0–30 (kept to one decimal).
 * The manual gives the range, not the step size, so the order sheet says what to aim for.
 */
export function parseSssTime(v: unknown): string | undefined {
  if (v === "System" || v === "Hold") return v;
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d{1,2}(\.\d+)?$/.test(v) ? Number(v) : NaN;
  if (!Number.isFinite(n)) return undefined;
  return (Math.round(Math.min(30, Math.max(0, n)) * 10) / 10).toFixed(1);
}

/** How an SSS Time value reads on the order sheet, e.g. "2.5sec" or "Hold". */
export function sssLabel(v: string): string {
  return v === "System" || v === "Hold" ? v : `${v}sec`;
}

/**
 * Every placed name the keyboard cannot take (Bank Name, Page Name, then each slot), one line each,
 * e.g. "USER 1 · Page 1 · Slot 3 "เปียโน": เ ป ี ย โ น". Empty for keyboards without the ASCII rule.
 */
export function nameProblemLines(t: Target, layout: Layout): string[] {
  if (!t.asciiNames) return [];
  const out = bankPageNameProblems(t, layout).map((x) => `${x.where}: ${x.chars.join(" ")}`);
  layout.pages.forEach((page, p) =>
    page.forEach((item, s) => {
      if (!item) return;
      const chars = unsupportedNameChars(t, item.name);
      if (!chars.length) return;
      const where = t.pagesPerBank ? (() => { const { bank, page: pg } = bankPage(t, p); return `USER ${bank} · Page ${pg} · `; })() : "";
      out.push(`${where}${t.slotName} ${slotLabel(t, p, s)} "${item.name}": ${chars.join(" ")}`);
    }),
  );
  return out;
}

/**
 * The arranged sounds as a chain list, in grid order with empty places skipped (FANTOM-0 Scene Chain:
 * 16 per chain page, up to the keyboard's limit). [] when the keyboard has no chain or nothing is placed.
 */
export function chainLines(layout: Layout): string[] {
  const t = getTarget(layout.target);
  if (!t.chain) return [];
  const names = layout.pages.flat().filter((x): x is Item => !!x).map((x) => x.name).slice(0, t.chain.max);
  const out: string[] = [];
  names.forEach((name, i) => {
    if (i % 16 === 0) out.push(`  หน้า ${i / 16 + 1}`);
    out.push(`    ${i + 1}. ${name}`);
  });
  return out;
}

/** Order sheet in the keyboard's own words. */
export function orderSheet(layout: Layout): string {
  const t = getTarget(layout.target);
  const lines = [layout.title, `${t.name} · ${t.pageName}`, ""];
  layout.pages.forEach((page, p) => {
    if (t.maxPages > 1) {
      if (page.every((x) => !x) && !layout.pageNames?.[p]) return;
      lines.push(pageTitle(t, layout, p));
    }
    page.forEach((item, s) => {
      if (!item) return;
      const extra = [
        item.color ? `Color: ${item.color}` : "",
        t.hasVolume && item.volume !== undefined ? `Volume: ${item.volume}` : "",
        t.hasSssTime && item.sss ? `SSS Time: ${sssLabel(item.sss)}` : "",
        item.note,
      ]
        .filter(Boolean)
        .join(" · ");
      lines.push(`  ${t.slotName} ${slotLabel(t, p, s)}: ${item.name}${extra ? `  (${extra})` : ""}`);
    });
    lines.push("");
  });
  if (layout.pool.length) lines.push(`ยังไม่ได้วาง: ${layout.pool.map((x) => x.name).join(", ")}`, "");
  const bad = nameProblemLines(t, layout);
  if (bad.length) lines.push(`ชื่อที่ ${t.short} พิมพ์ไม่ได้ (แก้เป็นตัวอักษรอังกฤษก่อนตั้งชื่อบนเครื่อง):`, ...bad.map((x) => `  ${x}`), "");
  lines.push(t.howTo, "");
  if (t.rearrange) lines.push(t.rearrange, "");
  const chain = chainLines(layout);
  if (t.chain && chain.length) lines.push(t.chain.howTo, "ลำดับสำหรับ Scene Chain:", ...chain, "");
  lines.push("จัดบน Mcky Vintage Key");
  return lines.join("\n");
}

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u001f]/g, "").slice(0, max) : "");

function parseItem(raw: unknown, t: Target): Item | null {
  const allowPatch = t.usesFile;
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return null;
  const name = clean(r.name, 40);
  if (!name) return null;
  const color = t.colors.includes(r.color as string) ? (r.color as string) : "";
  const volume = t.hasVolume && typeof r.volume === "number" && Number.isFinite(r.volume) ? Math.min(127, Math.max(0, Math.round(r.volume))) : undefined;
  const sss = t.hasSssTime ? parseSssTime(r.sss) : undefined;
  const patch = allowPatch && typeof r.patch === "string" && /^[A-Za-z0-9+/]{206}[A-Za-z0-9+/=]{2}$/.test(r.patch) ? r.patch : undefined;
  const sound = typeof r.sound === "string" && PREVIEW_SOUNDS.some((x) => x.key === r.sound) ? r.sound : undefined;
  const demo = typeof r.demo === "string" && /^[a-z0-9-]{1,60}$/.test(r.demo) ? r.demo : undefined;
  const clip = demo && typeof r.clip === "string" && /^\/demos\/[\w./-]{1,160}$/.test(r.clip) && !r.clip.includes("..") ? r.clip : undefined;
  return { id: newId(), name: name.slice(0, t.nameMax), note: clean(r.note, 60), color, ...(sound ? { sound } : {}), ...(demo ? { demo } : {}), ...(clip ? { clip } : {}), ...(volume !== undefined ? { volume } : {}), ...(sss ? { sss } : {}), ...(patch ? { patch } : {}) };
}

/** Reads a layout from a file or link, rejecting anything malformed. */
export function parseLayout(raw: unknown): Layout | null {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== "object" || r.version !== 1 || !Array.isArray(r.pages)) return null;
  const t = getTarget(String(r.target));
  if (t.id !== r.target) return null;
  const pages = (r.pages as unknown[]).slice(0, t.maxPages).map((page) => {
    const list = Array.isArray(page) ? page : [];
    return Array.from({ length: t.slotsPerPage }, (_, s) => parseItem(list[s], t));
  });
  const pool = (Array.isArray(r.pool) ? r.pool : [])
    .slice(0, 512)
    .map((x) => parseItem(x, t))
    .filter((x): x is Item => !!x);
  const names = (v: unknown, n: number) =>
    Array.isArray(v) ? v.slice(0, n).map((x) => clean(x, t.pageNameMax ?? 20)) : undefined;
  const pageNames = t.pageNameMax ? names(r.pageNames, t.maxPages) : undefined;
  const bankNames = t.pageNameMax && t.pagesPerBank ? names(r.bankNames, Math.ceil(t.maxPages / t.pagesPerBank)) : undefined;
  return {
    version: 1,
    target: t.id,
    title: clean(r.title, 40) || emptyLayout(t.id).title,
    pages: pages.length ? pages : [emptyPage(t)],
    pool,
    ...(pageNames ? { pageNames } : {}),
    ...(bankNames ? { bankNames } : {}),
  };
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

/** A store pack, as the organizer's demo banks need it. */
export interface DemoPackInfo {
  slug: string;
  name: string;
  target: TargetId;
  patches: { tag: string; name: string; clip?: string }[];
}

/**
 * A demo bank: the pack's sounds placed in order on the first page, each with
 * its demo. People can play and arrange it; it cannot be exported.
 */
export function demoBank(pack: DemoPackInfo, guess: (name: string) => string): Layout {
  const t = getTarget(pack.target);
  const slots = emptyPage(t).map((_, i) => {
    const p = pack.patches[i];
    if (!p) return null;
    return { ...newItem(p.name.slice(0, t.nameMax)), sound: guess(`${p.tag} ${p.name}`), demo: pack.slug, ...(p.clip ? { clip: p.clip } : {}) };
  });
  const rest = pack.patches.slice(t.slotsPerPage).map((p) => ({ ...newItem(p.name), sound: guess(`${p.tag} ${p.name}`), demo: pack.slug, ...(p.clip ? { clip: p.clip } : {}) }));
  return {
    version: 1,
    target: t.id,
    title: `${pack.name} (เดโม)`.slice(0, 40),
    pages: [slots],
    pool: rest,
    ...(t.pageNameMax ? { pageNames: ["DEMO"] } : {}),
  };
}

/** The demo pack in a layout, if it holds any demo sounds. */
export function demoOf(layout: Layout): string | undefined {
  return [...layout.pages.flat(), ...layout.pool].find((x) => x?.demo)?.demo ?? undefined;
}

/**
 * DX7 voices that sound the same: identical voice data (the 145 bytes before
 * the 10-character name), even when the names differ. Returns, for each later
 * copy, the id of the first item with the same sound. Slots are read in order
 * (voice 1 first), then the shelf.
 */
export function duplicateVoices(layout: Layout): Map<string, string> {
  const first = new Map<string, string>();
  const dups = new Map<string, string>();
  for (const item of [...layout.pages.flat(), ...layout.pool]) {
    if (!item?.patch) continue;
    let key: string;
    try {
      key = Array.from(atob(item.patch).slice(0, 145), (c) => c.charCodeAt(0).toString(16)).join(",");
    } catch {
      continue;
    }
    const seen = first.get(key);
    if (seen) dups.set(item.id, seen);
    else first.set(key, item.id);
  }
  return dups;
}

/** Moves later copies of the same DX7 voice from the slots to the shelf, so each sound is in the cartridge once. */
export function shelveDuplicates(layout: Layout): Layout {
  const dups = duplicateVoices(layout);
  const moved: Item[] = [];
  const pages = layout.pages.map((p) =>
    p.map((x) => {
      if (x && dups.has(x.id)) {
        moved.push(x);
        return null;
      }
      return x;
    }),
  );
  return moved.length ? { ...layout, pages, pool: [...layout.pool, ...moved] } : layout;
}

/** Swaps the first and second half of a page (DX7: voices 1–16 ↔ 17–32), keeping the order inside each half. */
export function swapHalves(layout: Layout, page: number): Layout {
  const row = layout.pages[page];
  if (!row || row.length % 2) return layout;
  const h = row.length / 2;
  const next = [...row.slice(h), ...row.slice(0, h)];
  return { ...layout, pages: layout.pages.map((p, i) => (i === page ? next : p)) };
}

/**
 * Merging two cartridges (DX7): puts up to `count` shelf sounds, starting at shelf
 * position `from`, into slots `start`.. of a page. The sounds they replace go to the
 * end of the shelf, so nothing is lost. With swapHalves this picks any 16 of each.
 */
export function shelfIntoSlots(layout: Layout, page: number, start: number, from: number, count = 16): Layout {
  const row = layout.pages[page];
  if (!row || start < 0 || from < 0 || start >= row.length) return layout;
  const take = layout.pool.slice(from, from + Math.min(count, row.length - start));
  if (!take.length) return layout;
  const next = [...row];
  const out: Item[] = [];
  take.forEach((item, i) => {
    const old = next[start + i];
    if (old) out.push(old);
    next[start + i] = item;
  });
  const pool = [...layout.pool.slice(0, from), ...layout.pool.slice(from + take.length), ...out];
  return { ...layout, pages: layout.pages.map((p, i) => (i === page ? next : p)), pool };
}
