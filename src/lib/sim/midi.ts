/**
 * MIDI in for the simulator pages (read only: nothing is sent to the keyboard).
 * Only the general MIDI 1.0 channel messages every keyboard sends are read here: note on / off,
 * control change and pitch bend. Which CC a keyboard control sends is not assumed; the visitor
 * teaches the page with "learn" (turn a control, the page takes its CC). See docs/SIMULATOR.md, S8.
 */

export type MidiEvent =
  | { type: "noteOn"; channel: number; note: number; velocity: number }
  | { type: "noteOff"; channel: number; note: number }
  | { type: "cc"; channel: number; cc: number; value: number }
  | { type: "bend"; channel: number; value: number };

/** Reads one channel message. Running status and system messages are ignored (returns null). */
export function parseMidi(data: ArrayLike<number> | null | undefined): MidiEvent | null {
  if (!data || data.length < 3) return null;
  const status = data[0];
  if (status < 0x80 || status >= 0xf0) return null;
  const kind = status & 0xf0;
  const channel = status & 0x0f;
  const a = data[1] & 0x7f;
  const b = data[2] & 0x7f;
  if (kind === 0x90 && b > 0) return { type: "noteOn", channel, note: a, velocity: b / 127 };
  if (kind === 0x80 || kind === 0x90) return { type: "noteOff", channel, note: a };
  if (kind === 0xb0) return { type: "cc", channel, cc: a, value: b };
  // Pitch bend: 14 bits, LSB first, 8192 = centre. -1 … +1 (8191 up rounds to just under 1).
  if (kind === 0xe0) return { type: "bend", channel, value: Math.max(-1, ((b << 7) | a) / 8192 - 1) };
  return null;
}

/**
 * Pitch bend range of the simulator pages, in semitones each way. The store's own choice: the
 * keyboards' part bend range is in their Data Lists, not yet read (docs/SIMULATOR.md, S8b).
 */
export const BEND_RANGE = 2;

/** Bend value (-1 … +1, from parseMidi) → cents, at `range` semitones each way. */
export function bendCents(value: number, range = BEND_RANGE): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value)) * range * 100;
}

/** Sustain (damper) pedal is CC 64 in MIDI 1.0; 64 and above is down. */
export const SUSTAIN_CC = 64;

/**
 * CCs that learn will not take: 0 and 32 (Bank Select), 64 (sustain, already used),
 * 120–127 (channel mode messages such as All Notes Off). Defined in the MIDI 1.0 specification.
 */
export const RESERVED_CCS: ReadonlySet<number> = new Set([0, 32, SUSTAIN_CC, 120, 121, 122, 123, 124, 125, 126, 127]);

export interface LearnState<T extends string> {
  /** The page control waiting for a CC, or null. */
  learning: T | null;
  /** Page control → CC number. */
  map: Partial<Record<T, number>>;
}

export const emptyLearn = <T extends string>(): LearnState<T> => ({ learning: null, map: {} });

/** Starts learning for `target`, or stops if it is already learning. */
export function toggleLearn<T extends string>(state: LearnState<T>, target: T): LearnState<T> {
  return { ...state, learning: state.learning === target ? null : target };
}

/** Removes the CC learnt for `target`. */
export function forget<T extends string>(state: LearnState<T>, target: T): LearnState<T> {
  const map = { ...state.map };
  delete map[target];
  return { learning: state.learning === target ? null : state.learning, map };
}

/**
 * Handles one CC. While learning, the CC is given to the waiting control (taken away from any
 * other control that had it) and learning stops. Returns the new state and the controls to move,
 * each with a value 0…1.
 */
export function handleCc<T extends string>(
  state: LearnState<T>,
  cc: number,
  value: number,
): { state: LearnState<T>; set: { target: T; value: number }[] } {
  if (RESERVED_CCS.has(cc)) return { state, set: [] };
  let next = state;
  if (state.learning) {
    const map = { ...state.map };
    for (const k of Object.keys(map) as T[]) if (map[k] === cc) delete map[k];
    map[state.learning] = cc;
    next = { learning: null, map };
  }
  const v = Math.min(1, Math.max(0, value / 127));
  const set = (Object.keys(next.map) as T[]).filter((k) => next.map[k] === cc).map((target) => ({ target, value: v }));
  return { state: next, set };
}

/** The part of a MIDIAccess the pages use, so it can be mocked in tests. */
export interface MidiAccessLike {
  inputs: { values(): IterableIterator<MidiInputLike> | Iterable<MidiInputLike> };
  onstatechange: ((e: unknown) => void) | null;
}
export interface MidiInputLike {
  name?: string | null;
  onmidimessage: ((e: { data: Uint8Array | null }) => void) | null;
}

/**
 * Listens on every input of `access` (and on inputs plugged in later). Calls `onPorts` with the
 * port names each time the list changes. Returns a function that stops listening.
 */
export function listenAll(
  access: MidiAccessLike,
  onEvent: (e: MidiEvent) => void,
  onPorts: (names: string[]) => void,
): () => void {
  const onMessage = (e: { data: Uint8Array | null }) => {
    const ev = parseMidi(e.data);
    if (ev) onEvent(ev);
  };
  const bind = () => {
    const inputs = [...access.inputs.values()];
    for (const input of inputs) input.onmidimessage = onMessage;
    onPorts(inputs.map((i) => i.name ?? "MIDI"));
  };
  bind();
  access.onstatechange = bind;
  return () => {
    for (const input of access.inputs.values()) input.onmidimessage = null;
    access.onstatechange = null;
  };
}
