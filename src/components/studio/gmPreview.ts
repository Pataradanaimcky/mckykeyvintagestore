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
        const inst = new Soundfont(ctx, { instrument: gm, kit: "FluidR3_GM", destination: this.out!, loadLoopData: false });
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

  close() {
    void this.ctx?.close();
    this.ctx = null;
    this.cache.clear();
  }
}
