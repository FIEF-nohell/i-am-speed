import type { Metrics } from "@/features/engine/metrics";
import type { Lang } from "@/features/content/types";
import { PASS_ACCURACY } from "@/features/lessons/types";
import { emptyAggregates, withViews } from "@/features/sync/combine";
import type { Contribution } from "@/features/sync/types";
import { MAX_ATTEMPTS, type Attempt, type DayTotals, type StoredData } from "./schema";
import { sourceKind } from "./source";

export interface AttemptInput {
  source: string;
  lang: Lang;
  text: string;
  metrics: Metrics;
  at: number;
}

export function dayKey(at: number): string {
  const d = new Date(at);
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Pure: returns new data with the attempt folded into history and into this device's own
 * contribution (rev + 1). The displayed views are recomputed from all contributions.
 */
export function recordAttempt(data: StoredData, input: AttemptInput): StoredData {
  const { metrics: m } = input;
  // Zen is free type: nothing is a target, so accuracy is not applicable. It counts toward
  // totals, recent attempts and the time per day, but never toward accuracy-based aggregates.
  const free = sourceKind(input.source) === "zen";
  const passed = m.accuracy >= PASS_ACCURACY;
  const { ownId } = data.sync;
  const own: Contribution = data.sync.contribs[ownId] ?? {
    id: ownId,
    rev: 0,
    updatedAt: 0,
    ...emptyAggregates(),
  };
  const rev = own.rev + 1;
  const attempt: Attempt = {
    id: `${ownId}-${rev}`,
    at: input.at,
    source: input.source,
    lang: input.lang,
    netWpm: m.netWpm,
    rawWpm: m.rawWpm,
    accuracy: m.accuracy,
    consistency: m.consistency,
    errors: m.errors,
    durationMs: m.durationMs,
    chars: m.typedChars,
    passed,
  };

  const keys = { ...own.keys };
  for (const [k, s] of free ? [] : Object.entries(m.perKey)) {
    const prev = keys[k] ?? { attempts: 0, errors: 0, totalMs: 0, timedHits: 0 };
    keys[k] = {
      attempts: prev.attempts + s.attempts,
      errors: prev.errors + s.errors,
      totalMs: prev.totalMs + s.totalMs,
      timedHits: prev.timedHits + s.timedHits,
    };
  }
  const fingers = { ...own.fingers };
  for (const [f, s] of (free ? [] : Object.entries(m.perFinger)) as [
    keyof typeof fingers,
    { attempts: number; errors: number },
  ][]) {
    const prev = fingers[f] ?? { attempts: 0, errors: 0 };
    fingers[f] = { attempts: prev.attempts + s.attempts, errors: prev.errors + s.errors };
  }

  const dk = dayKey(input.at);
  const day: DayTotals = own.days[dk] ?? { attempts: 0, wpmSum: 0, accuracySum: 0, timeMs: 0 };

  const dayTotals: DayTotals = free
    ? { ...day, timeMs: day.timeMs + m.durationMs }
    : {
        attempts: day.attempts + 1,
        wpmSum: day.wpmSum + m.netWpm,
        accuracySum: day.accuracySum + m.accuracy,
        timeMs: day.timeMs + m.durationMs,
      };

  const isLesson = sourceKind(input.source) === "lesson";
  const lessons = { ...own.lessons };
  if (isLesson) {
    const prev = lessons[input.source];
    lessons[input.source] = {
      completed: (prev?.completed ?? false) || passed,
      bestWpm: Math.max(prev?.bestWpm ?? 0, passed ? m.netWpm : 0),
      bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, m.accuracy),
      lastWpm: m.netWpm,
      lastAccuracy: m.accuracy,
      attempts: (prev?.attempts ?? 0) + 1,
      lastAt: input.at,
    };
  }

  const nextOwn: Contribution = {
    id: ownId,
    rev,
    updatedAt: input.at,
    keys,
    fingers,
    days: {
      ...own.days,
      [dk]: dayTotals,
    },
    lessons,
    totals: {
      attempts: own.totals.attempts + 1,
      timeMs: own.totals.timeMs + m.durationMs,
      chars: own.totals.chars + m.typedChars,
    },
  };

  const attempts = [...data.attempts, attempt].slice(-MAX_ATTEMPTS);
  const kept = new Set(attempts.map((a) => a.id));
  return withViews({
    ...data,
    attempts,
    lastResult: {
      attempt,
      series: m.series,
      perKey: free ? {} : m.perKey,
      perFinger: free ? {} : m.perFinger,
      text: input.text,
    },
    sync: {
      ...data.sync,
      contribs: { ...data.sync.contribs, [ownId]: nextOwn },
      unsyncedAttemptIds: [...data.sync.unsyncedAttemptIds, attempt.id].filter((id) =>
        kept.has(id),
      ),
    },
  });
}
