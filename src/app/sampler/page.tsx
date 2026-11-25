import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { AutoSamplerLoader } from "@/components/rack/sim/AutoSamplerLoader";

export const metadata: Metadata = {
  title: "อัดเสียงจากคีย์บอร์ด",
  description:
    "อัดเสียงจากคีย์บอร์ดของคุณทีละโน้ตผ่าน USB แล้วบันทึกเป็นไฟล์ WAV พร้อม manifest และ .sfz ไว้ในเครื่องของคุณ ไม่มีการอัปโหลด",
};

export default function SamplerPage() {
  return (
    <Container className="flex flex-col gap-8 pb-10">
      <PageHeader title="อัดเสียงจากคีย์บอร์ด">
        ให้เว็บกดโน้ตบนคีย์บอร์ดของคุณทีละโน้ตแล้วอัดเสียงเก็บไว้ เพื่อนำไปเล่นต่อในเครื่องมืออื่น หรือเปิดในหน้าจำลอง{" "}
        <Link href="/#play-modxm" className="underline underline-offset-2">
          MODX M
        </Link>{" "}
        และ{" "}
        <Link href="/#play-fantom" className="underline underline-offset-2">
          FANTOM-0
        </Link>{" "}
        ด้วยปุ่ม “โหลดชุดเสียงที่อัดเอง”
      </PageHeader>
      <AutoSamplerLoader />
    </Container>
  );
}
