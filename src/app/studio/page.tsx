import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudioLoader } from "@/components/studio/StudioLoader";
import { clipFor } from "@/content/demos";
import { listProducts, type InstrumentId } from "@/lib/catalog";
import type { DemoPackInfo, TargetId } from "@/lib/studio/library";

export const metadata: Metadata = {
  title: "จัดเรียงเสียง",
  description:
    "จัดลำดับเสียงที่ทำไว้ในคีย์บอร์ด: แบงก์ DX7 (.syx), Live Set ของ MODX M และ Scene ของ FANTOM-0 ลองกับแบงก์เดโมของร้านได้ แล้วดาวน์โหลดไฟล์หรือใบจัดเรียงไปใช้บนเครื่อง",
};

const TARGET_OF: Record<InstrumentId, TargetId> = {
  "yamaha-modx-m": "modx-m",
  "roland-fantom-0": "fantom-0",
};

export default function StudioPage() {
  // Each store pack can open as a demo bank on the keyboard it is made for.
  const packs: DemoPackInfo[] = listProducts().map((p) => ({
    slug: p.slug,
    name: p.name,
    target: TARGET_OF[p.instrument],
    patches: p.patches.map((patch) => ({ tag: patch.tag, name: patch.name, clip: clipFor(p.slug, patch.name) })),
  }));

  return (
    <Container className="flex flex-col gap-8 pb-10">
      <PageHeader title="จัดเรียงเสียง">
        ทำเสียงบนคีย์บอร์ดตามปกติ แล้วมาจัดลำดับที่นี่บนจอใหญ่ ลากวางได้เลย ง่ายกว่าเลื่อนทีละช่องบนเครื่อง
      </PageHeader>
      <StudioLoader packs={packs} />
    </Container>
  );
}
