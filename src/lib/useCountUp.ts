"use client";

import { useEffect, useState } from "react";
import { DURATION, prefersReducedMotion, tween } from "./motion";

/**
 * Counts from 0 to `target` once. Any key press or click skips to the end, so it never delays
 * retrying or continuing. With reduced motion the target shows immediately.
 */
export function useCountUp(target: number, delayMs = 0): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    let stop = (): void => {};
    const skip = (): void => stop();
    const timer = window.setTimeout(() => {
      stop = tween(0, target, DURATION.reveal, setValue);
    }, delayMs);
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      stop();
    };
  }, [target, delayMs]);
  return value;
}
