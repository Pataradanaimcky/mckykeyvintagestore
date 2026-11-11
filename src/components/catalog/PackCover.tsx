import type { CSSProperties } from "react";
import Image from "next/image";
import type { Product } from "@/lib/catalog";

/**
 * Cover for a pack.
 *
 * - If the product has `image`, that photo is shown. This is the preferred look:
 *   a real photo of the owner's own keyboard.
 * - Otherwise a plain printed-label cover is drawn: one flat color, the pack's
 *   short label in large type, and a strip of keys. No gradients or glow.
 *
 * Motion lives in globals.css under "Cover motion": keys press on card hover,
 * or loop on their own when `playing` is set.
 */

const WHITE_KEYS = Array.from({ length: 14 }, (_, i) => i);
// Black keys sit after white keys 0,1,3,4,5 in every group of 7.
const BLACK_KEYS = WHITE_KEYS.filter((i) => [0, 1, 3, 4, 5].includes(i % 7) && i < 13);
// White keys that "play", with a stagger so it reads as a rolled chord.
const PLAYED: Record<number, number> = { 2: 0, 4: 1, 6: 2, 9: 3, 11: 4 };

export function PackCover({
  product,
  className = "",
  playing = false,
}: {
  product: Product;
  className?: string;
  playing?: boolean;
}) {
  if (product.image) {
    return (
      <Image
        src={product.image}
        alt={`ภาพแพ็ก ${product.name}`}
        width={840}
        height={630}
        className={`block aspect-[4/3] h-auto w-full object-cover ${className}`}
      />
    );
  }

  const { color, label } = product.cover;

  return (
    <svg
      viewBox="0 0 280 210"
      role="img"
      aria-label={`ปกแพ็ก ${product.name}`}
      className={`pack-cover block h-auto w-full ${playing ? "is-playing" : ""} ${className}`}
    >
      <rect width="280" height="210" fill={color} />
      <text x="20" y="34" fill="#ffffff" fillOpacity="0.8" fontFamily="Kanit, sans-serif" fontWeight="500" fontSize="11" letterSpacing="2">
        SOUND PACK
      </text>
      <text x="18" y="96" fill="#ffffff" fontFamily="Kanit, sans-serif" fontWeight="600" fontSize="58">
        {label}
      </text>
      <text x="20" y="122" fill="#ffffff" fillOpacity="0.9" fontFamily="Kanit, sans-serif" fontWeight="500" fontSize="13">
        {product.soundCount} เสียง
      </text>

      <g transform="translate(0 146)">
        <rect width="280" height="64" fill="#1a1a1a" />
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
              height="61"
              fill="#ffffff"
            />
          );
        })}
        {BLACK_KEYS.map((i) => (
          <rect key={i} x={i * 20 + 13.5} y="3" width="13" height="36" fill="#1a1a1a" />
        ))}
      </g>
    </svg>
  );
}
