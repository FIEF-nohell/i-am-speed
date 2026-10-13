import type { ReactNode } from "react";
import { staggerStyle } from "@/lib/motion";
import styles from "./Panel.module.css";

interface Props {
  title?: string;
  description?: string;
  /** Right side of the header: a count, a status, a Segmented, a button. */
  aside?: ReactNode;
  id?: string;
  as?: "section" | "div";
  /** No fill, border or padding: a hairline rule above the content instead of a card. */
  bare?: boolean;
  className?: string;
  /** Position in the page: the panel fades in with a capped stagger (the shared `.enter`). */
  index?: number;
  children: ReactNode;
}

/**
 * One level of quiet grouping for pages outside the typing screens: flat fill, 1px border, no
 * shadow. A Panel never contains another Panel; inside, separate content with Rows or spacing.
 */
export function Panel({
  title,
  description,
  aside,
  id,
  as: Tag = "section",
  bare,
  className,
  index,
  children,
}: Props) {
  const headingId = title ? `${id ?? title.replace(/\s+/g, "-")}-h` : undefined;
  return (
    <Tag
      id={id}
      className={`${styles.panel} ${bare ? styles.bare : ""} ${index === undefined ? "" : "enter"} ${className ?? ""}`}
      style={index === undefined ? undefined : staggerStyle(index)}
      aria-labelledby={Tag === "section" ? headingId : undefined}
    >
      {(title || aside) && (
        <header className={styles.head}>
          <div className={styles.titles}>
            {title && (
              <h2 id={headingId} className={styles.title}>
                {title}
              </h2>
            )}
            {description && <p className={styles.desc}>{description}</p>}
          </div>
          {aside && <div className={styles.aside}>{aside}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}
