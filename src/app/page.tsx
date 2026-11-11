import type { CSSProperties } from "react";
import Link from "next/link";
import { CompatibilityTable } from "@/components/catalog/CompatibilityTable";
import { FilterTabs } from "@/components/catalog/FilterTabs";
import { Hero } from "@/components/catalog/Hero";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SoundMarquee } from "@/components/catalog/SoundMarquee";
import { Container } from "@/components/layout/Container";
import { categories, instruments, isCategoryId, isInstrumentId, listProducts } from "@/lib/catalog";

const assurances = [
  { title: "ดาวน์โหลดทันที", text: "ได้ลิงก์ไฟล์ทางอีเมลหลังชำระเงิน ไม่ต้องรอจัดส่ง" },
  { title: "พร้อมเล่นสด", text: "ทุกเสียงตั้งค่าคอนโทรลสำหรับเล่นบนเวทีไว้แล้ว" },
  { title: "จ่ายด้วย PromptPay", text: "สแกน QR จากแอปธนาคารได้ทุกธนาคาร" },
];

const faqs = [
  {
    q: "จะรู้ได้อย่างไรว่าแพ็กไหนใช้กับเครื่องของฉัน",
    a: "ทุกแพ็กมีป้าย “สำหรับ” บอกยี่ห้อและรุ่นของเครื่อง และสีของปกบอกว่าเป็นแพ็กของเครื่องไหน เลือกดูเฉพาะเครื่องของคุณได้จากตัวกรอง และตรวจรุ่นย่อยได้ในตารางรุ่นที่ใช้ได้",
  },
  {
    q: "ซื้อแล้วได้ไฟล์อย่างไร",
    a: "หลังชำระเงินสำเร็จ ระบบจะส่งลิงก์ดาวน์โหลดไฟล์เสียงไปที่อีเมลที่กรอกไว้",
  },
  {
    q: "ใช้เสียงนี้อัดเพลงหรือเล่นงานจ้างได้ไหม",
    a: "ได้ ใช้ในงานเพลงและงานแสดงของคุณได้เต็มที่ แต่ห้ามนำไฟล์แพ็กไปแจกหรือขายต่อ",
  },
  {
    q: "ขอเงินคืนได้ไหม",
    a: "เนื่องจากเป็นไฟล์ดิจิทัล กรุณาตรวจรุ่นเครื่องในตารางก่อนซื้อ หากไฟล์มีปัญหา ติดต่อร้านได้ตามช่องทางด้านล่าง",
  },
];

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { cat, inst } = await searchParams;
  const category = isCategoryId(cat) ? cat : undefined;
  const instrument = isInstrumentId(inst) ? inst : undefined;
  const products = listProducts({ category, instrument });

  return (
    <div className="flex flex-col gap-20 pb-10 sm:gap-28">
      <Container>
        <Hero />
      </Container>

      <SoundMarquee />

      <Container>
        <section id="packs" className="flex scroll-mt-24 flex-col gap-8">
          <div data-reveal className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="section-title">แพ็กเสียง</h2>
            <p className="text-muted tabular-nums">{products.length} รายการ</p>
          </div>
          <div data-reveal className="flex flex-col gap-3">
            <FilterTabs
              label="เครื่องของคุณ"
              param="inst"
              active={instrument}
              others={{ cat: category }}
              tabs={[
                { label: "ทุกเครื่อง" },
                ...instruments.map((i) => ({ value: i.id, label: `${i.maker} ${i.model}` })),
              ]}
            />
            <FilterTabs
              label="ประเภทเสียง"
              param="cat"
              active={category}
              others={{ inst: instrument }}
              tabs={[{ label: "ทั้งหมด" }, ...categories.map((c) => ({ value: c.id, label: c.label }))]}
            />
          </div>
          {products.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, index) => (
                <div key={product.slug} data-reveal style={delay((index % 3) * 90)} className="flex min-w-0">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-3xl bg-surface p-8 text-muted">
              ยังไม่มีแพ็กที่ตรงกับตัวกรองนี้ ลองเลือกประเภทเสียงเป็น “ทั้งหมด”
            </p>
          )}
        </section>
      </Container>

      <Container>
        <section className="grid gap-4 md:grid-cols-3">
          {assurances.map((item, index) => (
            <div
              key={item.title}
              data-reveal
              style={delay(index * 90)}
              className="flex min-w-0 flex-col gap-3 rounded-3xl border border-line p-6 sm:p-8"
            >
              <h3 className="text-2xl font-semibold tracking-tight">{item.title}</h3>
              <p className="text-muted">{item.text}</p>
            </div>
          ))}
        </section>
      </Container>

      <Container>
        <section id="compatibility" className="flex scroll-mt-24 flex-col gap-8">
          <div data-reveal className="flex flex-col gap-3">
            <h2 className="section-title">รุ่นที่ใช้ได้</h2>
            <p className="max-w-2xl text-lg text-muted">
              แต่ละแพ็กทำมาสำหรับเครื่องรุ่นเดียว ไฟล์ของเครื่องหนึ่งใช้กับอีกเครื่องไม่ได้ ตรวจรุ่นของคุณก่อนซื้อ
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {instruments.map((item, index) => (
              <div key={item.id} data-reveal style={delay(index * 90)} className="min-w-0">
                <CompatibilityTable instrument={item} />
              </div>
            ))}
          </div>
        </section>
      </Container>

      <Container>
        <section id="faq" className="grid scroll-mt-24 gap-8 md:grid-cols-[1fr_1.4fr]">
          <h2 data-reveal className="section-title">
            คำถามที่พบบ่อย
          </h2>
          <div data-reveal className="flex flex-col">
            {faqs.map((faq) => (
              <details key={faq.q} className="faq border-b border-line py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
                  {faq.q}
                  <span aria-hidden="true" className="faq-icon grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-xl">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
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
          <Link href="/#packs" className="btn btn-dark">
            ดูแพ็กทั้งหมด <span aria-hidden="true" className="btn-arrow">→</span>
          </Link>
        </section>
      </Container>
    </div>
  );
}
