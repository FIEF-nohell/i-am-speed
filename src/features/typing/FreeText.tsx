"use client";

import { memo, useLayoutEffect, useRef } from "react";
import type { FreeStatus } from "@/features/engine/freeType";
import type { CaretStyle } from "@/features/settings/settings";
import styles from "./FreeText.module.css";

interface Props {
  text: string;
  status: FreeStatus;
  caret: CaretStyle;
}

/**
 * Only the tail of the text is rendered, so a long session costs the same as a short one. The cut
 * moves in steps and depends only on the text, so line breaks stay put between steps. It snaps to
 * a newline (or else a space) so the first rendered line starts at a word.
 */
const KEEP = 4000;
const STEP = 2000;
const SNAP = 300;

export function tailStart(text: string): number {
  if (text.length <= KEEP + STEP) return 0;
  const cut = Math.floor((text.length - KEEP) / STEP) * STEP;
  const window = text.slice(cut, cut + SNAP);
  const nl = window.indexOf("\n");
  if (nl >= 0) return cut + nl + 1;
  const sp = window.indexOf(" ");
  return sp >= 0 ? cut + sp + 1 : cut;
}

const reducedMotion = (): boolean =>
  document.documentElement.dataset.motion === "reduce" ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function FreeTextImpl({ text, status, caret }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const lastStart = useRef(0);
  const start = tailStart(text);
  const shown = start === 0 ? text : text.slice(start);

  // Keep the newest line in view. Reads layout only; the scroll itself is a compositor animation.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const target = frame.scrollHeight - frame.clientHeight;
    const jumped = lastStart.current !== start;
    lastStart.current = start;
    frame.toggleAttribute("data-scrolled", target > 0);
    if (Math.abs(target - frame.scrollTop) < 1) return;
    frame.scrollTo({ top: target, behavior: jumped || reducedMotion() ? "instant" : "smooth" });
  }, [shown, start]);

  return (
    <div className={`${styles.frame} mono`} ref={frameRef} role="group" aria-label="your text">
      <span className={styles.text}>{shown}</span>
      <span
        className={styles.caret}
        data-style={caret}
        data-idle={status === "idle" || undefined}
        aria-hidden="true"
      />
    </div>
  );
}

export const FreeText = memo(FreeTextImpl);
