import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface Props {
  /** A lucide icon element. Decorative. */
  icon: ReactNode;
  title: string;
  children: ReactNode;
  /** Up to two buttons or links. */
  actions?: ReactNode;
}

/** Icon, title, one sentence and up to two actions. Wrap it in a Panel where a box is wanted. */
export function EmptyState({ icon, title, children, actions }: Props) {
  return (
    <div className={styles.empty}>
      <div className={styles.icon} aria-hidden="true">
        {icon}
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.text}>{children}</p>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
