import { listProducts } from "@/lib/catalog";

/**
 * Oversized strip of sound names that scrolls sideways. Decorative: the same
 * names are listed on each pack's page, so it is hidden from screen readers.
 * The list is drawn twice so the loop has no gap.
 */
export function SoundMarquee() {
  const names = listProducts().flatMap((product) => product.patches.map((patch) => patch.name));

  const row = (
    <ul className="flex shrink-0 items-center">
      {names.map((name, index) => (
        <li key={`${name}-${index}`} className="flex items-center">
          <span className={index % 2 === 0 ? "" : "text-outline"}>{name}</span>
          <span className="px-6 text-[0.5em] sm:px-10">✦</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      aria-hidden="true"
      className="marquee overflow-hidden whitespace-nowrap border-y border-line py-5 text-4xl font-bold tracking-tight sm:py-7 sm:text-6xl"
    >
      <div className="marquee-track flex w-max">
        {row}
        {row}
      </div>
    </div>
  );
}
