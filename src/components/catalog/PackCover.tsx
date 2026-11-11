import type { Product } from "@/lib/catalog";

/**
 * Drawn cover for a pack: a color field with a keyboard along the bottom.
 * Replace with a real image later by swapping this component's contents.
 */
export function PackCover({ product, className = "" }: { product: Product; className?: string }) {
  const gradientId = `cover-${product.slug}`;
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
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={product.cover.from} />
          <stop offset="1" stopColor={product.cover.to} />
        </linearGradient>
      </defs>
      <rect width="280" height="210" fill={`url(#${gradientId})`} />
      <circle cx="232" cy="46" r="20" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" />
      <line x1="232" y1="46" x2="244" y2="34" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <text
        x="20"
        y="72"
        fill="#ffffff"
        fontFamily="Prompt, sans-serif"
        fontWeight="700"
        fontSize="46"
        letterSpacing="1"
      >
        {product.cover.label}
      </text>
      <text x="22" y="98" fill="#ffffff" fillOpacity="0.85" fontFamily="Prompt, sans-serif" fontWeight="500" fontSize="13">
        {product.performances} PERFORMANCES
      </text>
      <g transform="translate(0 140)">
        {whiteKeys.map((i) => (
          <rect key={i} x={i * 20} y="0" width="19" height="70" fill="#ffffff" />
        ))}
        {blackKeys.map((i) => (
          <rect key={i} x={i * 20 + 13} y="0" width="13" height="42" fill="#0b1220" />
        ))}
      </g>
    </svg>
  );
}
