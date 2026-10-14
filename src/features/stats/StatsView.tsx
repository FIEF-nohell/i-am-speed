"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { Stat } from "@/components/ui/Stat";
import { staggerStyle } from "@/lib/motion";
import { LESSONS, PHASES } from "@/features/lessons/curriculum";
import { heatByCode } from "@/features/results/heat";
import { dayKey } from "@/features/storage/record";
import { useData, useHydrated } from "@/features/storage/store";
import {
  activitySeries,
  activitySummary,
  attemptRecords,
  completedPerPhase,
  dailySeries,
  fingerAccuracies,
  formatDuration,
  recentAttempts,
  weakestKeys,
  weekdayAverages,
  type DayRange,
} from "./aggregate";
import { ActivityChart } from "./ActivityChart";
import { RecordsPanel, WeekdayPanel } from "./HabitPanels";
import { FingersPanel, PhasesPanel } from "./BarPanels";
import { KeysPanel } from "./KeysPanel";
import { LessonsPanel } from "./LessonsPanel";
import { ProgressCharts } from "./ProgressCharts";
import { RecentAttempts } from "./RecentAttempts";
import styles from "./StatsView.module.css";

const plural = (n: number, word: string) =>
  `${n.toLocaleString("en")} ${word}${n === 1 ? "" : "s"}`;

const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "all" },
] as const;

/** One horizontal band of the page: a full-width rule over a 12-column grid. */
function Band({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div className={`${styles.band} enter`} style={staggerStyle(index)}>
      {children}
    </div>
  );
}

export function StatsView() {
  const data = useData();
  const hydrated = useHydrated();
  const [now] = useState(() => Date.now());
  const [range, setRange] = useState<DayRange>("30d");
  const today = dayKey(now);
  const days = useMemo(() => dailySeries(data.days), [data.days]);
  const span = useMemo(
    () => activitySeries(data.days, data.attempts, range, today),
    [data.days, data.attempts, range, today],
  );
  const spanDates = useMemo(() => span.map((d) => d.date), [span]);
  const weak = useMemo(() => weakestKeys(data.keys, 8), [data.keys]);
  const heat = useMemo(() => heatByCode(data.keys), [data.keys]);
  const fingers = useMemo(() => fingerAccuracies(data.fingers), [data.fingers]);
  const recent = useMemo(() => recentAttempts(data.attempts, 10), [data.attempts]);
  const activity = useMemo(() => activitySummary(data.days, today), [data.days, today]);
  const weekdays = useMemo(() => weekdayAverages(data.days), [data.days]);
  const records = useMemo(() => attemptRecords(data.attempts), [data.attempts]);
  const phases = completedPerPhase(
    LESSONS,
    data.lessons,
    PHASES.map((p) => p.id),
  );
  const attempted = LESSONS.filter((l) => data.lessons[l.id]);
  const passed = phases.reduce((a, p) => a + p.completed, 0);

  if (!hydrated) return <div style={{ minHeight: "30rem" }} />;
  if (data.totals.attempts === 0) {
    return (
      <div className="page-full">
        <PageHeader title="stats" />
        <div className={styles.band}>
          <EmptyState
            icon={<BarChart3 />}
            title="no attempts yet"
            actions={
              <>
                <ButtonLink href="/lesson/home-01/" variant="primary">
                  start lesson 1
                </ButtonLink>
                <ButtonLink href="/test/" variant="secondary">
                  take a test
                </ButtonLink>
              </>
            }
          >
            Finish a lesson, a test or a zen session and your progress will collect here.
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className={`page-full ${styles.page}`}>
      <PageHeader
        title="stats"
        lede={`${plural(data.totals.attempts, "attempt")} and ${plural(data.totals.chars, "character")} over ${plural(Object.keys(data.days).length, "day")}.`}
      />

      <Band index={1}>
        <dl className={styles.figures}>
          <Stat size="tile" label="time typed" value={formatDuration(data.totals.timeMs)} />
          <Stat size="tile" label="today" value={formatDuration(activity.todayMs)} />
          <Stat
            size="tile"
            label="streak"
            value={plural(activity.streak, "day")}
            unit={
              activity.longestStreak > activity.streak
                ? `best ${activity.longestStreak}`
                : undefined
            }
          />
          <Stat size="tile" label="lessons passed" value={`${passed} / ${LESSONS.length}`} />
        </dl>
      </Band>

      <Band index={2}>
        <Panel
          bare
          title="day by day"
          aside={<Segmented label="range" value={range} options={RANGES} onChange={setRange} />}
        >
          <div className={styles.charts}>
            <ActivityChart series={span} />
            <ProgressCharts days={days} dates={spanDates} />
          </div>
        </Panel>
      </Band>

      <Band index={3}>
        <WeekdayPanel
          className={styles.third}
          weekdays={weekdays}
          avgActiveMs={activity.avgActiveMs}
        />
        <FingersPanel className={styles.third} fingers={fingers} />
        <PhasesPanel className={styles.third} phases={phases} />
      </Band>

      <Band index={4}>
        <KeysPanel className={styles.half} weak={weak} heat={heat} />
        <RecordsPanel className={styles.half} records={records} bestDay={activity.bestDay} />
      </Band>

      <Band index={5}>
        <RecentAttempts attempts={recent} now={now} />
      </Band>

      {attempted.length > 0 && (
        <Band index={6}>
          <LessonsPanel lessons={attempted} progress={data.lessons} />
        </Band>
      )}
    </div>
  );
}
