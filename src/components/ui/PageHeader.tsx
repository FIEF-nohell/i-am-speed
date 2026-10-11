import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

interface Props {
  /** Small context line above the title, e.g. "free test" or a phase name. */
  eyebrow?: string;
  title: string;
  lede?: string;
  /** Right side: page-level actions. */
  actions?: ReactNode;
}

/** The h1 block of every page outside the typing screens. Keeps the .page-title class. */
export function PageHeader({ eyebrow, title, lede, actions }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={`page-title ${styles.title}`}>{title}</h1>
        {lede && <p className={styles.lede}>{lede}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
