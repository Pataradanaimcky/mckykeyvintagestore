"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/packs", label: "แพ็กเสียง" },
  { href: "/compatibility", label: "รุ่นที่ใช้ได้" },
  { href: "/faq", label: "คำถาม" },
  { href: "/account", label: "บัญชี" },
];

/** Main menu. The link for the current section is highlighted. */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="เมนูหลัก" className="flex items-center gap-1 text-sm font-medium">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-2 transition-colors ${active ? "bg-surface" : "hover:bg-surface"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
