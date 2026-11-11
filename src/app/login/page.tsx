import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { currentUser, safeNextPath, signIn, signInOptions, supportedPlatforms } from "@/lib/auth";

export const metadata: Metadata = { title: "เข้าสู่ระบบ", robots: { index: false } };

const errorText: Record<string, string> = {
  OAuthAccountNotLinked: "อีเมลนี้เคยใช้เข้าสู่ระบบด้วยช่องทางอื่น กรุณาใช้ช่องทางเดิม",
  AccessDenied: "การเข้าสู่ระบบถูกยกเลิก",
  Configuration: "ร้านเชื่อมต่อกับแพลตฟอร์มนี้ไม่สำเร็จ กรุณาลองช่องทางอื่นหรือแจ้งร้าน",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = safeNextPath(next);
  if (await currentUser()) redirect(nextPath);

  return (
    <Container className="flex max-w-xl flex-col gap-8 pb-10">
      <PageHeader title="เข้าสู่ระบบ">
        เข้าสู่ระบบด้วยบัญชีที่คุณมีอยู่แล้ว ไม่ต้องตั้งรหัสผ่านใหม่ ร้านจะไม่เห็นรหัสผ่านของคุณ
      </PageHeader>

      {typeof error === "string" ? (
        <p role="alert" className="rounded-2xl border border-sale/50 bg-sale/10 p-4 text-sm">
          {errorText[error] ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"}
        </p>
      ) : null}

      {signInOptions.length > 0 ? (
        <ul className="rise flex flex-col gap-3">
          {signInOptions.map((option) => (
            <li key={option.id}>
              <form
                action={async () => {
                  "use server";
                  await signIn(option.id, { redirectTo: nextPath });
                }}
              >
                <button type="submit" className="btn btn-light w-full justify-between">
                  เข้าสู่ระบบด้วย {option.label}
                  <span aria-hidden="true" className="btn-arrow">
                    →
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-2 rounded-3xl border border-dashed border-line p-6">
          <p className="font-semibold">ยังไม่เปิดให้เข้าสู่ระบบ</p>
          <p className="text-sm text-muted">
            ร้านรองรับการเข้าสู่ระบบด้วย {supportedPlatforms.join(", ")} แต่ยังไม่ได้เชื่อมกับแพลตฟอร์มใดเลย
            ระหว่างนี้ซื้อแพ็กได้ตามปกติโดยไม่ต้องเข้าสู่ระบบ
          </p>
        </div>
      )}

      <p className="text-sm text-muted">ไม่ต้องเข้าสู่ระบบก็ซื้อได้ การเข้าสู่ระบบช่วยให้ดูคำสั่งซื้อย้อนหลังได้ในที่เดียว</p>
    </Container>
  );
}
