import Link from "next/link";
import { Container } from "@/components/layout/Container";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-3xl font-semibold">ไม่พบหน้านี้</h1>
      <p className="text-muted">ลิงก์อาจพิมพ์ผิด หรือสินค้านี้ถูกนำออกแล้ว</p>
      <Link
        href="/"
        className="rounded-full bg-ink px-5 py-2.5 font-semibold text-white hover:bg-brand-dark"
      >
        กลับหน้าร้าน
      </Link>
    </Container>
  );
}
