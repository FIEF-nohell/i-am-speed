"use client";

import { useMemo } from "react";
import { Section } from "@/components/ui/Section";
import { Stat } from "@/components/ui/Stat";
import { FINGER_LABEL } from "@/features/keyboard/layout/atQwertz";
import { KeyboardGuide } from "@/features/keyboard/KeyboardGuide";
import { LESSONS, PHASES } from "@/features/lessons/curriculum";
import { heatByCode } from "@/features/results/heat";
import { useData, useHydrated } from "@/features/storage/store";
import {
  completedPerPhase,
  dailySeries,
  fingerAccuracies,
  formatDuration,
  weakestKeys,
} from "./aggregate";
import { ProgressCharts } from "./ProgressCharts";
import styles from "./StatsView.module.css";

export function StatsView() {
  const data = useData();
  const hydrated = useHydrated();
  const days = useMemo(() => dailySeries(data.days), [data.days]);
  const weak = useMemo(() => weakestKeys(data.keys, 8), [data.keys]);
  const heat = useMemo(() => heatByCode(data.keys), [data.keys]);
  const fingers = useMemo(() => fingerAccuracies(data.fingers), [data.fingers]);
  const phases = completedPerPhase(
    LESSONS,
    data.lessons,
    PHASES.map((p) => p.id),
  );
  const attempted = LESSONS.filter((l) => data.lessons[l.id]);

  if (!hydrated) return <div style={{ minHeight: "30rem" }} />;
  if (data.totals.attempts === 0) {
    return (
      <div className="page-narrow">
        <h1 className="page-title">stats</h1>
        <p className="page-lede">
          Nothing to show yet. Finish a lesson or a test and your progress will collect here, in
          this browser only.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">stats</h1>
      <p className="page-lede">Everything below is calculated from data stored in this browser.</p>

      <dl className={styles.totals}>
        <Stat label="time typed" value={formatDuration(data.totals.timeMs)} />
        <Stat label="characters" value={data.totals.chars.toLocaleString("en")} />
        <Stat label="attempts" value={`${data.totals.attempts}`} />
        <Stat
          label="lessons passed"
          value={`${phases.reduce((a, p) => a + p.completed, 0)} / ${LESSONS.length}`}
        />
      </dl>

      <Section title="progress">
        <ProgressCharts days={days} />
      </Section>

      <Section title="fingers" description="Accuracy by finger, across everything you have typed.">
        <ul className={styles.fingers}>
          {fingers.map((f) => (
            <li key={f.finger}>
              <span className={styles.fname}>{FINGER_LABEL[f.finger]}</span>
              <span
                className={styles.bar}
                role="img"
                aria-label={f.accuracy === null ? "no data" : `${f.accuracy.toFixed(1)} percent`}
              >
                <span
                  style={{ width: `${f.accuracy ?? 0}%`, background: `var(--finger-${f.finger})` }}
                />
              </span>
              <span className={`${styles.pct} mono`}>
                {f.accuracy === null ? "-" : `${f.accuracy.toFixed(1)}%`}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="weakest keys"
        description={
          weak.length
            ? "Highest error rate over all attempts."
            : "No key has enough errors to call it weak. Good."
        }
      >
        {weak.length > 0 && (
          <ul className={styles.weak}>
            {weak.map((w) => (
              <li key={w.key}>
                <kbd className="mono">{w.key}</kbd>
                <span className="mono">{(w.errorRate * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        )}
        {weak.length > 0 && (
          <KeyboardGuide
            colorByFinger={false}
            heat={heat}
            label="keyboard error heatmap, all time"
          />
        )}
      </Section>

      <Section title="phases">
        <ul className={styles.phases}>
          {phases.map((p) => (
            <li key={p.phase}>
              <span>{PHASES[p.phase - 1].title}</span>
              <span
                className={styles.bar}
                role="img"
                aria-label={`${p.completed} of ${p.total} lessons`}
              >
                <span
                  style={{
                    width: `${(p.completed / p.total) * 100}%`,
                    background: "var(--accent)",
                  }}
                />
              </span>
              <span className={`${styles.pct} mono`}>
                {p.completed}/{p.total}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {attempted.length > 0 && (
        <Section title="lessons" description="Best speed counts only passed attempts.">
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">lesson</th>
                <th scope="col">best</th>
                <th scope="col">last</th>
                <th scope="col">accuracy</th>
              </tr>
            </thead>
            <tbody>
              {attempted.map((l) => {
                const p = data.lessons[l.id];
                return (
                  <tr key={l.id}>
                    <th scope="row">{l.title}</th>
                    <td className="mono">{p.completed ? `${Math.round(p.bestWpm)} wpm` : "-"}</td>
                    <td className="mono">{Math.round(p.lastWpm)} wpm</td>
                    <td className="mono">{p.lastAccuracy.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}
