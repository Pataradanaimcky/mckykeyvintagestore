"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** A rotary control. Drag up or down, or use the arrow keys. `value` runs from 0 to 1. */
export function Knob({
  label,
  hint,
  value,
  onChange,
  steps,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  /** Number of fixed positions, for a switch-like knob. */
  steps?: number;
}) {
  const drag = useRef<{ y: number; value: number } | null>(null);
  const snap = (n: number) => (steps ? Math.round(clamp(n) * (steps - 1)) / (steps - 1) : clamp(n));
  const nudge = steps ? 1 / (steps - 1) : 0.05;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, value };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    onChange(snap(drag.current.value + (drag.current.y - event.clientY) / 110));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const up = event.key === "ArrowUp" || event.key === "ArrowRight";
    const down = event.key === "ArrowDown" || event.key === "ArrowLeft";
    if (!up && !down) return;
    event.preventDefault();
    onChange(snap(value + (up ? nudge : -nudge)));
  };

  return (
    <span className="flex flex-col items-center gap-1">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={hint}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="rack-knob"
        style={{ transform: `rotate(${-135 + value * 270}deg)` }}
      />
      <span className="rack-label">{label}</span>
      <span className="rack-hint">{hint}</span>
    </span>
  );
}
