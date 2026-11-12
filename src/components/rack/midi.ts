/** Frequency in Hz of a MIDI note number (69 = A 440 Hz). */
export const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12);
