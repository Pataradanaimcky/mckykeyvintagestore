"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import type { Part } from "@/lib/studio/arrangement";
import { isBlack, noteName, type NoteNaming } from "@/lib/studio/machines";

interface Props {
  lo: number;
  hi: number;
  naming: NoteNaming;
  parts: Part[];
  labels: string[];
  selected: number;
  held: ReadonlySet<number>;
  onSelect: (index: number) => void;
  onRange: (index: number, lo: number, hi: number) => void;
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
}

/**
 * The whole keyboard with one lane per part above it. Each lane is a bar over
 * the keys that part plays: drag its ends to move the split points, drag the
 * middle to slide the whole range. The keys below play the arrangement.
 */
export function KeyMap({ lo, hi, naming, parts, labels, selected, held, onSelect, onRange, onNoteOn, onNoteOff }: Props) {
  const notes: number[] = [];
  for (let n = lo; n <= hi; n++) notes.push(n);
  const whites = notes.filter((n) => !isBlack(n));
  const W = whites.length;
  const whiteIndex = new Map(whites.map((n, i) => [n, i]));
  const left = (n: number) => (isBlack(n) ? ((whiteIndex.get(n - 1) ?? 0) + 0.68) / W : (whiteIndex.get(n) ?? 0) / W);
  const right = (n: number) => (isBlack(n) ? ((whiteIndex.get(n - 1) ?? 0) + 1.32) / W : ((whiteIndex.get(n) ?? 0) + 1) / W);

  const lanes = useRef<HTMLDivElement>(null);
  const drag = useRef<{ index: number; edge: "lo" | "hi" | "move"; start: number; lo: number; hi: number } | null>(null);

  /** The note under a horizontal position from 0 to 1. */
  const noteAt = (f: number) => {
    const w = whites[Math.min(W - 1, Math.max(0, Math.floor(f * W)))];
    for (const b of [w + 1, w - 1]) if (b >= lo && b <= hi && isBlack(b) && f >= left(b) && f <= right(b)) return b;
    return w;
  };
  const fraction = (event: PointerEvent) => {
    const box = lanes.current?.getBoundingClientRect();
    return box ? (event.clientX - box.left) / box.width : 0;
  };

  const onLaneDown = (index: number, edge: "lo" | "hi" | "move") => (event: PointerEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    lanes.current?.setPointerCapture(event.pointerId);
    onSelect(index);
    drag.current = { index, edge, start: noteAt(fraction(event)), lo: parts[index].lo, hi: parts[index].hi };
  };
  const onLaneMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const n = noteAt(fraction(event));
    if (d.edge === "lo") onRange(d.index, Math.min(n, d.hi), d.hi);
    else if (d.edge === "hi") onRange(d.index, d.lo, Math.max(n, d.lo));
    else {
      const shift = Math.min(hi - d.hi, Math.max(lo - d.lo, n - d.start));
      onRange(d.index, d.lo + shift, d.hi + shift);
    }
  };
  const onLaneUp = () => {
    drag.current = null;
  };

  // Keys: which note each finger or the mouse is holding.
  const pointers = useRef(new Map<number, number>());
  const handlers = useRef({ onNoteOn, onNoteOff });
  useEffect(() => {
    handlers.current = { onNoteOn, onNoteOff };
  });
  useEffect(() => {
    const map = pointers.current;
    const release = (event: globalThis.PointerEvent) => {
      const note = map.get(event.pointerId);
      if (note === undefined) return;
      map.delete(event.pointerId);
      handlers.current.onNoteOff(note);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, []);

  const keyDown = (note: number) => (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    // Lower on the key is louder, like pressing harder.
    const box = event.currentTarget.getBoundingClientRect();
    const velocity = Math.round(50 + 77 * Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)));
    pointers.current.set(event.pointerId, note);
    onNoteOn(note, velocity);
  };
  const keyEnter = (note: number) => (event: PointerEvent<HTMLButtonElement>) => {
    const current = pointers.current.get(event.pointerId);
    if (current === undefined || current === note) return;
    onNoteOff(current);
    pointers.current.set(event.pointerId, note);
    onNoteOn(note, 100);
  };

  const pct = (f: number) => `${(f * 100).toFixed(3)}%`;

  return (
    <div className="studio-keymap-scroll">
      <div className="studio-keymap" style={{ "--whites": W } as CSSProperties}>
        <div
          ref={lanes}
          className="studio-lanes"
          onPointerMove={onLaneMove}
          onPointerUp={onLaneUp}
          onPointerCancel={onLaneUp}
          role="group"
          aria-label="ช่วงคีย์ของแต่ละพาร์ต"
        >
          {parts.map((p, i) => (
            <div key={p.id} className="studio-lane">
              <div
                className={`studio-zone part-c${i % 8} ${i === selected ? "is-selected" : ""} ${p.on ? "" : "is-off"}`}
                style={{ left: pct(left(p.lo)), width: pct(right(p.hi) - left(p.lo)) }}
                onPointerDown={onLaneDown(i, "move")}
                title={`${labels[i]}: ${noteName(p.lo, naming)} – ${noteName(p.hi, naming)}`}
              >
                <span
                  className="studio-handle is-lo"
                  onPointerDown={onLaneDown(i, "lo")}
                  role="slider"
                  tabIndex={0}
                  aria-label={`${labels[i]} โน้ตต่ำสุด`}
                  aria-valuemin={lo}
                  aria-valuemax={p.hi}
                  aria-valuenow={p.lo}
                  aria-valuetext={noteName(p.lo, naming)}
                  onKeyDown={(event) => {
                    const by = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
                    if (!by) return;
                    event.preventDefault();
                    onRange(i, Math.min(p.hi, Math.max(lo, p.lo + by)), p.hi);
                  }}
                />
                <span className="studio-zone-label">
                  {labels[i]} · {noteName(p.lo, naming)}–{noteName(p.hi, naming)}
                </span>
                <span
                  className="studio-handle is-hi"
                  onPointerDown={onLaneDown(i, "hi")}
                  role="slider"
                  tabIndex={0}
                  aria-label={`${labels[i]} โน้ตสูงสุด`}
                  aria-valuemin={p.lo}
                  aria-valuemax={hi}
                  aria-valuenow={p.hi}
                  aria-valuetext={noteName(p.hi, naming)}
                  onKeyDown={(event) => {
                    const by = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
                    if (!by) return;
                    event.preventDefault();
                    onRange(i, p.lo, Math.max(p.lo, Math.min(hi, p.hi + by)));
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="studio-keys" role="group" aria-label="คีย์บอร์ด">
          {notes.map((n) => (
            <button
              key={n}
              type="button"
              tabIndex={-1}
              aria-label={noteName(n, naming)}
              aria-pressed={held.has(n)}
              className={isBlack(n) ? "studio-key is-black" : "studio-key"}
              style={isBlack(n) ? { left: pct(left(n)), width: pct(right(n) - left(n)) } : undefined}
              onPointerDown={keyDown(n)}
              onPointerEnter={keyEnter(n)}
            >
              {n % 12 === 0 && <span className="studio-key-name">{noteName(n, naming)}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
