import type { ReactNode } from "react";
import { formatTHB } from "@/lib/format";

/** Price breakdown box used on the cart and checkout pages. */
export function OrderSummary({
  lines,
  totalSatang,
  children,
}: {
  lines: { name: string; priceSatang: number }[];
  totalSatang: number;
  children?: ReactNode;
}) {
  return (
    <aside className="flex min-w-0 flex-col gap-4 self-start rounded-3xl bg-surface p-6 lg:sticky lg:top-24">
      <h2 className="text-lg font-semibold">สรุปคำสั่งซื้อ</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {lines.map((line) => (
          <li key={line.name} className="flex justify-between gap-4">
            <span className="min-w-0 truncate text-muted">{line.name}</span>
            <span className="shrink-0 tabular-nums">{formatTHB(line.priceSatang)}</span>
          </li>
        ))}
      </ul>
      <dl className="flex items-baseline justify-between border-t border-line pt-4">
        <dt className="font-semibold">ยอดชำระ</dt>
        <dd className="text-2xl font-bold tabular-nums">{formatTHB(totalSatang)}</dd>
      </dl>
      {children}
    </aside>
  );
}
