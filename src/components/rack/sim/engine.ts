import { createChorus, PolyVoices } from "../poly/voices";
import type { AnSettings, Performance } from "@/lib/sim/modx";
import { joinReverbSend, SIM_LIMITER, softClipCurve } from "@/lib/sim/output";
import { brightCutoff } from "@/lib/sim/sampler";
import type { OpenedSet } from "@/lib/sim/userset";
import { SamplePart, type SampleVoice } from "./samplePart";
import { UserSetPart } from "./userSetPart";

interface PartChannel {
  gain: GainNode;
  pan?: StereoPannerNode;
  an?: { voices: PolyVoices; settings: AnSettings };
  /** AWM2 / PCM parts: the store's own sample voice (both pages), or smplr when it cannot load. */
  awm?: Promise<SampleVoice>;
  /** A2c: the part's own sample voice, kept while a set the visitor opened plays in its place. */
  ownAwm?: Promise<SampleVoice>;
  /** AWM2 / PCM parts: low-pass before the part gain, open (pass-through at Nyquist) unless Knob 3 BRIGHT closes it (S2d). */
  tone?: BiquadFilterNode;
  /** FM-X parts: one AudioWorklet node (public/worklets/fmx-poly.js); null when the browser has no AudioWorklet. */
  fm?: Promise<AudioWorkletNode | null>;
  /** FANTOM-0 zone effects (loaded with `fx`): EQ bands and the reverb and chorus sends. */
  fx?: { low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode; reverb: GainNode; chorus: GainNode; reverbJoined: boolean };
  /** Release in seconds for sample notes (FANTOM-0 CTRL RELEASE); unset = the sample player's own. */
  release?: number;
  /** Attack in seconds for sample notes (FANTOM-0 CTRL ATTACK, S5j); unset = the sample voice's own. Not heard on the smplr fallback. */
  attack?: number;
}

/**
 * Audio for the MODX M-style page: one channel per part (AN-X parts use the POLY page's
 * analog-style voices, AWM2 parts play FluidR3_GM samples through the store's own sample voice
 * (SamplePart, SIMULATOR.md S2b; smplr if it cannot load), FM-X parts run the
 * store's own 8-operator FM voice in an AudioWorklet), a shared chorus
 * and a limiter with a soft clip after it. Built for the Performance in use; `load` swaps it.
 */
export class SimEngine {
  readonly ctx: AudioContext;
  readonly analyser: AnalyserNode;
  private bus: GainNode;
  private parts: PartChannel[] = [];
  private bendCents = 0;
  private sounding = new Map<number, { part: number; note: number }[]>();
  private fmModule?: Promise<boolean>;
  private out: AudioNode;
  private sends?: { reverb: AudioNode; chorus: AudioNode };

  constructor() {
    this.ctx = new AudioContext({ latencyHint: "interactive" });
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 0.55;
    // Limiter then soft clip, so large chords stay under full scale (src/lib/sim/output.ts, SIMULATOR.md S7b).
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = SIM_LIMITER.threshold;
    limiter.knee.value = SIM_LIMITER.knee;
    limiter.ratio.value = SIM_LIMITER.ratio;
    limiter.attack.value = SIM_LIMITER.attack;
    limiter.release.value = SIM_LIMITER.release;
    const clip = this.ctx.createWaveShaper();
    clip.curve = softClipCurve();
    clip.oversample = "2x";
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    const chorus = createChorus(this.ctx, this.bus, limiter);
    chorus.setMode(1);
    limiter.connect(clip).connect(this.analyser).connect(this.ctx.destination);
    this.out = limiter;
  }

  /**
   * Shared reverb and chorus for the FANTOM-0 CTRL sends, made once on first use. The store's own:
   * a convolver on a decaying noise burst and a wet-only modulated delay; not Roland's effects.
   */
  private sendBuses() {
    if (this.sends) return this.sends;
    const ctx = this.ctx;
    const len = Math.round(ctx.sampleRate * 2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    const reverb = ctx.createConvolver();
    reverb.buffer = ir;
    const revOut = ctx.createGain();
    revOut.gain.value = 0.5;
    reverb.connect(revOut).connect(this.out);
    const chorusIn = ctx.createGain();
    const delay = ctx.createDelay(0.05);
    delay.delayTime.value = 0.016;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.7;
    const depth = ctx.createGain();
    depth.gain.value = 0.004;
    lfo.connect(depth).connect(delay.delayTime);
    lfo.start();
    chorusIn.connect(delay).connect(this.out);
    this.sends = { reverb, chorus: chorusIn };
    return this.sends;
  }

  resume() {
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  /** Loads the FM-X worklet once; false when this browser cannot run it (the FM-X part is then silent). */
  private fmReady(): Promise<boolean> {
    this.fmModule ??= this.ctx.audioWorklet
      ? this.ctx.audioWorklet.addModule("/worklets/fmx-poly.js").then(() => true, () => false)
      : Promise.resolve(false);
    return this.fmModule;
  }

  /**
   * Sets up one channel per part. Sample parts start loading now; returns when all have loaded (or failed).
   * `pans` (0..1 per part) adds a pan control to each channel; without it the channels are as before.
   * `voice` picks the sample player: "own" (the store's SamplePart, both pages since S2c, smplr if it cannot
   * load) or "smplr" (smplr only).
   */
  async load(perf: Performance, pans?: readonly number[], fx = false, voice: "own" | "smplr" = "own"): Promise<boolean> {
    this.allOff();
    for (const p of this.parts)
      setTimeout(() => {
        p.gain.disconnect();
        if (p.fx?.reverbJoined) p.fx.reverb.disconnect();
        void p.fm?.then((node) => {
          node?.port.postMessage({ type: "stop" });
          node?.disconnect();
        });
      }, 1500);
    this.parts = perf.parts.map((part, i) => {
      const gain = this.ctx.createGain();
      gain.gain.value = part.level;
      const ch: PartChannel = { gain };
      if (pans) {
        ch.pan = this.ctx.createStereoPanner();
        ch.pan.pan.value = (pans[i] ?? 0.5) * 2 - 1;
        if (fx) {
          // FANTOM-0 zone path: EQ (low shelf, peak, high shelf; the store's corner frequencies), pan, then sends.
          const band = (type: BiquadFilterType, freq: number) => {
            const f = this.ctx.createBiquadFilter();
            f.type = type;
            f.frequency.value = freq;
            f.gain.value = 0;
            return f;
          };
          const low = band("lowshelf", 200);
          const mid = band("peaking", 1000);
          const high = band("highshelf", 4000);
          const sends = this.sendBuses();
          const reverb = this.ctx.createGain();
          const chorus = this.ctx.createGain();
          reverb.gain.value = 0;
          chorus.gain.value = 0;
          gain.connect(low).connect(mid).connect(high).connect(ch.pan).connect(this.bus);
          // The reverb send joins the convolver only when its REVERB knob first goes above 0 (S7d, setZoneFx).
          ch.pan.connect(reverb);
          ch.pan.connect(chorus).connect(sends.chorus);
          ch.fx = { low, mid, high, reverb, chorus, reverbJoined: false };
        } else gain.connect(ch.pan).connect(this.bus);
      } else gain.connect(this.bus);
      if (part.engine === "AN-X" && part.an) {
        ch.an = { voices: new PolyVoices(this.ctx, gain, 6), settings: { ...part.an } };
        if (this.bendCents) ch.an.voices.setBend(this.bendCents);
      } else if (part.engine === "FM-X" && part.fm) {
        const patch = part.fm;
        ch.fm = this.fmReady().then((ok) => {
          if (!ok) return null;
          const node = new AudioWorkletNode(this.ctx, "fmx-poly", {
            numberOfInputs: 0,
            outputChannelCount: [2],
            processorOptions: { patch },
          });
          node.connect(gain);
          if (this.bendCents) node.port.postMessage({ type: "bend", cents: this.bendCents });
          return node;
        });
      } else if (part.gm) {
        const gm = part.gm;
        const tone = this.ctx.createBiquadFilter();
        tone.type = "lowpass";
        tone.frequency.value = this.ctx.sampleRate / 2;
        tone.Q.value = 0.7071;
        tone.connect(gain);
        ch.tone = tone;
        const smplr = () => smplrVoice(this.ctx, gm, tone);
        ch.awm =
          voice === "own"
            ? (async () => {
                const own = new SamplePart(this.ctx, tone);
                await own.load(gm);
                if (this.bendCents) own.bend(this.bendCents);
                return own as SampleVoice;
              })().catch(smplr)
            : smplr();
      }
      return ch;
    });
    const results = await Promise.allSettled(this.parts.map((p) => p.awm ?? p.fm ?? Promise.resolve(null)));
    return results.every((r) => r.status === "fulfilled");
  }

  /**
   * A2c (docs/SIMULATOR.md): plays a set the visitor opened (recorded with /sampler) in place of an
   * AWM2 / PCM part's sample, through the same tone filter, level and pan; `null` goes back to the
   * part's own sample. Throws a Thai message when the part has no sample or a WAV will not decode.
   * Loading another Performance or Scene (`load`) drops the set, as the part's sounds are rebuilt.
   */
  async useSet(part: number, set: OpenedSet | null): Promise<void> {
    const ch = this.parts[part];
    if (!ch?.tone || !ch.awm) throw new Error("ส่วนนี้ไม่ใช่เสียงแซมเปิล เลือกส่วน AWM2 / PCM ก่อน");
    if (!set) {
      if (!ch.ownAwm) return;
      void ch.awm.then((v) => v.allOff()).catch(() => {});
      ch.awm = ch.ownAwm;
      ch.ownAwm = undefined;
      return;
    }
    const voice = new UserSetPart(this.ctx, ch.tone);
    await voice.load(set);
    if (this.parts[part] !== ch) return; // another Performance was loaded meanwhile
    if (this.bendCents) voice.bend(this.bendCents);
    void ch.awm.then((v) => v.allOff()).catch(() => {});
    ch.ownAwm ??= ch.awm;
    ch.awm = Promise.resolve(voice);
  }

  setLevel(part: number, level: number) {
    this.parts[part]?.gain.gain.setTargetAtTime(level * 0.9, this.ctx.currentTime, 0.02);
  }

  /** Pan 0..1 (0.5 = centre); only for channels loaded with `pans`. */
  setPan(part: number, pan: number) {
    this.parts[part]?.pan?.pan.setTargetAtTime(Math.min(1, Math.max(-1, pan * 2 - 1)), this.ctx.currentTime, 0.02);
  }

  /** FANTOM-0 CTRL: EQ gains in dB, reverb and chorus sends 0..1, for channels loaded with `fx`. */
  setZoneFx(part: number, eq: { low: number; mid: number; high: number }, reverb: number, chorus: number) {
    const fx = this.parts[part]?.fx;
    if (!fx) return;
    const t = this.ctx.currentTime;
    fx.low.gain.setTargetAtTime(eq.low, t, 0.02);
    fx.mid.gain.setTargetAtTime(eq.mid, t, 0.02);
    fx.high.gain.setTargetAtTime(eq.high, t, 0.02);
    fx.reverb.gain.setTargetAtTime(reverb * 0.8, t, 0.02);
    if (joinReverbSend(fx.reverbJoined, reverb)) {
      fx.reverb.connect(this.sendBuses().reverb);
      fx.reverbJoined = true;
    }
    fx.chorus.gain.setTargetAtTime(chorus * 0.7, t, 0.02);
  }

  /** FANTOM-0 CTRL ATTACK / RELEASE: new analog settings for a VA channel (next notes), or attack and release for sample notes. */
  setEnvelope(part: number, an: AnSettings | undefined, release: number | undefined, attack?: number) {
    const ch = this.parts[part];
    if (!ch) return;
    if (ch.an && an) ch.an.settings = { ...an };
    ch.release = release;
    ch.attack = attack;
  }

  setCutoff(part: number, cutoff: number) {
    const an = this.parts[part]?.an;
    if (!an) return;
    an.settings = { ...an.settings, cutoff };
    an.voices.update(an.settings);
  }

  /** Knob 3 BRIGHT on an AWM2 part (S2d): 1 = open as recorded, 0 = darkest (src/lib/sim/sampler.ts brightCutoff). */
  setBright(part: number, bright: number) {
    const tone = this.parts[part]?.tone;
    if (!tone) return;
    const t = this.ctx.currentTime;
    const hz = brightCutoff(bright, this.ctx.sampleRate / 2);
    tone.frequency.cancelScheduledValues(t);
    if (bright >= 1) tone.frequency.setValueAtTime(hz, t);
    else tone.frequency.setTargetAtTime(hz, t, 0.02);
  }

  /**
   * Pitch bend in cents. Heard on the AN-X / VA and FM-X parts and on the MODX M AWM2 and FANTOM-0 PCM
   * parts played by the store's own sample voice, held notes included (S8e, S2c). Parts on the smplr
   * fallback do not bend: smplr 1.1.0 has no way to change the pitch of a note already playing.
   */
  bend(cents: number) {
    this.bendCents = cents;
    for (const ch of this.parts) {
      ch.an?.voices.setBend(cents);
      void ch.fm?.then((node) => node?.port.postMessage({ type: "bend", cents }));
      void ch.awm?.then((v) => v.bend?.(cents)).catch(() => {});
    }
  }

  /** `targets` are [part, note after transpose] pairs from the routing rules. */
  noteOn(key: number, targets: [number, number][], velocity = 0.8) {
    this.resume();
    this.noteOff(key);
    for (const [part, note] of targets) {
      const ch = this.parts[part];
      if (!ch) continue;
      if (ch.an) ch.an.voices.noteOn(note, ch.an.settings, velocity);
      else if (ch.fm) void ch.fm.then((node) => node?.port.postMessage({ type: "on", note, velocity }));
      else void ch.awm?.then((v) => v.noteOn(note, Math.round(30 + velocity * 97), ch.release, ch.attack)).catch(() => {});
    }
    this.sounding.set(key, targets.map(([part, note]) => ({ part, note })));
  }

  noteOff(key: number) {
    for (const { part, note } of this.sounding.get(key) ?? []) {
      const ch = this.parts[part];
      if (ch?.an) ch.an.voices.noteOff(note, ch.an.settings);
      else if (ch?.fm) void ch.fm.then((node) => node?.port.postMessage({ type: "off", note }));
      else void ch?.awm?.then((v) => v.noteOff(note)).catch(() => {});
    }
    this.sounding.delete(key);
  }

  allOff() {
    for (const key of [...this.sounding.keys()]) this.noteOff(key);
    for (const ch of this.parts) {
      if (ch.an) ch.an.voices.allOff(ch.an.settings);
      else if (ch.fm) void ch.fm.then((node) => node?.port.postMessage({ type: "allOff" }));
      else void ch.awm?.then((v) => v.allOff()).catch(() => {});
    }
  }

  close() {
    void this.ctx.close();
  }
}

/** smplr 1.1.0 playing the same FluidR3_GM file, as the pages did before S2b. */
async function smplrVoice(ctx: AudioContext, instrument: string, destination: AudioNode): Promise<SampleVoice> {
  const { Soundfont } = await import("smplr");
  const inst = new Soundfont(ctx, { instrument, kit: "FluidR3_GM", destination, loadLoopData: false, extraGain: 1, volume: 90 });
  await inst.load;
  return {
    noteOn: (note, velocity, release) => void inst.start({ note, velocity, ...(release !== undefined ? { ampRelease: release } : {}) }),
    noteOff: (note) => void inst.stop(note),
    allOff: () => void inst.stop(),
  };
}
