import { site } from "@/config/site";
import { Container } from "./Container";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <Container className="flex flex-col gap-2 py-8 text-sm text-muted">
        <p className="font-display font-semibold text-ink">{site.name}</p>
        <p>ติดต่อ: {site.contact}</p>
        <p className="text-xs">
          MODX และ MONTAGE เป็นเครื่องหมายการค้าของ Yamaha Corporation
          ร้านนี้เป็นผู้ผลิตเสียงอิสระ ไม่ได้เป็นตัวแทนหรือได้รับการรับรองจาก Yamaha
        </p>
      </Container>
    </footer>
  );
}
