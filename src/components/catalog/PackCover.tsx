import type { CSSProperties } from "react";
import type { Product } from "@/lib/catalog";

/**
 * Drawn cover for a pack: a generic dark instrument panel with a small screen,
 * three knobs, five sliders and a keyboard. It is deliberately not a drawing of
 * any real product. Swap this component's contents for a real photo later.
 *
 * Motion lives in globals.css under "Cover motion":
 * - inside a `.group` (product card), keys and controls move on hover
 * - with `playing`, the cover loops a short chord pattern on its own
 */

const WHITE_KEYS = Array.from({ length: 14 }, (_, i) => i);
// Black keys sit after white keys 0,1,3,4,5 in every group of 7.
const BLACK_KEYS = WHITE_KEYS.filter((i) => [0, 1, 3, 4, 5].includes(i % 7) && i < 13);
// White keys that "play" in the loop, with a stagger so it reads as a rolled chord.
const PLAYED: Record<number, number> = { 2: 0, 4: 1, 6: 2, 9: 3, 11: 4 };
const KNOB_TURN = [-40, 25, 55];
const SLIDER_Y = [84, 92, 80, 96, 88];

export function PackCover({
  product,
  className = "",
  playing = false,
}: {
  product: Product;
  className?: string;
  playing?: boolean;
}) {
  const { accent, label } = product.cover;
  const style = { "--accent": accent } as CSSProperties;

  return (
    <svg
      viewBox="0 0 280 210"
      role="img"
      aria-label={`ปกแพ็ก ${product.name}`}
      className={`pack-cover block h-auto w-full ${playing ? "is-playing" : ""} ${className}`}
      style={style}
    >
      <rect width="280" height="210" fill="#15171b" />
      <rect className="cover-bar" width="280" height="4" fill={accent} />

      {/* Screen */}
      <rect x="18" y="24" width="150" height="84" rx="6" fill="#0b0d10" stroke="#2c3038" />
      <rect className="cover-scan" x="19" y="25" width="148" height="6" fill={accent} opacity="0" />
      <text
        className="cover-label"
        x="30"
        y="72"
        fill={accent}
        fontFamily="'Chakra Petch', sans-serif"
        fontWeight="700"
        fontSize="38"
        letterSpacing="1"
      >
        {label}
      </text>
      <text
        x="31"
        y="94"
        fill="#8b93a1"
        fontFamily="'Chakra Petch', sans-serif"
        fontWeight="500"
        fontSize="11"
        letterSpacing="1"
      >
        {product.soundCount} SOUNDS
      </text>

      {/* Knobs */}
      {[190, 222, 254].map((cx, i) => (
        <g key={cx}>
          <circle cx={cx} cy="50" r="11" fill="#22252b" stroke="#3a3f49" />
          <g
            className="cover-knob"
            style={{ transformOrigin: `${cx}px 50px`, "--turn": `${KNOB_TURN[i]}deg` } as CSSProperties}
          >
            <line
              x1={cx}
              y1="50"
              x2={cx}
              y2="41"
              stroke={i === 1 ? accent : "#c9ced8"}
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${[-35, 0, 40][i]} ${cx} 50)`}
            />
          </g>
        </g>
      ))}

      {/* Sliders */}
      {[190, 206, 222, 238, 254].map((x, i) => (
        <g key={x}>
          <rect x={x - 1} y="76" width="2" height="30" fill="#3a3f49" />
          <rect
            className="cover-slider"
            style={{ "--i": i } as CSSProperties}
            x={x - 5}
            y={SLIDER_Y[i]}
            width="10"
            height="5"
            rx="1"
            fill="#c9ced8"
          />
        </g>
      ))}

      {/* Keys */}
      <g transform="translate(0 132)">
        <rect width="280" height="78" fill="#0b0d10" />
        {WHITE_KEYS.map((i) => {
          const order = PLAYED[i];
          return (
            <rect
              key={i}
              className={order === undefined ? "cover-key" : "cover-key is-played"}
              style={order === undefined ? undefined : ({ "--i": order } as CSSProperties)}
              x={i * 20 + 0.5}
              y="4"
              width="19"
              height="74"
              rx="1.5"
              fill="#f4f5f7"
            />
          );
        })}
        {BLACK_KEYS.map((i) => (
          <rect key={i} x={i * 20 + 13.5} y="4" width="13" height="44" rx="1.5" fill="#15171b" />
        ))}
      </g>
    </svg>
  );
}
