import { CompatibilityTable } from "@/components/catalog/CompatibilityTable";
import { FilterTabs } from "@/components/catalog/FilterTabs";
import { ProductCard } from "@/components/catalog/ProductCard";
import { PatchTicker } from "@/components/catalog/PatchTicker";
import { PromoBanner } from "@/components/catalog/PromoBanner";
import { Container } from "@/components/layout/Container";
import { categories, instruments, isCategoryId, isInstrumentId, listProducts } from "@/lib/catalog";

const assurances = [
  { title: "ดาวน์โหลดทันที", text: "ได้ลิงก์ไฟล์ทางอีเมลหลังชำระเงิน" },
  { title: "พร้อมเล่นสด", text: "ทุกเสียงตั้งค่าคอนโทรลสำหรับเล่นบนเวทีไว้แล้ว" },
  { title: "จ่ายด้วย PromptPay", text: "สแกน QR จากแอปธนาคารได้ทุกธนาคาร" },
];

const faqs = [
  {
    q: "จะรู้ได้อย่างไรว่าแพ็กไหนใช้กับเครื่องของฉัน",
    a: "ทุกแพ็กมีป้าย “สำหรับ” บอกยี่ห้อและรุ่นของเครื่อง เลือกดูเฉพาะเครื่องของคุณได้จากตัวกรองด้านบน และตรวจรุ่นย่อยได้ในตารางรุ่นที่ใช้ได้",
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

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { cat, inst } = await searchParams;
  const category = isCategoryId(cat) ? cat : undefined;
  const instrument = isInstrumentId(inst) ? inst : undefined;
  const products = listProducts({ category, instrument });
  const featured = listProducts().find((p) => p.status === "available") ?? listProducts()[0];

  return (
    <Container className="flex flex-col gap-12 py-6 sm:py-8">
      <div className="flex flex-col gap-3">
        <PromoBanner product={featured} />
        <PatchTicker />
      </div>

      <section id="packs" className="flex scroll-mt-24 flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold">แพ็กเสียงทั้งหมด</h2>
          <p className="text-sm text-muted tabular-nums">{products.length} รายการ</p>
        </div>
        <div className="flex flex-col gap-3 rounded border border-line p-4">
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
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.slug} className="flex min-w-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded bg-surface p-6 text-muted">
            ยังไม่มีแพ็กที่ตรงกับตัวกรองนี้ ลองเลือกประเภทเสียงเป็น “ทั้งหมด”
          </p>
        )}
      </section>

      <section className="grid gap-4 rounded bg-surface p-6 sm:grid-cols-3">
        {assurances.map((item) => (
          <div key={item.title} className="flex min-w-0 flex-col gap-1">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm text-muted">{item.text}</p>
          </div>
        ))}
      </section>

      <section id="compatibility" className="flex scroll-mt-24 flex-col gap-4">
        <h2 className="text-2xl font-semibold">รุ่นที่ใช้ได้</h2>
        <p className="max-w-2xl text-muted">
          แต่ละแพ็กทำมาสำหรับเครื่องรุ่นเดียว ไฟล์ของเครื่องหนึ่งใช้กับอีกเครื่องไม่ได้ ตรวจรุ่นของคุณก่อนซื้อ
        </p>
        <div className="grid gap-5 lg:grid-cols-2">
          {instruments.map((item) => (
            <CompatibilityTable key={item.id} instrument={item} />
          ))}
        </div>
      </section>

      <section id="faq" className="flex scroll-mt-24 flex-col gap-2">
        <h2 className="mb-2 text-2xl font-semibold">คำถามที่พบบ่อย</h2>
        {faqs.map((faq) => (
          <details key={faq.q} className="max-w-3xl border-b border-line py-3">
            <summary className="cursor-pointer font-medium">{faq.q}</summary>
            <p className="mt-2 text-muted">{faq.a}</p>
          </details>
        ))}
      </section>
    </Container>
  );
}
