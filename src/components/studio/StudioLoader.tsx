"use client";

import dynamic from "next/dynamic";

/** The organizer reads saved work from this browser, so it only renders in the browser. */
export const StudioLoader = dynamic(() => import("./Organizer").then((m) => m.Organizer), {
  ssr: false,
  loading: () => <p className="studio-panel text-muted">กำลังเปิด…</p>,
});
