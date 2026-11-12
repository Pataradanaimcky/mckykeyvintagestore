import type { Soundfont } from "smplr";

type Instrument = Soundfont;

/**
 * Plays open General MIDI samples (FluidR3_GM, CC BY 3.0) for previewing a
 * slot. smplr and each instrument's samples load the first time they are used.
 */
export class GmPreview {
  ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private cache = new Map<string, Promise<Instrument>>();

  private start() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.9;
      this.out.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** The instrument, loading it the first time. Rejects when the samples cannot be fetched. */
  load(gm: string): Promise<Instrument> {
    const ctx = this.start();
    let entry = this.cache.get(gm);
    if (!entry) {
      entry = import("smplr").then(async ({ Soundfont }) => {
        const inst = new Soundfont(ctx, { instrument: gm, kit: "FluidR3_GM", destination: this.out!, loadLoopData: false, extraGain: 1, volume: 90 });
        await inst.load;
        return inst;
      });
      entry.catch(() => this.cache.delete(gm));
      this.cache.set(gm, entry);
    }
    return entry;
  }

  /** A short chord, like trying a sound on the keyboard. */
  async chord(gm: string) {
    const inst = await this.load(gm);
    const t = this.ctx!.currentTime;
    for (const note of [60, 64, 67]) inst.start({ note, velocity: 90, time: t, duration: 1.2 });
  }

  async noteOn(gm: string, note: number, velocity = 100) {
    const inst = await this.load(gm);
    inst.start({ note, velocity });
  }

  noteOff(gm: string, note: number) {
    void this.cache.get(gm)?.then((inst) => inst.stop(note));
  }

  private clips = new Map<string, Promise<AudioBuffer>>();
  private clipNode: { node: AudioBufferSourceNode; gain: GainNode } | null = null;

  /** Plays the start of a recorded demo through Web Audio (no file link on the page). */
  async clip(url: string, seconds = 8) {
    const ctx = this.start();
    let entry = this.clips.get(url);
    if (!entry) {
      entry = fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`demo ${r.status}`);
          return r.arrayBuffer();
        })
        .then((b) => ctx.decodeAudioData(b));
      entry.catch(() => this.clips.delete(url));
      this.clips.set(url, entry);
    }
    const buffer = await entry;
    this.stopClip();
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    const end = t + Math.min(seconds, buffer.duration);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.04);
    gain.gain.setValueAtTime(1, end - 0.4);
    gain.gain.linearRampToValueAtTime(0, end);
    node.connect(gain).connect(this.out!);
    node.start(t);
    node.stop(end + 0.05);
    this.clipNode = { node, gain };
  }

  stopClip() {
    const c = this.clipNode;
    if (!c || !this.ctx) return;
    c.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    c.node.stop(this.ctx.currentTime + 0.15);
    this.clipNode = null;
  }

  close() {
    void this.ctx?.close();
    this.ctx = null;
    this.cache.clear();
  }
}
