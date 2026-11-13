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

/*
 * Identity Request / Identity Reply (Universal Non-realtime, General Information),
 * from the same MIDI Implementation v1.00, read only:
 * - Identity Request (received): F0 7E dev 06 01 F7, dev 10H–1FH or 7FH (broadcast).
 *   "When this message is received, Identity Reply message will be transmitted."
 * - Identity Reply (transmitted): F0 7E dev 06 02 41 5B 03 00 01 rr 03 00 00 F7,
 *   41H Roland, 5BH 03H device family code, 00H 01H device family number code,
 *   then the software revision, given per model: FANTOM-06 00H 03H 00H 00H,
 *   FANTOM-07 01H 03H 00H 00H, FANTOM-08 02H 03H 00H 00H.
 * Nothing here is used by the page yet; it is for finding which USB port is a
 * FANTOM-0 without relying on the port name. Not tested on a real keyboard.
 */

/** Identity Request. 7FH asks every device; 10H–1FH asks one Device ID. */
export function identityRequest(device = 0x7f): Uint8Array {
  if (!Number.isInteger(device) || !(device === 0x7f || (device >= 0x10 && device <= 0x1f))) {
    throw new RangeError("device is 10H–1FH or 7FH");
  }
  return Uint8Array.from([0xf0, 0x7e, device, 0x06, 0x01, 0xf7]);
}

export type FantomModel = "FANTOM-06" | "FANTOM-07" | "FANTOM-08";

const IDENTITY_HEAD = [0x06, 0x02, 0x41, 0x5b, 0x03, 0x00, 0x01] as const;
const MODEL_BY_REVISION: Record<number, FantomModel> = { 0x00: "FANTOM-06", 0x01: "FANTOM-07", 0x02: "FANTOM-08" };

export interface FantomIdentity {
  /** Device ID the keyboard answered with (10H–1FH). */
  device: number;
  /** Model from the first software revision byte, or undefined if the value is not in the manual. */
  model?: FantomModel;
  /** The four software revision bytes as sent. */
  revision: number[];
}

/**
 * Reads an Identity Reply. Gives null unless it is Roland's FANTOM-0 family
 * (family code 5B 03, family number 00 01). The model is named only for the
 * revision values printed in the manual; later firmware may send other values.
 */
export function readIdentityReply(msg: ArrayLike<number>): FantomIdentity | null {
  const m = Array.from(msg);
  if (m.length !== 15 || m[0] !== 0xf0 || m[1] !== 0x7e || m[14] !== 0xf7) return null;
  if (m[2] < 0x10 || m[2] > 0x1f) return null;
  if (IDENTITY_HEAD.some((b, i) => m[3 + i] !== b)) return null;
  const revision = m.slice(10, 14);
  if (revision.some((b) => b > 0x7f)) return null;
  const printed = revision[1] === 0x03 && revision[2] === 0x00 && revision[3] === 0x00;
  return { device: m[2], model: printed ? MODEL_BY_REVISION[revision[0]] : undefined, revision };
}

/**
 * Finds which USB output is a FANTOM-0: the page sends one Identity Request
 * (7FH) to each output in turn and calls `hear` with every message that comes
 * back while that output is being asked. The first FANTOM-0 Identity Reply
 * marks the output; its Device ID is then used for the RQ1. Read only, not
 * tested on a real keyboard (a reply may arrive late and be counted for the
 * next output; the page leaves a gap between outputs for that reason).
 */
export class FantomPortFinder {
  private index = 0;
  private hit: { output: string; identity: FantomIdentity } | null = null;
  private readonly outputs: readonly string[];

  constructor(outputs: readonly string[]) {
    this.outputs = outputs;
  }

  /** The output being asked now, or undefined when all have been asked. */
  current(): string | undefined {
    return this.hit ? undefined : this.outputs[this.index];
  }

  /** Moves on to the next output. */
  next() {
    if (!this.hit) this.index++;
  }

  /** Reads a message heard while `current()` was asked; true once a FANTOM-0 is found. */
  hear(msg: ArrayLike<number>): boolean {
    if (this.hit) return true;
    const output = this.outputs[this.index];
    const identity = output === undefined ? null : readIdentityReply(msg);
    if (!identity) return false;
    this.hit = { output, identity };
    return true;
  }

  /** The output that answered as a FANTOM-0 and its identity, or null. */
  found() {
    return this.hit;
  }
}
