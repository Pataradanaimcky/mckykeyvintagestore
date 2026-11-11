import type { Product } from "@/lib/catalog";

/**
 * Drawn cover for a pack: a generic dark instrument panel with a small screen,
 * three knobs and a keyboard. It is deliberately not a drawing of any real
 * product. Swap this component's contents for a real photo later.
 */
export function PackCover({ product, className = "" }: { product: Product; className?: string }) {
  const { accent, label } = product.cover;
  const whiteKeys = Array.from({ length: 14 }, (_, i) => i);
  // Black keys sit after white keys 0,1,3,4,5 in every group of 7.
  const blackKeys = whiteKeys.filter((i) => [0, 1, 3, 4, 5].includes(i % 7) && i < 13);

  return (
    <svg
      viewBox="0 0 280 210"
      role="img"
      aria-label={`ปกแพ็ก ${product.name}`}
      className={`block h-auto w-full ${className}`}
    >
      <rect width="280" height="210" fill="#15171b" />
      <rect width="280" height="4" fill={accent} />

      {/* Screen */}
      <rect x="18" y="24" width="150" height="84" rx="6" fill="#0b0d10" stroke="#2c3038" />
      <text
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
      <text x="31" y="94" fill="#8b93a1" fontFamily="'Chakra Petch', sans-serif" fontWeight="500" fontSize="11" letterSpacing="1">
        {product.soundCount} SOUNDS
      </text>

      {/* Knobs */}
      {[196, 228, 260].map((cx, i) => (
        <g key={cx}>
          <circle cx={cx - 6} cy="50" r="11" fill="#22252b" stroke="#3a3f49" />
          <line
            x1={cx - 6}
            y1="50"
            x2={cx - 6 + [-5, 0, 6][i]}
            y2={[43, 41, 44][i]}
            stroke={i === 1 ? accent : "#c9ced8"}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      ))}
      {/* Sliders */}
      {[190, 206, 222, 238, 254].map((x, i) => (
        <g key={x}>
          <rect x={x - 1} y="76" width="2" height="30" fill="#3a3f49" />
          <rect x={x - 5} y={[84, 92, 80, 96, 88][i]} width="10" height="5" rx="1" fill="#c9ced8" />
        </g>
      ))}

      {/* Keys */}
      <g transform="translate(0 132)">
        <rect width="280" height="78" fill="#0b0d10" />
        {whiteKeys.map((i) => (
          <rect key={i} x={i * 20 + 0.5} y="4" width="19" height="74" rx="1.5" fill="#f4f5f7" />
        ))}
        {blackKeys.map((i) => (
          <rect key={i} x={i * 20 + 13.5} y="4" width="13" height="44" rx="1.5" fill="#15171b" />
        ))}
      </g>
    </svg>
  );
}
