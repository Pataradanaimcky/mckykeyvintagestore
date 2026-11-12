import Link from "next/link";
import { getCartSlugs } from "@/lib/cart";

/** Cart button in the header with the number of packs in it. */
export async function CartLink() {
  const count = (await getCartSlugs()).length;
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `ตะกร้า มี ${count} แพ็ก` : "ตะกร้า ว่างอยู่"}
      className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      ตะกร้า
      {count > 0 ? (
        <span
          key={count}
          className="pop-in grid h-5 min-w-5 place-items-center rounded-full bg-red px-1.5 text-xs font-semibold text-white tabular-nums"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
