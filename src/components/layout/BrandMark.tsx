/**
 * The store's mark: three white keys with a blue and a red short key, on a black tile.
 * The same drawing is used for the site icon and the social profile picture
 * (see public/brand and docs/BRAND_PROFILE.md).
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="14" fill="#08080a" />
      <rect x="15" y="14" width="10" height="36" rx="2.5" fill="#f4f4f6" />
      <rect x="27" y="14" width="10" height="36" rx="2.5" fill="#f4f4f6" />
      <rect x="39" y="14" width="10" height="36" rx="2.5" fill="#f4f4f6" />
      <rect x="22" y="14" width="8" height="22" rx="2" fill="#2456ff" />
      <rect x="34" y="14" width="8" height="22" rx="2" fill="#e0263f" />
    </svg>
  );
}
