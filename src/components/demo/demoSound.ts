import { createChorus, POLY_PROGRAMS, PolyVoices } from "@/components/rack/poly/voices";

export type DemoSource =
  | { kind: "fm"; patch: Uint8Array }
  | { kind: "poly"; program: number }
  | { kind: "gm"; gm: string }
  | { kind: "clip"; url: string };

type Gm = { start: (o: { note: number; velocity?: number; time?: number; duration?: number }) => unknown; stop: (n?: number) => void };

/**
 * One audio engine for the demo page that can swap sounds while a phrase
 * plays: the FM engine, the polysynth, open GM samples, or the owner's own
 * recordings. Everything plays through Web Audio, with no file links on the page.
 */
export class DemoSound {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  private master: GainNode | null = null;
  private fm: AudioWorkletNode | null = null;
  private fmReady: Promise<boolean> | null = null;
  private poly: PolyVoices | null = null;
  private polyBus: GainNode | null = null;
  private setChorus: ((mode: number) => void) | null = null;
  private gm = new Map<string, Promise<Gm>>();
  private clips = new Map<string, Promise<AudioBuffer>>();
  private clip: { node: AudioBufferSourceNode; gain: GainNode; started: number; duration: number } | null = null;
  private source: DemoSource | null = null;

  async start() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const ctx = new AudioContext({ latencyHint: "interactive" });
    const master = ctx.createGain();
    master.gain.value = 0.9;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 6;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(limiter).connect(analyser).connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.analyser = analyser;
    this.fmReady = ctx.audioWorklet
      .addModule("/worklets/dx7-poly.js")
      .then(() => {
        const node = new AudioWorkletNode(ctx, "dx7-poly", { numberOfInputs: 0, outputChannelCount: [2] });
        const boost = ctx.createGain();
        boost.gain.value = 1.3;
        node.connect(boost).connect(master);
        this.fm = node;
        return true;
      })
      .catch(() => false);
    const bus = ctx.createGain();
    bus.gain.value = 0.32;
    this.setChorus = createChorus(ctx, bus, master).setMode;
    this.polyBus = bus;
    this.poly = new PolyVoices(ctx, bus, 8);
  }

  private loadGm(name: string) {
    let entry = this.gm.get(name);
    if (!entry) {
      const ctx = this.ctx!;
      entry = import("smplr").then(async ({ Soundfont }) => {
        const inst = new Soundfont(ctx, { instrument: name, kit: "FluidR3_GM", destination: this.master!, loadLoopData: false, extraGain: 1, volume: 90 });
        await inst.load;
        return inst as unknown as Gm;
      });
      entry.catch(() => this.gm.delete(name));
      this.gm.set(name, entry);
    }
    return entry;
  }

  private loadClip(url: string) {
    let entry = this.clips.get(url);
    if (!entry) {
      const ctx = this.ctx!;
      entry = fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`clip ${r.status}`);
          return r.arrayBuffer();
        })
        .then((b) => ctx.decodeAudioData(b));
      entry.catch(() => this.clips.delete(url));
      this.clips.set(url, entry);
    }
    return entry;
  }

  /** Switches to a new sound. Loads it first, so the old one keeps playing until the new one is ready. */
  async setSource(next: DemoSource, playing: boolean) {
    await this.start();
    const ctx = this.ctx!;
    if (next.kind === "gm") await this.loadGm(next.gm);
    if (next.kind === "fm") await this.fmReady;
    const buffer = next.kind === "clip" ? await this.loadClip(next.url) : null;

    // Where the old clip was, so a clip-to-clip swap keeps its place in the music.
    const offset = this.clip ? (ctx.currentTime - this.clip.started) % this.clip.duration : 0;
    this.allOff();
    this.stopClip(0.08);
    this.source = next;
    if (next.kind === "fm") this.fm?.port.postMessage({ type: "patch", patch: next.patch });
    if (next.kind === "poly") this.setChorus?.(POLY_PROGRAMS[next.program]?.chorus ?? 1);
    if (buffer && playing) this.playClip(buffer, offset % buffer.duration);
  }

  get isClip() {
    return this.source?.kind === "clip";
  }

  /** Starts or stops the recording when the transport starts or stops. */
  async transport(playing: boolean) {
    if (this.source?.kind !== "clip") return;
    if (!playing) return this.stopClip(0.1);
    const buffer = await this.loadClip(this.source.url);
    this.playClip(buffer, 0);
  }

  private playClip(buffer: AudioBuffer, offset: number) {
    const ctx = this.ctx!;
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.06);
    node.connect(gain).connect(this.master!);
    node.start(ctx.currentTime, offset);
    this.clip = { node, gain, started: ctx.currentTime - offset, duration: buffer.duration };
  }

  private stopClip(fade: number) {
    const c = this.clip;
    if (!c || !this.ctx) return;
    const t = this.ctx.currentTime;
    c.gain.gain.setTargetAtTime(0, t, fade / 3);
    c.node.stop(t + fade + 0.05);
    this.clip = null;
  }

  noteOn(note: number, velocity: number) {
    const s = this.source;
    if (!s || !this.ctx) return;
    if (s.kind === "fm") this.fm?.port.postMessage({ type: "on", note, velocity });
    else if (s.kind === "poly") this.poly?.noteOn(note, POLY_PROGRAMS[s.program].settings, velocity / 127);
    else if (s.kind === "gm") void this.gm.get(s.gm)?.then((inst) => inst.start({ note, velocity }));
  }

  noteOff(note: number) {
    const s = this.source;
    if (!s) return;
    if (s.kind === "fm") this.fm?.port.postMessage({ type: "off", note });
    else if (s.kind === "poly") this.poly?.noteOff(note, POLY_PROGRAMS[s.program].settings);
    else if (s.kind === "gm") void this.gm.get(s.gm)?.then((inst) => inst.stop(note));
  }

  allOff() {
    this.fm?.port.postMessage({ type: "allOff" });
    if (this.poly) this.poly.allOff(POLY_PROGRAMS[0].settings);
    for (const entry of this.gm.values()) void entry.then((inst) => inst.stop()).catch(() => {});
  }

  close() {
    void this.ctx?.close();
    this.ctx = null;
    this.polyBus = null;
  }
}
