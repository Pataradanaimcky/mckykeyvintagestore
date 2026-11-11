"use client";

import { useEffect } from "react";

/**
 * Turns on scroll reveals. Any element with a `data-reveal` attribute fades up
 * the first time it scrolls into view. Without JavaScript nothing is hidden:
 * the hiding styles only apply once this adds the `js` class to <html>.
 */
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("js");

    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    const scan = () => {
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          io.observe(el);
        }
      });
    };
    scan();

    // Filtering the store swaps cards in without a page load, so watch for new ones.
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      document.documentElement.classList.remove("js");
    };
  }, []);

  return null;
}
