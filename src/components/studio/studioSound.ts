import { FM_PRESETS } from "@/components/rack/fm/presets";
import { createChorus, POLY_PROGRAMS, PolyVoices } from "@/components/rack/poly/voices";
import type { Part, PreviewSource } from "@/lib/studio/arrangement";

interface Strip {
  key: string;
  gain: GainNode;
  pan: StereoPannerNode;
  fm?: AudioWorkletNode;
  poly?: PolyVoices;
  program?: number;
}

const sourceKey = (s: PreviewSource) =>
  s.engine === "fm" ? `fm${s.preset}` : s.engine === "poly" ? `poly${s.program}` : s.engine === "syx" ? `syx${s.data}` : "none";

function patchOf(s: PreviewSource): Uint8Array | null {
  if (s.engine === "fm") return FM_PRESETS[s.preset]?.patch ?? null;
  if (s.engine === "syx") {
    try {
      const bin = atob(s.data);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return bytes.length === 155 ? bytes : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Plays an arrangement in the browser: one channel strip per part (level and
 * pan) with the part's preview sound, the FM engine or the polysynth from the
 * rack on the home page.
 */
export class StudioSound {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  private master: GainNode | null = null;
  private fmReady: Promise<boolean> | null = null;
  private strips = new Map<string, Strip>();

  /** Starts audio. Call from a tap or key press. */
  async start() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const ctx = new AudioContext({ latencyHint: "interactive" });
    const master = ctx.createGain();
    master.gain.value = 0.9;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.ratio.value = 8;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(limiter).connect(analyser).connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.analyser = analyser;
    this.fmReady = ctx.audioWorklet
      .addModule("/worklets/dx7-poly.js")
      .then(() => true)
      .catch(() => false);
  }

  /** Brings the channel strips in line with the parts: level, pan and sound. */
  async sync(parts: Part[], levelMax: number) {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const fmOk = await this.fmReady;
    const ids = new Set(parts.map((p) => p.id));
    for (const [id, strip] of this.strips) {
      if (!ids.has(id)) {
        this.dropStrip(strip);
        this.strips.delete(id);
      }
    }
    for (const part of parts) {
      let strip = this.strips.get(part.id);
      const key = sourceKey(part.preview);
      if (strip && strip.key !== key) {
        this.dropStrip(strip);
        strip = undefined;
      }
      if (!strip) {
        const gain = ctx.createGain();
        const pan = ctx.createStereoPanner();
        gain.connect(pan).connect(master);
        strip = { key, gain, pan };
        const patch = patchOf(part.preview);
        if (patch && fmOk) {
          const node = new AudioWorkletNode(ctx, "dx7-poly", { numberOfInputs: 0, outputChannelCount: [2] });
          node.port.postMessage({ type: "patch", patch });
          const boost = ctx.createGain();
          boost.gain.value = 2.2;
          node.connect(boost).connect(gain);
          strip.fm = node;
        } else if (part.preview.engine === "poly") {
          const program = POLY_PROGRAMS[part.preview.program] ?? POLY_PROGRAMS[0];
          const bus = ctx.createGain();
          bus.gain.value = 0.35;
          createChorus(ctx, bus, gain).setMode(program.chorus);
          strip.poly = new PolyVoices(ctx, bus, 8);
          strip.program = part.preview.program;
        }
        this.strips.set(part.id, strip);
      }
      const level = part.on ? (part.level / levelMax) ** 2 : 0;
      strip.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.02);
      strip.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, part.pan / 63)), ctx.currentTime, 0.02);
    }
  }

  private dropStrip(strip: Strip) {
    strip.fm?.port.postMessage({ type: "allOff" });
    const fm = strip.fm;
    const gain = strip.gain;
    // Let notes fade before disconnecting.
    window.setTimeout(() => {
      fm?.disconnect();
      gain.disconnect();
    }, 1500);
    if (strip.poly) strip.poly.allOff(POLY_PROGRAMS[strip.program ?? 0].settings);
  }

  noteOn(partId: string, note: number, velocity: number) {
    const strip = this.strips.get(partId);
    if (!strip) return;
    if (strip.fm) strip.fm.port.postMessage({ type: "on", note, velocity });
    else if (strip.poly) strip.poly.noteOn(note, POLY_PROGRAMS[strip.program ?? 0].settings, velocity / 127);
  }

  noteOff(partId: string, note: number) {
    const strip = this.strips.get(partId);
    if (!strip) return;
    if (strip.fm) strip.fm.port.postMessage({ type: "off", note });
    else if (strip.poly) strip.poly.noteOff(note, POLY_PROGRAMS[strip.program ?? 0].settings);
  }

  allOff() {
    for (const strip of this.strips.values()) {
      strip.fm?.port.postMessage({ type: "allOff" });
      strip.poly?.allOff(POLY_PROGRAMS[strip.program ?? 0].settings);
    }
  }

  close() {
    void this.ctx?.close();
    this.ctx = null;
    this.strips.clear();
  }
}
