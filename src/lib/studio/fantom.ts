/**
 * FANTOM-0 (FANTOM-06/07/08) Scene Name over MIDI, read only. Used by the
 * "รับชื่อ Scene" button on /studio (behind a confirmation); not tested on a real keyboard.
 *
 * From Roland's FANTOM-06/07/08 MIDI Implementation (v1.00):
 * - Data Request 1 (RQ1): F0 41 dev 00 00 00 5B 11 aa bb cc dd ss tt uu vv sum F7
 * - Data Set 1 (DT1):     F0 41 dev 00 00 00 5B 12 aa bb cc dd data… sum F7
 *   (worked example: F0 41 10 00 00 00 5B 12 02 00 00 10 4A 24 F7)
 * - Checksum: add the address and data (or size) bytes, divide by 128,
 *   checksum = 128 − remainder (kept to 7 bits, so remainder 0 gives 00).
 * - Device ID 10H–1FH; 10H is device 17, the value in Roland's example.
 * - Parameter Address Map: 02 00 00 00 Temporary Scene; Scene Common at
 *   offset 00 00 00; Scene Name 1–16 at 00 00–00 0F, each 32–127 (ASCII).
 *
 * The address map lists only the Temporary Scene (the scene being played), not
 * the stored scenes A001–D128, so only the name of the scene on screen can be
 * asked for. Nothing here writes to the keyboard.
 */

export const FANTOM_NAME_LENGTH = 16;
export const FANTOM_DEVICE_ID = 0x10;

const MODEL = [0x00, 0x00, 0x00, 0x5b] as const;
const RQ1 = 0x11;
const DT1 = 0x12;
/** Temporary Scene, Scene Common, Scene Name 1. */
export const SCENE_NAME_ADDRESS = [0x02, 0x00, 0x00, 0x00] as const;

/** Roland checksum over the address and data (or size) bytes. */
export function rolandChecksum(bytes: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < bytes.length; i++) sum += bytes[i];
  return (128 - (sum % 128)) & 0x7f;
}

/** RQ1 asking for the 16 Scene Name characters of the scene on screen. Asks only. */
export function sceneNameRequest(device = FANTOM_DEVICE_ID): Uint8Array {
  if (!Number.isInteger(device) || device < 0x10 || device > 0x1f) throw new RangeError("device is 10H–1FH");
  const body = [...SCENE_NAME_ADDRESS, 0x00, 0x00, 0x00, FANTOM_NAME_LENGTH];
  return Uint8Array.from([0xf0, 0x41, device, ...MODEL, RQ1, ...body, rolandChecksum(body), 0xf7]);
}

export interface SceneNameBytes {
  /** First character position (0–15). */
  start: number;
  bytes: number[];
}

/**
 * Reads a DT1 holding Scene Name characters of the Temporary Scene
 * (address 02 00 00 0x). Other messages, other addresses, characters outside
 * 32–127 or a bad checksum give null.
 */
export function readSceneNameReply(msg: ArrayLike<number>): SceneNameBytes | null {
  const m = Array.from(msg);
  if (m.length < 15 || m[0] !== 0xf0 || m[1] !== 0x41 || m[m.length - 1] !== 0xf7) return null;
  if (m[2] < 0x10 || m[2] > 0x1f) return null;
  if (MODEL.some((b, i) => m[3 + i] !== b) || m[7] !== DT1) return null;
  const addr = m.slice(8, 12);
  const data = m.slice(12, -2);
  if (rolandChecksum([...addr, ...data]) !== m[m.length - 2]) return null;
  if (addr[0] !== 0x02 || addr[1] !== 0x00 || addr[2] !== 0x00) return null;
  const start = addr[3];
  if (data.length === 0 || start + data.length > FANTOM_NAME_LENGTH) return null;
  if (data.some((b) => b < 32 || b > 127)) return null;
  return { start, bytes: data };
}

/** Collects Scene Name characters; gives the name once all 16 are in. */
export class SceneNameCollector {
  private chars: (number | undefined)[] = new Array(FANTOM_NAME_LENGTH);

  add(reply: SceneNameBytes) {
    reply.bytes.forEach((b, i) => (this.chars[reply.start + i] = b));
  }

  /** The name with trailing spaces removed, or undefined while characters are missing. */
  name(): string | undefined {
    for (let i = 0; i < FANTOM_NAME_LENGTH; i++) if (this.chars[i] === undefined) return undefined;
    return (this.chars as number[]).map((b) => String.fromCharCode(b)).join("").replace(/\s+$/, "");
  }
}
