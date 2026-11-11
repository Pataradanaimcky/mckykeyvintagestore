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
    <header className="sticky top-0 z-20 bg-canvas/80 backdrop-blur-md">
      <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {site.name}
        </Link>
        <nav aria-label="เมนูหลัก" className="flex items-center gap-1 text-sm font-medium">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-full px-3 py-2 transition-colors hover:bg-surface">
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}
