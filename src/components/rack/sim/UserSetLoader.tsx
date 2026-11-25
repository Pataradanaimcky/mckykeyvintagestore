"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { openPickedSet, setSummary, type OpenedSet, type PickedFile } from "@/lib/sim/userset";

/**
 * A2c (docs/SIMULATOR.md): "โหลดชุดเสียงที่อัดเอง" for the selected sample part / zone. Opens a zip
 * saved by /sampler, or its unzipped folder, in this browser only (nothing is uploaded), and hands
 * the set to the page; "ใช้เสียงเดิม" goes back to the part's own sample. Shared by both simulator pages.
 */
export function UserSetLoader({
  target,
  canLoad,
  loadedName,
  onOpen,
  onReset,
}: {
  /** e.g. "PART 1" or "ZONE 2", shown in the buttons' labels. */
  target: string;
  /** False when the selected part / zone does not play samples. */
  canLoad: boolean;
  /** Name of the set now playing on the selected part / zone, or null. */
  loadedName: string | null;
  /** Plays the set; rejects with a Thai message the loader shows. */
  onOpen: (set: OpenedSet) => Promise<void>;
  onReset: () => void;
}) {
  const zipInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    // Folder picking is not a typed React prop; Chrome, Edge, Firefox and Safari read this attribute.
    folderInput.current?.setAttribute("webkitdirectory", "");
  }, []);

  const pick = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const files: PickedFile[] = await Promise.all(
        [...list].map(async (f) => ({ name: f.name, path: f.webkitRelativePath ?? "", bytes: new Uint8Array(await f.arrayBuffer()) })),
      );
      const set = openPickedSet(files);
      await onOpen(set);
      setMessage({ text: setSummary(set), error: false });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "เปิดชุดเสียงไม่ได้", error: true });
    } finally {
      setBusy(false);
      if (zipInput.current) zipInput.current.value = "";
      if (folderInput.current) folderInput.current.value = "";
    }
  };

  return (
    <div className="sim-userset">
      <div className="flex flex-wrap items-center gap-1">
        <span className="rack-title">USER SET</span>
        <button
          type="button"
          className="rack-mini"
          disabled={!canLoad || busy}
          onClick={() => zipInput.current?.click()}
          aria-label={`โหลดชุดเสียงที่อัดเอง (ไฟล์ zip) ให้ ${target}`}
        >
          {busy ? "กำลังเปิด…" : "โหลดชุดเสียงที่อัดเอง"}
        </button>
        <button type="button" className="rack-mini" disabled={!canLoad || busy} onClick={() => folderInput.current?.click()} aria-label={`เลือกโฟลเดอร์ชุดเสียงให้ ${target}`}>
          โฟลเดอร์
        </button>
        {loadedName && (
          <button type="button" className="rack-mini" onClick={onReset} aria-label={`ใช้เสียงเดิมของ ${target}`}>
            ใช้เสียงเดิม
          </button>
        )}
      </div>
      <input ref={zipInput} type="file" accept=".zip,application/zip" hidden onChange={(e) => void pick(e.target.files)} />
      <input ref={folderInput} type="file" multiple hidden onChange={(e) => void pick(e.target.files)} />
      <p className="rack-hint leading-snug" aria-live="polite">
        {message ? (
          <span className={message.error ? "sim-userset-error" : undefined}>{message.text}</span>
        ) : canLoad ? (
          `ใช้ไฟล์ zip หรือโฟลเดอร์จากหน้าอัดเสียง แทนเสียงของ ${target} · เปิดในเบราว์เซอร์นี้เท่านั้น ไม่มีการอัปโหลด`
        ) : (
          `${target} ไม่ใช่เสียงแซมเปิล เลือกส่วนที่เป็นแซมเปิลก่อน`
        )}{" "}
        <Link href="/sampler" className="underline underline-offset-2">
          อัดเสียงจากคีย์บอร์ด
        </Link>
      </p>
    </div>
  );
}
