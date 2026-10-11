import type { ReactNode } from "react";
import styles from "./Row.module.css";

interface Props {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
  /**
   * "never" (default): the control stays beside the label at every width. "narrow": a wide control
   * (segmented, slider, picker) drops under the label below 36rem.
   */
  stack?: "never" | "narrow";
}

/** Label on the left, control on the right. Used by settings. */
export function Row({ label, hint, children, htmlFor, stack = "never" }: Props) {
  return (
    <div className={styles.row} data-stack={stack}>
      <div className={styles.text}>
        <label htmlFor={htmlFor} className={styles.label}>
          {label}
        </label>
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
      <div className={styles.control}>{children}</div>
    </div>
  );
}
