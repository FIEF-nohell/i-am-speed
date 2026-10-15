"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Stat } from "@/components/ui/Stat";
import { initialFor } from "@/components/layout/headerModel";
import { useAuth } from "@/features/auth/session";
import { LESSONS } from "@/features/lessons/curriculum";
import { overviewOf, recentSpeeds, sparkPoints } from "@/features/lessons/overview";
import {
  activitySummary,
  formatDuration,
  formatRelative,
  recentAttempts,
} from "@/features/stats/aggregate";
import { dayKey } from "@/features/storage/record";
import { sourceLabel } from "@/features/storage/source";
import { useData, useHydrated } from "@/features/storage/store";
import styles from "./ProfileSidebar.module.css";

const SPARK_W = 240;
const SPARK_H = 44;

function nameOf(user: { displayName: string | null; email: string | null } | null): string {
  if (!user) return "guest";
  return user.displayName?.trim() || user.email?.split("@")[0] || "you";
}

export function ProfileSidebar() {
  const data = useData();
  const hydrated = useHydrated();
  const { status, user } = useAuth();
  const [now] = useState(() => Date.now());
  const today = dayKey(now);
  const overview = useMemo(
    () => overviewOf(data.days, data.attempts, data.lessons),
    [data.days, data.attempts, data.lessons],
  );
  const activity = useMemo(() => activitySummary(data.days, today), [data.days, today]);
  const recent = useMemo(() => recentAttempts(data.attempts, 5), [data.attempts]);
  const speeds = useMemo(() => recentSpeeds(data.attempts, 14), [data.attempts]);

  if (!hydrated) return <aside className={styles.side} aria-label="your progress" />;

  const signedIn = status === "signed-in";
  const hasData = data.totals.attempts > 0;
  const initial = (user && initialFor(user)) ?? "g";
  const round = (n: number | null): string => (n === null ? "-" : String(Math.round(n)));

  return (
    <aside className={styles.side} aria-label="your progress">
      <section className={styles.block}>
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
          <div className={styles.who}>
            <p className={styles.name}>{nameOf(user)}</p>
            <p className={styles.sub}>
              {signedIn ? (
                "synced to your account"
              ) : (
                <>
                  saved in this browser. <Link href="/login/">sign in</Link> to sync
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <section className={styles.block} aria-labelledby="side-overall">
        <h2 id="side-overall" className={styles.label}>
          overall
        </h2>
        {hasData ? (
          <dl className={styles.figures}>
            <Stat
              size="tile"
              accent
              label="average speed"
              value={round(overview.avgWpm)}
              unit="wpm"
            />
            <Stat size="tile" label="best speed" value={round(overview.bestWpm)} unit="wpm" />
            <Stat size="tile" label="accuracy" value={round(overview.avgAccuracy)} unit="%" />
            <Stat
              size="tile"
              label="streak"
              value={String(activity.streak)}
              unit={activity.streak === 1 ? "day" : "days"}
            />
            <Stat
              size="tile"
              label="lessons passed"
              value={`${overview.passed} / ${LESSONS.length}`}
            />
            <Stat size="tile" label="time typed" value={formatDuration(data.totals.timeMs)} />
          </dl>
        ) : (
          <p className={styles.empty}>
            Your speed, accuracy and streak appear here after your first lesson.
          </p>
        )}
      </section>

      {hasData && (
        <section className={styles.block} aria-labelledby="side-recent">
          <h2 id="side-recent" className={styles.label}>
            recent
          </h2>
          {speeds.length > 1 && (
            <svg
              className={styles.spark}
              viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
              role="img"
              aria-label={`speed over your last ${speeds.length} attempts`}
              preserveAspectRatio="none"
            >
              <polyline
                points={sparkPoints(speeds, SPARK_W, SPARK_H, 3)}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          <ul className={styles.recent}>
            {recent.map((a) => (
              <li key={a.id}>
                <span className={styles.what}>{sourceLabel(a.source)}</span>
                <span className={`${styles.wpm} mono`}>{Math.round(a.netWpm)}</span>
                <span className={styles.when}>{formatRelative(a.at, now)}</span>
              </li>
            ))}
          </ul>
          <Link href="/stats/" className={styles.more}>
            all stats
          </Link>
        </section>
      )}
    </aside>
  );
}
