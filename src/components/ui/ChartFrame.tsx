import type { ReactNode } from "react";
import styles from "./ChartFrame.module.css";

interface Props {
  title: string;
  /** Plain-text summary for assistive tech and when the chart is empty. */
  summary: string;
  height?: number;
  children: ReactNode;
  empty?: boolean;
}

/** Shared wrapper for every chart: title, fixed height (no layout shift), accessible summary. */
export function ChartFrame({ title, summary, height = 220, children, empty }: Props) {
  return (
    <figure className={styles.frame}>
      <figcaption className={styles.title}>{title}</figcaption>
      <div
        className={styles.body}
        style={{ height }}
        role="img"
        aria-label={`${title}. ${summary}`}
      >
        {empty ? <p className={styles.empty}>{summary}</p> : children}
      </div>
    </figure>
  );
}
