"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** A vertical slider. Drag the cap or anywhere on the track, or use the arrow keys. `value` runs from 0 to 1. */
export function Fader({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = track.current?.getBoundingClientRect();
    if (!box) return;
    onChange(clamp(1 - (event.clientY - box.top) / box.height));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const up = event.key === "ArrowUp" || event.key === "ArrowRight";
    const down = event.key === "ArrowDown" || event.key === "ArrowLeft";
    if (!up && !down) return;
    event.preventDefault();
    onChange(clamp(value + (up ? 0.05 : -0.05)));
  };

  return (
    <span className="flex flex-col items-center gap-1">
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={hint}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragging.current = true;
          fromPointer(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) fromPointer(event);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onKeyDown={onKeyDown}
        className="rack-fader"
      >
        <span className="rack-fader-cap" style={{ bottom: `calc(${value} * (100% - 0.9rem))` }} />
      </div>
      <span className="rack-label">{label}</span>
      <span className="rack-hint">{hint}</span>
    </span>
  );
}
