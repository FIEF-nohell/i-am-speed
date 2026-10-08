import type { ReactNode } from "react";
import styles from "./Notice.module.css";

export function Notice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <p className={styles.notice} data-tone={tone} role="status">
      {children}
    </p>
  );
}
