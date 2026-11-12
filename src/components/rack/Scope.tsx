"use client";

import { useEffect, useRef } from "react";
import type { Route } from "./patch";

function sample(wave: string, t: number) {
  const x = t - Math.floor(t);
  if (wave === "square") return x < 0.5 ? 1 : -1;
  if (wave === "triangle") return 1 - 4 * Math.abs(x - 0.5);
  return 2 * x - 1;
}

/** A small screen that draws the wave the current patch would make. */
export function Scope({
  route,
  wave,
  cutoff,
  rate,
  note,
  playing,
}: {
  route: Route;
  wave: string;
  cutoff: number;
  rate: number;
  note: number;
  /** A key is held, so there is signal even without the sequencer. */
  playing: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const trace = getComputedStyle(canvas).color;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const draw = (ms: number) => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * ratio) {
        canvas.width = w * ratio;
        canvas.height = h * ratio;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const seconds = ms / 1000;
      const lfo = Math.sin(seconds * (0.2 + rate * 8) * Math.PI * 2);
      // A closed filter rounds the wave off towards a sine.
      let open = route.filtered ? cutoff : 1;
      if (route.lfoToFilter) open = Math.min(1, Math.max(0.05, open + lfo * 0.35));
      const cycles = (route.sequenced || playing ? note / 110 : 2.5) * (route.lfoToPitch ? 1 + lfo * 0.12 : 1);
      const level = route.audible ? 0.36 : 0.015;

      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const t = (x / w) * cycles + (still ? 0 : seconds * 0.6);
        const y = sample(wave, t) * open + Math.sin(t * Math.PI * 2) * (1 - open);
        ctx.lineTo(x, h / 2 - y * h * level);
      }
      ctx.strokeStyle = trace;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.shadowColor = trace;
      ctx.shadowBlur = 6;
      ctx.stroke();
      if (!still) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [route.audible, route.filtered, route.sequenced, route.lfoToFilter, route.lfoToPitch, wave, cutoff, rate, note, playing]);

  return <canvas ref={canvasRef} aria-hidden="true" className="rack-scope" />;
}
