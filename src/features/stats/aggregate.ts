import type { FingerStat, KeyStat } from "@/features/engine/metrics";
import { FINGERS } from "@/features/keyboard/layout/atQwertz";
import type { Finger } from "@/features/keyboard/layout/types";
import type { Lesson } from "@/features/lessons/types";
import type { DayTotals, LessonProgress } from "@/features/storage/schema";

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
