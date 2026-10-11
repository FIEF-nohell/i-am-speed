import type { FingerStat, KeyStat } from "@/features/engine/metrics";
import { FINGERS } from "@/features/keyboard/layout/atQwertz";
import type { Finger } from "@/features/keyboard/layout/types";
import type { Lesson } from "@/features/lessons/types";
import type { Attempt, DayTotals, LessonProgress } from "@/features/storage/schema";

export interface WeakKey {
  key: string;
  errorRate: number;
  attempts: number;
  errors: number;
}

/** Keys with the highest error rate. Needs a few attempts so one slip is not "weak". */
export function weakestKeys(
  keys: Record<string, KeyStat>,
  count: number,
  minAttempts = 8,
): WeakKey[] {
  return Object.entries(keys)
    .filter(([key, s]) => key !== " " && s.attempts >= minAttempts && s.errors > 0)
    .map(([key, s]) => ({
      key,
      errorRate: s.errors / s.attempts,
      attempts: s.attempts,
      errors: s.errors,
    }))
    .sort((a, b) => b.errorRate - a.errorRate || b.errors - a.errors)
    .slice(0, count);
}

export interface FingerAccuracy {
  finger: Finger;
  accuracy: number | null;
  attempts: number;
}

export function fingerAccuracies(fingers: Partial<Record<Finger, FingerStat>>): FingerAccuracy[] {
  return FINGERS.map((finger) => {
    const s = fingers[finger];
    return {
      finger,
      attempts: s?.attempts ?? 0,
      accuracy: s && s.attempts > 0 ? (1 - s.errors / s.attempts) * 100 : null,
    };
  });
}

export interface DayPoint {
  date: string;
  wpm: number;
  accuracy: number;
  attempts: number;
  minutes: number;
}

export function dailySeries(days: Record<string, DayTotals>): DayPoint[] {
  return Object.entries(days)
    .filter(([, d]) => d.attempts > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      wpm: d.wpmSum / d.attempts,
      accuracy: d.accuracySum / d.attempts,
      attempts: d.attempts,
      minutes: d.timeMs / 60000,
    }));
}

export interface PhaseProgress {
  phase: number;
  completed: number;
  total: number;
}

export function completedPerPhase(
  lessons: readonly Lesson[],
  progress: Record<string, LessonProgress>,
  phases: readonly number[],
): PhaseProgress[] {
  return phases.map((phase) => {
    const inPhase = lessons.filter((l) => l.phase === phase);
    return {
      phase,
      total: inPhase.length,
      completed: inPhase.filter((l) => progress[l.id]?.completed).length,
    };
  });
}

/** Average milliseconds per correct hit for a key, or null with too little data. */
export function keyLatency(stat: KeyStat | undefined): number | null {
  return stat && stat.timedHits >= 3 ? stat.totalMs / stat.timedHits : null;
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export type DayRange = "7d" | "30d" | "all";

const RANGE_DAYS: Record<Exclude<DayRange, "all">, number> = { "7d": 7, "30d": 30 };

function shiftDay(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(y, m - 1, d + delta);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getFullYear()}-${p(shifted.getMonth() + 1)}-${p(shifted.getDate())}`;
}

/** Days inside the range ending at `today` (YYYY-MM-DD, local), today included. Order is kept. */
export function filterDays(
  series: readonly DayPoint[],
  range: DayRange,
  today: string,
): DayPoint[] {
  if (range === "all") return [...series];
  const first = shiftDay(today, -(RANGE_DAYS[range] - 1));
  return series.filter((d) => d.date >= first && d.date <= today);
}

/** The newest `count` attempts, newest first. Input is stored oldest first. */
export function recentAttempts(attempts: readonly Attempt[], count: number): Attempt[] {
  return attempts.slice(-count).reverse();
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Short relative time: "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", "3 oct". */
export function formatRelative(at: number, now: number): string {
  const diff = now - at;
  if (diff < 60_000) return "just now";
  const then = new Date(at);
  const today = new Date(now);
  const dayGap = Math.round(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())) /
      86_400_000,
  );
  if (dayGap === 0) {
    return diff < 3_600_000
      ? `${Math.floor(diff / 60_000)} min ago`
      : `${Math.floor(diff / 3_600_000)} h ago`;
  }
  if (dayGap === 1) return "yesterday";
  if (dayGap < 7) return `${dayGap} days ago`;
  return `${then.getDate()} ${MONTHS[then.getMonth()]}`;
}

/** The finger with the lowest accuracy, if it has enough data to mean something. */
export function weakestFinger(accuracies: readonly FingerAccuracy[], minAttempts = 20) {
  const rated = accuracies.filter((f) => f.accuracy !== null && f.attempts >= minAttempts);
  if (rated.length < 2) return null;
  return rated.reduce((low, f) => ((f.accuracy ?? 100) < (low.accuracy ?? 100) ? f : low));
}
