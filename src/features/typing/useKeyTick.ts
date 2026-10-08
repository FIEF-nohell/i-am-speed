"use client";

import { useCallback } from "react";
import { playTick } from "@/lib/sound";

/** Stable key-press callback that ticks only when sound is on. */
export function useKeyTick(enabled: boolean): (() => void) | undefined {
  const tick = useCallback(() => playTick(), []);
  return enabled ? tick : undefined;
}
