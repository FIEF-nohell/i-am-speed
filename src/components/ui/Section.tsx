import type { CSSProperties, ReactNode } from "react";
import styles from "./Section.module.css";

interface Props {
  title?: string;
  description?: string;
  children: ReactNode;
  id?: string;
  /** Right-aligned content beside the title (a count, a link). */
  aside?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** A quiet section: lowercase title, whitespace, no box. */
export function Section({ title, description, children, id, aside, className, style }: Props) {
  return (
    <section
      className={`${styles.section} ${className ?? ""}`}
      style={style}
      aria-labelledby={title ? `${id ?? title}-h` : undefined}
    >
      {title && (
        <header className={styles.head}>
          <div>
            <h2 id={`${id ?? title}-h`} className={styles.title}>
              {title}
            </h2>
            {description && <p className={styles.desc}>{description}</p>}
          </div>
          {aside && <div className={styles.aside}>{aside}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
