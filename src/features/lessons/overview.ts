import { attemptRecords } from "@/features/stats/aggregate";
import { sourceKind } from "@/features/storage/source";
import type { Attempt, DayTotals, LessonProgress } from "@/features/storage/schema";
import { LESSONS } from "./curriculum";
import type { Lesson } from "./types";

/** The first lesson that is not passed yet, or null when every lesson is passed. */
export function nextUp(progress: Record<string, LessonProgress>): Lesson | null {
  return LESSONS.find((l) => !progress[l.id]?.completed) ?? null;
}

export interface Overview {
  /** Mean net wpm over scored attempts (zen excluded), or null before the first one. */
  avgWpm: number | null;
  bestWpm: number | null;
  /** Mean accuracy in percent over scored attempts. */
  avgAccuracy: number | null;
  passed: number;
}

export function overviewOf(
  days: Record<string, DayTotals>,
  attempts: readonly Attempt[],
  progress: Record<string, LessonProgress>,
): Overview {
  let count = 0;
  let wpm = 0;
  let acc = 0;
  for (const d of Object.values(days)) {
    count += d.attempts;
    wpm += d.wpmSum;
    acc += d.accuracySum;
  }
  const fastest = attemptRecords(attempts).fastest;
  const lessonBest = Object.values(progress).reduce((m, p) => Math.max(m, p.bestWpm), 0);
  const best = Math.max(fastest?.netWpm ?? 0, lessonBest);
  return {
    avgWpm: count > 0 ? wpm / count : null,
    bestWpm: best > 0 ? best : null,
    avgAccuracy: count > 0 ? acc / count : null,
    passed: LESSONS.filter((l) => progress[l.id]?.completed).length,
  };
}

/** Net wpm of the newest `count` scored attempts, oldest first, for a sparkline. */
export function recentSpeeds(attempts: readonly Attempt[], count: number): number[] {
  return attempts
    .filter((a) => sourceKind(a.source) !== "zen")
    .slice(-count)
    .map((a) => a.netWpm);
}

/** Points of a polyline in a `w` by `h` box, padded by `pad`; a single value draws a flat line. */
export function sparkPoints(values: readonly number[], w: number, h: number, pad = 2): string {
  if (values.length === 0) return "";
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  return values
    .map((v, i) => {
      const x = values.length === 1 ? w / 2 : pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = hi === lo ? h / 2 : h - pad - ((v - lo) / span) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
