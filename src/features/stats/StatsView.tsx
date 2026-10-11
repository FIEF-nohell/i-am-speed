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
import { useData, useHydrated } from "@/features/storage/store";
import {
  completedPerPhase,
  dailySeries,
  fingerAccuracies,
  formatDuration,
  recentAttempts,
  weakestKeys,
} from "./aggregate";
import { FingersPanel, PhasesPanel } from "./BarPanels";
import { KeysPanel } from "./KeysPanel";
import { LessonsPanel } from "./LessonsPanel";
import { ProgressCharts } from "./ProgressCharts";
import { RecentAttempts } from "./RecentAttempts";
import styles from "./StatsView.module.css";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Tile({ children, progress }: { children: ReactNode; progress?: number }) {
  return (
    <Panel as="div" className={styles.tile}>
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
      <div className="page-wide">
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
    <div className={`page-wide ${styles.page}`}>
      <PageHeader
        title="stats"
        lede={`${plural(data.totals.attempts, "attempt")} over ${plural(days.length, "day")}.`}
      />

      <div className={styles.tiles}>
        <Tile>
          <Stat size="tile" label="time typed" value={formatDuration(data.totals.timeMs)} />
        </Tile>
        <Tile>
          <Stat size="tile" label="characters" value={data.totals.chars.toLocaleString("en")} />
        </Tile>
        <Tile>
          <Stat size="tile" label="attempts" value={`${data.totals.attempts}`} />
        </Tile>
        <Tile progress={passed / LESSONS.length}>
          <Stat size="tile" label="lessons passed" value={`${passed} / ${LESSONS.length}`} />
        </Tile>
      </div>

      <ProgressCharts days={days} now={now} />

      <div className={styles.pair}>
        <FingersPanel fingers={fingers} />
        <PhasesPanel phases={phases} />
      </div>

      <KeysPanel weak={weak} heat={heat} />
      <RecentAttempts attempts={recent} now={now} />
      {attempted.length > 0 && <LessonsPanel lessons={attempted} progress={data.lessons} />}
    </div>
  );
}
