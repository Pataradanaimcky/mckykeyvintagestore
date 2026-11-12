// Polyphonic FM voice player for the FM page of the rack.
// Runs in an AudioWorklet. The DX7 engine (@audio/synth-dx7) is placed above this
// code by scripts/build-worklets.mjs, which defines `Voice` and `INIT`.

const MAX_VOICES = 12;
const FULL_SCALE = 2 ** 28;
const MAX_RELEASE_BLOCKS = Math.ceil((sampleRate * 10) / 64);

class Dx7Poly extends AudioWorkletProcessor {
  constructor() {
    super();
    this.patch = INIT;
    this.voices = [];
    this.block = new Int32Array(64);
    // Rendered samples waiting to be handed out; the engine works in 64-sample blocks.
    this.fifo = new Float32Array(1024);
    this.read = 0;
    this.count = 0;
    this.port.onmessage = (event) => this.handle(event.data);
  }

  handle(message) {
    if (message.type === "patch") {
      this.patch = new Uint8Array(message.patch);
    } else if (message.type === "on") {
      this.noteOff(message.note);
      if (this.voices.length >= MAX_VOICES) this.voices.shift();
      this.voices.push({
        note: message.note,
        voice: new Voice(this.patch, { note: message.note, velocity: message.velocity, fs: sampleRate }),
        released: false,
        releasedFor: 0,
      });
    } else if (message.type === "off") {
      this.noteOff(message.note);
    } else if (message.type === "allOff") {
      for (const v of this.voices) this.release(v);
    }
  }

  release(v) {
    if (!v.released) {
      v.voice.keyup();
      v.released = true;
    }
  }

  noteOff(note) {
    for (const v of this.voices) if (v.note === note) this.release(v);
  }

  renderBlock() {
    const block = this.block;
    block.fill(0);
    for (const v of this.voices) {
      v.voice.block(block);
      if (v.released) v.releasedFor++;
    }
    const size = this.fifo.length;
    let write = (this.read + this.count) % size;
    for (let i = 0; i < 64; i++) {
      this.fifo[write] = block[i] / FULL_SCALE;
      write = (write + 1) % size;
    }
    this.count += 64;
    this.voices = this.voices.filter((v) => !(v.released && (v.voice.done || v.releasedFor > MAX_RELEASE_BLOCKS)));
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    const frames = output[0].length;
    while (this.count < frames) this.renderBlock();
    const size = this.fifo.length;
    for (let i = 0; i < frames; i++) {
      const sample = this.fifo[this.read];
      for (const channel of output) channel[i] = sample;
      this.read = (this.read + 1) % size;
    }
    this.count -= frames;
    return true;
  }
}

registerProcessor("dx7-poly", Dx7Poly);
