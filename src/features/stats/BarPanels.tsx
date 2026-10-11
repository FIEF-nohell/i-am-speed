import { Panel } from "@/components/ui/Panel";
import { FINGER_LABEL } from "@/features/keyboard/layout/atQwertz";
import { PHASES } from "@/features/lessons/curriculum";
import type { FingerAccuracy, PhaseProgress } from "./aggregate";
import { weakestFinger } from "./aggregate";
import styles from "./StatsView.module.css";

function Bar({ percent, color, label }: { percent: number; color: string; label: string }) {
  return (
    <span className={styles.bar} role="img" aria-label={label}>
      <span style={{ width: `${percent}%`, background: color }} />
    </span>
  );
}

export function FingersPanel({ fingers, index }: { fingers: FingerAccuracy[]; index?: number }) {
  const weakest = weakestFinger(fingers);
  return (
    <Panel
      index={index}
      title="fingers"
      description="Accuracy by finger, across everything you have typed."
      aside={weakest ? <span>weakest: {FINGER_LABEL[weakest.finger]}</span> : undefined}
    >
      <ul className={styles.bars}>
        {fingers.map((f) => (
          <li key={f.finger}>
            <span className={styles.name}>{FINGER_LABEL[f.finger]}</span>
            <Bar
              percent={f.accuracy ?? 0}
              color={`var(--finger-${f.finger})`}
              label={f.accuracy === null ? "no data" : `${f.accuracy.toFixed(1)} percent`}
            />
            <span className={`${styles.pct} mono`}>
              {f.accuracy === null ? "-" : `${f.accuracy.toFixed(1)}%`}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function PhasesPanel({ phases, index }: { phases: PhaseProgress[]; index?: number }) {
  return (
    <Panel index={index} title="phases" description="Lessons passed in each phase of the course.">
      <ul className={styles.bars}>
        {phases.map((p) => (
          <li key={p.phase}>
            <span className={styles.name}>{PHASES[p.phase - 1].title}</span>
            <Bar
              percent={(p.completed / p.total) * 100}
              color="var(--accent)"
              label={`${p.completed} of ${p.total} lessons`}
            />
            <span className={`${styles.pct} mono`}>
              {p.completed}/{p.total}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
