/**
 * The /sampler page's run, as pure logic (docs/SIMULATOR.md A1d): the MIDI bytes it sends,
 * how each recorded note is cut and checked, and how the finished set becomes one zip.
 * Only general MIDI 1.0 channel messages are built here (Note On 9n, Note Off 8n,
 * Control Change Bn 123 = All Notes Off); sources in docs/SIMULATOR.md. No SysEx, nothing that
 * changes the keyboard's memory. All timings and levels are the store's own choice.
 */
import {
  applyGain,
  buildManifest,
  defaultLoopOptions,
  encodeWav,
  fadeOut,
  findLoop,
  findOnset,
  loopSeconds,
  peakOf,
  setGain,
  soundEnd,
  trimTake,
  yamahaNoteName,
  type Manifest,
  type SavedTake,
} from "./autosample.ts";
import { buildZip, sampleSetEntries } from "./zip.ts";

const clamp7 = (n: number) => Math.max(0, Math.min(127, Math.round(n)));
const chan = (ch: number) => {
  if (!Number.isInteger(ch) || ch < 1 || ch > 16) throw new Error("ช่อง MIDI ต้องเป็น 1–16");
  return ch - 1;
};

/** Note On, channel 1–16 as shown on the page. Velocity at least 1 (0 would mean Note Off). */
export function noteOnMsg(channel: number, note: number, velocity: number): number[] {
  return [0x90 | chan(channel), clamp7(note), Math.max(1, clamp7(velocity))];
}
/** Note Off with release velocity 64. */
export function noteOffMsg(channel: number, note: number): number[] {
  return [0x80 | chan(channel), clamp7(note), 64];
}
/** Control Change 123 (All Notes Off), sent on stop after the note off. */
export function allNotesOffMsg(channel: number): number[] {
  return [0xb0 | chan(channel), 123, 0];
}

/** Extra seconds recorded after the tail, so a late start (USB and sound card delay) loses nothing. */
export const CAPTURE_MARGIN_S = 0.3;
/** Kept before the onset so the attack is not cut. */
export const PREROLL_S = 0.005;
/** Fade at the end of each file. */
export const FADE_S = 0.02;
/** The loop is looked for after this much of the note (the attack is left alone). */
export const LOOP_SKIP_S = 0.15;

/** Seconds of sound recorded for one note. */
export function captureSeconds(hold: number, tail: number): number {
  return hold + tail + CAPTURE_MARGIN_S;
}

export type CutTake = {
  note: number;
  velocity: number;
  channels: Float32Array[];
  peak: number;
  /** Loop in samples of the cut take, or none. */
  loop: { start: number; end: number } | null;
};

/**
 * One recorded note, from the moment its Note On was sent: finds where the sound starts,
 * keeps hold + tail seconds from there (a little before the onset too), drops silence at the end,
 * and looks for a loop in the held part. Null when nothing was heard.
 */
export function cutTake(
  raw: readonly Float32Array[],
  sampleRate: number,
  take: { note: number; velocity: number; hold: number; tail: number },
  findLoops = true,
): CutTake | null {
  const onset = findOnset(raw);
  if (onset === null) return null;
  const pre = Math.round(PREROLL_S * sampleRate);
  const cut = trimTake(raw, onset, pre, Math.round((take.hold + take.tail) * sampleRate) + pre);
  const end = Math.max(1, Math.min(cut[0]?.length ?? 0, soundEnd(cut) + Math.round(FADE_S * sampleRate)));
  const channels = cut.map((c) => c.slice(0, end));
  const held = Math.min(end, Math.round(take.hold * sampleRate) + (onset - Math.max(0, onset - pre)));
  const found = findLoops ? findLoop(channels, Math.round(LOOP_SKIP_S * sampleRate), held, defaultLoopOptions(sampleRate)) : null;
  return {
    note: take.note,
    velocity: take.velocity,
    channels,
    peak: peakOf(channels),
    loop: found ? { start: found.start, end: found.end } : null,
  };
}

/** Notes heard as silent, as Yamaha names for the page ("C1 v100"). */
export function silentLabel(takes: readonly { note: number; velocity: number }[]): string {
  return takes.map((t) => `${yamahaNoteName(t.note)} v${t.velocity}`).join(", ");
}

export type FinishedSet = { manifest: Manifest; zip: Uint8Array; gain: number };

/**
 * The whole set: one gain so the loudest note ends at −1 dBFS and the others keep their level,
 * a short fade at each end (kept after the loop end), WAV files, manifest.json, .sfz, one zip.
 * Changes the takes' sample arrays in place. Throws a Thai message when there is nothing to save.
 */
export function finishSet(name: string, sampleRate: number, bits: 16 | 24, takes: readonly CutTake[], when: Date = new Date()): FinishedSet {
  if (!takes.length) throw new Error("ยังไม่มีโน้ตที่อัดได้");
  const gain = setGain(takes.map((t) => t.peak));
  const saved: SavedTake[] = [];
  const wavs = new Map<string, Uint8Array>();
  const fade = Math.round(FADE_S * sampleRate);
  for (const t of takes) {
    applyGain(t.channels, gain);
    const len = t.channels[0]?.length ?? 0;
    // A loop must not play a fading sound: with a loop, fade only what comes after its end.
    fadeOut(t.channels, t.loop ? Math.min(fade, len - t.loop.end) : fade);
    saved.push({ note: t.note, velocity: t.velocity, ...(t.loop ? loopSeconds(t.loop, sampleRate) : {}) });
  }
  const manifest = buildManifest(name, sampleRate, bits, gain, saved);
  for (const t of takes) {
    const file = manifest.samples.find((s) => s.root === t.note && s.velocity === t.velocity)!.file;
    wavs.set(file, encodeWav(t.channels, sampleRate, bits));
  }
  return { manifest, gain, zip: buildZip(sampleSetEntries(manifest, wavs), when) };
}
