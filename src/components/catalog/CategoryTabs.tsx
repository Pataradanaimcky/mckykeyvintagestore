import Link from "next/link";
import { categories, type CategoryId } from "@/lib/catalog";

/** Filter pills. Each pill is a plain link, so filtering works without JavaScript. */
export function CategoryTabs({ active }: { active?: CategoryId }) {
  const tabs = [{ id: undefined, label: "ทั้งหมด" }, ...categories];
  return (
    <nav aria-label="หมวดเสียง" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <li key={tab.label}>
              <Link
                href={tab.id ? `/?cat=${tab.id}#packs` : "/#packs"}
                aria-current={selected ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                  selected
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-canvas text-ink hover:border-ink/40"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
