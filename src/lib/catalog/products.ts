import type { Category, Product } from "./types";

/**
 * The catalog. Names, prices and counts are SAMPLE DATA until real packs exist.
 * To add a pack, add one object here. Nothing else needs to change.
 */

export const categories: Category[] = [
  { id: "keys", label: "เปียโนและคีย์" },
  { id: "pads", label: "แพดและสตริง" },
  { id: "bass-brass", label: "เบสและบราส" },
  { id: "bundle", label: "ชุดรวม" },
];

export const products: Product[] = [
  {
    slug: "thai-pop-keys-vol-1",
    name: "Thai Pop Keys Vol.1",
    summary: "เปียโนไฟฟ้า เบลล์ แพด ครบสำหรับเพลงไทยยุค 80–90",
    description:
      "แพ็กเริ่มต้นสำหรับนักคีย์บอร์ดเล่นสด ทุกเสียงตั้ง Scene สลับท่อนเพลงและ Super Knob ไว้แล้ว โหลดเสร็จเล่นได้ทันที",
    category: "keys",
    priceSatang: 59000,
    compareAtSatang: 79000,
    performances: 32,
    engines: "AWM2 + FM-X",
    status: "available",
    badge: "ใหม่",
    cover: { from: "#1f3fff", to: "#7c5cff", label: "VOL.1" },
    patches: [
      { tag: "Key", name: "Sukhumvit EP" },
      { tag: "Key", name: "Ballad FM Tine" },
      { tag: "Pf", name: "Lakorn Grand + Str" },
      { tag: "Pad", name: "Midnight Soi Pad" },
      { tag: "Bell", name: "90s Idol Bell" },
      { tag: "Bass", name: "City Slap FM" },
      { tag: "Brs", name: "Showa Brass Hit" },
      { tag: "Ld", name: "Luk Krung Lead" },
    ],
  },
  {
    slug: "city-pop-ep-collection",
    name: "City Pop EP Collection",
    summary: "เปียโนไฟฟ้า FM และ Rhodes โทนซิตี้ป๊อป",
    description:
      "รวมเสียงเปียโนไฟฟ้าสำหรับเพลงซิตี้ป๊อป ตั้งคอรัสและเทรโมโลไว้บน Super Knob",
    category: "keys",
    priceSatang: 49000,
    performances: 24,
    engines: "FM-X + AWM2",
    status: "coming_soon",
    cover: { from: "#ff5c8a", to: "#ffb347", label: "EP" },
    patches: [
      { tag: "Key", name: "Neon Avenue Tine" },
      { tag: "Key", name: "Shibuya Dyno" },
      { tag: "Key", name: "Seaside Wurly" },
      { tag: "Key", name: "Night Drive DX" },
    ],
  },
  {
    slug: "lakorn-ballad-pianos",
    name: "Lakorn Ballad Pianos",
    summary: "เปียโนซ้อนสตริงสำหรับเพลงช้าและเพลงประกอบละคร",
    description:
      "เปียโนอะคูสติกที่จัดเลเยอร์สตริงและแพดไว้ให้ คุมน้ำหนักเลเยอร์ด้วย Super Knob",
    category: "keys",
    priceSatang: 39000,
    performances: 16,
    engines: "AWM2",
    status: "coming_soon",
    cover: { from: "#0f766e", to: "#5eead4", label: "PF" },
    patches: [
      { tag: "Pf", name: "Prime Time Grand" },
      { tag: "Pf", name: "Tearjerker Layer" },
      { tag: "Pf", name: "Wedding Song Pf" },
      { tag: "Pf", name: "Soft Felt + Pad" },
    ],
  },
  {
    slug: "midnight-pads",
    name: "Midnight Pads",
    summary: "แพดอุ่นและสตริงอนาล็อกสำหรับรองพื้นเพลง",
    description:
      "แพดที่ค่อย ๆ เปิดฟิลเตอร์ตาม Super Knob เหมาะกับท่อนอินโทรและท่อนเบรก",
    category: "pads",
    priceSatang: 39000,
    performances: 20,
    engines: "AN-X + AWM2",
    status: "coming_soon",
    cover: { from: "#312e81", to: "#a78bfa", label: "PAD" },
    patches: [
      { tag: "Pad", name: "Soi 11 After Dark" },
      { tag: "Pad", name: "Juno Chorus Bed" },
      { tag: "Str", name: "Tape Strings 84" },
      { tag: "Pad", name: "Glass Morning" },
    ],
  },
  {
    slug: "fm-bass-and-brass",
    name: "FM Bass & Brass",
    summary: "เบสสแลป FM และบราสฮิตแบบยุค 80",
    description:
      "เบสและบราสที่ตัดมิกซ์ชัดบนเวที แยก Scene สำหรับท่อนร้องและท่อนโซโล",
    category: "bass-brass",
    priceSatang: 39000,
    performances: 20,
    engines: "FM-X",
    status: "coming_soon",
    cover: { from: "#b45309", to: "#fde047", label: "FM" },
    patches: [
      { tag: "Bass", name: "City Slap FM" },
      { tag: "Bass", name: "Rubber Lately" },
      { tag: "Brs", name: "Showa Brass Hit" },
      { tag: "Brs", name: "Horn Stab 86" },
    ],
  },
  {
    slug: "stage-essentials-bundle",
    name: "Stage Essentials Bundle",
    summary: "รวมทุกแพ็กในราคาชุด สำหรับงานแบ็กอัพทั้งโชว์",
    description:
      "ชุดรวมทุกแพ็กของร้าน จัดหมวดไว้ใน Live Set ให้เรียกเสียงตามลำดับเพลงได้",
    category: "bundle",
    priceSatang: 129000,
    compareAtSatang: 196000,
    performances: 112,
    engines: "AWM2 + FM-X + AN-X",
    status: "coming_soon",
    badge: "คุ้มสุด",
    cover: { from: "#111827", to: "#4b5563", label: "ALL" },
    patches: [
      { tag: "Set", name: "Live Set: Pop Show" },
      { tag: "Set", name: "Live Set: Ballad Night" },
      { tag: "Set", name: "Live Set: City Pop" },
      { tag: "Set", name: "Live Set: Wedding" },
    ],
  },
];
