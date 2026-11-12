import type { CSSProperties } from "react";
import Link from "next/link";
import { Hero } from "@/components/catalog/Hero";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SoundMarquee } from "@/components/catalog/SoundMarquee";
import { Container } from "@/components/layout/Container";
import { RackCarousel } from "@/components/rack/RackCarousel";
import { listProducts } from "@/lib/catalog";

const assurances = [
  { title: "ดาวน์โหลดทันที", text: "ได้ลิงก์ไฟล์ทางอีเมลหลังชำระเงิน ไม่ต้องรอจัดส่ง" },
  { title: "พร้อมเล่นสด", text: "ทุกเสียงตั้งค่าคอนโทรลสำหรับเล่นบนเวทีไว้แล้ว" },
  { title: "จ่ายด้วย PromptPay", text: "สแกน QR จากแอปธนาคารได้ทุกธนาคาร" },
];

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Number of packs shown on the home page before sending people to /packs. */
const FEATURED_COUNT = 3;

export default function HomePage() {
  const all = listProducts();
  // Packs on sale first, then the rest in catalog order.
  const featured = [...all]
    .sort((a, b) => Number(b.status === "available") - Number(a.status === "available"))
    .slice(0, FEATURED_COUNT);

  return (
    <div className="flex flex-col gap-20 pb-10 sm:gap-28">
      <Container className="flex flex-col gap-10 pt-2 sm:gap-14 sm:pt-4">
        <RackCarousel />
        <Hero />
      </Container>

      <SoundMarquee />

      <Container>
        <section className="flex flex-col gap-8">
          <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="section-title">แพ็กแนะนำ</h2>
            <Link href="/packs" className="btn btn-light">
              ดูทั้งหมด {all.length} แพ็ก <span aria-hidden="true" className="btn-arrow">→</span>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product, index) => (
              <div key={product.slug} data-reveal style={delay(index * 90)} className="flex min-w-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      </Container>

      <Container>
        <section className="grid gap-4 md:grid-cols-3">
          {assurances.map((item, index) => (
            <div
              key={item.title}
              data-reveal
              style={delay(index * 90)}
              className="lift flex min-w-0 flex-col gap-3 rounded-3xl border border-line p-6 hover:border-ink sm:p-8"
            >
              <h3 className="text-2xl font-semibold tracking-tight">{item.title}</h3>
              <p className="text-muted">{item.text}</p>
            </div>
          ))}
        </section>
      </Container>

      <Container>
        <section
          data-reveal
          className="flex flex-col items-start gap-6 rounded-[2rem] border border-line bg-surface p-8 sm:p-14"
        >
          <h2 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            เลือกเครื่องของคุณ แล้วเริ่มเล่นได้คืนนี้
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/packs" className="btn btn-dark">
              ดูแพ็กทั้งหมด <span aria-hidden="true" className="btn-arrow">→</span>
            </Link>
            <Link href="/compatibility" className="btn btn-light">
              เช็กรุ่นที่ใช้ได้
            </Link>
            <Link href="/faq" className="btn btn-light">
              คำถามที่พบบ่อย
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}
