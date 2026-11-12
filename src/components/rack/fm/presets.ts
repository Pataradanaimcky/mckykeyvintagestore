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
}

interface VoiceSpec {
  name: string;
  /** Algorithm 1..32, as printed on a DX7. */
  alg: number;
  feedback: number;
  /** Operators in the DX7 order OP1..OP6. */
  ops: [Op, Op, Op, Op, Op, Op];
}

const SILENT: Op = { r: [99, 99, 99, 99], l: [0, 0, 0, 0], ol: 0, coarse: 1 };

function build({ name, alg, feedback, ops }: VoiceSpec): Uint8Array {
  const p = new Uint8Array(155);
  // VCED stores operators from OP6 down to OP1.
  [...ops].reverse().forEach((op, index) => {
    const o = index * 21;
    p.set(op.r, o);
    p.set(op.l, o + 4);
    p[o + 8] = 39; // break point C3
    p[o + 13] = op.rs ?? 2;
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
  p.set([35, 0, 0, 0, 1, 0, 3], 137); // LFO speed, delay, PMD, AMD, sync, wave, PMS
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
];
