/**
 * Text of the "วิธีเล่น" fold on the MODX M and FANTOM-0 simulator pages (SIMULATOR.md S13).
 * Only facts already written in docs/SIMULATOR.md and what the pages already do; anything the
 * manuals do not print is said to be the store's own reading, and USB is marked untested.
 */
import { KEYS } from "../patch.ts";

export type HowToSection = { heading: string; lines: string[] };

export const HOW_TO_TITLE = "วิธีเล่น";
export const UNTESTED = "ยังไม่ได้ทดสอบกับเครื่องจริง";

const upper = (k: string) => k.toUpperCase();
/** Computer keys, taken from the rack's own key map so the text cannot drift from it. */
export const computerKeysText = () => {
  const white = KEYS.filter((k) => !k.black).map((k) => upper(k.key));
  const black = KEYS.filter((k) => k.black).map((k) => upper(k.key));
  const first = KEYS[0].note;
  const last = KEYS[KEYS.length - 1].note;
  return `คีย์คอมพิวเตอร์: ${white.join(" ")} = คีย์ขาว ${first} ถึง ${last} · ${black.join(" ")} = คีย์ดำ`;
};

const playSection = (octaveLine: string): HowToSection => ({
  heading: "เล่นโน้ต",
  lines: [
    "แตะหรือคลิกคีย์บนจอหนึ่งครั้งก่อน เพื่อให้เบราว์เซอร์เปิดเสียง กดหลายคีย์พร้อมกันได้",
    computerKeysText(),
    octaveLine,
    `คีย์บอร์ดจริง: ต่อสาย USB แล้วกด "ต่อคีย์บอร์ด USB" ใช้ได้ใน Chrome หรือ Edge บนคอมพิวเตอร์และ Android (Safari บน iPhone ไม่มี Web MIDI) เล่นโน้ต แรงกด sustain และ pitch bend ได้ · ${UNTESTED}`,
    `LEARN: กด LEARN แล้วหมุนปุ่มหรือเลื่อนสไลเดอร์บนคีย์บอร์ด ปุ่มบนหน้าจะขยับตาม · ${UNTESTED}`,
  ],
});

export const MODX_HOW_TO: HowToSection[] = [
  playSection("OCT − / + เลื่อนคีย์บนจอและคีย์คอมพิวเตอร์ทีละอ็อกเทฟ"),
  {
    heading: "Performance และ PART",
    lines: [
      "เลือก Performance ที่ − / + หรือรายการใต้ CATEGORY / USB",
      "ปุ่ม PART 1–8 เลือก Part · สไลเดอร์ใต้ PART LEVEL ปรับระดับเสียงของแต่ละ Part",
      "SHIFT แล้ว PART SELECT = เปิดหรือปิด MUTE ของ Part ที่เลือก",
    ],
  },
  {
    heading: "Super Knob, Knob และ SCENE",
    lines: [
      "Super Knob หมุนหลายค่าพร้อมกัน · LEFT / MID / RIGHT เรียกค่าที่เก็บไว้ · SHIFT แล้วกดปุ่มนั้น = เก็บค่า",
      "KNOB: ASSIGN สลับ Knob 1–4 กับ 5–8 (กดแต่ละครั้งสลับไปอีกชุด เป็นการอ่านของร้าน)",
      "SCENE 1–8 เรียกค่าของ Part (ระดับเสียง MUTE และ Super Knob) · SHIFT แล้ว SCENE = เก็บ",
    ],
  },
  {
    heading: "แบ่งคีย์และซ้อนเสียง",
    lines: [
      "SPLIT เปิด Split Job: เลือกจำนวน Split Point ตั้งโน้ต แล้วแตะ Group A–D ให้แต่ละ Part · Done หรือ EXIT = ใช้ค่า · × = ปิดโดยไม่ใช้ค่า",
      "Part ที่อยู่ Group เดียวกันจะซ้อนเสียงกัน · ช่วงคีย์ของแต่ละ Group และคีย์ Split Point อยู่กลุ่มบน เป็นการอ่านของร้าน",
      "SHIFT แล้ว SPLIT เปิด Part - Note (ช่วงโน้ต) และ Velocity - Note (ช่วงแรงกด) ของแต่ละ Part · แตะช่องแล้วหมุน DATA หรือกด INC / DEC",
    ],
  },
  {
    heading: "เสียงที่ได้ยิน",
    lines: [
      "จำลองการทำงานแบบ MODX M ไม่ใช่เสียงจริงของเครื่อง Performance ทั้งหมดเป็นของร้าน ไม่ใช่เสียงโรงงาน",
      "ถ้าจอขึ้น SAMPLE ERROR กด \"โหลดเสียงอีกครั้ง\"",
    ],
  },
];

export const FANTOM_HOW_TO: HowToSection[] = [
  playSection("OCTAVE และ TRANSPOSE ใต้ KEYS เลื่อนเฉพาะคีย์บนจอและคีย์คอมพิวเตอร์ ไม่เลื่อนโน้ตจากคีย์บอร์ด USB"),
  {
    heading: "Scene และ ZONE",
    lines: [
      "เลือก Scene ที่ − / + หรือรายการใต้ SCENE SELECT / USB",
      "ZONE INT/EXT 1–8: ไฟติด = ZONE ทำงาน · ติดหลาย ZONE = ซ้อนเสียง",
      "PAN/LEVEL: ปุ่มหมุน = PAN สไลเดอร์ = ระดับเสียงของแต่ละ ZONE",
      "CTRL: ปุ่มหมุน 1–8 = ATTACK, RELEASE, REVERB, CHORUS, LOW / MID / HIGH GAIN, EQ ON ของ ZONE ปัจจุบัน (ช่วงค่าเป็นของร้าน)",
      "ZONE SELECT แล้วกดปุ่ม ZONE ที่ไฟติด = เลือก ZONE ปัจจุบัน",
    ],
  },
  {
    heading: "แบ่งคีย์",
    lines: ["SPLIT แล้วกดคีย์หนึ่งตัว = จุดแบ่ง: คีย์นั้นและสูงกว่าเล่น ZONE 1 ต่ำกว่าเล่น ZONE 4 · กด SPLIT อีกครั้ง = กลับมาซ้อนกัน"],
  },
  {
    heading: "PAD",
    lines: [
      "ตอนเริ่ม Pad เลือก Scene (ทางลัดของร้าน บนเครื่องเลือก Scene ที่จอ SCENE SELECT)",
      "PAD MODE แล้วกด Pad 5 = ZONE MUTE (Pad = ZONE) · Pad 6 = ZONE SOLO (ฟังทีละ ZONE) · Pad 16 = SYSTEM (กลับมาเลือก Scene)",
    ],
  },
  {
    heading: "เสียงที่ได้ยิน",
    lines: [
      "จำลองการทำงานแบบ FANTOM-0 ไม่ใช่เสียงจริงของเครื่อง Scene และ tone ทั้งหมดเป็นของร้าน ไม่ใช่เสียงโรงงาน",
      "ถ้าจอขึ้น SAMPLE ERROR กด \"โหลดเสียงอีกครั้ง\"",
    ],
  },
];
