import { site } from "@/config/site";
import { Container } from "./Container";

/** Thin strip above the header. Shows the sample-data notice until real packs exist. */
export function AnnouncementBar() {
  if (!site.isSampleCatalog) return null;
  return (
    <div className="border-b border-line bg-surface text-muted">
      <Container className="py-2 text-center text-xs sm:text-sm">
        ร้านอยู่ระหว่างทดสอบ ชื่อแพ็กและราคาเป็นตัวอย่าง ระบบชำระเงินเป็นแบบจำลอง ยังไม่มีการเก็บเงินจริง
      </Container>
    </div>
  );
}
