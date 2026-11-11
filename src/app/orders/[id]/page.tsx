import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MockPaymentPanel } from "@/components/checkout/MockPaymentPanel";
import { OrderStatusPoller } from "@/components/checkout/OrderStatusPoller";
import { QrCode } from "@/components/checkout/QrCode";
import { Container } from "@/components/layout/Container";
import { isDemoMode } from "@/lib/env";
import { formatDateTime, formatTHB, maskEmail } from "@/lib/format";
import { getOrder, type Order, type OrderStatus } from "@/lib/orders";
import { getProvider } from "@/lib/payments";

export const metadata: Metadata = { title: "คำสั่งซื้อ", robots: { index: false } };
export const dynamic = "force-dynamic";

const statusLabel: Record<OrderStatus, { text: string; className: string }> = {
  pending: { text: "รอชำระเงิน", className: "bg-sun text-ink" },
  paid: { text: "ชำระเงินแล้ว", className: "bg-ok text-white" },
  failed: { text: "ชำระเงินไม่สำเร็จ", className: "bg-sale text-white" },
  expired: { text: "QR หมดอายุ", className: "bg-surface text-muted" },
};

function Summary({ order }: { order: Order }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 rounded-lg border border-line p-5 text-sm">
      <dt className="text-muted">สินค้า</dt>
      <dd className="text-right font-medium">{order.productName}</dd>
      <dt className="text-muted">ยอดชำระ</dt>
      <dd className="text-right font-semibold tabular-nums">{formatTHB(order.amountSatang)}</dd>
      <dt className="text-muted">ส่งไฟล์ไปที่</dt>
      <dd className="truncate text-right">{maskEmail(order.email)}</dd>
      <dt className="text-muted">เลขอ้างอิง</dt>
      <dd className="truncate text-right font-mono text-xs">{order.providerRef}</dd>
      <dt className="text-muted">สั่งซื้อเมื่อ</dt>
      <dd className="text-right">{formatDateTime(order.createdAt)}</dd>
    </dl>
  );
}

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const order = await getOrder(decodeURIComponent(id));
  if (!order) notFound();

  const provider = getProvider(order.provider);
  const status = statusLabel[order.status];

  return (
    <Container className="flex max-w-3xl flex-col gap-6 py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">คำสั่งซื้อ</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}>
          {status.text}
        </span>
      </div>

      {order.status === "pending" ? (
        <>
          {!isDemoMode ? <OrderStatusPoller /> : null}
          <section className="grid items-center gap-6 rounded-lg bg-surface p-5 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-60">
              <QrCode payload={order.qrPayload} label="QR สำหรับชำระเงิน" />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <h2 className="text-xl font-semibold">สแกนเพื่อจ่าย {formatTHB(order.amountSatang)}</h2>
              <ol className="list-decimal pl-5 text-sm text-muted">
                <li>เปิดแอปธนาคารแล้วเลือกสแกน QR</li>
                <li>ตรวจยอดเงินให้ตรงกับยอดชำระ แล้วยืนยัน</li>
                <li>หน้านี้จะเปลี่ยนเป็น “ชำระเงินแล้ว” เมื่อธนาคารยืนยัน</li>
              </ol>
              <p className="text-sm">
                QR ใช้ได้ถึง <strong>{formatDateTime(order.expiresAt)}</strong>
              </p>
            </div>
          </section>
          {provider.isMock ? <MockPaymentPanel orderId={order.id} /> : null}
        </>
      ) : null}

      {order.status === "paid" ? (
        <section className="flex flex-col gap-2 rounded-lg bg-ok/10 p-5">
          <h2 className="text-xl font-semibold">ขอบคุณที่สั่งซื้อ</h2>
          <p className="text-muted">
            ได้รับการชำระเงินเมื่อ {order.paidAt ? formatDateTime(order.paidAt) : "-"}
          </p>
          <p className="rounded-md border border-dashed border-ok/50 bg-canvas p-4 text-sm">
            ลิงก์ดาวน์โหลดไฟล์เสียงจะแสดงตรงนี้และส่งทางอีเมล ส่วนนี้ยังไม่ได้เชื่อมกับไฟล์จริง
          </p>
        </section>
      ) : null}

      {order.status === "failed" || order.status === "expired" ? (
        <section className="flex flex-col items-start gap-3 rounded-lg bg-surface p-5">
          <h2 className="text-xl font-semibold">
            {order.status === "failed" ? "การชำระเงินไม่สำเร็จ" : "QR นี้หมดอายุแล้ว"}
          </h2>
          <p className="text-muted">ยังไม่มีการตัดเงิน คุณสร้างคำสั่งซื้อใหม่เพื่อรับ QR อันใหม่ได้</p>
          <Link
            href={`/checkout/${order.productSlug}`}
            className="rounded-md bg-ink px-5 py-2.5 font-display font-semibold text-white hover:bg-brand"
          >
            สั่งซื้ออีกครั้ง
          </Link>
        </section>
      ) : null}

      <Summary order={order} />
    </Container>
  );
}
