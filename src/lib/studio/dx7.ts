/**
 * DX7 voice data for the sound organizer: packing voices (VCED, 155 bytes)
 * into a 32-voice cartridge (VMEM) and the system-exclusive file formats.
 *
 * Formats per the Yamaha DX7 manual's MIDI data format:
 *   single voice  F0 43 0n 00 01 1B <155 bytes> <checksum> F7
 *   32 voices     F0 43 0n 09 20 00 <4096 bytes> <checksum> F7
 * The checksum is the 7-bit two's complement of the sum of the data bytes.
 * `packVoice` is the exact inverse of `unpack` in @audio/synth-dx7 (MSFA), which
 * the tests check.
 */

export const voiceName = (patch: ArrayLike<number>) =>
  String.fromCharCode(...Array.from(patch).slice(145, 155)).trimEnd();

/** Writes a name as 10 printable ASCII characters. */
export function setVoiceName(patch: ArrayLike<number>, name: string): Uint8Array {
  const p = Uint8Array.from(patch);
  const clean = name.replace(/[^\x20-\x7e]/g, " ").slice(0, 10).padEnd(10, " ");
  for (let i = 0; i < 10; i++) p[145 + i] = clean.charCodeAt(i);
  return p;
}

export const checksum = (data: ArrayLike<number>) => {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return (128 - (sum & 127)) & 127;
};

/** One voice as a single-voice bulk dump, for MIDI channel 1..16. */
export function voiceSysex(patch: ArrayLike<number>, channel = 1): Uint8Array {
  const data = Uint8Array.from(patch).subarray(0, 155);
  return Uint8Array.from([0xf0, 0x43, (channel - 1) & 15, 0x00, 0x01, 0x1b, ...data, checksum(data), 0xf7]);
}

/** VCED voice (155 bytes) → packed cartridge voice (128 bytes). */
export function packVoice(p: ArrayLike<number>): Uint8Array {
  const b = new Uint8Array(128);
  for (let op = 0; op < 6; op++) {
    const o = op * 21;
    const k = op * 17;
    for (let i = 0; i < 11; i++) b[k + i] = p[o + i];
    b[k + 11] = (p[o + 11] & 3) | ((p[o + 12] & 3) << 2);
    b[k + 12] = (p[o + 13] & 7) | ((p[o + 20] & 15) << 3);
    b[k + 13] = (p[o + 14] & 3) | ((p[o + 15] & 7) << 2);
    b[k + 14] = p[o + 16];
    b[k + 15] = (p[o + 17] & 1) | ((p[o + 18] & 31) << 1);
    b[k + 16] = p[o + 19];
  }
  for (let i = 0; i < 9; i++) b[102 + i] = p[126 + i];
  b[111] = (p[135] & 7) | ((p[136] & 1) << 3);
  for (let i = 0; i < 4; i++) b[112 + i] = p[137 + i];
  b[116] = (p[141] & 1) | ((p[142] & 7) << 1) | ((p[143] & 7) << 4);
  for (let i = 0; i < 11; i++) b[117 + i] = p[144 + i];
  return b;
}

/** Up to 32 voices as a cartridge bulk dump. Empty slots are filled with `fill`. */
export function bankSysex(voices: ArrayLike<number>[], fill: ArrayLike<number>, channel = 1): Uint8Array {
  const data = new Uint8Array(4096);
  for (let i = 0; i < 32; i++) data.set(packVoice(voices[i] ?? fill), i * 128);
  return Uint8Array.from([0xf0, 0x43, (channel - 1) & 15, 0x09, 0x20, 0x00, ...data, checksum(data), 0xf7]);
}

export type DumpCheck = { ok: true; channel: number } | { ok: false; reason: string };

/**
 * Checks a message received from a DX7 (Web MIDI, read only) before it is used:
 * a 32-voice bulk dump F0 43 0n 09 20 00 <4096 bytes> <checksum> F7, 4104 bytes.
 * The DX7 sends it from its panel (FUNCTION, button 8 MIDI, SYS INFO AVAIL,
 * MIDI TRANSMIT ? → YES); it does not answer voice dump requests, so nothing is
 * ever sent to it from here. Reasons are in Thai for the page.
 */
export function checkCartridgeDump(msg: ArrayLike<number>): DumpCheck {
  if (msg.length < 6 || msg[0] !== 0xf0 || msg[1] !== 0x43) return { ok: false, reason: "ไม่ใช่ข้อมูลจาก Yamaha" };
  if (msg[2] >> 4 !== 0 || msg[3] !== 0x09 || msg[4] !== 0x20 || msg[5] !== 0x00) return { ok: false, reason: "ไม่ใช่ข้อมูล 32 เสียงของ DX7" };
  if (msg.length !== 4104 || msg[4103] !== 0xf7) return { ok: false, reason: "ข้อมูลมาไม่ครบ ลองส่งจากเครื่องอีกครั้ง" };
  const data = Array.prototype.slice.call(msg, 6, 4102) as number[];
  if (checksum(data) !== msg[4102]) return { ok: false, reason: "ข้อมูลเสียหายระหว่างทาง (checksum ไม่ตรง) ลองส่งอีกครั้ง" };
  return { ok: true, channel: (msg[2] & 15) + 1 };
}
