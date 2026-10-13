import type { FingerStat, KeyStat } from "@/features/engine/metrics";
import { FINGERS } from "@/features/keyboard/layout/atQwertz";
import type { Finger } from "@/features/keyboard/layout/types";
import type { Lesson } from "@/features/lessons/types";
import type { Attempt, DayTotals, LessonProgress } from "@/features/storage/schema";
import { sourceKind } from "@/features/storage/source";

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

export interface ActivityDay {
  date: string;
  minutes: number;
  /** null when the day predates per-day character tracking and no saved attempt covers it. */
  chars: number | null;
  attempts: number;
}

/** Characters per day from saved attempts, the fallback for days recorded without `chars`. */
function charsFromAttempts(attempts: readonly Attempt[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of attempts) {
    const d = new Date(a.at);
    const p = (n: number) => String(n).padStart(2, "0");
    const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    out[key] = (out[key] ?? 0) + a.chars;
  }
  return out;
}

/**
 * Every calendar day from the start of the range (or the first active day for "all") through
 * `today`, quiet days included as zeros so gaps in practice stay visible. Zen days count.
 */
export function activitySeries(
  days: Record<string, DayTotals>,
  attempts: readonly Attempt[],
  range: DayRange,
  today: string,
): ActivityDay[] {
  const active = Object.keys(days)
    .filter((d) => days[d].timeMs > 0 || days[d].attempts > 0)
    .sort();
  if (active.length === 0) return [];
  const first = range === "all" ? active[0] : shiftDay(today, -(RANGE_DAYS[range] - 1));
  const fallback = charsFromAttempts(attempts);
  const out: ActivityDay[] = [];
  for (let date = first; date <= today; date = shiftDay(date, 1)) {
    const d = days[date];
    out.push({
      date,
      minutes: d ? d.timeMs / 60000 : 0,
      chars: d ? (d.chars ?? fallback[date] ?? null) : 0,
      attempts: d?.attempts ?? 0,
    });
    if (out.length > 3660) break;
  }
  return out;
}

export interface ActivitySummary {
  todayMs: number;
  todayChars: number;
  /** Consecutive practice days ending today, or yesterday if today has no practice yet. */
  streak: number;
  longestStreak: number;
  activeDays: number;
  /** Average practice time on days that had any, in ms. */
  avgActiveMs: number;
  bestDay: { date: string; ms: number } | null;
}

export function activitySummary(days: Record<string, DayTotals>, today: string): ActivitySummary {
  const dates = Object.keys(days)
    .filter((d) => days[d].timeMs > 0)
    .sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of dates) {
    run = prev !== null && shiftDay(prev, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = date;
  }
  const set = new Set(dates);
  let cursor = set.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  const totalMs = dates.reduce((a, d) => a + days[d].timeMs, 0);
  const best = dates.reduce<{ date: string; ms: number } | null>(
    (b, d) => (!b || days[d].timeMs > b.ms ? { date: d, ms: days[d].timeMs } : b),
    null,
  );
  return {
    todayMs: days[today]?.timeMs ?? 0,
    todayChars: days[today]?.chars ?? 0,
    streak,
    longestStreak: longest,
    activeDays: dates.length,
    avgActiveMs: dates.length > 0 ? totalMs / dates.length : 0,
    bestDay: best,
  };
}

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** Average practice minutes per weekday (Monday first), over every day that had practice. */
export function weekdayAverages(
  days: Record<string, DayTotals>,
): { day: string; minutes: number }[] {
  const sum = new Array<number>(7).fill(0);
  const count = new Array<number>(7).fill(0);
  for (const [date, d] of Object.entries(days)) {
    if (d.timeMs <= 0) continue;
    const [y, m, dd] = date.split("-").map(Number);
    const i = (new Date(y, m - 1, dd).getDay() + 6) % 7;
    sum[i] += d.timeMs / 60000;
    count[i] += 1;
  }
  return WEEKDAYS.map((day, i) => ({ day, minutes: count[i] > 0 ? sum[i] / count[i] : 0 }));
}

export interface Records {
  fastest: Attempt | null;
  mostAccurate: Attempt | null;
  longest: Attempt | null;
  avgRunMs: number;
  count: number;
}

/** Highlights of the saved attempts. Zen runs have no target, so they do not count for speed or accuracy. */
export function attemptRecords(attempts: readonly Attempt[]): Records {
  const scored = attempts.filter((a) => sourceKind(a.source) !== "zen");
  const top = (list: readonly Attempt[], pick: (a: Attempt) => number) =>
    list.reduce<Attempt | null>((b, a) => (!b || pick(a) > pick(b) ? a : b), null);
  return {
    fastest: top(scored, (a) => a.netWpm),
    mostAccurate: top(scored, (a) => a.accuracy),
    longest: top(attempts, (a) => a.durationMs),
    avgRunMs:
      attempts.length > 0 ? attempts.reduce((s, a) => s + a.durationMs, 0) / attempts.length : 0,
    count: attempts.length,
  };
}
