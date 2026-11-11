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
    instrument: "yamaha-modx-m",
    category: "keys",
    priceSatang: 59000,
    compareAtSatang: 79000,
    soundCount: 32,
    engines: "AWM2 + FM-X",
    status: "available",
    badge: "ใหม่",
    cover: { label: "VOL.1", color: "#0b4ea2" },
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
    instrument: "yamaha-modx-m",
    category: "keys",
    priceSatang: 49000,
    soundCount: 24,
    engines: "FM-X + AWM2",
    status: "coming_soon",
    cover: { label: "EP", color: "#b0205a" },
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
    instrument: "yamaha-modx-m",
    category: "keys",
    priceSatang: 39000,
    soundCount: 16,
    engines: "AWM2",
    status: "coming_soon",
    cover: { label: "PF", color: "#1f6b4c" },
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
    instrument: "yamaha-modx-m",
    category: "pads",
    priceSatang: 39000,
    soundCount: 20,
    engines: "AN-X + AWM2",
    status: "coming_soon",
    cover: { label: "PAD", color: "#5a3d9a" },
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
    instrument: "yamaha-modx-m",
    category: "bass-brass",
    priceSatang: 39000,
    soundCount: 20,
    engines: "FM-X",
    status: "coming_soon",
    cover: { label: "FM", color: "#9a5b00" },
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
    instrument: "yamaha-modx-m",
    category: "bundle",
    priceSatang: 129000,
    compareAtSatang: 196000,
    soundCount: 112,
    engines: "AWM2 + FM-X + AN-X",
    status: "coming_soon",
    badge: "คุ้มสุด",
    cover: { label: "ALL", color: "#2b2b2b" },
    patches: [
      { tag: "Set", name: "Live Set: Pop Show" },
      { tag: "Set", name: "Live Set: Ballad Night" },
      { tag: "Set", name: "Live Set: City Pop" },
      { tag: "Set", name: "Live Set: Wedding" },
    ],
  },
  {
    slug: "ballad-bells-la",
    name: "Ballad Bells LA",
    summary: "เบลล์และแพดใสแบบเพลงช้ายุค 80",
    description:
      "เสียงเบลล์ แพด และเปียโนไฟฟ้าที่โปรแกรมใหม่ทั้งหมดบน D-50 สำหรับเพลงบัลลาดและเพลงไทยยุค 80",
    instrument: "roland-d-50",
    category: "keys",
    priceSatang: 39000,
    soundCount: 32,
    engines: "LA Synthesis",
    status: "coming_soon",
    cover: { label: "LA", color: "#7a3520" },
    patches: [
      { tag: "Bell", name: "Glass Ballad" },
      { tag: "Pad", name: "Soft Air Choir" },
      { tag: "Key", name: "Digital Tine 87" },
      { tag: "Bell", name: "Music Box Rain" },
    ],
  },
];
