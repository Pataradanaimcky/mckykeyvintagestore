/**
 * Keyboards the studio page can arrange for. Each profile says how many parts
 * the keyboard layers, what it calls each setting, and how its parts listen to
 * MIDI, so the page can speak the keyboard's own language.
 *
 * `verified: false` means the numbers are a best reading and still need
 * checking against the maker's manual. See docs/STUDIO.md before changing one.
 */

export type MachineId = "modx-m" | "fantom-0" | "xps-30" | "xps-10" | "d-50";

/** How the keyboard names notes: Yamaha calls middle C "C3", Roland calls it "C4". */
export type NoteNaming = "yamaha" | "roland";

export interface Machine {
  id: MachineId;
  /** Maker and model, as plain text. */
  name: string;
  /** Short label for tabs. */
  short: string;
  /** Number of layered parts (or zones) in one saved sound. */
  maxParts: number;
  /** Keyboard sizes the model comes in. */
  keySizes: number[];
  naming: NoteNaming;
  /** Fixed names for the parts, when the keyboard uses names instead of numbers. */
  partNames?: string[];
  terms: {
    /** One saved combination of parts. */
    set: string;
    part: string;
    level: string;
    pan: string;
    keyRange: string;
    velocityRange: string;
    octave: string;
  };
  /** Level range on the keyboard (MODX and FANTOM: 0..127). */
  levelMax: number;
  /** Whether the keyboard can sound each part on its own MIDI channel (needed for playing it from this page over USB). */
  multiChannel: boolean;
  /** How to set the keyboard up so this page can play its parts over USB. */
  usbHint: string;
  /** One line on how the parts work. */
  about: string;
  verified: boolean;
  /** Where the facts came from. */
  sources: string[];
}

export const MACHINES: Machine[] = [
  {
    id: "modx-m",
    name: "Yamaha MODX M",
    short: "MODX M",
    maxParts: 16,
    keySizes: [61, 76, 88],
    naming: "yamaha",
    terms: {
      set: "Performance",
      part: "Part",
      level: "Volume",
      pan: "Pan",
      keyRange: "Note Limit",
      velocityRange: "Velocity Limit",
      octave: "Octave",
    },
    levelMax: 127,
    multiChannel: true,
    usbHint:
      "ปิด Keyboard Control ของพาร์ตที่จะเล่นจากเว็บ แล้วตั้ง Receive Channel ของแต่ละพาร์ตให้ตรงกับช่องในเว็บ (พาร์ต 1 = ช่อง 1)",
    about: "Performance หนึ่งชุดมีได้ 16 พาร์ต เปิด Keyboard Control เพื่อเล่นหลายพาร์ตพร้อมกันจากคีย์บอร์ด",
    verified: true,
    sources: ["https://files.kraftmusic.com/media/ownersmanual/Yamaha_MODX_M6_Operation_Manual.pdf"],
  },
  {
    id: "fantom-0",
    name: "Roland FANTOM-0",
    short: "FANTOM-0",
    maxParts: 16,
    keySizes: [61, 76, 88],
    naming: "roland",
    terms: {
      set: "Scene",
      part: "Zone",
      level: "Level",
      pan: "Pan",
      keyRange: "Keyboard Range",
      velocityRange: "Velocity Range",
      octave: "Octave Shift",
    },
    levelMax: 127,
    multiChannel: true,
    usbHint: "ตั้ง Receive Channel ของแต่ละโซนให้ตรงกับช่องในเว็บ (โซน 1 = ช่อง 1)",
    about: "Scene หนึ่งชุดมีได้ 16 โซน แต่ละโซนเลือกโทน ช่วงคีย์ และช่วงความแรงได้เอง",
    verified: true,
    sources: ["https://static.roland.com/assets/media/pdf/FANTOM-06_07_08_Parameter_eng01_W.pdf"],
  },
  {
    id: "xps-30",
    name: "Roland XPS-30",
    short: "XPS-30",
    maxParts: 2,
    keySizes: [61],
    naming: "roland",
    partNames: ["Upper", "Lower"],
    terms: {
      set: "Performance",
      part: "Part",
      level: "Level",
      pan: "Pan",
      keyRange: "Split Point",
      velocityRange: "Velocity Range",
      octave: "Octave Shift",
    },
    levelMax: 127,
    multiChannel: false,
    usbHint: "ตั้ง Split/Dual บนเครื่อง แล้วเล่นจากเว็บผ่านช่องของ Performance",
    about: "ยังไม่ได้ยืนยันจากคู่มือ: ใช้แบบ Split/Dual สองพาร์ตเหมือน XPS-10 ไปก่อน",
    verified: false,
    sources: ["https://www.roland.com/global/products/xps-30/support/"],
  },
  {
    id: "xps-10",
    name: "Roland XPS-10",
    short: "XPS-10",
    maxParts: 2,
    keySizes: [61],
    naming: "roland",
    partNames: ["Upper", "Lower"],
    terms: {
      set: "Performance",
      part: "Part",
      level: "Level",
      pan: "Pan",
      keyRange: "Split Point",
      velocityRange: "Velocity Range",
      octave: "Octave Shift",
    },
    levelMax: 127,
    multiChannel: false,
    usbHint: "ตั้ง Split หรือ Dual บนเครื่อง (กดปุ่ม SPLIT/DUAL ค้างแล้วกดคีย์เพื่อตั้งจุดแบ่ง)",
    about: "รวมได้สองโทน: Split แบ่งมือซ้าย/ขวา (Upper เริ่มที่จุดแบ่ง) หรือ Dual ซ้อนกัน",
    verified: true,
    sources: ["https://static.roland.com/assets/media/pdf/XPS-10_eng05_W.pdf"],
  },
  {
    id: "d-50",
    name: "Roland D-50",
    short: "D-50",
    maxParts: 2,
    keySizes: [61],
    naming: "roland",
    partNames: ["Upper", "Lower"],
    terms: {
      set: "Patch",
      part: "Tone",
      level: "Tone Balance",
      pan: "Pan",
      keyRange: "Split Point",
      velocityRange: "Velocity Range",
      octave: "Key Shift",
    },
    levelMax: 100,
    multiChannel: false,
    usbHint: "ซินธ์วินเทจ: ใช้หน้านี้วางแผน Upper/Lower แล้วตั้ง Key Mode บนเครื่องเอง",
    about: "ยังไม่ได้ยืนยันจากคู่มือ: Patch หนึ่งชุดมีโทน Upper กับ Lower เล่นแบบ Whole, Dual หรือ Split",
    verified: false,
    sources: [],
  },
];

export const DEFAULT_MACHINE: MachineId = "modx-m";

export function getMachine(id: string): Machine {
  return MACHINES.find((m) => m.id === id) ?? MACHINES[0];
}

/** Lowest and highest MIDI note of a keyboard with `keys` keys. */
export function keyboardRange(keys: number): { lo: number; hi: number } {
  if (keys >= 88) return { lo: 21, hi: 108 };
  if (keys >= 76) return { lo: 28, hi: 103 };
  if (keys >= 73) return { lo: 28, hi: 100 };
  if (keys >= 49 && keys < 61) return { lo: 36, hi: 84 };
  return { lo: 36, hi: 96 };
}

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Note name in the keyboard's own convention: MIDI 60 is "C3" on Yamaha and "C4" on Roland. */
export function noteName(midi: number, naming: NoteNaming = "roland"): string {
  const octave = Math.floor(midi / 12) - (naming === "yamaha" ? 2 : 1);
  return `${NAMES[((midi % 12) + 12) % 12]}${octave}`;
}

export const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
