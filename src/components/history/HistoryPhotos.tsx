"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadPhotos, type CommonsPhoto } from "@/lib/history/commons";

type State = { done: boolean; photos: Map<string, CommonsPhoto> };

const PhotosContext = createContext<State>({ done: false, photos: new Map() });

/** Loads every photo on /history in two requests (Wikipedia lead images, then Commons credits). */
export function HistoryPhotos({ titles, children }: { titles: string[]; children: ReactNode }) {
  const [state, setState] = useState<State>({ done: false, photos: new Map() });
  const key = titles.join("|");
  useEffect(() => {
    let live = true;
    loadPhotos(key.split("|")).then((photos) => {
      if (live) setState({ done: true, photos });
    });
    return () => {
      live = false;
    };
  }, [key]);
  return <PhotosContext.Provider value={state}>{children}</PhotosContext.Provider>;
}

/** A Commons photo with its author, licence and file page under it, or a plain plate when there is none. */
export function HistoryPhoto({ title, model }: { title: string | null; model: string }) {
  const { done, photos } = useContext(PhotosContext);
  const [broken, setBroken] = useState(false);
  const photo = title ? photos.get(title) : undefined;

  if (!photo || broken) {
    return (
      <div className="history-plate" aria-hidden={!done ? true : undefined}>
        <span className="font-mono text-xs uppercase tracking-widest">{model}</span>
        <span className="text-xs">{!title || done ? "ไม่มีภาพที่มีสัญญาอนุญาตเสรี" : "กำลังโหลดภาพ…"}</span>
      </div>
    );
  }
  return (
    <figure className="flex flex-col gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- hotlinked from Wikimedia Commons with credit, not stored here */}
      <img
        src={photo.src}
        alt={`${model} (ภาพจาก Wikimedia Commons)`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="history-img"
      />
      <figcaption className="history-credit">
        ภาพ: {photo.author} ·{" "}
        {photo.licenceUrl ? (
          <a href={photo.licenceUrl} target="_blank" rel="noopener noreferrer license">
            {photo.licence}
          </a>
        ) : (
          photo.licence
        )}{" "}
        ·{" "}
        <a href={photo.page} target="_blank" rel="noopener noreferrer">
          Wikimedia Commons
        </a>
      </figcaption>
    </figure>
  );
}
