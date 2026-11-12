"use client";

import dynamic from "next/dynamic";

/** The studio reads saved work from this browser, so it only renders in the browser. */
export const StudioLoader = dynamic(() => import("./Studio").then((m) => m.Studio), {
  ssr: false,
  loading: () => <p className="studio-panel text-muted">กำลังเปิดสตูดิโอ…</p>,
});
