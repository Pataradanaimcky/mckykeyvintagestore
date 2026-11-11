import type { CSSProperties } from "react";
import Image from "next/image";
import { getInstrument, type Product } from "@/lib/catalog";
import { KeyStrip } from "./KeyStrip";

/**
 * Cover for a pack.
 *
 * - If the product has `image`, that photo is shown (preferred: the owner's own
 *   photo of his own keyboard).
 * - Otherwise a flat cover is drawn in the product line's color, with the pack's
 *   short label and a strip of keys that play on hover.
 */
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

  const instrument = getInstrument(product.instrument);

  return (
    <svg
      viewBox="0 0 280 210"
      role="img"
      aria-label={`ปกแพ็ก ${product.name}`}
      className={`pack-cover block h-auto w-full ${playing ? "is-playing" : ""} ${className}`}
      style={{ "--press": instrument.color } as CSSProperties}
    >
      <rect width="280" height="210" fill={instrument.color} />
      <text x="20" y="36" fill="#ffffff" fillOpacity="0.85" fontFamily="Anuphan, sans-serif" fontWeight="600" fontSize="11" letterSpacing="1.5">
        {instrument.model}
      </text>
      <text x="18" y="104" fill="#ffffff" fontFamily="Anuphan, sans-serif" fontWeight="700" fontSize="60" letterSpacing="-2">
        {product.cover.label}
      </text>
      <text x="20" y="128" fill="#ffffff" fillOpacity="0.9" fontFamily="Anuphan, sans-serif" fontWeight="500" fontSize="13">
        {product.soundCount} เสียง
      </text>
      <KeyStrip y={150} height={60} />
    </svg>
  );
}
