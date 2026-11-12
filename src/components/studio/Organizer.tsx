"use client";

import { INIT, parse } from "@audio/synth-dx7";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
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
  SLOT_COLORS,
  TARGETS,
  updateItem,
  type Item,
  type Layout,
  type Place,
  type TargetId,
} from "@/lib/studio/library";

const KEY = (t: TargetId) => `mcky-organizer-${t}`;
const LAST_KEY = "mcky-organizer-target";

const COLOR_LABEL: Record<string, string> = {
  none: "ไม่มีสี",
  blue: "น้ำเงิน",
  red: "แดง",
  "light-blue": "ฟ้า",
  "light-red": "ชมพู",
  gray: "เทา",
};

const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function load(target: TargetId): Layout {
  try {
    const saved = window.localStorage.getItem(KEY(target));
    const parsed = saved ? parseLayout(JSON.parse(saved)) : null;
    if (parsed) return parsed;
  } catch {
    // Storage blocked or bad data: start empty.
  }
  return emptyLayout(target);
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
  const [over, setOver] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [octave, setOctave] = useState(0);
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  const engine = useRef<{ ctx: AudioContext; node: AudioWorkletNode } | null>(null);
  const starting = useRef<Promise<void> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const move = (from: Place, to: Place) => {
    setLayout((l) => moveItem(l, from, to));
    setPicked(null);
  };

  /** Tap to pick up, tap again somewhere to put it down. */
  const tap = (at: Place, filled: boolean) => {
    if (picked && same(picked, at)) return setPicked(null);
    if (picked) return move(picked, at);
    if (filled) setPicked(at);
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
    setLayout((l) => {
      const empty = l.pages[0].every((x) => !x);
      const withPool = { ...l, pool: [...l.pool, ...items].slice(0, 512) };
      return empty ? fillEmpty(withPool) : withPool;
    });
    setMessage(`เพิ่ม ${items.length} เสียงแล้ว${items.length > 32 ? " ส่วนที่เกิน 32 อยู่ในที่พักด้านซ้าย" : ""}`);
  };

  const addNames = () => {
    const items = itemsFromText(paste);
    if (!items.length) return;
    setLayout((l) => ({ ...l, pool: [...l.pool, ...items].slice(0, 512) }));
    setPaste("");
    setMessage(`เพิ่ม ${items.length} ชื่อในที่พักแล้ว ลากลงช่อง หรือกด “เติมช่องว่าง”`);
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

  const slotsGrid = t.columns === 8 ? "grid-cols-4 md:grid-cols-8" : "grid-cols-2 sm:grid-cols-4";

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

      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* Pool: sounds not placed yet */}
        <section
          className={`studio-panel organizer-pool ${over === "pool" ? "is-over" : ""} ${picked?.kind === "slot" ? "is-target" : ""}`}
          aria-label="ที่พักเสียง"
          onDragOver={(e) => {
            e.preventDefault();
            setOver("pool");
          }}
          onDragLeave={() => setOver(null)}
          onDrop={onDrop({ kind: "pool", index: layout.pool.length })}
          onClick={(e) => {
            if (e.target === e.currentTarget && picked?.kind === "slot") move(picked, { kind: "pool", index: layout.pool.length });
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold">ที่พักเสียง</h2>
            <span className="text-xs text-muted">{layout.pool.length} เสียง</span>
          </div>
          {t.usesFile ? (
            <button type="button" className="studio-btn" onClick={() => fileRef.current?.click()}>
              เปิดไฟล์ .syx
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
                เพิ่มลงที่พัก
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" multiple accept=".syx,application/octet-stream" className="sr-only" tabIndex={-1} aria-label="เลือกไฟล์ .syx" onChange={(e) => void openSyx(e)} />
          <ul className="flex max-h-[26rem] flex-col gap-1 overflow-y-auto">
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
                    className={`organizer-chip color-${item.color}`}
                  >
                    {item.name}
                  </button>
                </li>
              );
            })}
            {layout.pool.length === 0 && (
              <li className="text-xs text-muted">{t.usesFile ? "เสียงที่เกิน 32 ช่องหรือที่เอาออกจะมาอยู่ตรงนี้" : "วางรายชื่อจากเครื่องด้านบน หรือลากเสียงออกจากช่องมาพักไว้"}</li>
            )}
          </ul>
        </section>

        {/* Grid */}
        <section className="flex min-w-0 flex-col gap-3" aria-label={t.pageName}>
          {t.maxPages > 1 && (
            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="หน้า">
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
                  className={`studio-pill ${p === current ? "is-on" : ""}`}
                >
                  {t.id === "fantom-0" ? `${String(p * 16 + 1).padStart(3, "0")}–${String(p * 16 + 16).padStart(3, "0")}` : `หน้า ${p + 1}`}
                </button>
              ))}
              <button
                type="button"
                className="studio-pill"
                disabled={layout.pages.length >= t.maxPages}
                onClick={() => {
                  setLayout((l) => ({ ...l, pages: [...l.pages, emptyPage(t)] }));
                  setPage(layout.pages.length);
                }}
              >
                + หน้า
              </button>
            </div>
          )}

          <div className={`organizer-grid grid gap-1.5 ${slotsGrid}`}>
            {layout.pages[current].map((item, s) => {
              const at: Place = { kind: "slot", page: current, slot: s };
              const id = `${current}-${s}`;
              return (
                <button
                  key={id}
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
                  aria-pressed={same(picked, at)}
                  aria-label={`${t.slotName} ${slotLabel(t, current, s)}: ${item?.name ?? "ว่าง"}`}
                  className={`organizer-slot color-${item?.color ?? "none"} ${item ? "" : "is-empty"} ${over === id ? "is-over" : ""} ${picked && !same(picked, at) ? "is-target" : ""}`}
                >
                  <span className="organizer-num">{slotLabel(t, current, s)}</span>
                  <span className="organizer-name">{item?.name ?? ""}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="studio-btn" onClick={() => setLayout((l) => fillEmpty(l, current))} disabled={!layout.pool.length}>
              เติมช่องว่างจากที่พัก
            </button>
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
              ย้ายหน้านี้ไปที่พัก
            </button>
            <button
              type="button"
              className="studio-btn"
              onClick={() => {
                if (window.confirm("ล้างทั้งหมดของรุ่นนี้?")) {
                  setLayout(emptyLayout(t.id));
                  setPage(0);
                }
              }}
            >
              ล้างทั้งหมด
            </button>
          </div>

          {/* The picked sound */}
          <div className="studio-panel min-h-24" aria-live="polite">
            {pickedItem ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">แตะช่องอื่นเพื่อย้ายไปที่นั่น (ถ้ามีเสียงอยู่จะสลับกัน) หรือแตะที่พักเพื่อเอาออก</p>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="studio-field min-w-48 flex-1">
                    <span>ชื่อ</span>
                    <input
                      className="studio-input"
                      value={pickedItem.name}
                      maxLength={t.usesFile ? 10 : 40}
                      onChange={(e) => setLayout((l) => updateItem(l, pickedItem.id, { name: t.usesFile ? e.target.value.replace(/[^\x20-\x7e]/g, "") : e.target.value }))}
                    />
                  </label>
                  <label className="studio-field min-w-48 flex-1">
                    <span>โน้ต (เช่น เพลงที่ใช้)</span>
                    <input className="studio-input" value={pickedItem.note} maxLength={60} onChange={(e) => setLayout((l) => updateItem(l, pickedItem.id, { note: e.target.value }))} />
                  </label>
                  {pickedItem.patch && (
                    <button type="button" className="studio-btn" onClick={() => void preview(pickedItem)}>
                      ▶ ฟัง
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
                {t.colors && (
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="สีช่อง">
                    {SLOT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={pickedItem.color === c}
                        onClick={() => setLayout((l) => updateItem(l, pickedItem.id, { color: c }))}
                        className={`organizer-swatch color-${c}`}
                      >
                        {COLOR_LABEL[c]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">
                ลากเสียงไปวางช่องที่ต้องการ หรือแตะเสียงหนึ่งครั้งแล้วแตะช่องที่จะวาง · วางแล้ว {placed} เสียง
              </p>
            )}
          </div>

          {t.usesFile && (
            <div className="studio-panel">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold">ฟังเสียงที่เลือก</h2>
                <OctaveSwitch octave={octave} onChange={setOctave} />
              </div>
              <div className="rack-skin-fm rounded-xl bg-case p-1.5">
                <RackKeys active={!!pickedPatch} held={held} octave={octave} onNoteOn={(n) => void noteOn(n)} onNoteOff={noteOff} />
              </div>
              {!pickedPatch && <p className="text-xs text-muted">แตะเสียงในช่องก่อน แล้วกดคีย์หรือปุ่ม A–K เพื่อฟัง</p>}
            </div>
          )}
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
