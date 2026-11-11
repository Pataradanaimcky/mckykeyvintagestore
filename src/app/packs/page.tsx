import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { FilterTabs } from "@/components/catalog/FilterTabs";
import { ProductCard } from "@/components/catalog/ProductCard";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { categories, instruments, isCategoryId, isInstrumentId, listProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "แพ็กเสียง",
  description: "แพ็กเสียงทั้งหมดของร้าน เลือกดูตามเครื่องและประเภทเสียง",
};

export default async function PacksPage({ searchParams }: PageProps<"/packs">) {
  const { cat, inst } = await searchParams;
  const category = isCategoryId(cat) ? cat : undefined;
  const instrument = isInstrumentId(inst) ? inst : undefined;
  const products = listProducts({ category, instrument });

  return (
    <Container className="flex flex-col gap-8 pb-10">
      <PageHeader title="แพ็กเสียง">เลือกเครื่องของคุณก่อน แล้วเลือกประเภทเสียงที่ต้องการ</PageHeader>

      <div className="flex flex-col gap-3">
        <FilterTabs
          label="เครื่องของคุณ"
          basePath="/packs"
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
          basePath="/packs"
          param="cat"
          active={category}
          others={{ inst: instrument }}
          tabs={[{ label: "ทั้งหมด" }, ...categories.map((c) => ({ value: c.id, label: c.label }))]}
        />
        <p className="text-sm text-muted tabular-nums">{products.length} รายการ</p>
      </div>

      {products.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => (
            <div
              key={product.slug}
              data-reveal
              style={{ "--d": `${(index % 3) * 90}ms` } as CSSProperties}
              className="flex min-w-0"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-3xl bg-surface p-8 text-muted">
          ยังไม่มีแพ็กที่ตรงกับตัวกรองนี้ ลองเลือกประเภทเสียงเป็น “ทั้งหมด”
        </p>
      )}
    </Container>
  );
}
