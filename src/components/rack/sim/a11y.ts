/**
 * Thai names for screen readers on the MODX M and FANTOM-0 simulator pages (S14).
 * The visible text stays the keyboard's own words; these names add what each control does, in Thai.
 * Knobs and sliders already take Tab and the arrow keys (Knob.tsx, Fader.tsx); SimControls.tsx wraps
 * them in a named group so the Thai name is read out with them.
 */

/** True when the text has Thai letters. */
export const hasThai = (s: string) => /[฀-๿]/.test(s);

export const MODX_LABELS = {
  assignKnob: (n: number, name: string) => `ปุ่มหมุน Knob ${n} (${name}) ใช้ลูกศรเพื่อหมุน`,
  superKnob: "ปุ่มหมุน Super Knob ใช้ลูกศรเพื่อหมุน",
  splitData: "ปุ่มหมุน DATA ตั้งโน้ตของ Split Point ใช้ลูกศรเพื่อหมุน",
  rangeData: "ปุ่มหมุน DATA ตั้งค่าของช่องที่เลือก ใช้ลูกศรเพื่อหมุน",
  partFader: (n: number) => `สไลเดอร์ระดับเสียง PART ${n} ใช้ลูกศรเพื่อเลื่อน`,
  dec: "DEC ลดค่าลงหนึ่งขั้น",
  inc: "INC เพิ่มค่าขึ้นหนึ่งขั้น",
  keyboardEntry: "KEYBOARD ตั้งโน้ตด้วยการกดคีย์",
  shift: "SHIFT เปิดหรือปิด ใช้กับปุ่มอื่นเพื่อหน้าที่ที่สอง",
  splitExit: "EXIT ออกจากหน้า Split Job",
  splitDone: "Done ยืนยันและออกจากหน้า Split Job",
  rangeView: (view: string) => `เปิดหน้า ${view}`,
  rangeExit: "EXIT ออกจากหน้าตั้งช่วงของ Part",
  scene: (n: number, store: boolean) => (store ? `เก็บค่าปัจจุบันไว้ที่ SCENE ${n}` : `เรียก SCENE ${n}`),
  readyMap: "ใช้เลข CC ตามเอกสาร Yamaha กับปุ่มบนหน้า ยังไม่ได้ทดสอบกับเครื่องจริง",
} as const;

export const FANTOM_LABELS = {
  panKnob: (n: number) => `ปุ่มหมุน PAN ของ ZONE ${n} ใช้ลูกศรเพื่อหมุน`,
  ctrlKnob: (job: string, zone: number) => `ปุ่มหมุน ${job} ของ ZONE ${zone} ใช้ลูกศรเพื่อหมุน`,
  levelFader: (n: number) => `สไลเดอร์ LEVEL ของ ZONE ${n} ใช้ลูกศรเพื่อเลื่อน`,
  knobMode: (mode: string) => (mode === "CTRL" ? "ปุ่มหมุนทำหน้าที่ CTRL ของ ZONE ปัจจุบัน" : "ปุ่มหมุนทำหน้าที่ PAN และสไลเดอร์ทำหน้าที่ LEVEL"),
  split: (state: "off" | "armed" | "on") =>
    state === "on" ? "SPLIT เปิดอยู่ กดเพื่อปิด" : state === "armed" ? "SPLIT รอคีย์ กดคีย์เพื่อตั้งจุดแบ่ง หรือกดอีกครั้งเพื่อยกเลิก" : "SPLIT กดแล้วกดคีย์เพื่อตั้งจุดแบ่ง",
  padMode: "PAD MODE กดแล้วเลือก Pad เพื่อเปลี่ยนหน้าที่ของ Pad",
} as const;

/** Names used for the USB connect button on both pages, so the button says what it does. */
export const connectLabel = (status: string) => `${status} · เล่นจากคีย์บอร์ดจริงผ่าน USB ยังไม่ได้ทดสอบกับเครื่องจริง`;
