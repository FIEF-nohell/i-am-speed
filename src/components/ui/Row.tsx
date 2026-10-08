import type { ReactNode } from "react";
import styles from "./Row.module.css";

interface Props {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}

/** Label on the left, control on the right. Used by settings. */
export function Row({ label, hint, children, htmlFor }: Props) {
  return (
    <div className={styles.row}>
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
