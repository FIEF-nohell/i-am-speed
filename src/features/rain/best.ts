import { useSyncExternalStore } from "react";

const KEY = "i-am-speed:rain-best";
const listeners = new Set<() => void>();

/** Best rain score on this device. Storage may be blocked, so every access is guarded. */
export function readBest(): number {
  try {
    const n = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function writeBest(score: number): void {
  try {
    window.localStorage.setItem(KEY, String(Math.floor(score)));
  } catch {
    /* best score is a convenience */
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The stored best; 0 on the server and during hydration. */
export function useBest(): number {
  return useSyncExternalStore(subscribe, readBest, () => 0);
}
