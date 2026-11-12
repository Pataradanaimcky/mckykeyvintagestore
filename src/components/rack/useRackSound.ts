"use client";

import { useEffect, useMemo, useRef } from "react";
import { STEP_NOTES, type Route } from "./patch";

interface Voice {
  ctx: AudioContext;
  osc: OscillatorNode;
  filter: BiquadFilterNode;
  amp: GainNode;
  lfo: OscillatorNode;
  lfoToFilter: GainNode;
  lfoToPitch: GainNode;
}

interface Settings {
  route: Route;
  wave: OscillatorType;
  rate: number;
  cutoff: number;
  step: number;
  on: boolean;
  /** Frequency of the key being held on the rack keyboard, or null. */
  key: number | null;
}

/** Sound for the rack. Nothing is created until the visitor presses the sound switch or a key. */
export function useRackSound() {
  const voice = useRef<Voice | null>(null);
  // The last step that was plucked, so turning a knob does not retrigger the note.
  const plucked = useRef(-1);
  // The key that is sounding, so a held key is not retriggered on every update.
  const sounding = useRef<number | null>(null);

  useEffect(
    () => () => {
      void voice.current?.ctx.close();
      voice.current = null;
    },
    [],
  );

  return useMemo(
    () => ({
      /** Must be called from a click, tap or key press, which is when browsers allow sound. */
      start() {
        if (voice.current) {
          void voice.current.ctx.resume();
          return;
        }
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const amp = ctx.createGain();
        const master = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoToFilter = ctx.createGain();
        const lfoToPitch = ctx.createGain();

        filter.type = "lowpass";
        filter.Q.value = 6;
        amp.gain.value = 0;
        master.gain.value = 0.12;
        lfoToFilter.gain.value = 0;
        lfoToPitch.gain.value = 0;

        osc.connect(filter).connect(amp).connect(master).connect(ctx.destination);
        lfo.connect(lfoToFilter).connect(filter.frequency);
        lfo.connect(lfoToPitch).connect(osc.frequency);
        osc.start();
        lfo.start();
        voice.current = { ctx, osc, filter, amp, lfo, lfoToFilter, lfoToPitch };
      },

      update({ route, wave, rate, cutoff, step, on, key }: Settings) {
        const v = voice.current;
        if (!v) return;
        const now = v.ctx.currentTime;
        const hz = route.filtered ? 180 + cutoff * cutoff * 6000 : 12000;
        const pitch = key ?? (route.sequenced ? STEP_NOTES[step] : 220);

        v.osc.type = wave;
        v.osc.frequency.setTargetAtTime(pitch, now, key === null ? 0.01 : 0.004);
        v.filter.frequency.setTargetAtTime(hz, now, 0.03);
        v.lfo.frequency.setTargetAtTime(0.2 + rate * 8, now, 0.05);
        v.lfoToFilter.gain.setTargetAtTime(route.lfoToFilter ? hz * 0.7 : 0, now, 0.05);
        v.lfoToPitch.gain.setTargetAtTime(route.lfoToPitch ? 10 : 0, now, 0.05);

        if (!on || !route.audible) {
          v.amp.gain.cancelScheduledValues(now);
          v.amp.gain.setTargetAtTime(0, now, 0.03);
          plucked.current = -1;
          sounding.current = null;
        } else if (key !== null) {
          // A held key plays over the sequencer: quick attack, then hold.
          if (sounding.current !== key) {
            sounding.current = key;
            v.amp.gain.cancelScheduledValues(now);
            v.amp.gain.setTargetAtTime(0.9, now, 0.004);
            v.amp.gain.setTargetAtTime(0.6, now + 0.08, 0.2);
          }
          plucked.current = -1;
        } else if (sounding.current !== null) {
          // Key released: let the note fade.
          sounding.current = null;
          v.amp.gain.cancelScheduledValues(now);
          v.amp.gain.setTargetAtTime(route.sequenced ? 0 : 0.5, now, 0.12);
        } else if (!route.sequenced) {
          v.amp.gain.cancelScheduledValues(now);
          v.amp.gain.setTargetAtTime(0.5, now, 0.05);
          plucked.current = -1;
        } else if (plucked.current !== step) {
          // A short pluck on every step.
          plucked.current = step;
          v.amp.gain.cancelScheduledValues(now);
          v.amp.gain.setTargetAtTime(0.9, now, 0.005);
          v.amp.gain.setTargetAtTime(0.25, now + 0.06, 0.12);
        }
      },
    }),
    [],
  );
}
