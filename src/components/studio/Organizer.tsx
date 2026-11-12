"use client";

import { INIT, parse } from "@audio/synth-dx7";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FM_PRESETS } from "@/components/rack/fm/presets";
import { OctaveSwitch, RackKeys } from "@/components/rack/RackKeys";
import { bankSysex, checkCartridgeDump, voiceSysex } from "@/lib/studio/dx7";
import { readSceneNameReply, SceneNameCollector, sceneNameRequest } from "@/lib/studio/fantom";
import { namesOnPage, pageNameRequests, placeNames, readSlotNameReply, SlotNameCollector } from "@/lib/studio/modxm";
import { getSound, guessSound, PREVIEW_SOUNDS } from "@/lib/studio/sounds";
import { GmPreview } from "./gmPreview";
import {
  decodeLayout,
  emptyLayout,
  emptyPage,
  encodeLayout,
  fillEmpty,
  getTarget,
  itemsFromText,
  layoutToJson,
  moveItem,
  newItem,
  orderSheet,
  parseLayout,
  parseSssTime,
  removeItem,
  slotLabel,
  sortPage,
  bankPage,
  duplicateVoices,
  shelfIntoSlots,
  shelveDuplicates,
  swapHalves,
  copyItem,
  demoBank,
  demoOf,
  type DemoPackInfo,
  deleteAndMove,
  TARGETS,
  unsupportedNameChars,
  slotTypeNote,
  bankPageNameProblems,
  updateItem,
  type Item,
  type Layout,
  type Place,
  type TargetId,
} from "@/lib/studio/library";

const KEY = (t: TargetId) => `mcky-organizer-${t}`;
const LAST_KEY = "mcky-organizer-target";


/** Sends requests one after another, `gap` ms apart, so the keyboard is not flooded. */
function sendPaced(outputs: MIDIOutput[], requests: Uint8Array[], gap: number) {
  const start = performance.now() + 50;
  requests.forEach((r, i) => outputs.forEach((o) => o.send(r, start + i * gap)));
}

const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** DX7 starts with the store's free FM bank already in the cartridge. */
function starterLayout(target: TargetId): Layout {
  if (target !== "dx7") return emptyLayout(target);
  const withPool = { ...emptyLayout("dx7"), title: "MCKY FM VOL.1", pool: FM_PRESETS.map((p) => newItem(p.name, toB64(p.patch))) };
  return fillEmpty(withPool);
}

function load(target: TargetId): Layout {
  try {
    const saved = window.localStorage.getItem(KEY(target));
    const parsed = saved ? parseLayout(JSON.parse(saved)) : null;
    if (parsed) return parsed;
  } catch {
    // Storage blocked or bad data: start empty.
  }
  return starterLayout(target);
}

/** A shared link first, then the last keyboard used on this device. */
function initial(): Layout {
  try {
    const match = window.location.hash.match(/l=([A-Za-z0-9_-]+)/);
    const shared = match ? decodeLayout(match[1]) : null;
    if (shared) return shared;
    const last = window.localStorage.getItem(LAST_KEY);
    if (last && TARGETS.some((t) => t.id === last)) return load(last as TargetId);
  } catch {
    // Storage blocked: fall through.
  }
  return load("dx7");
}

function download(name: string, data: string | Uint8Array, type: string) {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const same = (a: Place | null, b: Place) =>
  !!a && a.kind === b.kind && (a.kind === "slot" && b.kind === "slot" ? a.page === b.page && a.slot === b.slot : a.kind === "pool" && b.kind === "pool" && a.index === b.index);

/**
 * The sound organizer. People make sounds on their keyboard, then come here to
 * put them in the order they want: a DX7 cartridge from a .syx file, a MODX M
 * Live Set, or FANTOM-0 scenes. Drag (or tap one, then tap where it goes),
 * then download the file or an order sheet to follow on the keyboard.
 */
export function Organizer({ packs = [] }: { packs?: DemoPackInfo[] }) {
  // A link such as /studio?demo=<pack> opens that pack's demo bank, keeping the visitor's own work aside.
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      const slug = new URLSearchParams(window.location.search).get("demo");
      const pack = packs.find((p) => p.slug === slug);
      if (pack) {
        const own = load(pack.target);
        if (!demoOf(own)) window.localStorage.setItem(`${KEY(pack.target)}-mine`, layoutToJson(own));
        return demoBank(pack, guessSound);
      }
    } catch {
      // Storage blocked: fall back to the usual start.
    }
    return initial();
  });
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<Place | null>(null);
  // Bumped on each pick so the chosen button and the screen replay their animation.
  const [pickCount, setPickCount] = useState(0);
  // Bumped when a new cartridge goes in, to replay the insert animation.
  const [cartKey, setCartKey] = useState(0);
  const [over, setOver] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [octave, setOctave] = useState(0);
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  const engine = useRef<{ ctx: AudioContext; node: AudioWorkletNode } | null>(null);
  const starting = useRef<Promise<void> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const openMode = useRef<"cartridge" | "shelf">("shelf");
  // Merging cartridges: which 16 shelf voices go into slots 17–32.
  const [mergeFrom, setMergeFrom] = useState(0);
  const [landed, setLanded] = useState<{ id: string; n: number } | null>(null);
  // What the next tap does with the chosen slot, like the keyboard's edit jobs.
  const [job, setJob] = useState<"exchange" | "copy">("exchange");
  const jsonRef = useRef<HTMLInputElement>(null);

  const t = getTarget(layout.target);
  const dupes = t.usesFile ? duplicateVoices(layout) : new Map<string, string>();
  const dupesInCart = layout.pages[0].flatMap((x, s) => {
    const firstId = x ? dupes.get(x.id) : undefined;
    const first = firstId ? layout.pages[0].findIndex((y) => y?.id === firstId) : -1;
    return firstId ? [`${s + 1} = ${first >= 0 ? first + 1 : "ชั้นวาง"}`] : [];
  });
  const current = Math.min(page, layout.pages.length - 1);
  const pickedItem: Item | null = picked
    ? picked.kind === "slot"
      ? (layout.pages[picked.page]?.[picked.slot] ?? null)
      : (layout.pool[picked.index] ?? null)
    : null;
  const placed = layout.pages.flat().filter(Boolean).length;

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY(layout.target), layoutToJson(layout));
      window.localStorage.setItem(LAST_KEY, layout.target);
    } catch {
      // Storage blocked: nothing to do.
    }
  }, [layout]);

  // Open-sample previews for keyboards whose sounds are not in a file (MODX M, FANTOM-0).
  const gm = useRef<GmPreview | null>(null);
  const [gmState, setGmState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const soundOf = (item: Item) => getSound(item.sound ?? guessSound(item.name));
  const auditionGm = async (item: Item) => {
    gm.current ??= new GmPreview();
    setGmState("loading");
    try {
      if (item.clip) await gm.current.clip(item.clip);
      else await gm.current.chord(soundOf(item).gm);
      setGmState("ready");
    } catch (error) {
      console.warn("Preview sound could not load", error);
      setGmState("error");
    }
  };

  // Demo banks: a store pack's sounds to play and arrange. The visitor's own work is kept aside meanwhile.
  const demoSlug = demoOf(layout);
  const demoPack = packs.find((p) => p.slug === demoSlug);
  const demoPacks = packs.filter((p) => p.target === layout.target);
  const MINE = (target: TargetId) => `${KEY(target)}-mine`;
  const openDemo = (pack: DemoPackInfo) => {
    try {
      if (!demoOf(layout)) window.localStorage.setItem(MINE(layout.target), layoutToJson(layout));
    } catch {
      // Storage blocked: the demo still opens.
    }
    setLayout(demoBank(pack, guessSound));
    setPage(0);
    setPicked(null);
    setMessage(`เปิดแบงก์เดโม ${pack.name} แล้ว แตะแต่ละช่องเพื่อฟังเดโม ลองสลับลองจัดได้เลย`);
  };
  const backToMine = () => {
    let mine: Layout | null = null;
    try {
      const saved = window.localStorage.getItem(MINE(layout.target));
      mine = saved ? parseLayout(JSON.parse(saved)) : null;
    } catch {
      mine = null;
    }
    setLayout(mine ?? emptyLayout(layout.target));
    setPage(0);
    setPicked(null);
    setMessage("กลับมาที่งานของคุณแล้ว");
  };

  useEffect(
    () => () => {
      void engine.current?.ctx.close();
      gm.current?.close();
    },
    [],
  );

  const switchTarget = (id: TargetId) => {
    if (id === layout.target) return;
    setLayout(load(id));
    setPage(0);
    setPicked(null);
    setMessage(null);
  };

  /** Opens page `p`, adding empty pages up to it the first time (banks fill in as you visit them). */
  const goToPage = (p: number) => {
    const target = Math.min(t.maxPages - 1, Math.max(0, p));
    setLayout((l) => (l.pages.length > target ? l : { ...l, pages: [...l.pages, ...Array.from({ length: target + 1 - l.pages.length }, () => emptyPage(t))] }));
    setPage(target);
  };
  const setName = (key: "pageNames" | "bankNames", index: number, value: string) =>
    setLayout((l) => {
      const list = [...(l[key] ?? [])];
      list[index] = value.slice(0, t.pageNameMax ?? 20);
      return { ...l, [key]: list };
    });

  const move = (from: Place, to: Place) => {
    setLayout((l) => moveItem(l, from, to));
    setPicked(null);
  };

  /** Tap to pick up, tap again somewhere to put it down. */
  const tap = (at: Place, filled: boolean) => {
    if (picked && same(picked, at)) return setPicked(null);
    if (picked) {
      if (at.kind === "slot") setLanded({ id: `${at.page}-${at.slot}`, n: pickCount + 1 });
      setPickCount((n) => n + 1);
      if (job === "copy" && at.kind === "slot") {
        setLayout((l) => copyItem(l, picked, at));
        setPicked(null);
        setJob("exchange");
        return;
      }
      return move(picked, at);
    }
    if (!filled) return;
    setPicked(at);
    setPickCount((n) => n + 1);
    // Choosing a DX7 voice plays it, like pressing a voice button on the keyboard.
    const item = at.kind === "slot" ? layout.pages[at.page]?.[at.slot] : layout.pool[at.index];
    if (item?.patch) void preview(item);
    else if (item) void auditionGm(item);
  };

  const onDragStart = (at: Place) => (event: DragEvent) => {
    event.dataTransfer.setData("text/plain", JSON.stringify(at));
    event.dataTransfer.effectAllowed = "move";
  };
  const onDrop = (to: Place) => (event: DragEvent) => {
    event.preventDefault();
    setOver(null);
    try {
      move(JSON.parse(event.dataTransfer.getData("text/plain")) as Place, to);
      if (to.kind === "slot") {
        setLanded({ id: `${to.page}-${to.slot}`, n: pickCount + 1 });
        setPickCount((n) => n + 1);
      }
    } catch {
      // Not one of ours: ignore.
    }
  };

  // DX7 audition: the picked voice plays on the keys below.
  const ensureEngine = useCallback(() => {
    if (engine.current) {
      if (engine.current.ctx.state === "suspended") void engine.current.ctx.resume();
      return Promise.resolve();
    }
    starting.current ??= (async () => {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      await ctx.audioWorklet.addModule("/worklets/dx7-poly.js");
      const node = new AudioWorkletNode(ctx, "dx7-poly", { numberOfInputs: 0, outputChannelCount: [2] });
      const gain = ctx.createGain();
      gain.gain.value = 2.4;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      node.connect(gain).connect(limiter).connect(ctx.destination);
      engine.current = { ctx, node };
    })();
    return starting.current;
  }, []);

  const pickedPatch = pickedItem?.patch;
  useEffect(() => {
    if (pickedPatch) engine.current?.node.port.postMessage({ type: "patch", patch: fromB64(pickedPatch) });
  }, [pickedPatch]);

  const noteOn = async (note: number) => {
    setHeld((h) => new Set(h).add(note));
    if (pickedItem && !pickedPatch) {
      gm.current ??= new GmPreview();
      void gm.current.noteOn(soundOf(pickedItem).gm, note).catch(() => setGmState("error"));
      return;
    }
    if (!pickedPatch) return;
    const fresh = !engine.current;
    await ensureEngine();
    const node = engine.current?.node;
    if (!node) return;
    if (fresh) node.port.postMessage({ type: "patch", patch: fromB64(pickedPatch) });
    node.port.postMessage({ type: "on", note, velocity: 100 });
  };
  const noteOff = (note: number) => {
    setHeld((h) => {
      const next = new Set(h);
      next.delete(note);
      return next;
    });
    engine.current?.node.port.postMessage({ type: "off", note });
    if (pickedItem && !pickedPatch) gm.current?.noteOff(soundOf(pickedItem).gm, note);
  };
  const preview = async (item: Item) => {
    if (!item.patch) return;
    await ensureEngine();
    const node = engine.current?.node;
    if (!node) return;
    node.port.postMessage({ type: "patch", patch: fromB64(item.patch) });
    for (const n of [60, 64, 67]) node.port.postMessage({ type: "on", note: n, velocity: 100 });
    window.setTimeout(() => node.port.postMessage({ type: "allOff" }), 900);
  };

  const openSyx = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])].slice(0, 16);
    event.target.value = "";
    const items: Item[] = [];
    for (const file of files) {
      if (file.size > 256 * 1024) continue;
      try {
        for (const v of parse(new Uint8Array(await file.arrayBuffer()))) items.push(newItem(v.name || "VOICE", toB64(v.patch)));
      } catch {
        setMessage(`อ่าน ${file.name} ไม่ได้ ใช้ไฟล์ .syx ของ DX7`);
      }
    }
    if (!items.length) return;
    if (openMode.current === "cartridge") {
      insertCartridge(items, files[0]?.name.replace(/\.syx$/i, "").slice(0, 40) || "CARTRIDGE");
    } else {
      setLayout((l) => ({ ...l, pool: [...l.pool, ...items].slice(0, 512) }));
      setMessage(`วาง ${items.length} เสียงบนชั้นวางแล้ว ลากขึ้นไปวางบนปุ่มได้เลย`);
    }
  };

  // A new cartridge goes in; the voices that were in it move to the shelf, so nothing is lost.
  const insertCartridge = (items: Item[], name: string) => {
    setLayout((l) => {
      const old = l.pages[0].filter((x): x is Item => !!x);
      const slots = l.pages[0].map((_, i) => items[i] ?? null);
      return { ...l, title: name, pages: [slots], pool: [...items.slice(slots.length), ...old, ...l.pool].slice(0, 512) };
    });
    setCartKey((k) => k + 1);
    setPicked(null);
    setMessage(`ใส่ตลับ ${name} แล้ว${items.length > 32 ? " เสียงที่เกิน 32 อยู่บนชั้นวาง" : ""} เสียงจากตลับเดิมย้ายไปอยู่บนชั้นวาง`);
  };

  // Receiving from a DX7 over USB-MIDI: read only. The DX7 sends its 32 voices
  // when asked from its own panel; this page only listens and sends nothing.
  const [listening, setListening] = useState(false);
  const stopListen = useRef<(() => void) | null>(null);
  useEffect(() => () => stopListen.current?.(), []);
  const receiveFromDx7 = async () => {
    if (listening) {
      stopListen.current?.();
      setMessage("หยุดรอรับแล้ว");
      return;
    }
    if (!("requestMIDIAccess" in navigator)) {
      setMessage("เบราว์เซอร์นี้ใช้ MIDI ไม่ได้ ลอง Chrome หรือ Edge บนคอมพิวเตอร์");
      return;
    }
    let access: MIDIAccess;
    try {
      access = await navigator.requestMIDIAccess({ sysex: true });
    } catch {
      setMessage("ไม่ได้รับอนุญาตให้ใช้ MIDI กดอนุญาตในเบราว์เซอร์แล้วลองใหม่");
      return;
    }
    const inputs = [...access.inputs.values()];
    if (!inputs.length) {
      setMessage("ไม่พบอุปกรณ์ MIDI ต่อสาย USB-MIDI จาก MIDI OUT ของ DX7 เข้าคอมพิวเตอร์ก่อน");
      return;
    }
    const onMessage = (event: MIDIMessageEvent) => {
      const data = event.data;
      if (!data || data[0] !== 0xf0) return;
      const check = checkCartridgeDump(data);
      if (!check.ok) {
        setMessage(check.reason);
        return;
      }
      const items = parse(data).map((v) => newItem(v.name || "VOICE", toB64(v.patch)));
      stop();
      insertCartridge(items, "DX7 INTERNAL");
    };
    const timer = window.setTimeout(() => {
      stop();
      setMessage("ยังไม่ได้รับข้อมูลจาก DX7 ลองกดส่งจากเครื่องอีกครั้ง");
    }, 120_000);
    const stop = () => {
      window.clearTimeout(timer);
      inputs.forEach((i) => i.removeEventListener("midimessage", onMessage));
      stopListen.current = null;
      setListening(false);
    };
    inputs.forEach((i) => i.addEventListener("midimessage", onMessage));
    stopListen.current = stop;
    setListening(true);
    setMessage("กำลังรอ… บน DX7 กด FUNCTION แล้วกดปุ่ม 8 (MIDI) จนจอขึ้น SYS INFO AVAIL กดปุ่ม 8 อีกครั้งจนจอถามว่าจะส่ง (MIDI TRANSMIT ?) แล้วกด YES");
  };

  // Asking a MODX M for the Slot Names of one Live Set page: read only. Only
  // Parameter Requests are sent (Data List 3-5-6); nothing on the keyboard changes.
  // Off until the visitor confirms, and not yet tested on a real MODX M.
  const [asking, setAsking] = useState(false);
  const stopAsk = useRef<(() => void) | null>(null);
  useEffect(() => () => stopAsk.current?.(), []);
  const receiveFromModx = async () => {
    if (asking) {
      stopAsk.current?.();
      setMessage("หยุดขอชื่อแล้ว");
      return;
    }
    const where = bankPage(t, current);
    const ok = window.confirm(
      `ขอชื่อ 16 ช่องจาก MODX M มาใส่หน้า ${where.page} ที่เปิดอยู่\n\n` +
        "• หน้านี้ส่งแค่คำขอ (Parameter Request) ไม่เขียนอะไรลงเครื่อง\n" +
        "• ยังไม่ได้ทดสอบกับ MODX M จริง ถ้าไม่มีอะไรตอบกลับก็ไม่มีอะไรเปลี่ยน\n" +
        "• บนเครื่องเปิด Live Set ที่ต้องการไว้ และตั้ง Device Number เป็น All หรือ 1 ([UTILITY] → Settings → Advanced)\n" +
        "• เสียงที่อยู่ในช่องเดิมจะย้ายลงชั้นวาง\n\nทำต่อไหม",
    );
    if (!ok) return;
    if (!("requestMIDIAccess" in navigator)) {
      setMessage("เบราว์เซอร์นี้ใช้ MIDI ไม่ได้ ลอง Chrome หรือ Edge บนคอมพิวเตอร์");
      return;
    }
    let access: MIDIAccess;
    try {
      access = await navigator.requestMIDIAccess({ sysex: true });
    } catch {
      setMessage("ไม่ได้รับอนุญาตให้ใช้ MIDI กดอนุญาตในเบราว์เซอร์แล้วลองใหม่");
      return;
    }
    const inputs = [...access.inputs.values()];
    const allOut = [...access.outputs.values()];
    const named = allOut.filter((o) => /modx/i.test(o.name ?? ""));
    const outputs = named.length ? named : allOut;
    if (!inputs.length || !outputs.length) {
      setMessage("ไม่พบ MODX M ต่อสาย USB จากเครื่องเข้าคอมพิวเตอร์ก่อน");
      return;
    }
    const kbPage = where.page - 1;
    const collector = new SlotNameCollector();
    const onMessage = (event: MIDIMessageEvent) => {
      const reply = event.data ? readSlotNameReply(event.data) : null;
      if (reply && reply.page === kbPage) collector.add(reply);
    };
    const requests = pageNameRequests(kbPage);
    const gap = 15;
    const finish = () => {
      stop();
      const names = namesOnPage(collector, kbPage);
      const missing = names.filter((n) => n === undefined).length;
      if (missing === 16) {
        setMessage("ไม่ได้รับชื่อจาก MODX M ดูว่าต่อสาย USB แล้ว และตั้ง Device Number เป็น All หรือ 1");
        return;
      }
      let placedCount = 0;
      setLayout((l) => {
        const pages = l.pages.map((x) => x.slice());
        const r = placeNames(pages[current] ?? emptyPage(t), names, (name) => newItem(name));
        pages[current] = r.slots;
        placedCount = r.placed;
        return { ...l, pages, pool: [...r.shelved, ...l.pool].slice(0, 512) };
      });
      setPicked(null);
      setMessage(
        `รับชื่อจาก MODX M ใส่หน้า ${where.page} แล้ว${placedCount ? ` ${placedCount} ช่อง` : ""}` +
          (missing ? ` · ${missing} ช่องยังไม่ได้รับครบ ปล่อยไว้ตามเดิม` : "") +
          " · เสียงในช่องเดิมอยู่บนชั้นวาง",
      );
    };
    const timer = window.setTimeout(finish, 50 + requests.length * gap + 3000);
    const stop = () => {
      window.clearTimeout(timer);
      inputs.forEach((i) => i.removeEventListener("midimessage", onMessage));
      stopAsk.current = null;
      setAsking(false);
    };
    inputs.forEach((i) => i.addEventListener("midimessage", onMessage));
    try {
      sendPaced(outputs, requests, gap);
    } catch {
      stop();
      setMessage("ส่งคำขอไม่ได้ ลองถอดสาย USB แล้วต่อใหม่");
      return;
    }
    stopAsk.current = stop;
    setAsking(true);
    setMessage(`กำลังขอชื่อ 16 ช่องของหน้า ${where.page} จาก MODX M… (ประมาณ 8 วินาที)`);
  };

  // Asking a FANTOM-0 for the name of the scene on screen: read only. One Data
  // Request (RQ1) for the 16 Scene Name characters of the Temporary Scene (MIDI
  // Implementation v1.00); the name goes on the shelf, no slot changes. Off until
  // the visitor confirms, and not yet tested on a real FANTOM-0.
  const askFantom = async () => {
    if (asking) {
      stopAsk.current?.();
      setMessage("หยุดขอชื่อแล้ว");
      return;
    }
    const ok = window.confirm(
      "ขอชื่อ Scene ที่เปิดอยู่บนจอ FANTOM-0 มาวางบนชั้นวาง\n\n" +
        "• หน้านี้ส่งแค่คำขอ (Data Request RQ1) 1 ครั้ง ไม่เขียนอะไรลงเครื่อง และไม่เปลี่ยน Scene บนเครื่อง\n" +
        "• ยังไม่ได้ทดสอบกับ FANTOM-0 จริง ถ้าไม่มีอะไรตอบกลับก็ไม่มีอะไรเปลี่ยน\n" +
        "• เครื่องจะตอบก็ต่อเมื่อเปิด Receive Exclusive ไว้ (SYSTEM: MIDI) และ Device ID ตรงกับ 17\n" +
        "• ช่องที่จัดไว้ไม่เปลี่ยน ชื่อที่ได้จะไปอยู่ท้ายชั้นวาง\n\nทำต่อไหม",
    );
    if (!ok) return;
    if (!("requestMIDIAccess" in navigator)) {
      setMessage("เบราว์เซอร์นี้ใช้ MIDI ไม่ได้ ลอง Chrome หรือ Edge บนคอมพิวเตอร์");
      return;
    }
    let access: MIDIAccess;
    try {
      access = await navigator.requestMIDIAccess({ sysex: true });
    } catch {
      setMessage("ไม่ได้รับอนุญาตให้ใช้ MIDI กดอนุญาตในเบราว์เซอร์แล้วลองใหม่");
      return;
    }
    const inputs = [...access.inputs.values()];
    const allOut = [...access.outputs.values()];
    const named = allOut.filter((o) => /fantom/i.test(o.name ?? ""));
    const outputs = named.length ? named : allOut;
    if (!inputs.length || !outputs.length) {
      setMessage("ไม่พบ FANTOM-0 ต่อสาย USB จากเครื่องเข้าคอมพิวเตอร์ก่อน");
      return;
    }
    const collector = new SceneNameCollector();
    const onMessage = (event: MIDIMessageEvent) => {
      const reply = event.data ? readSceneNameReply(event.data) : null;
      if (!reply) return;
      collector.add(reply);
      if (collector.name() !== undefined) finish();
    };
    const finish = () => {
      stop();
      const name = collector.name();
      if (name === undefined) {
        setMessage("ไม่ได้รับชื่อจาก FANTOM-0 ดูว่าต่อสาย USB แล้ว เปิด Receive Exclusive (SYSTEM: MIDI) และ Device ID เป็น 17");
        return;
      }
      const label = name || "INIT SCENE";
      setLayout((l) => ({ ...l, pool: [...l.pool, newItem(label)].slice(0, 512) }));
      setMessage(`รับชื่อ Scene “${label}” จาก FANTOM-0 วางท้ายชั้นวางแล้ว ลากไปวางบนช่องที่ต้องการ`);
    };
    const timer = window.setTimeout(finish, 3000);
    const stop = () => {
      window.clearTimeout(timer);
      inputs.forEach((i) => i.removeEventListener("midimessage", onMessage));
      stopAsk.current = null;
      setAsking(false);
    };
    inputs.forEach((i) => i.addEventListener("midimessage", onMessage));
    try {
      sendPaced(outputs, [sceneNameRequest()], 0);
    } catch {
      stop();
      setMessage("ส่งคำขอไม่ได้ ลองถอดสาย USB แล้วต่อใหม่");
      return;
    }
    stopAsk.current = stop;
    setAsking(true);
    setMessage("กำลังขอชื่อ Scene ที่เปิดอยู่จาก FANTOM-0…");
  };

  const addNames = () => {
    const items = itemsFromText(paste);
    if (!items.length) return;
    setLayout((l) => ({ ...l, pool: [...l.pool, ...items].slice(0, 512) }));
    setPaste("");
    setMessage(`วาง ${items.length} ชื่อบนชั้นวางแล้ว ลากขึ้นไปวางบนช่อง หรือกด “เติมปุ่มว่างให้อัตโนมัติ”`);
  };

  const openJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || file.size > 2_000_000) return;
    try {
      const next = parseLayout(JSON.parse(await file.text()));
      if (!next) throw new Error("bad");
      setLayout(next);
      setPage(0);
      setMessage(`เปิด ${file.name} แล้ว`);
    } catch {
      setMessage("ไฟล์นี้ไม่ใช่ไฟล์จัดเรียงจากหน้านี้");
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/studio#l=${encodeLayout(layout)}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("คัดลอกลิงก์แล้ว");
    } catch {
      window.history.replaceState(null, "", url);
      setMessage("ลิงก์อยู่ในแถบที่อยู่ด้านบนแล้ว");
    }
  };

  const sheet = orderSheet(layout);
  const fileBase = (layout.title || "sounds").replace(/[^\p{L}\p{N}_-]+/gu, "-");

  const slotsGrid = t.columns === 8 ? "grid-cols-4 sm:grid-cols-8 xl:grid-cols-16" : "grid-cols-4";
  const pickedNo = picked?.kind === "slot" ? slotLabel(t, picked.page, picked.slot) : null;
  const lcdTop =
    t.id === "dx7"
      ? pickedNo
        ? `INT ${pickedNo.padStart(2, "0")}`
        : "CARTRIDGE"
      : t.id === "modx-m"
        ? `USER ${bankPage(t, current).bank} · PAGE ${String(bankPage(t, current).page).padStart(2, "0")}${pickedNo ? ` · SLOT ${pickedNo}` : ""}${pickedItem?.volume !== undefined ? ` · VOL ${pickedItem.volume}` : ""}`
        : pickedNo
          ? `SCENE ${pickedNo}`
          : `SCENE ${slotLabel(t, current, 0)}–${slotLabel(t, current, 15)}`;
  const lcdName = (pickedItem?.name ?? layout.title).toUpperCase() + (pickedItem?.demo ? (pickedItem.clip ? "  ▶ DEMO" : "  ▶ PREVIEW") : "");
  const lcdKey = `${pickCount}-${current}-${layout.target}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" aria-label="เลือกรุ่นคีย์บอร์ด" className="rack-tabs">
          {TARGETS.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={x.id === layout.target} onClick={() => switchTarget(x.id)} className="rack-tab">
              {x.short}
              <span className="rack-tab-note">
                {x.pageName}
                {x.verified ? "" : " · รอยืนยัน"}
              </span>
            </button>
          ))}
        </div>
        <input
          className="studio-input w-56"
          value={layout.title}
          maxLength={40}
          onChange={(e) => setLayout((l) => ({ ...l, title: e.target.value }))}
          aria-label="ชื่อชุดที่จัด"
        />
      </div>
      <p className="text-sm text-muted">
        <span className="font-semibold text-ink">{t.name}</span> · {t.about}
      </p>
      {slotTypeNote(t) && <p className="text-xs text-muted">{slotTypeNote(t)}</p>}

      {/* How it works */}
      <ol className="organizer-steps">
        <li>
          <b>1</b> {t.usesFile ? "ใส่ตลับ: เปิดไฟล์ .syx หรือใช้แบงก์ของร้านที่ใส่ไว้แล้ว" : `ใส่รายชื่อ ${t.slotName === "Scene" ? "Scene" : "Performance"} จากเครื่องลงชั้นวาง`}
        </li>
        <li>
          <b>2</b> ลากเสียงไปวางบนปุ่ม หรือแตะเสียงหนึ่งครั้ง แล้วแตะปุ่มที่จะวาง
        </li>
        <li>
          <b>3</b> {t.usesFile ? "ดาวน์โหลดตลับที่เรียงแล้ว (.syx)" : "ดาวน์โหลดใบจัดเรียงไปทำตามบนเครื่อง"}
        </li>
      </ol>

      {/* Demo banks of the store's packs */}
      {demoPacks.length > 0 && (
        <section className="organizer-demo" aria-label="แบงก์เดโม">
          <div className="flex flex-col gap-1">
            <h2 className="font-bold">ลองกับแบงก์เดโมของร้าน</h2>
            <p className="text-xs text-muted">โหลดเสียงในแพ็กลงเครื่อง แตะแต่ละช่องเพื่อฟังเดโม ลองสลับลองจัดได้ แต่ดาวน์โหลดไม่ได้</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {demoPacks.map((p) => (
              <button key={p.slug} type="button" aria-pressed={demoSlug === p.slug} onClick={() => openDemo(p)} className={`studio-pill ${demoSlug === p.slug ? "is-on" : ""}`}>
                ▶ {p.name}
              </button>
            ))}
            {demoSlug && (
              <button type="button" className="studio-pill" onClick={backToMine}>
                ← กลับงานของฉัน
              </button>
            )}
          </div>
        </section>
      )}

      {/* The machine face */}
      <section className={`face face-${t.id}`} aria-label={`หน้าเครื่อง ${t.name}`}>
        <div className="face-top">
          <div className="face-lcd" aria-live="polite">
            <span key={`a${lcdKey}`} className="face-lcd-line">
              {lcdTop}
            </span>
            <span key={`b${lcdKey}`} className="face-lcd-line is-big">
              {lcdName}
            </span>
          </div>
          {t.usesFile ? (
            <button type="button" className="cartridge" key={`cart${cartKey}`} onClick={() => {
                openMode.current = "cartridge";
                fileRef.current?.click();
              }} aria-label="ใส่ตลับใหม่: เปิดไฟล์ .syx">
              <span className="cartridge-grip" aria-hidden="true" />
              <span className="cartridge-label">
                <span className="cartridge-brand">MCKY · FM CARTRIDGE</span>
                <span className="cartridge-title">{layout.title}</span>
                <span className="cartridge-meta">{placed} / 32 VOICES</span>
              </span>
              <span className="cartridge-pins" aria-hidden="true" />
            </button>
          ) : (
            t.pagesPerBank ? (
              <div className="face-liveset">
                {(() => {
                  const { bank, page: pg } = bankPage(t, current);
                  const banks = Math.ceil(t.maxPages / t.pagesPerBank!);
                  return (
                    <>
                      <div className="face-stepper">
                        <span className="face-stepper-label">BANK</span>
                        <button type="button" className="face-page" onClick={() => goToPage((bank - 2) * t.pagesPerBank! + pg - 1)} disabled={bank <= 1} aria-label="แบงก์ก่อนหน้า">
                          ◀
                        </button>
                        <span className="face-stepper-value">USER {bank}</span>
                        <button type="button" className="face-page" onClick={() => goToPage(bank * t.pagesPerBank! + pg - 1)} disabled={bank >= banks} aria-label="แบงก์ถัดไป">
                          ▶
                        </button>
                        <input
                          className="face-name-input"
                          value={layout.bankNames?.[bank - 1] ?? ""}
                          placeholder="Bank Name"
                          maxLength={t.pageNameMax}
                          onChange={(e) => setName("bankNames", bank - 1, e.target.value)}
                          aria-label={`ชื่อแบงก์ USER ${bank}`}
                        />
                      </div>
                      <div className="face-stepper">
                        <span className="face-stepper-label">PAGE</span>
                        <button type="button" className="face-page" onClick={() => goToPage(current - 1)} disabled={current <= 0} aria-label="หน้าก่อนหน้า">
                          ◀
                        </button>
                        <span className="face-stepper-value">{String(pg).padStart(2, "0")}</span>
                        <button type="button" className="face-page" onClick={() => goToPage(current + 1)} disabled={current >= t.maxPages - 1} aria-label="หน้าถัดไป">
                          ▶
                        </button>
                        <input
                          className="face-name-input"
                          value={layout.pageNames?.[current] ?? ""}
                          placeholder="Page Name"
                          maxLength={t.pageNameMax}
                          onChange={(e) => setName("pageNames", current, e.target.value)}
                          aria-label={`ชื่อหน้า ${pg}`}
                        />
                      </div>
                      {(() => {
                        const bad = bankPageNameProblems(t, layout).filter((x) => x.bank === bank || x.page === current);
                        return bad.length > 0 ? (
                          <p className="face-name-warn" role="status">
                            {t.short} ตั้งชื่อได้เฉพาะตัวอักษรอังกฤษ ตัวเลข และสัญลักษณ์พื้นฐาน{" "}
                            {bad.map((x) => `${x.where}: ${x.chars.join(" ")}`).join(" · ")}
                          </p>
                        ) : null;
                      })()}
                    </>
                  );
                })()}
              </div>
            ) : (
            <div className="face-pages" role="tablist" aria-label="หน้า">
              {layout.pages.map((_, p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={p === current}
                  onClick={() => setPage(p)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setPage(p);
                  }}
                  className="face-page"
                >
                  {t.id === "fantom-0" ? slotLabel(t, p, 0) : `P${p + 1}`}
                </button>
              ))}
              <button
                type="button"
                className="face-page is-add"
                disabled={layout.pages.length >= t.maxPages}
                onClick={() => {
                  setLayout((l) => ({ ...l, pages: [...l.pages, emptyPage(t)] }));
                  setPage(layout.pages.length);
                }}
                aria-label="เพิ่มหน้า"
              >
                +
              </button>
            </div>
            )
          )}
        </div>

        <div className={`face-keys grid ${slotsGrid}`}>
          {layout.pages[current].map((item, s) => {
            const at: Place = { kind: "slot", page: current, slot: s };
            const id = `${current}-${s}`;
            const active = same(picked, at);
            return (
              <button
                key={active || landed?.id === id ? `${id}-${pickCount}` : id}
                type="button"
                draggable={!!item}
                onDragStart={onDragStart(at)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(id);
                }}
                onDragLeave={() => setOver((o) => (o === id ? null : o))}
                onDrop={onDrop(at)}
                onClick={() => tap(at, !!item)}
                aria-pressed={active}
                aria-label={`${t.slotName} ${slotLabel(t, current, s)}: ${item?.name ?? "ว่าง"}`}
                className={`face-btn ${item?.color ? `slot-c-${item.color.toLowerCase()}` : ""} ${item ? "" : "is-empty"} ${landed?.id === id ? "is-landed" : ""} ${over === id ? "is-over" : ""} ${picked && !active ? "is-target" : ""}`}
              >
                <span className="face-btn-top">
                  <span className="face-led" aria-hidden="true" />
                  <span className="face-num">{slotLabel(t, current, s)}</span>
                </span>
                <span className="face-name">{item?.name ?? ""}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Shelf: sounds not in the machine yet */}
        <section
          className={`studio-panel organizer-pool ${over === "pool" ? "is-over" : ""} ${picked?.kind === "slot" ? "is-target" : ""}`}
          aria-label="ชั้นวางเสียง"
          onDragOver={(e) => {
            e.preventDefault();
            setOver("pool");
          }}
          onDragLeave={() => setOver(null)}
          onDrop={onDrop({ kind: "pool", index: layout.pool.length })}
          onClick={(e) => {
            if (picked?.kind === "slot" && !(e.target as HTMLElement).closest("button, textarea, input")) move(picked, { kind: "pool", index: layout.pool.length });
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold">ชั้นวางเสียง</h2>
            <span className="text-xs text-muted">{layout.pool.length} เสียง</span>
          </div>
          <p className="text-xs text-muted">
            เสียงที่ยังไม่ได้อยู่บนเครื่องจะรออยู่ตรงนี้ ลากขึ้นไปวางบนปุ่ม หรือแตะเสียงแล้วแตะปุ่มที่ต้องการ
            {picked?.kind === "slot" ? " · แตะพื้นที่นี้เพื่อเอาเสียงที่เลือกลงมาพักไว้" : ""}
          </p>
          {t.usesFile ? (
            <>
              <button
                type="button"
                className="studio-btn"
                onClick={() => {
                  openMode.current = "shelf";
                  fileRef.current?.click();
                }}
              >
                เปิดไฟล์ .syx มาวางบนชั้น
              </button>
              <button type="button" className="studio-btn" aria-pressed={listening} onClick={() => void receiveFromDx7()}>
                {listening ? "กำลังรอรับจาก DX7… (แตะเพื่อหยุด)" : "รับเสียง 32 เสียงจาก DX7 ทาง USB-MIDI"}
              </button>
              <p className="text-xs text-muted">อ่านอย่างเดียว หน้านี้ไม่ส่งอะไรเข้าเครื่อง เสียงที่รับมาจะใส่เป็นตลับ เสียงในตลับเดิมย้ายลงชั้นวาง ใช้ได้บน Chrome หรือ Edge</p>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                className="studio-input min-h-24 py-2"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={`วางรายชื่อ ${t.id === "modx-m" ? "Performance" : "Scene"} บรรทัดละชื่อ`}
                aria-label="รายชื่อเสียง บรรทัดละชื่อ"
              />
              <button type="button" className="studio-btn" onClick={addNames} disabled={!paste.trim()}>
                วางลงชั้นวาง
              </button>
              {t.id === "fantom-0" && !demoSlug && (
                <>
                  <button type="button" className="studio-btn" aria-pressed={asking} onClick={() => void askFantom()}>
                    {asking ? "กำลังขอชื่อจาก FANTOM-0… (แตะเพื่อหยุด)" : "รับชื่อ Scene ที่เปิดอยู่จาก FANTOM-0 ทาง USB (ยังไม่ได้ทดสอบกับเครื่องจริง)"}
                  </button>
                  <p className="text-xs text-muted">
                    อ่านอย่างเดียว ส่งแค่คำขอชื่อ ไม่เขียนอะไรลงเครื่อง ได้ทีละ 1 Scene (Scene ที่อยู่บนจอ) เปลี่ยน Scene บนเครื่องแล้วกดอีกครั้ง ชื่อจะไปอยู่ท้ายชั้นวาง ใช้ได้บน Chrome หรือ Edge
                  </p>
                </>
              )}
              {t.id === "modx-m" && !demoSlug && (
                <>
                  <button type="button" className="studio-btn" aria-pressed={asking} onClick={() => void receiveFromModx()}>
                    {asking ? "กำลังขอชื่อจาก MODX M… (แตะเพื่อหยุด)" : "รับชื่อช่องจาก MODX M ทาง USB (ยังไม่ได้ทดสอบกับเครื่องจริง)"}
                  </button>
                  <p className="text-xs text-muted">
                    อ่านอย่างเดียว ส่งแค่คำขอชื่อ ไม่เขียนอะไรลงเครื่อง ชื่อ 16 ช่องจะใส่หน้าที่เปิดอยู่ เสียงในช่องเดิมย้ายลงชั้นวาง ใช้ได้บน Chrome หรือ Edge
                  </p>
                </>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" multiple accept=".syx,application/octet-stream" className="sr-only" tabIndex={-1} aria-label="เลือกไฟล์ .syx" onChange={(e) => void openSyx(e)} />
          <ul className="flex max-h-[22rem] flex-col gap-1 overflow-y-auto">
            {layout.pool.map((item, i) => {
              const at: Place = { kind: "pool", index: i };
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={onDragStart(at)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.stopPropagation();
                      onDrop(at)(e);
                    }}
                    onClick={() => tap(at, true)}
                    aria-pressed={same(picked, at)}
                    className={`organizer-chip ${item.color ? `slot-c-${item.color.toLowerCase()}` : ""}`}
                  >
                    <span aria-hidden="true" className="mr-1.5 text-muted">⋮⋮</span>
                    {item.name}
                  </button>
                </li>
              );
            })}
            {layout.pool.length === 0 && (
              <li className="organizer-empty">
                <span aria-hidden="true">↑</span>
                {t.usesFile ? "ชั้นว่างอยู่ เสียงที่เกิน 32 หรือที่ยกลงจากเครื่องจะมาอยู่ตรงนี้" : "วางรายชื่อจากเครื่องในช่องด้านบน แล้วลากขึ้นไปวางบนปุ่ม"}
              </li>
            )}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="studio-btn" onClick={() => setLayout((l) => fillEmpty(l, current))} disabled={!layout.pool.length}>
              เติมปุ่มว่างให้อัตโนมัติ
            </button>
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          {/* The picked sound */}
          <div className="studio-panel min-h-24">
            {pickedItem ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">แตะปุ่มอื่นเพื่อย้ายเสียงนี้ไปที่นั่น (ถ้ามีเสียงอยู่จะสลับกัน) หรือแตะชั้นวางเพื่อยกลงมาพัก</p>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="studio-field min-w-48 flex-1">
                    <span>ชื่อ</span>
                    <input
                      className="studio-input"
                      value={pickedItem.name}
                      maxLength={t.nameMax}
                      onChange={(e) => setLayout((l) => updateItem(l, pickedItem.id, { name: t.usesFile ? e.target.value.replace(/[^\x20-\x7e]/g, "") : e.target.value }))}
                    />
                    {unsupportedNameChars(t, pickedItem.name).length > 0 && (
                      <span className="text-xs text-muted" role="status">
                        {t.short} ตั้งชื่อได้เฉพาะตัวอักษรอังกฤษ ตัวเลข และสัญลักษณ์พื้นฐาน ตัวนี้พิมพ์บนเครื่องไม่ได้: {unsupportedNameChars(t, pickedItem.name).join(" ")}
                      </span>
                    )}
                  </label>
                  <label className="studio-field min-w-48 flex-1">
                    <span>โน้ต (เช่น เพลงที่ใช้)</span>
                    <input className="studio-input" value={pickedItem.note} maxLength={60} onChange={(e) => setLayout((l) => updateItem(l, pickedItem.id, { note: e.target.value }))} />
                  </label>
                  {(pickedItem.patch || !t.usesFile) && (
                    <button type="button" className="studio-btn" onClick={() => void (pickedItem.patch ? preview(pickedItem) : auditionGm(pickedItem))}>
                      ▶ ฟังอีกครั้ง
                    </button>
                  )}
                  <button
                    type="button"
                    className="studio-btn"
                    onClick={() => {
                      setLayout((l) => removeItem(l, pickedItem.id));
                      setPicked(null);
                    }}
                  >
                    ลบ
                  </button>
                </div>
                {!t.usesFile && (
                  <label className="studio-field">
                    <span>เสียงตัวอย่างในเว็บ (ใกล้เคียงตามประเภท)</span>
                    <select
                      className="studio-input"
                      value={pickedItem.sound ?? guessSound(pickedItem.name)}
                      onChange={(e) => {
                        const sound = e.target.value;
                        setLayout((l) => updateItem(l, pickedItem.id, { sound }));
                        void auditionGm({ ...pickedItem, sound });
                      }}
                    >
                      {PREVIEW_SOUNDS.map((x) => (
                        <option key={x.key} value={x.key}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {t.colors.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted">Color</span>
                    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Color">
                      <button type="button" aria-pressed={!pickedItem.color} onClick={() => setLayout((l) => updateItem(l, pickedItem.id, { color: "" }))} className="organizer-swatch">
                        ไม่ตั้ง
                      </button>
                      {t.colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={pickedItem.color === c}
                          onClick={() => setLayout((l) => updateItem(l, pickedItem.id, { color: c }))}
                          className={`organizer-swatch slot-c-${c.toLowerCase()}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {t.hasVolume && (
                  <label className="studio-field">
                    <span>
                      Volume <b>{pickedItem.volume ?? "ตามเครื่อง"}</b>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={127}
                      value={pickedItem.volume ?? 100}
                      onChange={(e) => setLayout((l) => updateItem(l, pickedItem.id, { volume: Number(e.target.value) }))}
                    />
                  </label>
                )}
                {t.hasSssTime && (
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="studio-field min-w-40 flex-1">
                      <span>SSS Time</span>
                      <select
                        className="studio-input"
                        value={pickedItem.sss === undefined ? "" : pickedItem.sss === "System" || pickedItem.sss === "Hold" ? pickedItem.sss : "sec"}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLayout((l) => updateItem(l, pickedItem.id, { sss: v === "" ? undefined : v === "sec" ? "0.0" : v }));
                        }}
                      >
                        <option value="">ตามเครื่อง (ไม่ระบุในใบจัดเรียง)</option>
                        <option value="System">System</option>
                        <option value="Hold">Hold</option>
                        <option value="sec">0.0sec – 30sec</option>
                      </select>
                    </label>
                    {pickedItem.sss !== undefined && pickedItem.sss !== "System" && pickedItem.sss !== "Hold" && (
                      <label className="studio-field w-32">
                        <span>วินาที</span>
                        <input
                          className="studio-input"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={30}
                          step={0.1}
                          value={pickedItem.sss}
                          onChange={(e) => {
                            const sss = parseSssTime(e.target.value);
                            if (sss) setLayout((l) => updateItem(l, pickedItem.id, { sss }));
                          }}
                        />
                      </label>
                    )}
                    <p className="w-full text-xs text-muted">เวลาที่เสียงเดิมจางหายหลังปล่อยคีย์ แม้เปลี่ยน Performance ระหว่างเล่น · ตั้งบนเครื่องในหน้า Live Set Edit ตามใบจัดเรียง</p>
                  </div>
                )}
                {picked?.kind === "slot" && t.pagesPerBank && (
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Job">
                    <span className="mr-1 text-xs text-muted">Job</span>
                    <button type="button" className={`studio-pill ${job === "exchange" ? "is-on" : ""}`} aria-pressed={job === "exchange"} onClick={() => setJob("exchange")}>
                      Exchange
                    </button>
                    <button type="button" className={`studio-pill ${job === "copy" ? "is-on" : ""}`} aria-pressed={job === "copy"} onClick={() => setJob("copy")}>
                      Copy
                    </button>
                    <button
                      type="button"
                      className="studio-pill"
                      onClick={() => {
                        setLayout((l) => moveItem(l, picked, { kind: "pool", index: l.pool.length }));
                        setPicked(null);
                      }}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="studio-pill"
                      onClick={() => {
                        if (picked.kind === "slot") setLayout((l) => deleteAndMove(l, picked.page, picked.slot));
                        setPicked(null);
                      }}
                    >
                      Delete &amp; Move
                    </button>
                    <span className="text-xs text-muted">
                      {job === "copy" ? "แตะช่องที่จะวางสำเนา" : "แตะช่องอื่นเพื่อสลับ (Exchange)"} · Delete ยกลงชั้นวาง
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">แตะปุ่มบนเครื่องเพื่อเลือกเสียง (จะได้ยินเสียงทันที{t.usesFile ? "" : " เป็นเสียงตัวอย่างใกล้เคียง"}) แล้วแตะปุ่มอื่นเพื่อย้าย · ใส่แล้ว {placed} เสียง</p>
            )}
          </div>

          <div className="studio-panel">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">
                เล่นเสียงที่เลือก
                {!t.usesFile && pickedItem && <span className="ml-2 text-sm font-normal text-muted">({soundOf(pickedItem).label})</span>}
              </h2>
              <OctaveSwitch octave={octave} onChange={setOctave} />
            </div>
            <div className="rack-skin-fm rounded-xl bg-case p-1.5">
              <RackKeys active={!!pickedItem} held={held} octave={octave} onNoteOn={(n) => void noteOn(n)} onNoteOff={noteOff} />
            </div>
            {!t.usesFile && (
              <p className="text-xs text-muted">
                {gmState === "loading"
                  ? "กำลังโหลดเสียง…"
                  : gmState === "error"
                    ? "โหลดเสียงตัวอย่างไม่ได้ ลองใหม่อีกครั้ง หรือเช็กอินเทอร์เน็ต"
                    : "เสียงตัวอย่างใกล้เคียงตามประเภท ไม่ใช่เสียงจริงของเครื่อง"}{" "}
                · เสียงจาก FluidR3_GM โดย Frank Wen (CC BY 3.0) ผ่าน{" "}
                <a className="underline underline-offset-2" href="https://github.com/gleitz/midi-js-soundfonts">
                  midi-js-soundfonts
                </a>{" "}
                และ smplr (MIT)
              </p>
            )}
          </div>

          {t.usesFile && dupesInCart.length > 0 && (
            <p className="text-xs text-muted" role="status">
              เสียงซ้ำในแบงก์ (ค่าเสียงเหมือนกันทุกอย่าง แม้ชื่อต่างกัน): Voice {dupesInCart.join(", ")}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="studio-btn" onClick={() => setLayout((l) => sortPage(l, current))}>
              เรียงตามชื่อ
            </button>
            <button
              type="button"
              className="studio-btn"
              onClick={() =>
                setLayout((l) => ({
                  ...l,
                  pages: l.pages.map((p, i) => (i === current ? p.map(() => null) : p)),
                  pool: [...l.pool, ...l.pages[current].filter((x): x is Item => !!x)],
                }))
              }
            >
              ยกทั้งหน้าลงชั้นวาง
            </button>
            {t.usesFile && (
              <button type="button" className="studio-btn" onClick={() => setLayout((l) => swapHalves(l, current))}>
                สลับครึ่ง 1–16 ↔ 17–32
              </button>
            )}
            {t.usesFile && layout.pool.length > 0 && (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <label>
                  <span className="sr-only">เลือกเสียงจากชั้นวาง</span>
                  <select className="studio-input w-auto" value={mergeFrom} onChange={(e) => setMergeFrom(Number(e.target.value))}>
                    <option value={0}>ชั้นวาง 1–16</option>
                    {layout.pool.length > 16 && <option value={16}>ชั้นวาง 17–32</option>}
                  </select>
                </label>
                <button
                  type="button"
                  className="studio-btn"
                  onClick={() => {
                    const from = layout.pool.length > mergeFrom ? mergeFrom : 0;
                    setLayout((l) => shelfIntoSlots(l, current, 16, from));
                    setMessage("รวมตลับแล้ว เสียงที่เคยอยู่ช่อง 17–32 ย้ายไปท้ายชั้นวาง");
                  }}
                >
                  วางแทนช่อง 17–32
                </button>
              </span>
            )}
            {t.usesFile && dupesInCart.length > 0 && (
              <button type="button" className="studio-btn" onClick={() => setLayout((l) => shelveDuplicates(l))}>
                ย้ายเสียงซ้ำลงชั้นวาง ({dupesInCart.length})
              </button>
            )}
            {t.usesFile && (
              <button
                type="button"
                className="studio-btn"
                onClick={() => {
                  setLayout(starterLayout("dx7"));
                  setCartKey((k) => k + 1);
                  setPicked(null);
                }}
              >
                ใส่แบงก์ของร้าน (MCKY 32 เสียง)
              </button>
            )}
            <button
              type="button"
              className="studio-btn"
              onClick={() => {
                if (window.confirm("ล้างทั้งหมดของรุ่นนี้?")) {
                  setLayout(emptyLayout(t.id));
                  setPage(0);
                  setPicked(null);
                }
              }}
            >
              ล้างทั้งหมด
            </button>
          </div>
        </section>
      </div>

      {demoSlug ? (
        <section className="studio-panel" aria-label="แบงก์เดโม">
          <h2 className="font-bold">นี่คือแบงก์เดโม</h2>
          <p className="text-sm text-muted">
            ฟังและลองจัดได้ แต่ดาวน์โหลด บันทึก หรือแชร์ไม่ได้
            {demoPack && demoPack.patches.every((p) => !p.clip) ? " · เสียงตอนนี้เป็นเสียงใกล้เคียงตามประเภท รอเดโมที่อัดจากเครื่อง" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {demoPack && (
              <Link href={`/packs/${demoPack.slug}`} className="studio-btn is-primary">
                ซื้อแพ็ก {demoPack.name}
              </Link>
            )}
            <button type="button" className="studio-btn" onClick={backToMine}>
              กลับงานของฉัน
            </button>
          </div>
        </section>
      ) : (
      <section className="studio-panel" aria-label="บันทึกและนำไปใช้">
        <h2 className="font-bold">บันทึกและนำไปใช้</h2>
        <p className="text-sm text-muted">{t.howTo}</p>
        {t.chain && <p className="text-sm text-muted">{t.chain.howTo}</p>}
        <div className="flex flex-wrap gap-2">
          {t.usesFile && (
            <>
              <button
                type="button"
                className="studio-btn is-primary"
                disabled={!placed}
                onClick={() =>
                  download(
                    `${fileBase}.syx`,
                    bankSysex(layout.pages[0].map((x) => (x?.patch ? fromB64(x.patch) : INIT)), INIT),
                    "application/octet-stream",
                  )
                }
              >
                ดาวน์โหลดแบงก์ .syx (32 เสียงตามลำดับนี้)
              </button>
              {pickedItem?.patch && (
                <button type="button" className="studio-btn" onClick={() => download(`${pickedItem.name.replace(/[^A-Za-z0-9_-]+/g, "-") || "voice"}.syx`, voiceSysex(fromB64(pickedItem.patch!)), "application/octet-stream")}>
                  ดาวน์โหลดเฉพาะเสียงที่เลือก
                </button>
              )}
            </>
          )}
          <button type="button" className="studio-btn" onClick={() => download(`${fileBase}-order.txt`, sheet, "text/plain;charset=utf-8")}>
            ดาวน์โหลดใบจัดเรียง
          </button>
          <button type="button" className="studio-btn" onClick={() => window.print()}>
            พิมพ์ใบจัดเรียง
          </button>
          <button type="button" className="studio-btn" onClick={() => download(`${fileBase}.mcky.json`, layoutToJson(layout), "application/json")}>
            บันทึกไฟล์งาน
          </button>
          <button type="button" className="studio-btn" onClick={() => jsonRef.current?.click()}>
            เปิดไฟล์งาน
          </button>
          <button type="button" className="studio-btn" onClick={() => void share()}>
            คัดลอกลิงก์แชร์
          </button>
        </div>
        <input ref={jsonRef} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label="เปิดไฟล์งาน" onChange={(e) => void openJson(e)} />
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">ดูใบจัดเรียง</summary>
          <pre className="studio-sheet mt-2">{sheet}</pre>
        </details>
      </section>
      )}

      <p className="min-h-5 text-sm text-muted" aria-live="polite">
        {message}
      </p>
      <pre className="studio-print" aria-hidden="true">
        {sheet}
      </pre>
    </div>
  );
}
