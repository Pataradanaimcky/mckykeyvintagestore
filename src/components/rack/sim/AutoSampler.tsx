"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  checkSettings,
  DEFAULT_SETTINGS,
  findOnset,
  isClipping,
  peakOf,
  planNotes,
  progressLabel,
  runSeconds,
  yamahaNoteName,
  type SamplerSettings,
} from "@/lib/sim/autosample";
import { allNotesOffMsg, captureSeconds, cutTake, finishSet, noteOffMsg, noteOnMsg, silentLabel, type CutTake } from "@/lib/sim/autorun";
import { setZipName } from "@/lib/sim/zip";

/* The store's own auto-sampler page (docs/SIMULATOR.md A1d). Plays notes on the visitor's keyboard
 * over USB MIDI, records what comes back on the chosen audio input, and saves a zip on this
 * computer. Nothing is uploaded and nothing is written to the keyboard's memory. */

const UNTESTED = "ยังไม่ได้ทดสอบกับเครื่องจริง";

/** Tiny recorder worklet: passes each block of input to the page while recording is on. */
const RECORDER_JS = `class McRec extends AudioWorkletProcessor{constructor(){super();this.on=false;this.port.onmessage=(e)=>{this.on=!!e.data;};}
process(inputs){const i=inputs[0];if(this.on&&i&&i.length&&i[0].length){this.port.postMessage(i.map((c)=>c.slice()));}return true;}}
registerProcessor("mcky-rec",McRec);`;

type MidiPort = { id: string; name: string };
type MidiStatus = "off" | "unsupported" | "denied" | "on";
type AudioStatus = "off" | "unsupported" | "denied" | "on";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const dbfs = (peak: number) => (peak > 0 ? `${(20 * Math.log10(peak)).toFixed(1)} dBFS` : "เงียบ");

class Capture {
  ctx: AudioContext;
  private stream: MediaStream;
  private node: AudioWorkletNode;
  private chunks: Float32Array[][] = [];
  private constructor(ctx: AudioContext, stream: MediaStream, node: AudioWorkletNode) {
    this.ctx = ctx;
    this.stream = stream;
    this.node = node;
    node.port.onmessage = (e: MessageEvent<Float32Array[]>) => this.chunks.push(e.data);
  }
  static async open(deviceId: string): Promise<Capture> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2 },
    });
    const ctx = new AudioContext();
    await ctx.resume();
    const url = URL.createObjectURL(new Blob([RECORDER_JS], { type: "text/javascript" }));
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const node = new AudioWorkletNode(ctx, "mcky-rec", { numberOfInputs: 1, numberOfOutputs: 1 });
    const mute = ctx.createGain();
    mute.gain.value = 0;
    ctx.createMediaStreamSource(stream).connect(node);
    node.connect(mute).connect(ctx.destination);
    return new Capture(ctx, stream, node);
  }
  start() {
    this.chunks = [];
    this.node.port.postMessage(true);
  }
  /** Stops and joins what was recorded, one array per channel. */
  async stop(): Promise<Float32Array[]> {
    this.node.port.postMessage(false);
    await sleep(60);
    const nCh = Math.max(1, ...this.chunks.map((c) => c.length));
    const len = this.chunks.reduce((n, c) => n + c[0].length, 0);
    const out = Array.from({ length: nCh }, () => new Float32Array(len));
    let o = 0;
    for (const c of this.chunks) {
      for (let ch = 0; ch < nCh; ch++) out[ch].set(c[Math.min(ch, c.length - 1)], o);
      o += c[0].length;
    }
    this.chunks = [];
    return out;
  }
  close() {
    this.stream.getTracks().forEach((t) => t.stop());
    void this.ctx.close();
  }
}

function NumField(props: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; note?: boolean }) {
  return (
    <label className="studio-field">
      <span>
        {props.label} {props.note ? <b>{yamahaNoteName(Math.max(0, Math.min(127, Math.round(props.value || 0))))}</b> : null}
      </span>
      <input
        className="studio-input"
        type="number"
        inputMode="decimal"
        value={Number.isFinite(props.value) ? props.value : ""}
        step={props.step ?? 1}
        min={props.min}
        max={props.max}
        onChange={(e) => props.onChange(e.target.value === "" ? NaN : Number(e.target.value))}
      />
    </label>
  );
}

export function AutoSampler() {
  const [midiStatus, setMidiStatus] = useState<MidiStatus>("off");
  const [outputs, setOutputs] = useState<MidiPort[]>([]);
  const [outId, setOutId] = useState("");
  const [channel, setChannel] = useState(1);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("off");
  const [inputs, setInputs] = useState<MidiPort[]>([]);
  const [inId, setInId] = useState("");
  const [s, setS] = useState<SamplerSettings>(DEFAULT_SETTINGS);
  const [velText, setVelText] = useState(DEFAULT_SETTINGS.velocities.join(", "));
  const [bits, setBits] = useState<16 | 24>(24);
  const [name, setName] = useState("ชุดเสียงของฉัน");
  const [busy, setBusy] = useState<"" | "test" | "run">("");
  const [msg, setMsg] = useState("");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ url: string; file: string; count: number; silent: string } | null>(null);

  const access = useRef<MIDIAccess | null>(null);
  const stopRef = useRef(false);
  const sounding = useRef<number | null>(null);
  const capture = useRef<Capture | null>(null);

  const settings = useMemo<SamplerSettings>(() => {
    const velocities = velText.split(/[,\s]+/).filter(Boolean).map(Number);
    return { ...s, velocities };
  }, [s, velText]);
  const errors = useMemo(() => checkSettings(settings), [settings]);
  const total = errors.length ? 0 : planNotes(settings).length;
  const minutes = errors.length ? 0 : Math.ceil(runSeconds(settings) / 60);

  const out = useCallback((): MIDIOutput | null => access.current?.outputs.get(outId) ?? null, [outId]);

  /** Note off for the held note, then All Notes Off (CC 123) on the chosen channel. */
  const silence = useCallback(() => {
    const o = out();
    if (!o) return;
    try {
      if (sounding.current !== null) o.send(noteOffMsg(channel, sounding.current));
      o.send(allNotesOffMsg(channel));
    } catch {
      /* port gone */
    }
    sounding.current = null;
  }, [out, channel]);

  // Leaving the page: nothing keeps sounding or recording.
  const silenceRef = useRef(silence);
  useEffect(() => {
    silenceRef.current = silence;
  });
  useEffect(
    () => () => {
      stopRef.current = true;
      silenceRef.current();
      capture.current?.close();
    },
    [],
  );
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  async function connectMidi() {
    if (typeof navigator === "undefined" || !("requestMIDIAccess" in navigator)) {
      setMidiStatus("unsupported");
      return;
    }
    try {
      const a = await navigator.requestMIDIAccess({ sysex: false });
      access.current = a;
      const list = () => {
        const ports = [...a.outputs.values()].map((p) => ({ id: p.id, name: p.name ?? p.id }));
        setOutputs(ports);
        setOutId((cur) => (ports.some((p) => p.id === cur) ? cur : (ports[0]?.id ?? "")));
      };
      list();
      a.onstatechange = list;
      setMidiStatus("on");
    } catch {
      setMidiStatus("denied");
    }
  }

  async function connectAudio() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setAudioStatus("unsupported");
      return;
    }
    try {
      // Ask once so the device names appear, then let go of the microphone.
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      st.getTracks().forEach((t) => t.stop());
      const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput");
      const ports = devs.map((d, i) => ({ id: d.deviceId, name: d.label || `เสียงเข้า ${i + 1}` }));
      setInputs(ports);
      setInId((cur) => (ports.some((p) => p.id === cur) ? cur : (ports[0]?.id ?? "")));
      setAudioStatus("on");
    } catch {
      setAudioStatus("denied");
    }
  }

  async function openCapture(): Promise<Capture> {
    capture.current?.close();
    capture.current = await Capture.open(inId);
    return capture.current;
  }

  /** Plays one note and records it; returns the raw recording, or null when stopped. */
  async function playAndRecord(cap: Capture, note: number, velocity: number): Promise<Float32Array[] | null> {
    const o = out();
    if (!o) throw new Error("ยังไม่ได้เลือกพอร์ต MIDI");
    cap.start();
    o.send(noteOnMsg(channel, note, velocity));
    sounding.current = note;
    const until = performance.now() + settings.hold * 1000;
    while (performance.now() < until) {
      if (stopRef.current) return null;
      await sleep(20);
    }
    o.send(noteOffMsg(channel, note));
    sounding.current = null;
    const end = performance.now() + (captureSeconds(settings.hold, settings.tail) - settings.hold) * 1000;
    while (performance.now() < end) {
      if (stopRef.current) return null;
      await sleep(20);
    }
    return cap.stop();
  }

  async function testNote() {
    setBusy("test");
    setMsg("");
    stopRef.current = false;
    try {
      const cap = await openCapture();
      const note = Math.round((settings.low + settings.high) / 2);
      const velocity = settings.velocities[settings.velocities.length - 1] ?? 100;
      const raw = await playAndRecord(cap, note, velocity);
      if (!raw) return;
      const peak = peakOf(raw);
      if (findOnset(raw) === null) setMsg(`โน้ตทดสอบ ${yamahaNoteName(note)}: ไม่ได้ยินเสียง ตรวจสายเสียงเข้า ช่อง MIDI และระดับเสียง`);
      else if (isClipping(peak)) setMsg(`โน้ตทดสอบ ${yamahaNoteName(note)}: เสียงแตก (${dbfs(peak)}) ลดระดับเสียงที่คีย์บอร์ดหรือซาวด์การ์ดแล้วลองใหม่`);
      else setMsg(`โน้ตทดสอบ ${yamahaNoteName(note)}: ยอดเสียง ${dbfs(peak)} ใช้ได้${peak < 0.1 ? " (ค่อนข้างเบา เพิ่มระดับได้ถ้าไม่แตก)" : ""}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "อัดเสียงไม่ได้");
    } finally {
      silence();
      setBusy("");
    }
  }

  async function run() {
    setBusy("run");
    setMsg("");
    setResult(null);
    stopRef.current = false;
    const plan = planNotes(settings);
    const takes: CutTake[] = [];
    const silent: { note: number; velocity: number }[] = [];
    try {
      const cap = await openCapture();
      for (let i = 0; i < plan.length; i++) {
        setProgress(`${progressLabel(i + 1, plan.length)} · ${yamahaNoteName(plan[i].note)} v${plan[i].velocity}`);
        const raw = await playAndRecord(cap, plan[i].note, plan[i].velocity);
        if (!raw) break;
        const t = cutTake(raw, cap.ctx.sampleRate, { ...plan[i], hold: settings.hold, tail: settings.tail });
        if (t) takes.push(t);
        else silent.push(plan[i]);
        const gapEnd = performance.now() + settings.gap * 1000;
        while (performance.now() < gapEnd && !stopRef.current) await sleep(20);
        if (stopRef.current) break;
      }
      if (stopRef.current) {
        setMsg("หยุดแล้ว ไม่ได้บันทึกชุดเสียง");
        return;
      }
      const set = finishSet(name, cap.ctx.sampleRate, bits, takes);
      const url = URL.createObjectURL(new Blob([set.zip as Uint8Array<ArrayBuffer>], { type: "application/zip" }));
      setResult({ url, file: setZipName(name), count: takes.length, silent: silentLabel(silent) });
      setProgress(progressLabel(plan.length, plan.length));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "อัดเสียงไม่ได้");
    } finally {
      silence();
      capture.current?.close();
      capture.current = null;
      setBusy("");
    }
  }

  function stop() {
    stopRef.current = true;
    silence();
  }

  const ready = midiStatus === "on" && !!outId && audioStatus === "on" && !!inId && errors.length === 0;
  const set = (k: keyof SamplerSettings) => (n: number) => setS((cur) => ({ ...cur, [k]: n }));

  return (
    <div className="sampler">
      <p className="sampler-note">
        หน้านี้กดโน้ตบนคีย์บอร์ดของคุณผ่าน USB ทีละโน้ต อัดเสียงที่ออกมา แล้วบันทึกเป็นไฟล์ zip (WAV, manifest.json, .sfz) ไว้ในเครื่องของคุณ
        ไม่มีการอัปโหลด และไม่เขียนอะไรลงหน่วยความจำของคีย์บอร์ด ใช้ Chrome หรือ Edge บนคอมพิวเตอร์ · {UNTESTED}
      </p>

      <section className="studio-panel" aria-labelledby="sampler-midi">
        <h2 id="sampler-midi" className="sampler-h">1. MIDI ออกไปคีย์บอร์ด</h2>
        <div className="sampler-row">
          <button type="button" className="studio-btn" onClick={connectMidi} disabled={!!busy}>
            เชื่อมต่อ USB MIDI
          </button>
          <span className="sampler-tag">{UNTESTED}</span>
        </div>
        {midiStatus === "unsupported" ? <p className="sampler-warn">เบราว์เซอร์นี้ไม่มี Web MIDI (เช่น Safari บน iPhone) ใช้ Chrome หรือ Edge บนคอมพิวเตอร์</p> : null}
        {midiStatus === "denied" ? <p className="sampler-warn">ไม่ได้รับอนุญาตให้ใช้ MIDI กดอนุญาตในเบราว์เซอร์แล้วลองใหม่</p> : null}
        {midiStatus === "on" && outputs.length === 0 ? <p className="sampler-warn">ไม่พบพอร์ต MIDI ออก ต่อคีย์บอร์ดด้วยสาย USB แล้วรอสักครู่</p> : null}
        {outputs.length ? (
          <div className="sampler-grid">
            <label className="studio-field">
              <span>พอร์ต MIDI</span>
              <select className="studio-input" value={outId} onChange={(e) => setOutId(e.target.value)} disabled={!!busy}>
                {outputs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="studio-field">
              <span>ช่อง MIDI (ส่วนที่รับเสียงบนเครื่อง)</span>
              <select className="studio-input" value={channel} onChange={(e) => setChannel(Number(e.target.value))} disabled={!!busy}>
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </section>

      <section className="studio-panel" aria-labelledby="sampler-audio">
        <h2 id="sampler-audio" className="sampler-h">2. เสียงเข้าจากคีย์บอร์ด</h2>
        <p className="sampler-small">ใช้เสียงออกทาง USB ของคีย์บอร์ด (ถ้ามี) หรือต่อสายจากช่อง OUTPUT เข้าช่อง line-in ของซาวด์การ์ด ปิดเสียงแอปอื่นขณะอัด</p>
        <div className="sampler-row">
          <button type="button" className="studio-btn" onClick={connectAudio} disabled={!!busy}>
            เลือกเสียงเข้า
          </button>
          <span className="sampler-tag">{UNTESTED}</span>
        </div>
        {audioStatus === "unsupported" ? <p className="sampler-warn">เบราว์เซอร์นี้อัดเสียงไม่ได้</p> : null}
        {audioStatus === "denied" ? <p className="sampler-warn">ไม่ได้รับอนุญาตให้ใช้เสียงเข้า กดอนุญาตในเบราว์เซอร์แล้วลองใหม่</p> : null}
        {inputs.length ? (
          <label className="studio-field">
            <span>อุปกรณ์เสียงเข้า</span>
            <select className="studio-input" value={inId} onChange={(e) => setInId(e.target.value)} disabled={!!busy}>
              {inputs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      <section className="studio-panel" aria-labelledby="sampler-set">
        <h2 id="sampler-set" className="sampler-h">3. ตั้งค่า</h2>
        <div className="sampler-grid">
          <NumField label="โน้ตต่ำสุด" value={s.low} onChange={set("low")} min={0} max={127} note />
          <NumField label="โน้ตสูงสุด" value={s.high} onChange={set("high")} min={0} max={127} note />
          <NumField label="ห่างกันทุก (เซมิโทน)" value={s.step} onChange={set("step")} min={1} max={12} />
          <label className="studio-field">
            <span>velocity (คั่นด้วย , จากเบาไปแรง)</span>
            <input className="studio-input" value={velText} onChange={(e) => setVelText(e.target.value)} inputMode="numeric" />
          </label>
          <NumField label="กดค้าง (วินาที)" value={s.hold} onChange={set("hold")} step={0.1} min={0.1} max={30} />
          <NumField label="หางเสียง (วินาที)" value={s.tail} onChange={set("tail")} step={0.1} min={0} max={30} />
          <NumField label="พักระหว่างโน้ต (วินาที)" value={s.gap} onChange={set("gap")} step={0.1} min={0} max={10} />
          <label className="studio-field">
            <span>ความละเอียด WAV</span>
            <select className="studio-input" value={bits} onChange={(e) => setBits(Number(e.target.value) === 16 ? 16 : 24)}>
              <option value={24}>24 บิต</option>
              <option value={16}>16 บิต</option>
            </select>
          </label>
          <label className="studio-field sampler-wide">
            <span>ชื่อชุดเสียง</span>
            <input className="studio-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>
        {errors.length ? (
          <ul className="sampler-warn">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : (
          <p className="sampler-small">
            {total} โน้ต · ประมาณ {minutes} นาที · ชื่อโน้ตแบบ Yamaha (C3 = โน้ต 60)
          </p>
        )}
      </section>

      <section className="studio-panel" aria-labelledby="sampler-run">
        <h2 id="sampler-run" className="sampler-h">4. อัด</h2>
        <div className="sampler-row">
          <button type="button" className="studio-btn" onClick={testNote} disabled={!ready || !!busy}>
            โน้ตทดสอบ
          </button>
          <button type="button" className="studio-btn sampler-go" onClick={run} disabled={!ready || !!busy}>
            เริ่มอัด
          </button>
          <button type="button" className="studio-btn" onClick={stop} disabled={!busy}>
            หยุด
          </button>
        </div>
        <p className="sampler-progress" aria-live="polite">
          {busy === "test" ? "กำลังเล่นโน้ตทดสอบ…" : busy === "run" ? progress : progress && result ? `เสร็จ · ${progress}` : "พร้อม"}
        </p>
        {msg ? <p className="sampler-warn" role="status">{msg}</p> : null}
        {result ? (
          <div className="sampler-row">
            <a className="studio-btn sampler-go" href={result.url} download={result.file}>
              บันทึก {result.file}
            </a>
            <span className="sampler-small">
              อัดได้ {result.count} โน้ต{result.silent ? ` · ไม่ได้ยินเสียง: ${result.silent}` : ""}
            </span>
          </div>
        ) : null}
      </section>
    </div>
  );
}
