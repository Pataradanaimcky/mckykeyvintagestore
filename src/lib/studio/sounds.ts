/**
 * Preview sounds for the organizer: open General MIDI instruments that sound
 * like the kind of sound in a slot (piano, EP, strings...). They are a close
 * match by type, not the keyboard's own sound.
 *
 * Samples: FluidR3_GM by Frank Wen (Creative Commons Attribution 3.0), served
 * by the midi-js-soundfonts project and played with smplr (MIT).
 */

export interface PreviewSound {
  key: string;
  /** Shown to the visitor. */
  label: string;
  /** General MIDI instrument name in FluidR3_GM. */
  gm: string;
  /** Words in a sound's name that suggest this type (lowercase). */
  words: string[];
}

export const PREVIEW_SOUNDS: PreviewSound[] = [
  { key: "piano", label: "Piano", gm: "acoustic_grand_piano", words: ["piano", "grand", "cfx", "s700", "bechstein", "upright", "pf"] },
  { key: "epiano", label: "E.Piano", gm: "electric_piano_1", words: ["ep", "e.p", "epiano", "rhodes", "wurli", "suitcase", "tine", "dx", "fm piano"] },
  { key: "organ", label: "Organ", gm: "drawbar_organ", words: ["organ", "b3", "hammond", "leslie", "orgn"] },
  { key: "clav", label: "Clav", gm: "clavinet", words: ["clav", "clavi"] },
  { key: "strings", label: "Strings", gm: "string_ensemble_1", words: ["string", "strings", "violin", "cello", "orch", "ensemble"] },
  { key: "pad", label: "Pad", gm: "pad_2_warm", words: ["pad", "warm", "atmos", "ambient", "dream"] },
  { key: "synthpad", label: "Synth Pad", gm: "pad_3_polysynth", words: ["poly", "sweep", "juno", "oberheim", "prophet", "analog"] },
  { key: "brass", label: "Brass", gm: "brass_section", words: ["brass", "horn", "trumpet", "trombone", "bras", "section"] },
  { key: "synthbrass", label: "Synth Brass", gm: "synth_brass_1", words: ["syn brass", "synth brass", "jump"] },
  { key: "lead", label: "Synth Lead", gm: "lead_2_sawtooth", words: ["lead", "saw", "solo", "mono", "square", "sqr"] },
  { key: "bass", label: "Bass", gm: "electric_bass_finger", words: ["bass", "slap", "finger", "fretless"] },
  { key: "synthbass", label: "Synth Bass", gm: "synth_bass_1", words: ["syn bass", "synth bass", "sub bass", "sub", "moog", "808"] },
  { key: "bell", label: "Bell", gm: "tubular_bells", words: ["bell", "chime", "glock", "celesta", "music box"] },
  { key: "mallet", label: "Mallet", gm: "vibraphone", words: ["vibe", "vibes", "marimba", "ranat", "xylo", "mallet"] },
  { key: "choir", label: "Choir", gm: "choir_aahs", words: ["choir", "vox", "voice", "aah", "ooh"] },
  { key: "guitar", label: "Guitar", gm: "acoustic_guitar_steel", words: ["guitar", "gtr", "nylon", "steel"] },
  { key: "flute", label: "Flute", gm: "flute", words: ["flute", "khlui", "pipe", "pan flute"] },
  { key: "sax", label: "Sax", gm: "alto_sax", words: ["sax", "tenor", "alto"] },
];

export const DEFAULT_SOUND = "piano";

export function getSound(key: string | undefined): PreviewSound {
  return PREVIEW_SOUNDS.find((s) => s.key === key) ?? PREVIEW_SOUNDS[0];
}

/**
 * Guesses the type of sound from its name, so a pasted list plays something
 * sensible straight away. Longer matches win ("syn bass" before "bass").
 */
export function guessSound(name: string): string {
  const n = ` ${name.toLowerCase().replace(/[_\-./]+/g, " ")} `;
  let best: { key: string; len: number } | null = null;
  for (const s of PREVIEW_SOUNDS) {
    for (const w of s.words) {
      const hit = w.length <= 3 ? new RegExp(`[^a-z]${w.replace(".", "\\.")}[^a-z]`).test(n) : n.includes(w);
      if (hit && (!best || w.length > best.len)) best = { key: s.key, len: w.length };
    }
  }
  return best?.key ?? DEFAULT_SOUND;
}
