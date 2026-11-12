"use client";

import { INIT, parse } from "@audio/synth-dx7";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FM_PRESETS } from "@/components/rack/fm/presets";
import { OctaveSwitch, RackKeys } from "@/components/rack/RackKeys";
import { bankSysex, voiceSysex } from "@/lib/studio/dx7";
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
  removeItem,
  slotLabel,
  sortPage,
  bankPage,
  copyItem,
  deleteAndMove,
  TARGETS,
  updateItem,
  type Item,
  type Layout,
  type Place,
  type TargetId,
} from "@/lib/studio/library";

const KEY = (t: TargetId) => `mcky-organizer-${t}`;
const LAST_KEY = "mcky-organizer-target";


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
export function Organizer() {
  const [layout, setLayout] = useState<Layout>(initial);
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
  const [landed, setLanded] = useState<{ id: string; n: number } | null>(null);
  // What the next tap does with the chosen slot, like the keyboard's edit jobs.
  const [job, setJob] = useState<"exchange" | "copy">("exchange");
  const jsonRef = useRef<HTMLInputElement>(null);

  const t = getTarget(layout.target);
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

  useEffect(() => () => void engine.current?.ctx.close(), []);

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
      // A new cartridge goes in; the voices that were in it move to the shelf, so nothing is lost.
      const name = files[0]?.name.replace(/\.syx$/i, "").slice(0, 40) || "CARTRIDGE";
      setLayout((l) => {
        const old = l.pages[0].filter((x): x is Item => !!x);
        const slots = l.pages[0].map((_, i) => items[i] ?? null);
        return { ...l, title: name, pages: [slots], pool: [...items.slice(slots.length), ...old, ...l.pool].slice(0, 512) };
      });
      setCartKey((k) => k + 1);
      setPicked(null);
      setMessage(`ใส่ตลับ ${name} แล้ว${items.length > 32 ? " เสียงที่เกิน 32 อยู่บนชั้นวาง" : ""} เสียงจากตลับเดิมย้ายไปอยู่บนชั้นวาง`);
    } else {
      setLayout((l) => ({ ...l, pool: [...l.pool, ...items].slice(0, 512) }));
      setMessage(`วาง ${items.length} เสียงบนชั้นวางแล้ว ลากขึ้นไปวางบนปุ่มได้เลย`);
    }
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
  const lcdName = (pickedItem?.name ?? layout.title).toUpperCase();
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
                  {t.id === "fantom-0" ? `${String(p * 16 + 1).padStart(3, "0")}` : `P${p + 1}`}
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
                  </label>
                  <label className="studio-field min-w-48 flex-1">
                    <span>โน้ต (เช่น เพลงที่ใช้)</span>
                    <input className="studio-input" value={pickedItem.note} maxLength={60} onChange={(e) => setLayout((l) => updateItem(l, pickedItem.id, { note: e.target.value }))} />
                  </label>
                  {pickedItem.patch && (
                    <button type="button" className="studio-btn" onClick={() => void preview(pickedItem)}>
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
              <p className="text-sm text-muted">แตะปุ่มบนเครื่องเพื่อเลือกเสียง{t.usesFile ? " (จะได้ยินเสียงทันที)" : ""} แล้วแตะปุ่มอื่นเพื่อย้าย · ใส่แล้ว {placed} เสียง</p>
            )}
          </div>

          {t.usesFile && (
            <div className="studio-panel">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold">เล่นเสียงที่เลือก</h2>
                <OctaveSwitch octave={octave} onChange={setOctave} />
              </div>
              <div className="rack-skin-fm rounded-xl bg-case p-1.5">
                <RackKeys active={!!pickedPatch} held={held} octave={octave} onNoteOn={(n) => void noteOn(n)} onNoteOff={noteOff} />
              </div>
            </div>
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

      <section className="studio-panel" aria-label="บันทึกและนำไปใช้">
        <h2 className="font-bold">บันทึกและนำไปใช้</h2>
        <p className="text-sm text-muted">{t.howTo}</p>
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

      <p className="min-h-5 text-sm text-muted" aria-live="polite">
        {message}
      </p>
      <pre className="studio-print" aria-hidden="true">
        {sheet}
      </pre>
    </div>
  );
}
