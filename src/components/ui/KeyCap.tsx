import type { CSSProperties, ReactNode } from "react";
import styles from "./KeyCap.module.css";

interface Props {
  children: ReactNode;
  /** Finger colour token, e.g. "var(--finger-leftIndex)". */
  tint?: string;
  active?: boolean;
  pressed?: boolean;
  /** 0 to 1 error intensity for the heatmap. */
  heat?: number;
}

/** Inline keycap, used in prose and lesson headers. The on-screen board draws its own SVG caps. */
export function KeyCap({ children, tint, active, heat }: Props) {
  const style = { "--tint": tint ?? "var(--dim)", "--heat": heat ?? 0 } as CSSProperties;
  return (
    <kbd className={styles.cap} style={style} data-active={active || undefined}>
      {children}
    </kbd>
  );
}
