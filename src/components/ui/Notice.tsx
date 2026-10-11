import { AlertCircle, Info } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./Notice.module.css";

interface Props {
  children: ReactNode;
  /** neutral: quiet bar. info: accent bar (the caret again). error: error bar, announced as an alert. */
  tone?: "neutral" | "info" | "error";
  /** Show a leading icon (Info or AlertCircle). Neutral never shows one. */
  icon?: boolean;
  className?: string;
}

/** A callout: panel fill, 1px border and a 2px bar on the left. */
export function Notice({ children, tone = "neutral", icon = false, className }: Props) {
  const Icon = tone === "error" ? AlertCircle : tone === "info" ? Info : null;
  return (
    <div
      className={`${styles.notice} ${className ?? ""}`}
      data-tone={tone}
      role={tone === "error" ? "alert" : "status"}
    >
      {icon && Icon && <Icon className={styles.icon} aria-hidden="true" />}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
