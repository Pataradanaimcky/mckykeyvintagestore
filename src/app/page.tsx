import { CategoryTabs } from "@/components/catalog/CategoryTabs";
import { CompatibilityTable } from "@/components/catalog/CompatibilityTable";
import { ProductCard } from "@/components/catalog/ProductCard";
import { PromoBanner } from "@/components/catalog/PromoBanner";
import { Container } from "@/components/layout/Container";
import { isCategoryId, listProducts } from "@/lib/catalog";

const assurances = [
  { title: "ดาวน์โหลดทันที", text: "ได้ลิงก์ไฟล์ทางอีเมลหลังชำระเงิน" },
  { title: "พร้อมเล่นสด", text: "ทุกเสียงตั้ง Scene และ Super Knob ไว้แล้ว" },
  { title: "จ่ายด้วย PromptPay", text: "สแกน QR จากแอปธนาคารได้ทุกธนาคาร" },
];

const faqs = [
  {
    q: "ซื้อแล้วได้ไฟล์อย่างไร",
    a: "หลังชำระเงินสำเร็จ ระบบจะส่งลิงก์ดาวน์โหลดไฟล์ .Y2L ไปที่อีเมลที่กรอกไว้",
  },
  {
    q: "โหลดแล้วเสียงเดิมในเครื่องหายไหม",
    a: "ไม่หาย แพ็กติดตั้งเป็น Library แยกจากเสียงโรงงานและเสียง User ของคุณ",
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
  const { cat } = await searchParams;
  const category = isCategoryId(cat) ? cat : undefined;
  const products = listProducts(category);
  const featured = listProducts().find((p) => p.status === "available") ?? listProducts()[0];

  return (
    <Container className="flex flex-col gap-12 py-6 sm:py-8">
      <PromoBanner product={featured} />

      <section id="packs" className="flex scroll-mt-24 flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold">แพ็กเสียงทั้งหมด</h2>
          <p className="text-sm text-muted tabular-nums">{products.length} รายการ</p>
        </div>
        <CategoryTabs active={category} />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl bg-surface p-6 sm:grid-cols-3">
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
          ทุกแพ็กเป็นไฟล์ .Y2L สำหรับเครื่องตระกูล M เครื่อง MODX และ MODX+ รุ่นเดิมอ่านไฟล์นี้ไม่ได้
        </p>
        <CompatibilityTable />
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
