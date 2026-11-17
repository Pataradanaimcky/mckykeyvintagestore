// FM-X-style part player for the MODX M simulator page of the rack (SIMULATOR.md S3b).
// Runs in an AudioWorklet. The store's own 8-operator FM voice (src/lib/sim/fmx.ts) is placed
// above this code by scripts/build-worklets.mjs, which defines `FmPoly`.
// One node plays one part; messages: patch, on, off, allOff, bend, stop.

class FmxPoly extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const patch = options?.processorOptions?.patch;
    this.poly = patch ? new FmPoly(patch) : null;
    this.alive = true;
    this.port.onmessage = (event) => this.handle(event.data);
  }

  handle(m) {
    if (m.type === "patch") this.poly = new FmPoly(m.patch);
    else if (m.type === "stop") this.alive = false;
    else if (!this.poly) return;
    else if (m.type === "on") this.poly.noteOn(m.note, m.velocity);
    else if (m.type === "off") this.poly.noteOff(m.note);
    else if (m.type === "allOff") this.poly.allOff();
    else if (m.type === "bend") this.poly.setBend(m.cents);
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    if (!this.poly || !out || !out[0]) return this.alive;
    this.poly.render(out[0], sampleRate);
    for (let c = 1; c < out.length; c++) out[c].set(out[0]);
    return this.alive;
  }
}

registerProcessor("fmx-poly", FmxPoly);
