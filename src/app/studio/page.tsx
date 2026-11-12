import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudioLoader } from "@/components/studio/StudioLoader";

export const metadata: Metadata = {
  title: "จัดเรียงเสียง",
  description:
    "จัดลำดับเสียงที่ทำไว้ในคีย์บอร์ด: แบงก์ DX7 (.syx), Live Set ของ MODX M และ Scene ของ FANTOM-0 แล้วดาวน์โหลดไฟล์หรือใบจัดเรียงไปใช้บนเครื่อง",
};

export default function StudioPage() {
  return (
    <Container className="flex flex-col gap-8 pb-10">
      <PageHeader title="จัดเรียงเสียง">
        ทำเสียงบนคีย์บอร์ดตามปกติ แล้วมาจัดลำดับที่นี่บนจอใหญ่ ลากวางได้เลย ง่ายกว่าเลื่อนทีละช่องบนเครื่อง
      </PageHeader>
      <StudioLoader />
    </Container>
  );
}
