import { Panel } from "@/components/ui/Panel";
import type { Attempt } from "@/features/storage/schema";
import { sourceKind, sourceLabel } from "@/features/storage/source";
import { formatRelative } from "./aggregate";
import styles from "./StatsView.module.css";

interface Props {
  attempts: readonly Attempt[];
  now: number;
  index?: number;
}

/** Newest attempts first. Zen, tests and lessons are labelled by `sourceLabel`. Zen has no accuracy. */
export function RecentAttempts({ attempts, now, index }: Props) {
  return (
    <Panel bare index={index} title="recent attempts" description="Your latest finished runs.">
      {attempts.length === 0 ? (
        <p className={styles.note}>No saved attempts on this device yet.</p>
      ) : (
        <ul className={styles.recent}>
          {attempts.map((a) => (
            <li key={a.id}>
              <span className={styles.source}>{sourceLabel(a.source)}</span>
              <span className={`${styles.figure} mono`}>{Math.round(a.netWpm)} wpm</span>
              <span className={`${styles.figure} ${styles.acc} mono`}>
                {sourceKind(a.source) === "zen" ? "-" : `${a.accuracy.toFixed(1)}%`}
              </span>
              <time className={styles.when} dateTime={new Date(a.at).toISOString()}>
                {formatRelative(a.at, now)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
