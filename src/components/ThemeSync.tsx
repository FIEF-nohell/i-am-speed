"use client";

import { DURATION } from "@/lib/motion";
import { useEffect } from "react";
import { useHydrated, useSettings } from "@/features/storage/store";

/** Keeps <html> attributes in step with settings after hydration. The inline script handles first paint. */
export function ThemeSync() {
  const { theme, fontSize, reduceMotion } = useSettings();
  const hydrated = useHydrated();
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (root.dataset.theme !== theme && !reduceMotion) {
      // Fade colours for one theme change only; the class is removed so nothing else ever transitions globally.
      root.classList.add("theme-fade");
      window.setTimeout(() => root.classList.remove("theme-fade"), DURATION.slow + 40);
    }
    root.dataset.theme = theme;
    root.dataset.size = fontSize;
    if (reduceMotion) root.dataset.motion = "reduce";
    else delete root.dataset.motion;
  }, [theme, fontSize, reduceMotion, hydrated]);
  return null;
}
