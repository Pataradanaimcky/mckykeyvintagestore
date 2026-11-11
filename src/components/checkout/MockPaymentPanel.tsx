import { simulatePayment } from "@/app/orders/[id]/actions";

/** Test controls shown only while the payment simulator is the active provider. */
export function MockPaymentPanel({ orderId }: { orderId: string }) {
  return (
    <form
      action={simulatePayment}
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-ink/30 bg-sun/20 p-5"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <h2 className="font-semibold">โหมดทดสอบ</h2>
      <p className="text-sm text-muted">
        QR นี้เป็นแบบจำลอง สแกนจ่ายเงินไม่ได้ ใช้ปุ่มด้านล่างเพื่อจำลองผลการชำระเงินแทน
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="outcome"
          value="paid"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          จำลองว่าจ่ายสำเร็จ
        </button>
        <button
          type="submit"
          name="outcome"
          value="failed"
          className="rounded-full border border-ink/40 bg-canvas px-5 py-2.5 text-sm font-semibold hover:border-ink"
        >
          จำลองว่าจ่ายไม่สำเร็จ
        </button>
      </div>
    </form>
  );
}
