import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CompatibilityTable } from "@/components/catalog/CompatibilityTable";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { instruments } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "รุ่นที่ใช้ได้",
  description: "ตรวจว่าแพ็กเสียงใช้กับคีย์บอร์ดรุ่นของคุณได้หรือไม่ พร้อมวิธีติดตั้ง",
};

export default function CompatibilityPage() {
  return (
    <Container className="flex flex-col gap-10 pb-10">
      <PageHeader title="รุ่นที่ใช้ได้">
        แต่ละแพ็กทำมาสำหรับเครื่องรุ่นเดียว ไฟล์ของเครื่องหนึ่งใช้กับอีกเครื่องไม่ได้ ตรวจรุ่นของคุณก่อนซื้อ
      </PageHeader>

      {instruments.map((instrument, index) => (
        <section
          key={instrument.id}
          data-reveal
          style={{ "--d": `${index * 90}ms` } as CSSProperties}
          className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]"
        >
          <CompatibilityTable instrument={instrument} />
          <div className="flex min-w-0 flex-col gap-4 rounded-3xl bg-surface p-6">
            <h2 className="text-xl font-semibold">
              วิธีติดตั้งบน {instrument.maker} {instrument.model}
            </h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-muted">
              {instrument.installSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <Link href={`/packs?inst=${instrument.id}`} className="btn btn-dark self-start">
              ดูแพ็กของเครื่องนี้ <span aria-hidden="true" className="btn-arrow">→</span>
            </Link>
          </div>
        </section>
      ))}
    </Container>
  );
}
