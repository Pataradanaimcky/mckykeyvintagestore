import type { Metadata } from "next";
import { DemoPlayer, type DemoPack } from "@/components/demo/DemoPlayer";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { clipFor } from "@/content/demos";
import { getInstrument, listProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "ฟังเดโม",
  description: "ฟังเสียงตัวอย่างของแพ็กและเสียงฟรีของร้าน กดสลับเสียงระหว่างที่เดโมเล่นเพื่อเทียบกันได้ทันที",
};

export default async function DemoPage({ searchParams }: PageProps<"/demo">) {
  const { pack } = await searchParams;
  const packs: DemoPack[] = listProducts().map((p) => {
    const instrument = getInstrument(p.instrument);
    return {
      slug: p.slug,
      name: p.name,
      model: instrument.model,
      color: instrument.color,
      patches: p.patches.map((patch) => ({ ...patch, clip: clipFor(p.slug, patch.name) })),
    };
  });

  return (
    <Container className="flex flex-col gap-8 pb-10">
      <PageHeader title="ฟังเดโม">กดเล่น แล้วแตะสลับเสียงระหว่างที่เดโมเล่นอยู่ ฟังได้ทุกแพ็กก่อนตัดสินใจ</PageHeader>
      <DemoPlayer packs={packs} initialPack={typeof pack === "string" ? pack : undefined} />
    </Container>
  );
}
