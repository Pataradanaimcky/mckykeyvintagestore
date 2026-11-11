import { site } from "@/config/site";
import { Container } from "./Container";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <Container className="flex flex-col gap-2 py-8 text-sm text-muted">
        <p className="font-display font-semibold text-ink">{site.name}</p>
        <p>ติดต่อ: {site.contact}</p>
        <p className="text-xs">
          Yamaha, MODX และ MONTAGE เป็นเครื่องหมายการค้าของ Yamaha Corporation ส่วน Roland และ D-50
          เป็นเครื่องหมายการค้าของ Roland Corporation ร้านนี้เป็นผู้ผลิตเสียงอิสระ
          ไม่ได้เป็นตัวแทนและไม่ได้รับการรับรองจากทั้งสองบริษัท ชื่อยี่ห้อและรุ่นใช้เพื่อบอกว่าแพ็กใช้กับเครื่องใดเท่านั้น
        </p>
      </Container>
    </footer>
  );
}
