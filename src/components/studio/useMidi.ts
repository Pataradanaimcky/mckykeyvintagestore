"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface MidiPort {
  id: string;
  name: string;
}

type Status = "off" | "asking" | "on" | "unsupported" | "denied";

/**
 * USB / MIDI connection through the browser's Web MIDI (Chrome, Edge, Opera,
 * and Firefox with permission; not Safari). Nothing is asked until the visitor
 * presses connect. Uses notes and controllers only, never system-exclusive data.
 */
export function useMidi(onNote: (note: number, velocity: number, on: boolean) => void) {
  const [status, setStatus] = useState<Status>("off");
  const [inputs, setInputs] = useState<MidiPort[]>([]);
  const [outputs, setOutputs] = useState<MidiPort[]>([]);
  const [inputId, setInputId] = useState("");
  const [outputId, setOutputId] = useState("");
  const access = useRef<MIDIAccess | null>(null);
  const noteRef = useRef(onNote);
  useEffect(() => {
    noteRef.current = onNote;
  });

  const refresh = useCallback(() => {
    const a = access.current;
    if (!a) return;
    const ins = [...a.inputs.values()].map((p) => ({ id: p.id, name: p.name ?? "MIDI in" }));
    const outs = [...a.outputs.values()].map((p) => ({ id: p.id, name: p.name ?? "MIDI out" }));
    setInputs(ins);
    setOutputs(outs);
    setInputId((cur) => (ins.some((p) => p.id === cur) ? cur : (ins[0]?.id ?? "")));
    setOutputId((cur) => (outs.some((p) => p.id === cur) ? cur : (outs[0]?.id ?? "")));
  }, []);

  const connect = useCallback(async () => {
    if (typeof navigator === "undefined" || !("requestMIDIAccess" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("asking");
    try {
      access.current = await navigator.requestMIDIAccess({ sysex: false });
      access.current.onstatechange = refresh;
      refresh();
      setStatus("on");
    } catch {
      setStatus("denied");
    }
  }, [refresh]);

  // Listen to the chosen input.
  useEffect(() => {
    const port = inputId ? access.current?.inputs.get(inputId) : undefined;
    if (!port) return;
    port.onmidimessage = (event) => {
      const data = event.data;
      if (!data || data.length < 3) return;
      const kind = data[0] & 0xf0;
      if (kind === 0x90 && data[2] > 0) noteRef.current(data[1], data[2], true);
      else if (kind === 0x80 || (kind === 0x90 && data[2] === 0)) noteRef.current(data[1], 0, false);
    };
    return () => {
      port.onmidimessage = null;
    };
  }, [inputId, status]);

  /** Sends raw bytes to the chosen output. Returns false when nothing is connected. */
  const send = useCallback(
    (bytes: number[]) => {
      const port = outputId ? access.current?.outputs.get(outputId) : undefined;
      if (!port) return false;
      port.send(bytes);
      return true;
    },
    [outputId],
  );

  return { status, inputs, outputs, inputId, outputId, setInputId, setOutputId, connect, send };
}
