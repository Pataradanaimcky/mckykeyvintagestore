"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The site's three parts, numbered as on the landing page, then the account. */
const links = [
  { href: "/#play", match: "/", label: "เล่นซินธ์", num: "01" },
  { href: "/studio", match: "/studio", label: "จัดเรียงเสียง", num: "02" },
  { href: "/packs", match: "/packs", label: "แพ็กเสียง", num: "03" },
  { href: "/account", match: "/account", label: "บัญชี" },
];

/** Main menu. One row that scrolls sideways on a phone instead of wrapping. */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="เมนูหลัก" className="nav-scroll -mx-1 flex items-center gap-1 overflow-x-auto px-1 text-sm font-medium">
      {links.map((link) => {
        const active = link.match === "/" ? pathname === "/" : pathname === link.match || pathname.startsWith(`${link.match}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 transition-colors ${active ? "bg-surface" : "hover:bg-surface"}`}
          >
            {link.num && <span className="font-mono text-[0.65rem] text-muted">{link.num}</span>}
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
