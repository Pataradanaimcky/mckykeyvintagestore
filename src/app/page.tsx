import type { CSSProperties } from "react";
import Link from "next/link";
import { Hero } from "@/components/catalog/Hero";
import { FreePacks } from "@/components/catalog/FreePacks";
import { InstrumentCard } from "@/components/catalog/InstrumentCard";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SoundMarquee } from "@/components/catalog/SoundMarquee";
import { Container } from "@/components/layout/Container";
import { RackCarousel } from "@/components/rack/RackCarousel";
import { instruments, listProducts } from "@/lib/catalog";

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
      <Container className="pt-2 sm:pt-4">
        <Hero />
      </Container>

      {/* 01 Play */}
      <Container>
        <section id="play" className="flex scroll-mt-24 flex-col gap-6">
          <div data-reveal className="flex flex-col gap-3">
            <p className="font-mono text-sm text-muted">01 · เล่นซินธ์</p>
            <h2 className="section-title">ลองเล่นได้เลย</h2>
            <p className="max-w-2xl text-lg text-muted">
              ปัดหรือกดแท็บเพื่อเปลี่ยนเครื่อง กดคีย์บนจอหรือปุ่ม A–K บนคีย์บอร์ดคอม เสียงเริ่มเมื่อคุณกดเท่านั้น
            </p>
          </div>
          <RackCarousel />
        </section>
      </Container>

      {/* 02 Arrange */}
      <Container>
        <section
          data-reveal
          className="grid items-center gap-8 rounded-[2rem] border border-line bg-surface p-6 sm:p-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        >
          <div className="flex flex-col items-start gap-4">
            <p className="font-mono text-sm text-muted">02 · จัดเรียงเสียง</p>
            <h2 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">ทำเสียงบนเครื่อง แล้วมาจัดลำดับที่นี่</h2>
            <p className="text-muted">
              ลากเสียงวางลงช่องบนจอใหญ่ แทนการเลื่อนทีละช่องบนเครื่อง แบงก์ DX7 ดาวน์โหลดเป็นไฟล์ .syx ได้ทันที ส่วน MODX M และ FANTOM-0
              ได้ใบจัดเรียงไปทำตามบนเครื่อง
            </p>
            <Link href="/studio" className="btn btn-dark">
              เปิดตัวจัดเรียงเสียง <span aria-hidden="true" className="btn-arrow">→</span>
            </Link>
          </div>
          <div aria-hidden="true" className="organizer-grid grid grid-cols-4 gap-1.5">
            {["CITY EP", "GRAND", "", "WARM PAD", "BRASS", "", "SYN BASS", "", "", "BELL", "STRINGS", "", "ORGAN", "", "", "LEAD"].map((name, i) => (
              <span key={i} className={`organizer-slot ${name ? "" : "is-empty"} ${i === 1 ? "color-blue" : i === 4 ? "color-red" : ""}`}>
                <span className="organizer-num">{i + 1}</span>
                <span className="organizer-name">{name}</span>
              </span>
            ))}
          </div>
        </section>
      </Container>

      {/* 03 Buy */}
      <Container>
        <section className="flex flex-col gap-8">
          <div data-reveal className="flex flex-col gap-3">
            <p className="font-mono text-sm text-muted">03 · ซื้อเสียง</p>
            <h2 className="section-title">แพ็กเสียงไทยป๊อป และซิตี้ป๊อป</h2>
            <p className="max-w-2xl text-lg text-muted">ทำโดยนักคีย์บอร์ดแบ็กอัพ ตั้งค่าสำหรับเล่นสดไว้แล้ว โหลดลงเครื่องแล้วเล่นได้เลย</p>
            <Link href="/demo" className="btn btn-dark self-start">
              ▶ ฟังเดโมทุกแพ็ก <span aria-hidden="true" className="btn-arrow">→</span>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {instruments.map((instrument, index) => (
              <InstrumentCard key={instrument.id} instrument={instrument} delay={index * 120} />
            ))}
          </div>
          <div data-reveal className="flex flex-col gap-2 pt-4">
            <h3 className="text-3xl font-bold tracking-tight">เริ่มจากแพ็กฟรี</h3>
            <p className="text-muted">เสียงตั้งต้นของซินธ์ในเว็บ ร้านทำเองทั้งหมด</p>
          </div>
          <FreePacks />
        </section>
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
            <Link href="/studio" className="btn btn-light">
              จัดเรียงเสียง
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
