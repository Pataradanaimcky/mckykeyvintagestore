import type { CSSProperties } from "react";

const WHITE_KEYS = Array.from({ length: 14 }, (_, i) => i);
// Black keys sit after white keys 0,1,3,4,5 in every group of 7.
const BLACK_KEYS = WHITE_KEYS.filter((i) => [0, 1, 3, 4, 5].includes(i % 7) && i < 13);
// White keys that "play", with a stagger so it reads as a rolled chord.
const PLAYED: Record<number, number> = { 2: 0, 4: 1, 6: 2, 9: 3, 11: 4 };

/**
 * A strip of piano keys drawn at (0, y) inside a 280-wide SVG, in the same
 * rounded style as the brand mark: separate white bars with short dark bars between.
 * Keys marked `is-played` animate from CSS (see "Cover motion" in globals.css).
 */
export function KeyStrip({ y, height }: { y: number; height: number }) {
  const long = height - 12;
  return (
    <g transform={`translate(0 ${y})`}>
      {WHITE_KEYS.map((i) => {
        const order = PLAYED[i];
        return (
          <rect
            key={i}
            className={order === undefined ? "cover-key" : "cover-key is-played"}
            style={order === undefined ? undefined : ({ "--i": order } as CSSProperties)}
            x={i * 19 + 8.5}
            y="0"
            width="16"
            height={long}
            rx="4"
            fill="#ffffff"
          />
        );
      })}
      {BLACK_KEYS.map((i) => (
        <rect key={i} x={i * 19 + 20} y="0" width="12" height={long * 0.58} rx="3.5" fill="#0b0b0f" />
      ))}
    </g>
  );
}
