/**
 * S16 (docs/SIMULATOR.md): loading progress for the simulator displays. While a Performance's or
 * Scene's sounds load, the display shows "LOADING 1/3" (sounds ready / sounds being prepared:
 * one per sample part, plus the FM-X engine where a part uses it), then READY as before.
 */

/** Display text while loading; with nothing to count it stays "LOADING…" as before S16. */
export function loadingText(done: number, total: number): string {
  if (!(total > 0)) return "LOADING…";
  const d = Math.max(0, Math.min(total, Math.floor(done)));
  return `LOADING ${d}/${total}`;
}

/**
 * Waits for every promise (fulfilled or not) like Promise.allSettled, calling `onProgress(done, total)`
 * once at the start (0/total) and again each time one settles, in the order they settle.
 */
export async function settleWithProgress<T>(
  items: readonly Promise<T>[],
  onProgress?: (done: number, total: number) => void,
): Promise<PromiseSettledResult<T>[]> {
  const total = items.length;
  let done = 0;
  onProgress?.(0, total);
  return Promise.allSettled(
    items.map((p) =>
      p.finally(() => {
        done += 1;
        onProgress?.(done, total);
      }),
    ),
  );
}
