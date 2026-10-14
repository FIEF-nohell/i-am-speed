import { Panel } from "@/components/ui/Panel";
import type { Attempt } from "@/features/storage/schema";
import { sourceKind, sourceLabel } from "@/features/storage/source";
import { formatRelative } from "./aggregate";
import styles from "./StatsView.module.css";

interface Props {
  attempts: readonly Attempt[];
  now: number;
  className?: string;
}

/** Newest attempts first. Zen, tests and lessons are labelled by `sourceLabel`. Zen has no accuracy. */
export function RecentAttempts({ attempts, now, className }: Props) {
  return (
    <Panel bare className={className} title="recent attempts" aside={<span>newest first</span>}>
      {attempts.length === 0 ? (
        <p className={styles.note}>No saved attempts on this device yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">run</th>
                <th scope="col">speed</th>
                <th scope="col">accuracy</th>
                <th scope="col">when</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <th scope="row">{sourceLabel(a.source)}</th>
                  <td className="mono">{Math.round(a.netWpm)} wpm</td>
                  <td className="mono">
                    {sourceKind(a.source) === "zen" ? "-" : `${a.accuracy.toFixed(1)}%`}
                  </td>
                  <td>
                    <time dateTime={new Date(a.at).toISOString()}>{formatRelative(a.at, now)}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
