import type { Instrument } from "./types";

/**
 * Keyboards the store makes packs for. Maker and model names appear only as plain
 * text that says what a pack works with. Never add maker logos or product artwork.
 */
export const instruments: Instrument[] = [
  {
    id: "yamaha-modx-m",
    maker: "Yamaha",
    model: "MODX M",
    worksWith: "MODX M6 / M7 / M8 และ MONTAGE M",
    color: "#2f5bff",
    fileFormat: ".Y2L",
    soundUnit: "Performance",
    compatibility: [
      { model: "MODX M6 / M7 / M8", ok: true, note: "โหลดเป็น Library ได้เลย" },
      { model: "MONTAGE M6 / M7 / M8x", ok: true, note: "โหลดเป็น Library ได้เลย" },
      { model: "ปลั๊กอิน ESP", ok: true, note: "เปิดบนคอมพิวเตอร์" },
      { model: "MODX / MODX+ รุ่นเดิม", ok: false, note: "ไฟล์คนละรูปแบบ (.X8L)" },
    ],
    installSteps: [
      "ดาวน์โหลดไฟล์ .Y2L จากอีเมลยืนยันการสั่งซื้อ แล้วคัดลอกลง USB แฟลชไดรฟ์",
      "เสียบ USB ที่เครื่อง กด UTILITY แล้วเลือก Contents → Load",
      "ตั้ง Content Type เป็น Library File แล้วแตะชื่อไฟล์",
      "เปิด Category Search แล้วเลือก Bank เป็นชื่อแพ็กเพื่อเรียกเสียง",
    ],
  },
  {
    id: "roland-fantom-0",
    maker: "Roland",
    model: "FANTOM-0",
    worksWith: "FANTOM-06 / 07 / 08",
    color: "#d92d4a",
    fileFormat: ".SVZ",
    soundUnit: "Tone",
    compatibility: [
      { model: "FANTOM-06 / 07 / 08", ok: true, note: "นำเข้าจาก USB ได้เลย" },
      { model: "ซินธ์ Roland รุ่นอื่น", ok: false, note: "ยังไม่ได้ทดสอบ ไม่รับรองว่าใช้ได้" },
    ],
    installSteps: [
      "ดาวน์โหลดไฟล์ .SVZ จากอีเมลยืนยันการสั่งซื้อ แล้วคัดลอกลง USB แฟลชไดรฟ์",
      "เสียบ USB ที่เครื่อง กด MENU แล้วเลือก UTILITY → IMPORT → IMPORT TONE",
      "เลือกไฟล์ของแพ็ก แล้วเลือกเสียงที่ต้องการนำเข้า",
      "เลือกตำแหน่ง User ที่จะเก็บเสียง แล้วกดยืนยัน",
    ],
  },
];
