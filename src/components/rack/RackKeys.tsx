"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { KEYS } from "./patch";

const WHITE_COUNT = KEYS.filter((k) => !k.black).length;

/**
 * One-octave keyboard shared by every page of the rack. Plays chords with
 * several fingers or computer keys (A W S E D F T G Y H U J K), and slides
 * from key to key while a finger or the mouse is held down.
 *
 * Notes are MIDI numbers. `octave` shifts what the keys play.
 */
export function RackKeys({
  active,
  held,
  octave = 0,
  onNoteOn,
  onNoteOff,
}: {
  /** Only the visible rack page listens to the computer keyboard. */
  active: boolean;
  /** Notes currently sounding, to light the keys. */
  held: ReadonlySet<number>;
  octave?: number;
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
}) {
  const shift = octave * 12;
  // Which note each finger or mouse pointer is holding.
  const pointers = useRef(new Map<number, number>());
  // Keep the latest callbacks for the window listeners without re-binding them.
  const handlers = useRef({ onNoteOn, onNoteOff, shift });
  useEffect(() => {
    handlers.current = { onNoteOn, onNoteOff, shift };
  });

  // Computer keyboard.
  useEffect(() => {
    if (!active) return;
    const byKey = new Map(KEYS.map((k) => [k.key, k.midi]));
    const down = new Map<string, number>();
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    const onDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      const k = event.key.toLowerCase();
      const midi = byKey.get(k);
      if (midi === undefined || down.has(k)) return;
      const note = midi + handlers.current.shift;
      down.set(k, note);
      handlers.current.onNoteOn(note);
    };
    const onUp = (event: KeyboardEvent) => {
      const k = event.key.toLowerCase();
      const note = down.get(k);
      if (note === undefined) return;
      down.delete(k);
      handlers.current.onNoteOff(note);
    };
    const releaseAll = () => {
      down.forEach((note) => handlers.current.onNoteOff(note));
      down.clear();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [active]);

  // Letting go anywhere on the page ends that finger's note.
  useEffect(() => {
    const map = pointers.current;
    const release = (event: PointerEvent) => {
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
      map.forEach((note) => handlers.current.onNoteOff(note));
      map.clear();
    };
  }, []);

  return (
    <div className="rack-keybed" role="group" aria-label="คีย์บอร์ดสำหรับลองเล่น">
      {KEYS.map((k, index) => {
        const note = k.midi + shift;
        const whiteBefore = KEYS.slice(0, index).filter((x) => !x.black).length;
        const style = k.black
          ? ({ left: `calc(${(whiteBefore / WHITE_COUNT) * 100}% - var(--black-w) / 2)` } as CSSProperties)
          : undefined;
        return (
          <button
            key={k.midi}
            type="button"
            aria-label={`โน้ต ${k.note} (ปุ่ม ${k.key.toUpperCase()})`}
            aria-pressed={held.has(note)}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              // Release capture so the finger can slide onto the next key.
              event.currentTarget.releasePointerCapture?.(event.pointerId);
              pointers.current.set(event.pointerId, note);
              onNoteOn(note);
            }}
            onPointerEnter={(event) => {
              const current = pointers.current.get(event.pointerId);
              if (current === undefined || current === note) return;
              onNoteOff(current);
              pointers.current.set(event.pointerId, note);
              onNoteOn(note);
            }}
            onKeyDown={(event) => {
              if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
                event.preventDefault();
                onNoteOn(note);
              }
            }}
            onKeyUp={(event) => {
              if (event.key === "Enter" || event.key === " ") onNoteOff(note);
            }}
            className={k.black ? "rack-key rack-key-black" : "rack-key rack-key-white"}
            style={style}
          >
            <span className="rack-key-hint" aria-hidden="true">
              {k.key.toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Small − / + buttons that move the keyboard by an octave. */
export function OctaveSwitch({ octave, onChange }: { octave: number; onChange: (octave: number) => void }) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="เลื่อนออกเทฟ">
      <button
        type="button"
        className="rack-mini"
        onClick={() => onChange(Math.max(-2, octave - 1))}
        disabled={octave <= -2}
        aria-label="ลดออกเทฟ"
      >
        −
      </button>
      <span className="rack-hint w-12 text-center">OCT {octave > 0 ? `+${octave}` : octave}</span>
      <button
        type="button"
        className="rack-mini"
        onClick={() => onChange(Math.min(2, octave + 1))}
        disabled={octave >= 2}
        aria-label="เพิ่มออกเทฟ"
      >
        +
      </button>
    </div>
  );
}

export const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12);
