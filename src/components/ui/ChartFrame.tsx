import type { CSSProperties, ReactNode } from "react";
import styles from "./ChartFrame.module.css";

export interface LegendItem {
  label: string;
  /** Any CSS colour, normally a token such as "var(--accent)". */
  color: string;
  kind: "line" | "dot";
}

interface Props {
  title: string;
  /** Plain-text summary for assistive tech and when the chart is empty. */
  summary: string;
  height?: number;
  children: ReactNode;
  empty?: boolean;
  /** Legend shown beside the title: a swatch plus a label per series. */
  legend?: readonly LegendItem[];
  /** Right side of the header row, e.g. a Segmented range switch. */
  aside?: ReactNode;
}

/**
 * Shared wrapper for every chart: title row, fixed height (no layout shift, also when empty),
 * accessible summary.
 */
export function ChartFrame({
  title,
  summary,
  height = 220,
  children,
  empty,
  legend,
  aside,
}: Props) {
  return (
    <figure className={styles.frame}>
      <div className={styles.head}>
        <figcaption className={styles.title}>{title}</figcaption>
        {legend && legend.length > 0 && (
          <ul className={styles.legend}>
            {legend.map((item) => (
              <li key={item.label} className={styles.item}>
                <span
                  className={styles.swatch}
                  data-kind={item.kind}
                  style={{ "--swatch": item.color } as CSSProperties}
                  aria-hidden="true"
                />
                {item.label}
              </li>
            ))}
          </ul>
        )}
        {aside && <div className={styles.aside}>{aside}</div>}
      </div>
      <div
        className={styles.body}
        style={{ height }}
        role="img"
        aria-label={`${title}. ${summary}`}
      >
        {empty ? (
          <div className={styles.empty}>
            <p>{summary}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </figure>
  );
}
