"use client";

import { useEffect } from "react";
import { useHydrated, useSettings } from "@/features/storage/store";

/** Keeps <html> attributes in step with settings after hydration. The inline script handles first paint. */
export function ThemeSync() {
  const { theme, fontSize, reduceMotion } = useSettings();
  const hydrated = useHydrated();
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.size = fontSize;
    if (reduceMotion) root.dataset.motion = "reduce";
    else delete root.dataset.motion;
  }, [theme, fontSize, reduceMotion, hydrated]);
  return null;
}
