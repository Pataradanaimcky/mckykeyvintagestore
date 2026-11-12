"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { FmPage } from "./fm/FmPage";
import { PolyPage } from "./poly/PolyPage";
import { SynthRack } from "./SynthRack";

const PAGES = [
  { id: "modular", label: "MODULAR", note: "ต่อสายเอง" },
  { id: "fm", label: "FM 6-OP", note: "เล่นไฟล์ DX7" },
  { id: "poly", label: "POLY", note: "อนาล็อกยุค 80" },
] as const;

/**
 * The rack at the top of the home page, as pages you can swipe between or pick
 * from the tabs. Only the page in view listens to the computer keyboard and
 * makes sound.
 */
export function RackCarousel() {
  const [page, setPage] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // Follow swipes: whichever page is mostly in view is the current one.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setPage(Math.min(PAGES.length - 1, Math.max(0, next)));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // The track takes the height of the page in view, so a short page leaves no gap below it.
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = track.current?.children[page] as HTMLElement | undefined;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [page]);

  // Links such as /#play-fm open that page of the rack (the scroll listener above then marks it current).
  useEffect(() => {
    const apply = () => {
      const match = window.location.hash.match(/^#play-(\w+)$/);
      const index = match ? PAGES.findIndex((p) => p.id === match[1]) : -1;
      const el = track.current;
      if (index < 0 || !el) return;
      document.getElementById("play")?.scrollIntoView({ block: "start" });
      el.scrollTo({ left: index * el.clientWidth, behavior: "auto" });
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const go = (index: number, focus = false) => {
    const el = track.current;
    const next = (index + PAGES.length) % PAGES.length;
    if (el) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: next * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
    }
    setPage(next);
    if (focus) tabs.current[next]?.focus();
  };

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight") go(page + 1, true);
    else if (event.key === "ArrowLeft") go(page - 1, true);
    else return;
    event.preventDefault();
  };

  return (
    <div className="rise flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="หน้าของแร็ค" className="rack-tabs">
          {PAGES.map((p, i) => (
            <button
              key={p.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`rack-tab-${p.id}`}
              type="button"
              role="tab"
              aria-selected={page === i}
              aria-controls={`rack-page-${p.id}`}
              tabIndex={page === i ? 0 : -1}
              onClick={() => go(i)}
              onKeyDown={onTabKey}
              className="rack-tab"
            >
              {p.label}
              <span className="rack-tab-note">{p.note}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted sm:hidden">ปัดซ้ายขวาเพื่อเปลี่ยนเครื่อง</span>
          <button type="button" className="rack-nav" onClick={() => go(page - 1)} aria-label="เครื่องก่อนหน้า">
            ←
          </button>
          <button type="button" className="rack-nav" onClick={() => go(page + 1)} aria-label="เครื่องถัดไป">
            →
          </button>
        </div>
      </div>

      <div ref={track} className="rack-track" style={height ? { height } : undefined}>
        {PAGES.map((p, i) => (
          <div
            key={p.id}
            id={`rack-page-${p.id}`}
            role="tabpanel"
            aria-labelledby={`rack-tab-${p.id}`}
            aria-hidden={page !== i}
            inert={page !== i}
            className="rack-page"
          >
            {p.id === "modular" && <SynthRack active={page === i} />}
            {p.id === "fm" && <FmPage active={page === i} />}
            {p.id === "poly" && <PolyPage active={page === i} />}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2" aria-hidden="true">
        {PAGES.map((p, i) => (
          <span key={p.id} className={`rack-dot ${page === i ? "is-on" : ""}`} />
        ))}
      </div>
    </div>
  );
}
