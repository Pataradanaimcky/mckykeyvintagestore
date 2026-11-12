import Link from "next/link";
import { site } from "@/config/site";

const columns = [
  {
    title: "ใช้งาน",
    links: [
      { href: "/#play", label: "เล่นซินธ์" },
      { href: "/studio", label: "จัดเรียงเสียง" },
      { href: "/packs", label: "แพ็กเสียง" },
    ],
  },
  {
    title: "ช่วยเหลือ",
    links: [
      { href: "/compatibility", label: "รุ่นที่ใช้ได้" },
      { href: "/faq", label: "คำถามที่พบบ่อย" },
      { href: "/account", label: "บัญชีและคำสั่งซื้อ" },
      { href: "/cart", label: "ตะกร้า" },
    ],
  },
];
import { Container } from "./Container";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-line">
      <Container className="flex flex-col gap-6 py-8 text-sm text-muted">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <p className="text-lg font-bold tracking-tight text-ink">{site.name}</p>
            <p>ติดต่อ: {site.contact}</p>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2">
              <p className="font-semibold text-ink">{col.title}</p>
              {col.links.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-ink">
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <p className="text-xs">
          Yamaha, MODX, MONTAGE และ DX7 เป็นเครื่องหมายการค้าของ Yamaha Corporation ส่วน Roland และ FANTOM
          เป็นเครื่องหมายการค้าของ Roland Corporation ร้านนี้เป็นผู้ผลิตเสียงอิสระ
          ไม่ได้เป็นตัวแทนและไม่ได้รับการรับรองจากทั้งสองบริษัท ชื่อยี่ห้อและรุ่นใช้เพื่อบอกว่าแพ็กหรือไฟล์ใช้กับเครื่องใดเท่านั้น
        </p>
      </Container>
    </footer>
  );
}
