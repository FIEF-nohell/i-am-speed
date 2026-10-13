import { Panel } from "@/components/ui/Panel";
import { sourceLabel } from "@/features/storage/source";
import { formatDuration, type Records } from "./aggregate";
import styles from "./StatsView.module.css";

export function WeekdayPanel({
  weekdays,
  index,
}: {
  weekdays: { day: string; minutes: number }[];
  index?: number;
}) {
  const max = Math.max(...weekdays.map((w) => w.minutes), 0);
  return (
    <Panel
      index={index}
      title="week rhythm"
      description="Average practice time on each weekday, over the days you practised."
    >
      <ul className={styles.bars}>
        {weekdays.map((w) => (
          <li key={w.day}>
            <span className={styles.name}>{w.day}</span>
            <span
              className={styles.bar}
              role="img"
              aria-label={`${Math.round(w.minutes)} minutes on average`}
            >
              <span
                style={{
                  width: max > 0 ? `${(w.minutes / max) * 100}%` : "0%",
                  background: "var(--accent)",
                }}
              />
            </span>
            <span className={`${styles.pct} mono`}>
              {w.minutes > 0 ? `${w.minutes.toFixed(1)}m` : "-"}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function RecordsPanel({ records, index }: { records: Records; index?: number }) {
  const rows: { label: string; value: string; note?: string }[] = [];
  if (records.fastest)
    rows.push({
      label: "fastest run",
      value: `${records.fastest.netWpm.toFixed(0)} wpm`,
      note: sourceLabel(records.fastest.source),
    });
  if (records.mostAccurate)
    rows.push({
      label: "most accurate run",
      value: `${records.mostAccurate.accuracy.toFixed(1)}%`,
      note: sourceLabel(records.mostAccurate.source),
    });
  if (records.longest)
    rows.push({
      label: "longest run",
      value: formatDuration(records.longest.durationMs),
      note: sourceLabel(records.longest.source),
    });
  rows.push({ label: "average run", value: formatDuration(records.avgRunMs) });
  return (
    <Panel
      index={index}
      title="records"
      description={`Highlights from your last ${records.count} saved runs.`}
    >
      <ul className={styles.records}>
        {rows.map((r) => (
          <li key={r.label}>
            <span className={styles.name}>{r.label}</span>
            <span className={styles.note}>{r.note}</span>
            <span className={`${styles.pct} mono`}>{r.value}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
