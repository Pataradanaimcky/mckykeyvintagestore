/**
 * MODX M Live Set names over MIDI, read only.
 *
 * From Yamaha's MODX M Data List (MIDI Data Format 3-5-3 to 3-5-6 and the
 * MIDI PARAMETER CHANGE TABLE (LIVE SET), pp. 228–229):
 * - Parameter Request: F0 43 3n 7F 1C 0D aa aa aa aa F7
 * - Parameter Change:  F0 43 1n 7F 1C 0D aa aa aa aa dd F7
 * - Bulk Dump:         F0 43 0n 7F 1C bh bl 0D aa aa aa aa dd… cc F7
 *   (checksum: Model ID + address + data + cc has its lower 7 bits zero)
 * - Live Set Slot Name: 03 2p 0s 00–13 (p = page 0–15, s = slot 0–15),
 *   20 one-byte characters, 00 or 20–7E (ASCII).
 * - "n" = Device No.; the instrument receives under "omni", so requests use 0.
 *
 * Nothing here writes to the keyboard: only requests are built, and replies
 * are read. Not yet tested on a real MODX M.
 */

export const MODX_NAME_LENGTH = 20;

/**
 * Shown when no MODX M port is found or no name comes back. From the MODX M
 * Operation Manual (Kraft Music copy of Yamaha's MODX M6 Operation Manual):
 * [UTILITY] → Settings → MIDI I/O, "MIDI IN/OUT" (USB, MIDI) picks the
 * terminal used to send and receive MIDI (p. 368); [UTILITY] → Settings →
 * Advanced, "Device Number" (Off, All, 16–1) (p. 371). The Operation Manual
 * prints no default; the Data List does for MIDI IN/OUT (see below), not for
 * Device Number.
 */
export const MODX_USB_HELP =
  "บนเครื่องดู [UTILITY] → Settings → MIDI I/O → MIDI IN/OUT ต้องเป็น USB (ค่าเริ่มต้นของเครื่องคือ USB ถ้าเคยเปลี่ยนเป็น MIDI เครื่องจะรับส่ง MIDI ทางช่อง MIDI 5 ขาแทน) " +
  "และ [UTILITY] → Settings → Advanced → Device Number เป็น All หรือ 1 (ถ้าเป็น Off เครื่องจะไม่ตอบ)";

/**
 * Advanced → "Bulk Receive" (Protect, On) only decides whether the keyboard
 * takes Bulk Dump messages (Operation Manual p. 372). The organizer sends only
 * Parameter Requests, so Bulk Receive can stay at Protect: one more guard that
 * nothing is written to the keyboard.
 */
export const MODX_BULK_NOTE =
  "Bulk Receive ([UTILITY] → Settings → Advanced) ปล่อยเป็น Protect ได้ หน้านี้ไม่ส่ง Bulk Dump เข้าเครื่อง";

/**
 * MIDI IN/OUT as printed in the Data List, MIDI PARAMETER CHANGE TABLE
 * (SYSTEM), p. 226: "22 2 00 00 – 00 01 MIDI IN/OUT MIDI, USB 00 01"
 * (address 00 00 00 22, size 2, data 0 = MIDI, 1 = USB, default 00 01 = USB).
 * Kept for reference only: the organizer never sends a Parameter Change.
 * The same table has no Device Number row, so its default is still unknown.
 */
export const MODX_MIDI_IN_OUT = {
  address: [0x00, 0x00, 0x00, 0x22],
  values: ["MIDI", "USB"],
  defaultValue: 1,
} as const;

const HEAD = [0x43, 0x7f, 0x1c, 0x0d] as const;

function inRange(page: number, slot: number) {
  return Number.isInteger(page) && Number.isInteger(slot) && page >= 0 && page < 16 && slot >= 0 && slot < 16;
}

/** Address of one Slot Name character in the Live Set (Data List p. 229). */
export function slotNameAddress(page: number, slot: number, char = 0): [number, number, number, number] {
  if (!inRange(page, slot) || !Number.isInteger(char) || char < 0 || char >= MODX_NAME_LENGTH) {
    throw new RangeError("page and slot are 0–15, char is 0–19");
  }
  return [0x03, 0x20 | page, slot, char];
}

/** Parameter Request for one Slot Name character. Asks only; changes nothing on the keyboard. */
export function slotNameRequest(page: number, slot: number, char: number): Uint8Array {
  return Uint8Array.from([0xf0, 0x43, 0x30, 0x7f, 0x1c, 0x0d, ...slotNameAddress(page, slot, char), 0xf7]);
}

/** All 20 requests for one slot's name. */
export function slotNameRequests(page: number, slot: number): Uint8Array[] {
  return Array.from({ length: MODX_NAME_LENGTH }, (_, c) => slotNameRequest(page, slot, c));
}

export interface NameBytes {
  page: number;
  slot: number;
  /** First character position (0–19). */
  start: number;
  bytes: number[];
}

/**
 * Reads a reply holding Slot Name characters: a Parameter Change or a Bulk Dump
 * whose address is 03 2p 0s xx. Anything else (other addresses, bad checksum,
 * other makers) gives null.
 */
export function readSlotNameReply(msg: ArrayLike<number>): NameBytes | null {
  const m = Array.from(msg);
  if (m.length < 12 || m[0] !== 0xf0 || m[m.length - 1] !== 0xf7 || m[1] !== 0x43) return null;
  const kind = m[2] & 0xf0;
  let addr: number[];
  let data: number[];
  if (kind === 0x10) {
    if (m[3] !== HEAD[1] || m[4] !== HEAD[2] || m[5] !== HEAD[3]) return null;
    addr = m.slice(6, 10);
    data = m.slice(10, -1);
  } else if (kind === 0x00) {
    if (m.length < 14 || m[3] !== HEAD[1] || m[4] !== HEAD[2] || m[7] !== HEAD[3]) return null;
    const count = (m[5] << 7) | m[6];
    addr = m.slice(8, 12);
    data = m.slice(12, -2);
    // Byte count is not stated precisely enough to rely on; accept address + data or data alone.
    if (count !== data.length && count !== data.length + 4) return null;
    const sum = [HEAD[3], ...addr, ...data, m[m.length - 2]].reduce((a, b) => a + b, 0);
    if ((sum & 0x7f) !== 0) return null;
  } else {
    return null;
  }
  if (addr[0] !== 0x03 || (addr[1] & 0xf0) !== 0x20 || addr[2] > 0x0f) return null;
  const start = addr[3];
  if (data.length === 0 || start + data.length > MODX_NAME_LENGTH) return null;
  if (data.some((b) => b !== 0 && (b < 0x20 || b > 0x7e))) return null;
  return { page: addr[1] & 0x0f, slot: addr[2], start, bytes: data };
}

/** Collects name characters as replies arrive, then gives names per page and slot. */
export class SlotNameCollector {
  private chars = new Map<string, (number | undefined)[]>();

  add(reply: NameBytes) {
    const key = `${reply.page}:${reply.slot}`;
    const row = this.chars.get(key) ?? new Array<number | undefined>(MODX_NAME_LENGTH);
    reply.bytes.forEach((b, i) => (row[reply.start + i] = b));
    this.chars.set(key, row);
  }

  /** The name once all 20 characters have arrived, trailing spaces and 00 removed; otherwise undefined. */
  name(page: number, slot: number): string | undefined {
    const row = this.chars.get(`${page}:${slot}`);
    if (!row) return undefined;
    for (let i = 0; i < MODX_NAME_LENGTH; i++) if (row[i] === undefined) return undefined;
    const text = (row as number[]).map((b) => (b === 0 ? " " : String.fromCharCode(b))).join("");
    return text.replace(/\s+$/, "");
  }
}

/** All 320 requests (16 slots × 20 characters) for one Live Set page, slot by slot. */
export function pageNameRequests(page: number): Uint8Array[] {
  return Array.from({ length: 16 }, (_, s) => slotNameRequests(page, s)).flat();
}

/**
 * The 16 slot names of one page from what has arrived: a name once all 20
 * characters are in, "" for a slot whose name is all spaces, undefined if
 * characters are still missing.
 */
export function namesOnPage(collector: SlotNameCollector, page: number): (string | undefined)[] {
  return Array.from({ length: 16 }, (_, s) => collector.name(page, s));
}

/**
 * Puts received names into a page of the organizer. Slots that got a name get a
 * new sound with that name; the sounds that were in those slots move to the
 * front of the shelf, so nothing is lost. Slots with no reply, or a blank name,
 * are left as they were. Returns the new slots, the sounds for the shelf and how
 * many names were placed.
 */
export function placeNames<T extends { name: string }>(
  slots: (T | null)[],
  names: (string | undefined)[],
  make: (name: string) => T,
): { slots: (T | null)[]; shelved: T[]; placed: number } {
  const shelved: T[] = [];
  let placed = 0;
  const next = slots.map((old, i) => {
    const name = names[i];
    if (!name) return old;
    placed++;
    if (old) shelved.push(old);
    return make(name);
  });
  return { slots: next, shelved, placed };
}
