"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { LESSONS, PHASES } from "@/features/lessons/curriculum";
import { heatByCode } from "@/features/results/heat";
import { dayKey } from "@/features/storage/record";
import { useData, useHydrated } from "@/features/storage/store";
import {
  activitySummary,
  attemptRecords,
  completedPerPhase,
  dailySeries,
  fingerAccuracies,
  formatDuration,
  recentAttempts,
  weakestKeys,
  weekdayAverages,
} from "./aggregate";
import { ActivityChart } from "./ActivityChart";
import { RecordsPanel, WeekdayPanel } from "./HabitPanels";
import { FingersPanel, PhasesPanel } from "./BarPanels";
import { KeysPanel } from "./KeysPanel";
import { LessonsPanel } from "./LessonsPanel";
import { ProgressCharts } from "./ProgressCharts";
import { RecentAttempts } from "./RecentAttempts";
import styles from "./StatsView.module.css";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Tile({
  children,
  progress,
  index,
}: {
  children: ReactNode;
  progress?: number;
  index: number;
}) {
  return (
    <Panel as="div" index={index} className={styles.tile}>
      <dl>{children}</dl>
      {progress !== undefined && (
        <span className={styles.tileLine} aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} />
        </span>
      )}
    </Panel>
  );
}

export function StatsView() {
  const data = useData();
  const hydrated = useHydrated();
  const [now] = useState(() => Date.now());
  const days = useMemo(() => dailySeries(data.days), [data.days]);
  const weak = useMemo(() => weakestKeys(data.keys, 8), [data.keys]);
  const heat = useMemo(() => heatByCode(data.keys), [data.keys]);
  const fingers = useMemo(() => fingerAccuracies(data.fingers), [data.fingers]);
  const recent = useMemo(() => recentAttempts(data.attempts, 10), [data.attempts]);
  const activity = useMemo(() => activitySummary(data.days, dayKey(now)), [data.days, now]);
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
        <Panel as="div">
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
        </Panel>
      </div>
    );
  }

  return (
    <div className={`page-full ${styles.page}`}>
      <PageHeader
        title="stats"
        lede={`${plural(data.totals.attempts, "attempt")} over ${plural(Object.keys(data.days).length, "day")}.`}
      />

      <div className={styles.tiles}>
        <Tile index={1}>
          <Stat size="tile" label="time typed" value={formatDuration(data.totals.timeMs)} />
        </Tile>
        <Tile index={2}>
          <Stat size="tile" label="characters" value={data.totals.chars.toLocaleString("en")} />
        </Tile>
        <Tile index={3}>
          <Stat size="tile" label="attempts" value={`${data.totals.attempts}`} />
        </Tile>
        <Tile index={4} progress={passed / LESSONS.length}>
          <Stat size="tile" label="lessons passed" value={`${passed} / ${LESSONS.length}`} />
        </Tile>
      </div>

      <div className={styles.tiles}>
        <Tile index={5}>
          <Stat size="tile" label="today" value={formatDuration(activity.todayMs)} />
        </Tile>
        <Tile index={6}>
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
        </Tile>
        <Tile index={7}>
          <Stat
            size="tile"
            label="per active day"
            value={formatDuration(activity.avgActiveMs)}
            unit={`${activity.activeDays} days`}
          />
        </Tile>
        <Tile index={8}>
          <Stat
            size="tile"
            label="best day"
            value={activity.bestDay ? formatDuration(activity.bestDay.ms) : "-"}
            unit={activity.bestDay?.date.slice(5)}
          />
        </Tile>
      </div>

      <div className={styles.pair}>
        <ActivityChart days={data.days} attempts={data.attempts} now={now} index={9} />
        <ProgressCharts days={days} now={now} index={10} />
      </div>

      <div className={styles.trio}>
        <WeekdayPanel weekdays={weekdays} index={11} />
        <FingersPanel fingers={fingers} index={12} />
        <PhasesPanel phases={phases} index={13} />
      </div>

      <div className={styles.pair}>
        <KeysPanel weak={weak} heat={heat} index={14} />
        <RecordsPanel records={records} index={15} />
      </div>
      <RecentAttempts attempts={recent} now={now} index={16} />
      {attempted.length > 0 && (
        <LessonsPanel lessons={attempted} progress={data.lessons} index={17} />
      )}
    </div>
  );
}
