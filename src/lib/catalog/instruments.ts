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
    id: "roland-d-50",
    maker: "Roland",
    model: "D-50",
    worksWith: "D-50 / D-550 และปลั๊กอิน D-50 ที่อ่านไฟล์ SysEx ได้",
    fileFormat: ".SYX",
    soundUnit: "Patch",
    compatibility: [
      { model: "D-50 / D-550", ok: true, note: "ส่งไฟล์ผ่าน MIDI" },
      { model: "ปลั๊กอิน D-50 ที่รองรับ SysEx", ok: true, note: "นำเข้าไฟล์ .SYX" },
      { model: "ซินธ์ Roland รุ่นอื่น", ok: false, note: "ใช้ไฟล์นี้ไม่ได้" },
    ],
    installSteps: [
      "สำรองเสียงเดิมในเครื่องก่อน เพราะการโหลดจะเขียนทับเสียงในหน่วยความจำ",
      "ต่อสาย MIDI จากคอมพิวเตอร์เข้าช่อง MIDI IN ของเครื่อง",
      "ตั้งเครื่องให้พร้อมรับข้อมูล Bulk Load ตามคู่มือของเครื่อง",
      "ส่งไฟล์ .SYX จากโปรแกรมส่ง SysEx บนคอมพิวเตอร์",
    ],
  },
];
