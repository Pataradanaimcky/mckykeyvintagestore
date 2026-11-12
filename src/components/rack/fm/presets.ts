/**
 * The store's own FM voices for the FM page, written from scratch in the DX7
 * voice format (155-byte VCED). Yamaha's factory voices are not included.
 * Visitors can load their own .syx files on the page.
 */

interface Op {
  /** Envelope rates R1..R4 and levels L1..L4, 0..99. */
  r: [number, number, number, number];
  l: [number, number, number, number];
  /** Output level 0..99. */
  ol: number;
  /** Frequency ratio: coarse 0..31 (0 = 0.5) and fine 0..99 (percent). */
  coarse: number;
  fine?: number;
  /** Detune 0..14, 7 = centre. */
  det?: number;
  /** Key velocity sensitivity 0..7. */
  kvs?: number;
  /** Rate scaling 0..7. */
  rs?: number;
  /** Amplitude modulation sensitivity 0..3 (tremolo from the LFO). */
  ams?: number;
}

interface VoiceSpec {
  name: string;
  /** Algorithm 1..32, as printed on a DX7. */
  alg: number;
  feedback: number;
  /** Operators in the DX7 order OP1..OP6. */
  ops: [Op, Op, Op, Op, Op, Op];
  /** LFO speed, delay, pitch depth, amp depth (0..99) and wave (0 triangle .. 4 sine). */
  lfo?: { speed: number; delay?: number; pmd?: number; amd?: number; wave?: number };
}

const SILENT: Op = { r: [99, 99, 99, 99], l: [0, 0, 0, 0], ol: 0, coarse: 1 };

function build({ name, alg, feedback, ops, lfo }: VoiceSpec): Uint8Array {
  const p = new Uint8Array(155);
  // VCED stores operators from OP6 down to OP1.
  [...ops].reverse().forEach((op, index) => {
    const o = index * 21;
    p.set(op.r, o);
    p.set(op.l, o + 4);
    p[o + 8] = 39; // break point C3
    p[o + 13] = op.rs ?? 2;
    p[o + 14] = op.ams ?? 0;
    p[o + 15] = op.kvs ?? 2;
    p[o + 16] = op.ol;
    p[o + 17] = 0; // ratio mode
    p[o + 18] = op.coarse;
    p[o + 19] = op.fine ?? 0;
    p[o + 20] = op.det ?? 7;
  });
  p.set([99, 99, 99, 99, 50, 50, 50, 50], 126); // pitch EG flat
  p[134] = alg - 1;
  p[135] = feedback;
  p[136] = 1; // oscillator key sync
  // LFO speed, delay, PMD, AMD, sync, wave, PMS
  p.set([lfo?.speed ?? 35, lfo?.delay ?? 0, lfo?.pmd ?? 0, lfo?.amd ?? 0, 0, lfo?.wave ?? 4, 3], 137);
  p[144] = 24; // transpose: C3, no shift
  const label = name.padEnd(10, " ").slice(0, 10);
  for (let i = 0; i < 10; i++) p[145 + i] = label.charCodeAt(i);
  return p;
}

export const FM_PRESETS: { name: string; patch: Uint8Array }[] = [
  {
    // Three two-operator stacks: warm body, a bright tine, and a soft detuned layer.
    name: "MCKY EPNO",
    patch: build({
      name: "MCKY EPNO",
      alg: 5,
      feedback: 6,
      ops: [
        { r: [96, 25, 25, 67], l: [99, 75, 0, 0], ol: 99, coarse: 1, det: 7 },
        { r: [95, 50, 35, 78], l: [99, 75, 0, 0], ol: 64, coarse: 1, kvs: 6 },
        { r: [95, 20, 20, 50], l: [99, 95, 0, 0], ol: 92, coarse: 1, det: 10 },
        { r: [95, 29, 20, 50], l: [99, 95, 0, 0], ol: 56, coarse: 14, kvs: 7 },
        { r: [95, 20, 20, 50], l: [99, 95, 0, 0], ol: 78, coarse: 1, det: 4 },
        { r: [95, 29, 20, 50], l: [99, 95, 0, 0], ol: 52, coarse: 1, kvs: 4 },
      ],
    }),
  },
  {
    name: "MCKY BELL",
    patch: build({
      name: "MCKY BELL",
      alg: 5,
      feedback: 3,
      ops: [
        { r: [99, 27, 20, 32], l: [99, 45, 0, 0], ol: 99, coarse: 1 },
        { r: [99, 32, 22, 40], l: [99, 50, 0, 0], ol: 76, coarse: 2, fine: 75, kvs: 5 },
        { r: [99, 24, 18, 30], l: [99, 40, 0, 0], ol: 88, coarse: 1, det: 11 },
        { r: [99, 38, 25, 40], l: [99, 40, 0, 0], ol: 62, coarse: 7, kvs: 6 },
        { r: [99, 30, 20, 34], l: [99, 35, 0, 0], ol: 70, coarse: 2 },
        { r: [99, 40, 30, 40], l: [99, 30, 0, 0], ol: 48, coarse: 5, fine: 40 },
      ],
    }),
  },
  {
    name: "MCKY BASS",
    patch: build({
      name: "MCKY BASS",
      alg: 5,
      feedback: 5,
      ops: [
        { r: [99, 40, 30, 70], l: [99, 88, 70, 0], ol: 99, coarse: 0 },
        { r: [99, 55, 40, 70], l: [99, 62, 0, 0], ol: 84, coarse: 0, kvs: 4 },
        { r: [99, 45, 35, 70], l: [99, 80, 60, 0], ol: 82, coarse: 1 },
        { r: [99, 70, 40, 70], l: [99, 50, 0, 0], ol: 70, coarse: 1, kvs: 5 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    // The modulators open more slowly than the carriers, which gives the brassy swell.
    name: "MCKY BRAS",
    patch: build({
      name: "MCKY BRAS",
      alg: 5,
      feedback: 0,
      ops: [
        { r: [72, 40, 30, 60], l: [99, 92, 88, 0], ol: 96, coarse: 1 },
        { r: [55, 30, 30, 60], l: [99, 86, 82, 0], ol: 80, coarse: 1, kvs: 3 },
        { r: [72, 40, 30, 60], l: [99, 92, 88, 0], ol: 92, coarse: 1, det: 11 },
        { r: [52, 30, 30, 60], l: [99, 84, 80, 0], ol: 78, coarse: 1, kvs: 3 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "MCKY PAD",
    patch: build({
      name: "MCKY PAD",
      alg: 32,
      feedback: 4,
      ops: [
        { r: [38, 30, 25, 32], l: [99, 95, 90, 0], ol: 86, coarse: 1, det: 4 },
        { r: [36, 30, 25, 32], l: [99, 95, 90, 0], ol: 86, coarse: 1, det: 10 },
        { r: [34, 30, 25, 32], l: [99, 92, 88, 0], ol: 78, coarse: 2, det: 7 },
        { r: [40, 30, 25, 32], l: [99, 95, 90, 0], ol: 82, coarse: 0, det: 9 },
        { r: [30, 30, 25, 32], l: [99, 90, 85, 0], ol: 70, coarse: 3, det: 5 },
        { r: [32, 30, 25, 32], l: [99, 90, 85, 0], ol: 64, coarse: 1, det: 13 },
      ],
    }),
  },
  {
    // Six sine carriers at organ footages, gated like a key contact.
    name: "MCKY ORGN",
    patch: build({
      name: "MCKY ORGN",
      alg: 32,
      feedback: 0,
      ops: [
        { r: [99, 99, 99, 90], l: [99, 99, 99, 0], ol: 92, coarse: 0 },
        { r: [99, 99, 99, 90], l: [99, 99, 99, 0], ol: 94, coarse: 1 },
        { r: [99, 99, 99, 90], l: [99, 99, 99, 0], ol: 84, coarse: 1, fine: 50 },
        { r: [99, 99, 99, 90], l: [99, 99, 99, 0], ol: 86, coarse: 2 },
        { r: [99, 99, 99, 90], l: [99, 99, 99, 0], ol: 76, coarse: 3 },
        { r: [99, 99, 99, 90], l: [99, 99, 99, 0], ol: 72, coarse: 4 },
      ],
    }),
  },
  // ---- MCKY FM bank, voices 7–32 ----
  {
    name: "CITY EP",
    patch: build({
      name: "CITY EP",
      alg: 5,
      feedback: 6,
      ops: [
        { r: [96, 28, 25, 60], l: [99, 72, 0, 0], ol: 99, coarse: 1, det: 6 },
        { r: [96, 60, 35, 70], l: [99, 60, 0, 0], ol: 72, coarse: 1, kvs: 6 },
        { r: [95, 22, 20, 55], l: [99, 90, 0, 0], ol: 90, coarse: 1, det: 9 },
        { r: [95, 50, 30, 60], l: [99, 70, 0, 0], ol: 66, coarse: 14, kvs: 7 },
        { r: [95, 22, 20, 55], l: [99, 90, 0, 0], ol: 74, coarse: 1, det: 5 },
        { r: [95, 40, 25, 60], l: [99, 80, 0, 0], ol: 58, coarse: 1, kvs: 5 },
      ],
      lfo: { speed: 30, amd: 14 },
    }),
  },
  {
    name: "SOFT EP",
    patch: build({
      name: "SOFT EP",
      alg: 5,
      feedback: 3,
      ops: [
        { r: [90, 25, 22, 55], l: [99, 75, 0, 0], ol: 97, coarse: 1, det: 7 },
        { r: [90, 45, 30, 60], l: [99, 55, 0, 0], ol: 48, coarse: 1, kvs: 5 },
        { r: [90, 22, 20, 55], l: [99, 85, 0, 0], ol: 88, coarse: 1, det: 9 },
        { r: [90, 50, 30, 60], l: [99, 50, 0, 0], ol: 40, coarse: 1, kvs: 5 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "WURLY",
    patch: build({
      name: "WURLY",
      alg: 5,
      feedback: 7,
      ops: [
        { r: [99, 35, 25, 60], l: [99, 70, 0, 0], ol: 99, coarse: 1 },
        { r: [99, 55, 30, 60], l: [99, 55, 0, 0], ol: 76, coarse: 1, kvs: 7 },
        { r: [99, 35, 25, 60], l: [99, 70, 0, 0], ol: 86, coarse: 1, det: 10 },
        { r: [99, 60, 35, 60], l: [99, 40, 0, 0], ol: 62, coarse: 3, kvs: 6 },
        SILENT,
        SILENT,
      ],
      lfo: { speed: 42, amd: 20 },
    }),
  },
  {
    name: "CLAV",
    patch: build({
      name: "CLAV",
      alg: 5,
      feedback: 6,
      ops: [
        { r: [99, 55, 40, 80], l: [99, 60, 0, 0], ol: 96, coarse: 1 },
        { r: [99, 70, 45, 80], l: [99, 55, 0, 0], ol: 82, coarse: 3, kvs: 6 },
        { r: [99, 55, 40, 80], l: [99, 60, 0, 0], ol: 84, coarse: 2 },
        { r: [99, 75, 50, 80], l: [99, 45, 0, 0], ol: 74, coarse: 5, kvs: 6 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "MARIMBA",
    patch: build({
      name: "MARIMBA",
      alg: 5,
      feedback: 0,
      ops: [
        { r: [99, 50, 30, 50], l: [99, 0, 0, 0], ol: 99, coarse: 1, rs: 4 },
        { r: [99, 80, 40, 60], l: [99, 0, 0, 0], ol: 72, coarse: 4, kvs: 6 },
        { r: [99, 60, 35, 50], l: [99, 0, 0, 0], ol: 70, coarse: 4 },
        { r: [99, 85, 40, 60], l: [99, 0, 0, 0], ol: 50, coarse: 10 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    // A bright wooden mallet, in the spirit of a Thai ranat.
    name: "RANAT",
    patch: build({
      name: "RANAT",
      alg: 5,
      feedback: 2,
      ops: [
        { r: [99, 58, 35, 55], l: [99, 0, 0, 0], ol: 99, coarse: 1, rs: 5 },
        { r: [99, 85, 45, 60], l: [99, 0, 0, 0], ol: 78, coarse: 3, fine: 50, kvs: 6 },
        { r: [99, 70, 40, 55], l: [99, 0, 0, 0], ol: 72, coarse: 2 },
        { r: [99, 90, 45, 60], l: [99, 0, 0, 0], ol: 60, coarse: 7 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "VIBES",
    patch: build({
      name: "VIBES",
      alg: 5,
      feedback: 0,
      ops: [
        { r: [99, 30, 22, 38], l: [99, 0, 0, 0], ol: 99, coarse: 1, ams: 2 },
        { r: [99, 60, 30, 40], l: [99, 0, 0, 0], ol: 64, coarse: 4, kvs: 6 },
        { r: [99, 28, 20, 38], l: [99, 0, 0, 0], ol: 72, coarse: 4, ams: 2 },
        { r: [99, 55, 30, 40], l: [99, 0, 0, 0], ol: 40, coarse: 1 },
        SILENT,
        SILENT,
      ],
      lfo: { speed: 34, amd: 40 },
    }),
  },
  {
    name: "GLOCK",
    patch: build({
      name: "GLOCK",
      alg: 5,
      feedback: 0,
      ops: [
        { r: [99, 32, 25, 40], l: [99, 0, 0, 0], ol: 96, coarse: 2, rs: 3 },
        { r: [99, 45, 30, 40], l: [99, 0, 0, 0], ol: 66, coarse: 7, kvs: 5 },
        { r: [99, 35, 25, 40], l: [99, 0, 0, 0], ol: 80, coarse: 5, fine: 40 },
        { r: [99, 50, 30, 40], l: [99, 0, 0, 0], ol: 40, coarse: 1 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "TUBE BELL",
    patch: build({
      name: "TUBE BELL",
      alg: 5,
      feedback: 4,
      ops: [
        { r: [99, 22, 18, 30], l: [99, 0, 0, 0], ol: 99, coarse: 1 },
        { r: [99, 30, 20, 30], l: [99, 0, 0, 0], ol: 78, coarse: 3, fine: 50, kvs: 4 },
        { r: [99, 20, 16, 30], l: [99, 0, 0, 0], ol: 84, coarse: 1, det: 12 },
        { r: [99, 28, 20, 30], l: [99, 0, 0, 0], ol: 72, coarse: 3, fine: 50 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "HARP",
    patch: build({
      name: "HARP",
      alg: 5,
      feedback: 3,
      ops: [
        { r: [99, 38, 25, 45], l: [99, 0, 0, 0], ol: 99, coarse: 1, rs: 3 },
        { r: [99, 70, 40, 50], l: [99, 20, 0, 0], ol: 60, coarse: 2, kvs: 5 },
        { r: [99, 40, 25, 45], l: [99, 0, 0, 0], ol: 76, coarse: 1, det: 10 },
        { r: [99, 75, 40, 50], l: [99, 0, 0, 0], ol: 52, coarse: 1 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "KOTO",
    patch: build({
      name: "KOTO",
      alg: 5,
      feedback: 7,
      ops: [
        { r: [99, 45, 30, 50], l: [99, 0, 0, 0], ol: 99, coarse: 1, rs: 4 },
        { r: [99, 80, 45, 55], l: [99, 0, 0, 0], ol: 80, coarse: 3, kvs: 6 },
        { r: [99, 45, 30, 50], l: [99, 0, 0, 0], ol: 70, coarse: 2 },
        { r: [99, 85, 45, 55], l: [99, 0, 0, 0], ol: 68, coarse: 1 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "SYN BASS",
    patch: build({
      name: "SYN BASS",
      alg: 5,
      feedback: 7,
      ops: [
        { r: [99, 50, 35, 75], l: [99, 85, 75, 0], ol: 99, coarse: 0 },
        { r: [99, 65, 40, 75], l: [99, 60, 45, 0], ol: 88, coarse: 0, kvs: 5 },
        { r: [99, 50, 35, 75], l: [99, 85, 75, 0], ol: 80, coarse: 0, det: 10 },
        { r: [99, 70, 40, 75], l: [99, 55, 40, 0], ol: 80, coarse: 1 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "SLAP BASS",
    patch: build({
      name: "SLAP BASS",
      alg: 5,
      feedback: 6,
      ops: [
        { r: [99, 45, 35, 70], l: [99, 75, 60, 0], ol: 99, coarse: 0 },
        { r: [99, 85, 50, 70], l: [99, 40, 0, 0], ol: 90, coarse: 1, kvs: 7 },
        { r: [99, 80, 50, 70], l: [99, 0, 0, 0], ol: 70, coarse: 2 },
        { r: [99, 90, 50, 70], l: [99, 0, 0, 0], ol: 76, coarse: 5, kvs: 7 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "SUB BASS",
    patch: build({
      name: "SUB BASS",
      alg: 5,
      feedback: 0,
      ops: [
        { r: [99, 45, 35, 80], l: [99, 92, 88, 0], ol: 99, coarse: 0 },
        { r: [99, 60, 40, 80], l: [99, 50, 30, 0], ol: 52, coarse: 0, kvs: 3 },
        SILENT,
        SILENT,
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "STRINGS",
    patch: build({
      name: "STRINGS",
      alg: 5,
      feedback: 7,
      ops: [
        { r: [45, 30, 25, 40], l: [99, 95, 92, 0], ol: 92, coarse: 1, det: 4 },
        { r: [42, 30, 25, 40], l: [99, 90, 88, 0], ol: 70, coarse: 1 },
        { r: [45, 30, 25, 40], l: [99, 95, 92, 0], ol: 90, coarse: 1, det: 10 },
        { r: [42, 30, 25, 40], l: [99, 90, 88, 0], ol: 68, coarse: 1 },
        { r: [45, 30, 25, 40], l: [99, 95, 92, 0], ol: 80, coarse: 2, det: 7 },
        { r: [42, 30, 25, 40], l: [99, 90, 88, 0], ol: 64, coarse: 2 },
      ],
      lfo: { speed: 34, delay: 40, pmd: 6 },
    }),
  },
  {
    name: "CHOIR",
    patch: build({
      name: "CHOIR",
      alg: 32,
      feedback: 0,
      ops: [
        { r: [40, 30, 25, 40], l: [99, 95, 92, 0], ol: 94, coarse: 1, det: 5 },
        { r: [38, 30, 25, 40], l: [99, 95, 92, 0], ol: 90, coarse: 1, det: 9 },
        { r: [36, 30, 25, 40], l: [99, 92, 90, 0], ol: 74, coarse: 2 },
        { r: [34, 30, 25, 40], l: [99, 90, 88, 0], ol: 70, coarse: 3 },
        { r: [34, 30, 25, 40], l: [99, 85, 80, 0], ol: 60, coarse: 5 },
        { r: [34, 30, 25, 40], l: [99, 85, 80, 0], ol: 54, coarse: 6 },
      ],
      lfo: { speed: 30, delay: 30, pmd: 5 },
    }),
  },
  {
    // A breathy flute, in the spirit of a Thai khlui.
    name: "KHLUI",
    patch: build({
      name: "KHLUI",
      alg: 5,
      feedback: 4,
      ops: [
        { r: [60, 40, 30, 55], l: [99, 95, 90, 0], ol: 98, coarse: 1 },
        { r: [70, 45, 30, 55], l: [99, 70, 60, 0], ol: 52, coarse: 1, kvs: 3 },
        { r: [70, 50, 30, 55], l: [99, 80, 70, 0], ol: 50, coarse: 2 },
        { r: [80, 60, 40, 55], l: [99, 50, 40, 0], ol: 70, coarse: 9 },
        SILENT,
        SILENT,
      ],
      lfo: { speed: 38, delay: 45, pmd: 10 },
    }),
  },
  {
    name: "SAW LEAD",
    patch: build({
      name: "SAW LEAD",
      alg: 5,
      feedback: 7,
      ops: [
        { r: [99, 40, 30, 60], l: [99, 95, 92, 0], ol: 96, coarse: 1, det: 5 },
        { r: [99, 40, 30, 60], l: [99, 92, 90, 0], ol: 86, coarse: 1 },
        { r: [99, 40, 30, 60], l: [99, 95, 92, 0], ol: 94, coarse: 1, det: 9 },
        { r: [99, 40, 30, 60], l: [99, 92, 90, 0], ol: 86, coarse: 1 },
        SILENT,
        SILENT,
      ],
      lfo: { speed: 36, delay: 50, pmd: 8 },
    }),
  },
  {
    name: "SQR LEAD",
    patch: build({
      name: "SQR LEAD",
      alg: 5,
      feedback: 0,
      ops: [
        { r: [99, 40, 30, 60], l: [99, 95, 92, 0], ol: 96, coarse: 1 },
        { r: [99, 40, 30, 60], l: [99, 92, 90, 0], ol: 82, coarse: 2 },
        { r: [99, 40, 30, 60], l: [99, 95, 92, 0], ol: 80, coarse: 1, det: 10 },
        { r: [99, 40, 30, 60], l: [99, 92, 90, 0], ol: 78, coarse: 2 },
        SILENT,
        SILENT,
      ],
      lfo: { speed: 36, delay: 50, pmd: 8 },
    }),
  },
  {
    name: "SYN BRASS",
    patch: build({
      name: "SYN BRASS",
      alg: 5,
      feedback: 6,
      ops: [
        { r: [80, 40, 30, 60], l: [99, 92, 88, 0], ol: 96, coarse: 1, det: 4 },
        { r: [50, 35, 30, 60], l: [99, 88, 80, 0], ol: 86, coarse: 1, kvs: 3 },
        { r: [80, 40, 30, 60], l: [99, 92, 88, 0], ol: 92, coarse: 1, det: 10 },
        { r: [48, 35, 30, 60], l: [99, 88, 80, 0], ol: 84, coarse: 1, kvs: 3 },
        { r: [80, 40, 30, 60], l: [99, 92, 88, 0], ol: 76, coarse: 0 },
        { r: [50, 35, 30, 60], l: [99, 85, 78, 0], ol: 74, coarse: 0 },
      ],
    }),
  },
  {
    name: "POLY STAB",
    patch: build({
      name: "POLY STAB",
      alg: 5,
      feedback: 7,
      ops: [
        { r: [99, 55, 40, 70], l: [99, 70, 0, 0], ol: 98, coarse: 1, det: 4 },
        { r: [99, 70, 45, 70], l: [99, 55, 0, 0], ol: 86, coarse: 1, kvs: 5 },
        { r: [99, 55, 40, 70], l: [99, 70, 0, 0], ol: 94, coarse: 1, det: 10 },
        { r: [99, 70, 45, 70], l: [99, 55, 0, 0], ol: 84, coarse: 1, kvs: 5 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "PLUCK",
    patch: build({
      name: "PLUCK",
      alg: 5,
      feedback: 5,
      ops: [
        { r: [99, 50, 35, 60], l: [99, 0, 0, 0], ol: 99, coarse: 1, rs: 3 },
        { r: [99, 80, 45, 60], l: [99, 0, 0, 0], ol: 76, coarse: 1, kvs: 6 },
        { r: [99, 50, 35, 60], l: [99, 0, 0, 0], ol: 84, coarse: 2, det: 9 },
        { r: [99, 85, 45, 60], l: [99, 0, 0, 0], ol: 70, coarse: 2 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    name: "TOY PIANO",
    patch: build({
      name: "TOY PIANO",
      alg: 5,
      feedback: 0,
      ops: [
        { r: [99, 45, 30, 50], l: [99, 0, 0, 0], ol: 99, coarse: 2, rs: 4 },
        { r: [99, 70, 40, 50], l: [99, 0, 0, 0], ol: 66, coarse: 9, kvs: 5 },
        { r: [99, 50, 30, 50], l: [99, 0, 0, 0], ol: 78, coarse: 4, fine: 30 },
        { r: [99, 80, 40, 50], l: [99, 0, 0, 0], ol: 46, coarse: 1 },
        SILENT,
        SILENT,
      ],
    }),
  },
  {
    // Organ footages plus one fast-fading operator for a key click.
    name: "PERC ORGN",
    patch: build({
      name: "PERC ORGN",
      alg: 32,
      feedback: 0,
      ops: [
        { r: [99, 99, 99, 90], l: [99, 99, 99, 0], ol: 92, coarse: 0 },
        { r: [99, 99, 99, 90], l: [99, 99, 99, 0], ol: 94, coarse: 1 },
        { r: [99, 99, 99, 90], l: [99, 99, 99, 0], ol: 88, coarse: 2 },
        { r: [99, 55, 40, 90], l: [99, 0, 0, 0], ol: 86, coarse: 3 },
        { r: [99, 99, 99, 90], l: [99, 99, 99, 0], ol: 66, coarse: 4 },
        { r: [99, 99, 99, 90], l: [99, 99, 99, 0], ol: 60, coarse: 8 },
      ],
      lfo: { speed: 60, amd: 8 },
    }),
  },
  {
    name: "GLASS PAD",
    patch: build({
      name: "GLASS PAD",
      alg: 5,
      feedback: 2,
      ops: [
        { r: [32, 30, 25, 30], l: [99, 95, 90, 0], ol: 92, coarse: 1, det: 5 },
        { r: [28, 25, 25, 30], l: [99, 80, 70, 0], ol: 64, coarse: 3, fine: 50 },
        { r: [32, 30, 25, 30], l: [99, 95, 90, 0], ol: 88, coarse: 2, det: 9 },
        { r: [26, 25, 25, 30], l: [99, 80, 70, 0], ol: 58, coarse: 5 },
        { r: [30, 30, 25, 30], l: [99, 95, 90, 0], ol: 80, coarse: 1, det: 11 },
        { r: [24, 25, 25, 30], l: [99, 75, 65, 0], ol: 54, coarse: 7 },
      ],
      lfo: { speed: 24, pmd: 4, amd: 10 },
    }),
  },
  {
    name: "SWEEP PAD",
    patch: build({
      name: "SWEEP PAD",
      alg: 5,
      feedback: 6,
      ops: [
        { r: [30, 25, 20, 30], l: [99, 95, 92, 0], ol: 92, coarse: 1, det: 4 },
        { r: [22, 18, 20, 30], l: [99, 60, 85, 0], ol: 78, coarse: 1, ams: 2 },
        { r: [30, 25, 20, 30], l: [99, 95, 92, 0], ol: 90, coarse: 1, det: 10 },
        { r: [20, 18, 20, 30], l: [99, 60, 85, 0], ol: 76, coarse: 2, ams: 2 },
        SILENT,
        SILENT,
      ],
      lfo: { speed: 18, amd: 30, wave: 0 },
    }),
  },
];
