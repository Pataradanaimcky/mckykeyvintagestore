import type { Metadata } from "next";
import { FaqList } from "@/components/catalog/FaqList";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { site } from "@/config/site";
import { faqs } from "@/content/faq";

export const metadata: Metadata = {
  title: "คำถามที่พบบ่อย",
  description: "คำตอบเรื่องการซื้อ การรับไฟล์ การใช้งาน และการคืนเงิน",
};

export default function FaqPage() {
  return (
    <Container className="flex flex-col gap-8 pb-10">
      <PageHeader title="คำถามที่พบบ่อย">ถ้ายังไม่เจอคำตอบ ติดต่อร้านได้โดยตรง</PageHeader>
      <div data-reveal className="max-w-3xl">
        <FaqList items={faqs} />
      </div>
      <p data-reveal className="rounded-3xl bg-surface p-6 text-muted">
        ติดต่อ: {site.contact}
      </p>
    </Container>
  );
}
