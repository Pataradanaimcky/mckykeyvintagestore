import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { currentUser, signOut } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { formatDateTime, formatTHB } from "@/lib/format";
import { listOrdersForUser, type OrderStatus } from "@/lib/orders";

export const metadata: Metadata = { title: "บัญชีของฉัน", robots: { index: false } };

const statusText: Record<OrderStatus, string> = {
  pending: "รอชำระเงิน",
  paid: "ชำระเงินแล้ว",
  failed: "ชำระเงินไม่สำเร็จ",
  expired: "QR หมดอายุ",
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");

  const orders = await listOrdersForUser(user.id);

  return (
    <Container className="flex max-w-3xl flex-col gap-8 pb-10">
      <PageHeader title="บัญชีของฉัน" />

      <section className="rise flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface p-6">
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{user.name ?? "ลูกค้า"}</p>
          {user.email ? <p className="truncate text-muted">{user.email}</p> : null}
          {user.provider ? <p className="text-sm text-muted">เข้าสู่ระบบด้วย {user.provider}</p> : null}
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="btn btn-light">
            ออกจากระบบ
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">คำสั่งซื้อของฉัน</h2>
        {orders.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4 transition-colors hover:bg-surface"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{order.productName}</span>
                    <span className="block text-sm text-muted">{formatDateTime(order.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-4 tabular-nums">
                    <span className="text-sm text-muted">{statusText[order.status]}</span>
                    <span className="font-semibold">{formatTHB(order.amountSatang)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-6 text-muted">
            {isDemoMode
              ? "ร้านยังอยู่ในโหมดทดสอบที่ไม่เก็บคำสั่งซื้อ จึงยังไม่มีประวัติให้แสดง"
              : "ยังไม่มีคำสั่งซื้อที่ทำขณะเข้าสู่ระบบ"}
          </p>
        )}
        <Link href="/packs" className="btn btn-dark self-start">
          ดูแพ็กเสียง <span aria-hidden="true" className="btn-arrow">→</span>
        </Link>
      </section>
    </Container>
  );
}
