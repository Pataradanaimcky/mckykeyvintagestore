import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { StudioLoader } from "@/components/studio/StudioLoader";

export const metadata: Metadata = {
  title: "สตูดิโอจัดเสียง",
  description:
    "จัดพาร์ต เลเยอร์ และจุดแบ่งคีย์สำหรับ MODX M, FANTOM-0, XPS และซินธ์วินเทจ ฟังในเว็บหรือผ่าน USB แล้วดาวน์โหลดใบตั้งค่าไปทำตามบนเครื่อง",
};

export default function StudioPage() {
  return (
    <Container className="flex flex-col gap-8 pb-10">
      <PageHeader title="สตูดิโอจัดเสียง">
        จัดพาร์ต ซ้อนเสียง และแบ่งคีย์บนจอใหญ่ ง่ายกว่ากดบนเครื่อง ฟังได้ทันที แล้วเอาไปตั้งบนคีย์บอร์ดของคุณ
      </PageHeader>
      <StudioLoader />
    </Container>
  );
}
