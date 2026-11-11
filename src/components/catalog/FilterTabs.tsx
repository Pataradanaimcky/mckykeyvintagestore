import Link from "next/link";

export interface FilterTab {
  /** Undefined means "all". */
  value?: string;
  label: string;
}

/**
 * A row of filter pills. Each pill is a plain link, so filtering works without
 * JavaScript. `others` holds the filters from other rows so they are kept in the link.
 */
export function FilterTabs({
  label,
  param,
  tabs,
  active,
  others = {},
}: {
  label: string;
  param: string;
  tabs: FilterTab[];
  active?: string;
  others?: Record<string, string | undefined>;
}) {
  function href(value?: string): string {
    const query = new URLSearchParams();
    for (const [key, other] of Object.entries(others)) {
      if (other) query.set(key, other);
    }
    if (value) query.set(param, value);
    const text = query.toString();
    return `/${text ? `?${text}` : ""}#packs`;
  }

  return (
    <nav aria-label={label} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-24 shrink-0 text-sm font-medium text-muted">{label}</span>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2">
          {tabs.map((tab) => {
            const selected = tab.value === active;
            return (
              <li key={tab.label}>
                <Link
                  href={href(tab.value)}
                  aria-current={selected ? "page" : undefined}
                  className={`block whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    selected
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-canvas text-ink hover:border-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
