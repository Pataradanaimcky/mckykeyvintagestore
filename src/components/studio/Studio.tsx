"use client";

import { parse } from "@audio/synth-dx7";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { FM_PRESETS } from "@/components/rack/fm/presets";
import { LiveScope } from "@/components/rack/LiveScope";
import { KEYS } from "@/components/rack/patch";
import { POLY_PROGRAMS } from "@/components/rack/poly/voices";
import {
  decodeArrangement,
  encodeArrangement,
  fitToMachine,
  movePart,
  newPart,
  parseArrangement,
  routeNote,
  setupSheet,
  starterArrangement,
  twoPartMode,
  type Arrangement,
  type Part,
  type PreviewSource,
} from "@/lib/studio/arrangement";
import { getMachine, keyboardRange, MACHINES, noteName, type MachineId } from "@/lib/studio/machines";
import { KeyMap } from "./KeyMap";
import { StudioSound } from "./studioSound";
import { useMidi } from "./useMidi";

const STORAGE_KEY = "mcky-studio-v1";
const CATEGORIES = ["Piano", "E.Piano", "Organ", "Strings", "Brass", "Pad", "Synth Lead", "Synth Pad", "Bass", "Bell", "Choir", "Guitar", "Drum", "FX"];

type Target = "web" | "usb" | "both";

interface UserVoice {
  name: string;
  data: string;
}

const toBase64 = (bytes: Uint8Array) => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

/** The arrangement to open with: a shared link first, then the last one on this device, else a starter. */
function initialArrangement(): Arrangement {
  try {
    const match = window.location.hash.match(/a=([A-Za-z0-9_-]+)/);
    if (match) {
      const shared = decodeArrangement(match[1]);
      if (shared) return shared;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseArrangement(JSON.parse(saved));
      if (parsed) return parsed;
    }
  } catch {
    // Storage blocked or bad data: start fresh.
  }
  return starterArrangement();
}

const sourceValue = (s: PreviewSource, voices: UserVoice[]) => {
  if (s.engine === "fm") return `fm:${s.preset}`;
  if (s.engine === "poly") return `poly:${s.program}`;
  if (s.engine === "syx") return `syx:${voices.findIndex((v) => v.data === s.data)}`;
  return "none";
};

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const safeName = (title: string) => title.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-|-$/g, "") || "sound";

/**
 * The studio: arrange the parts of a layered sound for a hardware keyboard,
 * hear it in the browser or on the keyboard itself over USB, then download it
 * or a setup sheet in the keyboard's own words.
 */
export function Studio() {
  const [arr, setArr] = useState<Arrangement>(initialArrangement);
  const [selected, setSelected] = useState(0);
  const [userVoices, setUserVoices] = useState<UserVoice[]>(() =>
    arr.parts.flatMap((p) => (p.preview.engine === "syx" ? [{ name: p.preview.name, data: p.preview.data }] : [])),
  );
  const [target, setTarget] = useState<Target>("web");
  const [octave, setOctave] = useState(0);
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const sound = useRef<StudioSound | null>(null);
  const active = useRef(new Map<number, { partId: string; note: number; channel: number }[]>());
  const arrRef = useRef(arr);
  const fileRef = useRef<HTMLInputElement>(null);
  const syxRef = useRef<HTMLInputElement>(null);
  const dragFrom = useRef<number | null>(null);
  // Sends bytes to the chosen USB/MIDI output (set once the MIDI hook below exists).
  const sendRef = useRef<(bytes: number[]) => boolean>(() => false);

  const machine = getMachine(arr.machine);
  const range = keyboardRange(arr.keys);
  const labels = arr.parts.map((_, i) => machine.partNames?.[i] ?? `${machine.terms.part} ${i + 1}`);
  const part: Part | undefined = arr.parts[Math.min(selected, arr.parts.length - 1)];
  const sheet = useMemo(() => setupSheet(arr), [arr]);

  // Remember the arrangement on this device, and keep the browser sound in step with it.
  useEffect(() => {
    arrRef.current = arr;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // Storage blocked: nothing to do.
    }
    if (sound.current?.ctx) void sound.current.sync(arr.parts, getMachine(arr.machine).levelMax);
  }, [arr]);

  useEffect(() => () => sound.current?.close(), []);

  const update = (index: number, change: Partial<Part>) =>
    setArr((a) => ({ ...a, parts: a.parts.map((p, i) => (i === index ? { ...p, ...change } : p)) }));

  const playNote = useCallback(
    async (note: number, velocity: number) => {
      setHeld((h) => new Set(h).add(note));
      const current = arrRef.current;
      const m = getMachine(current.machine);
      const routes = routeNote(current, note, velocity);
      const sent: { partId: string; note: number; channel: number }[] = [];
      if (target !== "web") {
        if (m.multiChannel) {
          for (const r of routes) {
            sendRef.current([0x90 | (r.part.channel - 1), r.note, velocity]);
            sent.push({ partId: "", note: r.note, channel: r.part.channel });
          }
        } else {
          // The keyboard splits by itself: send the note as played.
          sendRef.current([0x90, note, velocity]);
          sent.push({ partId: "", note, channel: 1 });
        }
      }
      if (target !== "usb") {
        if (!sound.current) sound.current = new StudioSound();
        const s = sound.current;
        if (!s.ctx) {
          await s.start();
          setAnalyser(s.analyser);
          await s.sync(current.parts, m.levelMax);
        }
        for (const r of routes) {
          s.noteOn(r.part.id, r.note, velocity);
          sent.push({ partId: r.part.id, note: r.note, channel: 0 });
        }
      }
      active.current.set(note, [...(active.current.get(note) ?? []), ...sent]);
    },
    [target],
  );

  const stopNote = useCallback((note: number) => {
    setHeld((h) => {
      const next = new Set(h);
      next.delete(note);
      return next;
    });
    for (const v of active.current.get(note) ?? []) {
      if (v.partId) sound.current?.noteOff(v.partId, v.note);
      else sendRef.current([0x80 | (v.channel - 1), v.note, 0]);
    }
    active.current.delete(note);
  }, []);

  const midi = useMidi((note, velocity, on) => (on ? void playNote(note, velocity) : stopNote(note)));
  const midiSend = midi.send;
  useEffect(() => {
    sendRef.current = midiSend;
  }, [midiSend]);

  // Computer keys A–K play an octave from middle C.
  useEffect(() => {
    const byKey = new Map(KEYS.map((k) => [k.key, k.midi]));
    const down = new Map<string, number>();
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const k = e.key.toLowerCase();
      const base = byKey.get(k);
      if (base === undefined || down.has(k)) return;
      const note = base + octave * 12;
      down.set(k, note);
      void playNote(note, 100);
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const note = down.get(k);
      if (note === undefined) return;
      down.delete(k);
      stopNote(note);
    };
    const all = () => {
      down.forEach((n) => stopNote(n));
      down.clear();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", all);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", all);
      all();
    };
  }, [octave, playNote, stopNote]);

  const panic = () => {
    sound.current?.allOff();
    for (let ch = 0; ch < 16; ch++) sendRef.current([0xb0 | ch, 123, 0]);
    active.current.clear();
    setHeld(new Set());
  };

  const switchMachine = (id: MachineId) => {
    const next = fitToMachine(arr, id);
    if (next.parts.length < arr.parts.length) {
      setMessage(`${getMachine(id).name} รวมได้ ${getMachine(id).maxParts} พาร์ต จึงเก็บไว้แค่ ${next.parts.length} พาร์ตแรก`);
    } else setMessage(null);
    setArr(next);
    setSelected(0);
  };

  const addPart = () => {
    if (arr.parts.length >= machine.maxParts) return;
    setArr((a) => ({ ...a, parts: [...a.parts, newPart(machine, a.keys, a.parts.length)] }));
    setSelected(arr.parts.length);
  };

  const removePart = (index: number) => {
    setArr((a) => ({ ...a, parts: a.parts.filter((_, i) => i !== index) }));
    setSelected((s) => Math.max(0, s >= index ? s - 1 : s));
  };

  const reorder = (from: number, to: number) => {
    setArr((a) => ({
      ...a,
      // On these keyboards part N listens on channel N, so channels follow the new order.
      parts: movePart(a.parts, from, to).map((p, i) => (machine.multiChannel ? { ...p, channel: i + 1 } : p)),
    }));
    setSelected(to);
  };

  const sendLevels = () => {
    if (!machine.multiChannel) {
      setMessage("รุ่นนี้รับค่าแยกพาร์ตทาง USB ไม่ได้ ใช้ใบตั้งค่าแทน");
      return;
    }
    let ok = true;
    for (const p of arr.parts) {
      const level = Math.round((p.level / machine.levelMax) * 127);
      ok = midi.send([0xb0 | (p.channel - 1), 7, p.on ? level : 0]) && ok;
      midi.send([0xb0 | (p.channel - 1), 10, Math.min(127, Math.max(0, p.pan + 64))]);
    }
    setMessage(ok ? "ส่ง Level และ Pan ของทุกพาร์ตไปที่เครื่องแล้ว" : "ยังไม่ได้เลือกพอร์ต USB/MIDI ขาออก");
  };

  const share = async () => {
    const url = `${window.location.origin}/studio#a=${encodeArrangement(arr)}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("คัดลอกลิงก์แล้ว ส่งให้เพื่อนเปิดได้เลย");
    } catch {
      window.history.replaceState(null, "", url);
      setMessage("ลิงก์อยู่ในแถบที่อยู่ด้านบนแล้ว");
    }
  };

  const openFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 200_000) return setMessage("ไฟล์ใหญ่เกินไป");
    try {
      const next = parseArrangement(JSON.parse(await file.text()));
      if (!next) throw new Error("bad");
      setArr(next);
      setSelected(0);
      setUserVoices((v) => [
        ...v,
        ...next.parts.flatMap((p) => (p.preview.engine === "syx" ? [{ name: p.preview.name, data: p.preview.data }] : [])),
      ]);
      setMessage(`เปิด ${file.name} แล้ว`);
    } catch {
      setMessage("ไฟล์นี้ไม่ใช่ไฟล์จากสตูดิโอนี้");
    }
  };

  const openSyx = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 64 * 1024) return setMessage("ไฟล์ใหญ่เกินไป ไฟล์ .syx ของ DX7 ปกติไม่เกิน 4 KB");
    try {
      const voices = parse(new Uint8Array(await file.arrayBuffer())).map((v) => ({
        name: v.name || "VOICE",
        data: toBase64(v.patch),
      }));
      setUserVoices((current) => [...current, ...voices].slice(-64));
      setMessage(`เพิ่ม ${voices.length} เสียง FM จาก ${file.name} ในรายการเสียงตัวอย่างแล้ว`);
    } catch {
      setMessage("อ่านไฟล์นี้ไม่ได้ ใช้ไฟล์ .syx ของ DX7");
    }
  };

  const setSource = (index: number, value: string) => {
    const [kind, n] = value.split(":");
    const i = Number(n);
    const preview: PreviewSource =
      kind === "fm"
        ? { engine: "fm", preset: i }
        : kind === "poly"
          ? { engine: "poly", program: i }
          : kind === "syx" && userVoices[i]
            ? { engine: "syx", name: userVoices[i].name, data: userVoices[i].data }
            : { engine: "none" };
    update(index, { preview });
  };

  const sourceName = (s: PreviewSource) =>
    s.engine === "fm"
      ? FM_PRESETS[s.preset]?.name
      : s.engine === "poly"
        ? `POLY ${POLY_PROGRAMS[s.program]?.name}`
        : s.engine === "syx"
          ? `FM ${s.name}`
          : "ไม่มีเสียงตัวอย่าง";

  const notesInRange: number[] = [];
  for (let n = range.lo; n <= range.hi; n++) notesInRange.push(n);
  const mode = machine.maxParts === 2 ? twoPartMode(arr.parts) : null;

  const sourceSelect = (index: number, value: PreviewSource, id?: string) => (
    <select
      id={id}
      className="studio-input"
      value={sourceValue(value, userVoices)}
      onChange={(e) => setSource(index, e.target.value)}
      aria-label="เสียงตัวอย่างในเว็บ"
    >
      <optgroup label="FM 6-OP (เข้ากับไฟล์ DX7)">
        {FM_PRESETS.map((p, i) => (
          <option key={p.name} value={`fm:${i}`}>
            {p.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="POLY (อนาล็อกยุค 80)">
        {POLY_PROGRAMS.map((p, i) => (
          <option key={p.name} value={`poly:${i}`}>
            POLY {p.name}
          </option>
        ))}
      </optgroup>
      {userVoices.length > 0 && (
        <optgroup label="ไฟล์ .syx ของคุณ">
          {userVoices.map((v, i) => (
            <option key={`${v.data}${i}`} value={`syx:${i}`}>
              FM {v.name}
            </option>
          ))}
        </optgroup>
      )}
      <option value="none">ไม่มีเสียงตัวอย่าง</option>
    </select>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Keyboard choice */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" aria-label="เลือกรุ่นคีย์บอร์ด" className="rack-tabs">
          {MACHINES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === arr.machine}
              onClick={() => switchMachine(m.id)}
              className="rack-tab"
            >
              {m.short}
              <span className="rack-tab-note">
                {m.maxParts} {m.terms.part === "Zone" ? "โซน" : "พาร์ต"}
                {m.verified ? "" : " · รอยืนยัน"}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted">
            ขนาด
            <select
              className="studio-input w-auto"
              value={arr.keys}
              onChange={(e) => setArr((a) => fitToMachine(a, a.machine, Number(e.target.value)))}
            >
              {machine.keySizes.map((k) => (
                <option key={k} value={k}>
                  {k} คีย์
                </option>
              ))}
            </select>
          </label>
          <input
            className="studio-input w-48"
            value={arr.title}
            maxLength={40}
            onChange={(e) => setArr((a) => ({ ...a, title: e.target.value }))}
            aria-label={`ชื่อ ${machine.terms.set}`}
          />
        </div>
      </div>

      <p className="text-sm text-muted">
        <span className="font-semibold text-ink">{machine.name}</span> · {machine.about}
        {mode && (
          <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs text-ink">
            {mode.mode}
            {mode.splitPoint !== undefined ? ` · จุดแบ่ง ${noteName(mode.splitPoint, machine.naming)}` : ""}
          </span>
        )}
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Part list, styled like the keyboard's screen */}
        <section className="studio-screen" aria-label={`รายการ ${machine.terms.part}`}>
          <div className="studio-screen-head">
            <span>
              {machine.terms.set.toUpperCase()} · {arr.title}
            </span>
            <span>
              {arr.parts.length}/{machine.maxParts}
            </span>
          </div>
          <ol className="flex flex-col">
            {arr.parts.map((p, i) => (
              <li
                key={p.id}
                draggable
                onDragStart={() => {
                  dragFrom.current = i;
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragFrom.current !== null) reorder(dragFrom.current, i);
                  dragFrom.current = null;
                }}
                className={`studio-row ${i === selected ? "is-selected" : ""} ${p.on ? "" : "is-off"}`}
              >
                <span className="studio-grip" aria-hidden="true">
                  ⋮⋮
                </span>
                <button type="button" className="studio-row-main" onClick={() => setSelected(i)} aria-current={i === selected}>
                  <span className={`studio-chip part-c${i % 8}`}>{labels[i].replace(/^(Part|Zone|Tone) /, "")}</span>
                  <span className="min-w-0 flex-1 truncate text-left">
                    <span className="block truncate">{p.sound || p.category || "ยังไม่ได้ตั้งชื่อเสียง"}</span>
                    <span className="studio-row-sub block truncate">
                      {noteName(p.lo, machine.naming)}–{noteName(p.hi, machine.naming)} · {sourceName(p.preview)}
                    </span>
                  </span>
                  <span className="studio-meter" aria-label={`${machine.terms.level} ${p.level}`}>
                    <i style={{ width: `${(p.level / machine.levelMax) * 100}%` }} />
                  </span>
                </button>
                <button
                  type="button"
                  className={`studio-pill ${p.on ? "is-on" : ""}`}
                  aria-pressed={p.on}
                  onClick={() => update(i, { on: !p.on })}
                >
                  {p.on ? "ON" : "OFF"}
                </button>
                <span className="flex flex-col">
                  <button type="button" className="studio-arrow" onClick={() => reorder(i, i - 1)} disabled={i === 0} aria-label={`เลื่อน ${labels[i]} ขึ้น`}>
                    ▲
                  </button>
                  <button
                    type="button"
                    className="studio-arrow"
                    onClick={() => reorder(i, i + 1)}
                    disabled={i === arr.parts.length - 1}
                    aria-label={`เลื่อน ${labels[i]} ลง`}
                  >
                    ▼
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <button type="button" className="studio-add" onClick={addPart} disabled={arr.parts.length >= machine.maxParts}>
            + เพิ่ม{machine.terms.part === "Zone" ? "โซน" : "พาร์ต"}
          </button>
        </section>

        {/* Edit the selected part */}
        {part && (
          <section className="studio-panel" aria-label={`แก้ ${labels[selected]}`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <span className={`studio-chip part-c${selected % 8}`}>{labels[selected]}</span>
              </h2>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="studio-btn"
                  disabled={arr.parts.length >= machine.maxParts}
                  onClick={() => {
                    setArr((a) => ({
                      ...a,
                      parts: [...a.parts, { ...part, id: `${part.id}c${a.parts.length}`, channel: Math.min(16, a.parts.length + 1) }],
                    }));
                    setSelected(arr.parts.length);
                  }}
                >
                  ทำซ้ำ
                </button>
                <button type="button" className="studio-btn" onClick={() => removePart(selected)} disabled={arr.parts.length <= 1}>
                  ลบ
                </button>
              </div>
            </div>

            <label className="studio-field">
              <span>ชื่อเสียงในเครื่อง</span>
              <input
                className="studio-input"
                value={part.sound}
                maxLength={40}
                placeholder="เช่น ชื่อพรีเซ็ตที่เลือกบนเครื่อง"
                onChange={(e) => update(selected, { sound: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="studio-field">
                <span>หมวด</span>
                <input
                  className="studio-input"
                  list="studio-categories"
                  value={part.category}
                  maxLength={20}
                  onChange={(e) => update(selected, { category: e.target.value })}
                />
                <datalist id="studio-categories">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className="studio-field" htmlFor="studio-source">
                <span>เสียงตัวอย่างในเว็บ</span>
                {sourceSelect(selected, part.preview, "studio-source")}
              </label>
            </div>

            <label className="studio-field">
              <span>
                {machine.terms.level} <b>{part.level}</b>
              </span>
              <input
                type="range"
                min={0}
                max={machine.levelMax}
                value={part.level}
                onChange={(e) => update(selected, { level: Number(e.target.value) })}
              />
            </label>
            <label className="studio-field">
              <span>
                {machine.terms.pan} <b>{part.pan === 0 ? "C" : part.pan < 0 ? `L${-part.pan}` : `R${part.pan}`}</b>
              </span>
              <input type="range" min={-64} max={63} value={part.pan} onChange={(e) => update(selected, { pan: Number(e.target.value) })} />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="studio-field">
                <span>{machine.terms.keyRange} ต่ำ</span>
                <select className="studio-input" value={part.lo} onChange={(e) => update(selected, { lo: Math.min(Number(e.target.value), part.hi) })}>
                  {notesInRange.map((n) => (
                    <option key={n} value={n}>
                      {noteName(n, machine.naming)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="studio-field">
                <span>{machine.terms.keyRange} สูง</span>
                <select className="studio-input" value={part.hi} onChange={(e) => update(selected, { hi: Math.max(Number(e.target.value), part.lo) })}>
                  {notesInRange.map((n) => (
                    <option key={n} value={n}>
                      {noteName(n, machine.naming)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="studio-field">
                <span>{machine.terms.velocityRange} ต่ำ</span>
                <input
                  type="number"
                  className="studio-input"
                  min={1}
                  max={part.velHi}
                  value={part.velLo}
                  onChange={(e) => update(selected, { velLo: Math.min(part.velHi, Math.max(1, Number(e.target.value) || 1)) })}
                />
              </label>
              <label className="studio-field">
                <span>{machine.terms.velocityRange} สูง</span>
                <input
                  type="number"
                  className="studio-input"
                  min={part.velLo}
                  max={127}
                  value={part.velHi}
                  onChange={(e) => update(selected, { velHi: Math.max(part.velLo, Math.min(127, Number(e.target.value) || 127)) })}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="studio-field">
                <span>{machine.terms.octave}</span>
                <div className="flex items-center gap-1" role="group" aria-label={machine.terms.octave}>
                  {[-3, -2, -1, 0, 1, 2, 3].map((o) => (
                    <button
                      key={o}
                      type="button"
                      className={`studio-pill ${part.octave === o ? "is-on" : ""}`}
                      aria-pressed={part.octave === o}
                      onClick={() => update(selected, { octave: o })}
                    >
                      {o > 0 ? `+${o}` : o}
                    </button>
                  ))}
                </div>
              </div>
              {machine.multiChannel && (
                <label className="studio-field">
                  <span>MIDI ch</span>
                  <select className="studio-input w-20" value={part.channel} onChange={(e) => update(selected, { channel: Number(e.target.value) })}>
                    {Array.from({ length: 16 }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Keyboard map */}
      <section className="studio-panel" aria-label="แผนที่คีย์บอร์ด">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">แผนที่คีย์บอร์ด</h2>
          <p className="text-xs text-muted">ลากปลายแถบเพื่อตั้งจุดแบ่ง · ลากกลางแถบเพื่อเลื่อนทั้งช่วง · กดคีย์ หรือปุ่ม A–K เพื่อฟัง</p>
        </div>
        <KeyMap
          lo={range.lo}
          hi={range.hi}
          naming={machine.naming}
          parts={arr.parts}
          labels={labels}
          selected={selected}
          held={held}
          onSelect={setSelected}
          onRange={(i, lo, hi) => update(i, { lo, hi })}
          onNoteOn={(n, v) => void playNote(n, v)}
          onNoteOff={stopNote}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1" role="group" aria-label="เสียงออกที่">
            <span className="mr-1 text-sm text-muted">เสียงออกที่</span>
            {(
              [
                ["web", "เว็บ"],
                ["usb", "คีย์บอร์ด (USB)"],
                ["both", "ทั้งคู่"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={target === value}
                className={`studio-pill ${target === value ? "is-on" : ""}`}
                onClick={() => {
                  panic();
                  setTarget(value);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="ออกเทฟของปุ่ม A–K">
            <span className="mr-1 text-sm text-muted">ปุ่ม A–K</span>
            <button type="button" className="studio-pill" onClick={() => setOctave((o) => Math.max(-3, o - 1))} aria-label="ลดออกเทฟ">
              −
            </button>
            <span className="w-16 text-center text-sm">{noteName(60 + octave * 12, machine.naming)}</span>
            <button type="button" className="studio-pill" onClick={() => setOctave((o) => Math.min(3, o + 1))} aria-label="เพิ่มออกเทฟ">
              +
            </button>
          </div>
          <button type="button" className="studio-btn" onClick={panic}>
            หยุดทุกเสียง
          </button>
          <div className="min-w-40 flex-1">
            <LiveScope analyser={analyser} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {/* USB */}
        <section className="studio-panel" aria-label="ต่อคีย์บอร์ดผ่าน USB">
          <h2 className="font-bold">ต่อคีย์บอร์ดผ่าน USB</h2>
          {midi.status !== "on" ? (
            <>
              <p className="text-sm text-muted">
                เสียบสาย USB จากคีย์บอร์ดเข้าคอม แล้วกดเชื่อมต่อ ใช้ได้กับ Chrome และ Edge บนคอม (Safari และ iPhone ยังไม่รองรับ)
              </p>
              <button type="button" className="studio-btn self-start" onClick={() => void midi.connect()}>
                {midi.status === "asking" ? "กำลังขออนุญาต…" : "เชื่อมต่อ USB / MIDI"}
              </button>
              {midi.status === "unsupported" && <p className="text-sm text-sale">เบราว์เซอร์นี้ยังไม่รองรับ USB MIDI ลองเปิดด้วย Chrome บนคอม</p>}
              {midi.status === "denied" && <p className="text-sm text-sale">เบราว์เซอร์ไม่อนุญาต ลองกดอนุญาตที่แถบที่อยู่แล้วกดใหม่</p>}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="studio-field">
                  <span>รับโน้ตจาก</span>
                  <select className="studio-input" value={midi.inputId} onChange={(e) => midi.setInputId(e.target.value)}>
                    <option value="">ไม่รับ</option>
                    {midi.inputs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="studio-field">
                  <span>ส่งไปที่</span>
                  <select className="studio-input" value={midi.outputId} onChange={(e) => midi.setOutputId(e.target.value)}>
                    <option value="">ไม่ส่ง</option>
                    {midi.outputs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-sm text-muted">{machine.usbHint}</p>
              <p className="text-xs text-muted">
                ถ้าเล่นจากคีย์บอร์ดตัวเดียวกับที่ส่งเสียงออก ให้เลือก “เสียงออกที่ เว็บ” หรือปิด Local Control บนเครื่อง เพื่อไม่ให้เสียงซ้อนกัน
              </p>
              <button type="button" className="studio-btn self-start" onClick={sendLevels}>
                ส่ง {machine.terms.level} และ {machine.terms.pan} ไปที่เครื่อง
              </button>
            </>
          )}
        </section>

        {/* Files */}
        <section className="studio-panel" aria-label="บันทึกและแชร์">
          <h2 className="font-bold">บันทึกและแชร์</h2>
          <p className="text-sm text-muted">
            งานบันทึกในเครื่องนี้อัตโนมัติ ดาวน์โหลดไฟล์ไว้เปิดต่อ หรือใบตั้งค่าไว้ทำตามบนคีย์บอร์ด
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="studio-btn" onClick={() => download(`${safeName(arr.title)}.mcky.json`, JSON.stringify(arr, null, 2), "application/json")}>
              ดาวน์โหลดไฟล์งาน
            </button>
            <button type="button" className="studio-btn" onClick={() => download(`${safeName(arr.title)}-setup.txt`, sheet, "text/plain;charset=utf-8")}>
              ดาวน์โหลดใบตั้งค่า
            </button>
            <button type="button" className="studio-btn" onClick={() => window.print()}>
              พิมพ์ใบตั้งค่า
            </button>
            <button type="button" className="studio-btn" onClick={() => void share()}>
              คัดลอกลิงก์แชร์
            </button>
            <button type="button" className="studio-btn" onClick={() => fileRef.current?.click()}>
              เปิดไฟล์งาน
            </button>
            <button type="button" className="studio-btn" onClick={() => syxRef.current?.click()}>
              เพิ่มเสียงจาก .syx
            </button>
            <button
              type="button"
              className="studio-btn"
              onClick={() => {
                setArr(starterArrangement(arr.machine));
                setSelected(0);
              }}
            >
              เริ่มใหม่
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label="เปิดไฟล์งาน" onChange={(e) => void openFile(e)} />
          <input ref={syxRef} type="file" accept=".syx,application/octet-stream" className="sr-only" tabIndex={-1} aria-label="เลือกไฟล์ .syx" onChange={(e) => void openSyx(e)} />
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">ดูใบตั้งค่า</summary>
            <pre className="studio-sheet mt-2">{sheet}</pre>
          </details>
        </section>
      </div>

      <p className="min-h-5 text-sm text-muted" aria-live="polite">
        {message}
      </p>

      {/* What gets printed */}
      <pre className="studio-print" aria-hidden="true">
        {sheet}
      </pre>
    </div>
  );
}
