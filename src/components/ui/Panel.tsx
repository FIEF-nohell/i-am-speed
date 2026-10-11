import type { ReactNode } from "react";
import styles from "./Panel.module.css";

interface Props {
  title?: string;
  description?: string;
  /** Right side of the header: a count, a status, a Segmented, a button. */
  aside?: ReactNode;
  id?: string;
  as?: "section" | "div";
  className?: string;
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
  className,
  children,
}: Props) {
  const headingId = title ? `${id ?? title.replace(/\s+/g, "-")}-h` : undefined;
  return (
    <Tag
      id={id}
      className={`${styles.panel} ${className ?? ""}`}
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
