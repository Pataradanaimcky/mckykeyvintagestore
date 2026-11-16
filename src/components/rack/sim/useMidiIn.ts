"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MidiState = "off" | "unsupported" | "denied" | "waiting" | "on";

export interface MidiHandlers {
  noteOn: (note: number, velocity: number) => void;
  noteOff: (note: number) => void;
  /** Sustain pedal (CC 64), down or up. */
  sustain?: (down: boolean) => void;
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
    const onMessage = (e: MIDIMessageEvent) => {
      const d = e.data;
      if (!d || d.length < 2) return;
      const kind = d[0] & 0xf0;
      if (kind === 0x90 && d[2] > 0) latest.current.noteOn(d[1], d[2] / 127);
      else if (kind === 0x80 || (kind === 0x90 && d[2] === 0)) latest.current.noteOff(d[1]);
      else if (kind === 0xb0 && d[1] === 64) latest.current.sustain?.(d[2] >= 64);
    };
    const bind = () => {
      const inputs = [...a.inputs.values()];
      for (const input of inputs) input.onmidimessage = onMessage;
      setNames(inputs.map((i) => i.name ?? "MIDI"));
      setState(inputs.length ? "on" : "waiting");
    };
    queueMicrotask(bind);
    a.onstatechange = bind;
    return () => {
      for (const input of a.inputs.values()) input.onmidimessage = null;
      a.onstatechange = null;
    };
  }, [active, state]);

  return { state, names, connect };
}
