import Link from "next/link";
import { site } from "@/config/site";
import { Container } from "./Container";

const links = [
  { href: "/#packs", label: "แพ็กเสียง" },
  { href: "/#compatibility", label: "รุ่นที่ใช้ได้" },
  { href: "/#faq", label: "คำถาม" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
      <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          {site.name}
        </Link>
        <nav aria-label="เมนูหลัก" className="flex gap-5 text-sm text-muted">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}
