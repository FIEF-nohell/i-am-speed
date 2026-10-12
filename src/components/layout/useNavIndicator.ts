"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  INITIAL_INDICATOR,
  nextIndicator,
  type IndicatorCause,
  type IndicatorState,
} from "./navIndicator";

const half = (n: number): number => Math.round(n * 2) / 2;

/** Position of the label of the tab with this href, relative to the track, or null. */
function measureBox(track: HTMLElement, href: string | null): { x: number; w: number } | null {
  if (href === null) return null;
  const label = track.querySelector<HTMLElement>(`[data-href="${href}"] [data-label]`);
  if (!label) return null;
  const t = track.getBoundingClientRect();
  const l = label.getBoundingClientRect();
  return { x: half(l.left - t.left), w: half(l.width) };
}

/**
 * Tracks the current tab label inside the track. `measured` flips once the first placement is
 * known (hand-off from the static ::after bar); `ready` follows one frame later so the first
 * placement never animates.
 */
export function useNavIndicator(trackRef: RefObject<HTMLElement | null>, href: string | null) {
  const [state, setState] = useState<IndicatorState>(INITIAL_INDICATOR);
  const [measured, setMeasured] = useState(false);
  const [ready, setReady] = useState(false);
  const hrefRef = useRef(href);
  const measureRef = useRef<((cause: IndicatorCause) => void) | null>(null);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = (cause: IndicatorCause) => {
      const box = measureBox(track, hrefRef.current);
      setState((prev) => nextIndicator(prev, box, cause));
      setMeasured(true);
    };
    measureRef.current = measure;
    measure("init");
    const observer = new ResizeObserver(() => measure("resize"));
    observer.observe(track);
    track.querySelectorAll("[data-label]").forEach((el) => observer.observe(el));
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) measure("resize");
    });
    return () => {
      cancelled = true;
      observer.disconnect();
      measureRef.current = null;
    };
  }, [trackRef]);

  useLayoutEffect(() => {
    hrefRef.current = href;
    if (mounted.current) measureRef.current?.("route");
    mounted.current = true;
  }, [href]);

  useLayoutEffect(() => {
    if (!measured || ready) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [measured, ready]);

  return { state, ready, measured };
}
