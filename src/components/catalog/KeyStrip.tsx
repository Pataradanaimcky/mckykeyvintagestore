import type { CSSProperties } from "react";

const WHITE_KEYS = Array.from({ length: 14 }, (_, i) => i);
// Black keys sit after white keys 0,1,3,4,5 in every group of 7.
const BLACK_KEYS = WHITE_KEYS.filter((i) => [0, 1, 3, 4, 5].includes(i % 7) && i < 13);
// White keys that "play", with a stagger so it reads as a rolled chord.
const PLAYED: Record<number, number> = { 2: 0, 4: 1, 6: 2, 9: 3, 11: 4 };

/**
 * A strip of piano keys drawn at (0, y) inside a 280-wide SVG.
 * Keys marked `is-played` animate from CSS (see "Cover motion" in globals.css).
 */
export function KeyStrip({ y, height }: { y: number; height: number }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <rect width="280" height={height} fill="#0b0b0f" />
      {WHITE_KEYS.map((i) => {
        const order = PLAYED[i];
        return (
          <rect
            key={i}
            className={order === undefined ? "cover-key" : "cover-key is-played"}
            style={order === undefined ? undefined : ({ "--i": order } as CSSProperties)}
            x={i * 20 + 0.5}
            y="3"
            width="19"
            height={height - 3}
            fill="#ffffff"
          />
        );
      })}
      {BLACK_KEYS.map((i) => (
        <rect key={i} x={i * 20 + 13.5} y="3" width="13" height={(height - 3) * 0.6} fill="#0b0b0f" />
      ))}
    </g>
  );
}
