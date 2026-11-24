"use client";

import dynamic from "next/dynamic";

/** The auto-sampler uses Web MIDI and the sound card, so it only renders in the browser. */
export const AutoSamplerLoader = dynamic(() => import("./AutoSampler").then((m) => m.AutoSampler), {
  ssr: false,
  loading: () => <p className="studio-panel text-muted">กำลังเปิด…</p>,
});
