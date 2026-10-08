import type { CSSProperties } from "react";

/**
 * The motion system. Every duration and easing in the app comes from here or from the matching
 * CSS variables in src/styles/motion.css (a unit test keeps the two in sync).
 *
 * Rules: animate transform and opacity only; never put animation work on the keystroke path;
 * everything must be skippable and finish within DURATION.slow, except the one-time results
 * reveal (DURATION.reveal).
 */
export const DURATION = {
  /** Hover, press, key feedback, caret step. */
  fast: 120,
  /** Colour and small state changes. */
  base: 200,
  /** Page entrance, theme change. */
  slow: 320,
  /** The results reveal: count-up and chart draw. The only long animation. */
  reveal: 900,
} as const;

export const EASING = {
  out: "cubic-bezier(0.2, 0.7, 0.2, 1)",
  inOut: "cubic-bezier(0.6, 0, 0.2, 1)",
  /** Small overshoot for tactile controls. */
  settle: "cubic-bezier(0.34, 1.45, 0.64, 1)",
} as const;

/** Delay between siblings in a staggered entrance, and the cap for the whole group. */
export const STAGGER = { step: 18, max: 360 } as const;

export function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/** Inline style that delays item `index` of a staggered group. Pair with the `.enter` class. */
export function staggerStyle(index: number): CSSProperties {
  return { "--delay": `${Math.min(index * STAGGER.step, STAGGER.max)}ms` } as CSSProperties;
}

/** System preference or the in-app "reduce motion" setting (data-motion on <html>). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.dataset.motion === "reduce" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Number tween on requestAnimationFrame. Returns a function that jumps to the end (skip) and stops.
 * With reduced motion it finishes immediately. Never call this from a key handler.
 */
export function tween(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (value: number) => void,
  reduced = prefersReducedMotion(),
): () => void {
  if (reduced || durationMs <= 0) {
    onUpdate(to);
    return () => {};
  }
  let raf = 0;
  let done = false;
  const start = performance.now();
  const step = (now: number): void => {
    if (done) return;
    const t = (now - start) / durationMs;
    onUpdate(lerp(from, to, easeOutCubic(t)));
    if (t < 1) raf = requestAnimationFrame(step);
    else done = true;
  };
  raf = requestAnimationFrame(step);
  return () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    onUpdate(to);
  };
}
