"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(hover: none) and (pointer: coarse)";

function subscribe(cb: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** False on touch-only devices (no hover, coarse pointer). SSR assumes a keyboard exists. */
export function useHasPhysicalKeyboard(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(QUERY).matches,
    () => true,
  );
}
