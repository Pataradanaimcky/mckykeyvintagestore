"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listenAll, SUSTAIN_CC, type MidiAccessLike } from "@/lib/sim/midi";

export type MidiState = "off" | "unsupported" | "denied" | "waiting" | "on";

export interface MidiHandlers {
  noteOn: (note: number, velocity: number) => void;
  noteOff: (note: number) => void;
  /** Sustain pedal (CC 64), down or up. */
  sustain?: (down: boolean) => void;
  /** Pitch bend wheel, -1 … +1 (0 = centre). */
  bend?: (value: number) => void;
  /** Any other control change (number, 0–127), for CC learn. */
  cc?: (cc: number, value: number) => void;
}

/**
 * Plays the page from a keyboard on USB (Web MIDI, read only: nothing is sent to the keyboard).
 * Note on / note off / sustain are the general MIDI channel messages every keyboard sends.
 * Listens only while `active`; the visitor turns it on with a button.
 */
export function useMidiIn(active: boolean, handlers: MidiHandlers) {
  const [state, setState] = useState<MidiState>("off");
  const [names, setNames] = useState<string[]>([]);
  const access = useRef<MIDIAccess | null>(null);
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  const connect = useCallback(async () => {
    if (typeof navigator === "undefined" || !("requestMIDIAccess" in navigator)) {
      setState("unsupported");
      return;
    }
    try {
      access.current = await navigator.requestMIDIAccess({ sysex: false });
      setState("waiting");
    } catch {
      setState("denied");
    }
  }, []);

  useEffect(() => {
    const a = access.current;
    if (!a || !active || state === "off" || state === "denied" || state === "unsupported") return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    // Wait a tick so the state update for the port list does not run inside the effect.
    queueMicrotask(() => {
      if (cancelled) return;
      stop = listenAll(
        a as unknown as MidiAccessLike,
        (ev) => {
          const h = latest.current;
          if (ev.type === "noteOn") h.noteOn(ev.note, ev.velocity);
          else if (ev.type === "noteOff") h.noteOff(ev.note);
          else if (ev.type === "cc" && ev.cc === SUSTAIN_CC) h.sustain?.(ev.value >= 64);
          else if (ev.type === "cc") h.cc?.(ev.cc, ev.value);
          else if (ev.type === "bend") h.bend?.(ev.value);
        },
        (list) => {
          setNames(list);
          setState(list.length ? "on" : "waiting");
        },
      );
    });
    return () => {
      cancelled = true;
      stop?.();
      stop = null;
    };
  }, [active, state]);

  return { state, names, connect };
}
