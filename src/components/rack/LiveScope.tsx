"use client";

import { useEffect, useRef } from "react";

/**
 * Draws the real output of a rack page from an AnalyserNode. Before sound has
 * started (no analyser yet) it shows a flat line.
 */
export function LiveScope({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const trace = getComputedStyle(canvas).color;
    const data = analyser ? new Float32Array(analyser.fftSize) : null;
    let frame = 0;

    const draw = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * ratio) {
        canvas.width = w * ratio;
        canvas.height = h * ratio;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);

      let start = 0;
      if (analyser && data) {
        analyser.getFloatTimeDomainData(data);
        // Start on a rising zero crossing so the wave stands still.
        for (let i = 1; i < data.length / 2; i++) {
          if (data[i - 1] < 0 && data[i] >= 0) {
            start = i;
            break;
          }
        }
      }
      const span = data ? Math.min(data.length - start, 512) : 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const v = data ? data[start + Math.floor((x / w) * (span - 1))] : 0;
        ctx.lineTo(x, h / 2 - Math.max(-1, Math.min(1, v * 1.6)) * h * 0.45);
      }
      ctx.strokeStyle = trace;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.shadowColor = trace;
      ctx.shadowBlur = 6;
      ctx.stroke();
      if (analyser) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [analyser]);

  return <canvas ref={canvasRef} aria-hidden="true" className="rack-scope" />;
}
