import styles from "./Stat.module.css";

interface Props {
  label: string;
  value: string;
  unit?: string;
  /** "lead" makes the figure larger (headline result). "tile" is a compact figure for stat tiles. */
  size?: "lead" | "normal" | "tile";
  accent?: boolean;
}

export function Stat({ label, value, unit, size = "normal", accent }: Props) {
  return (
    <div className={styles.stat} data-size={size} data-accent={accent || undefined}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>
        <span className="mono" data-stat-value>
          {value}
        </span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </dd>
    </div>
  );
}
