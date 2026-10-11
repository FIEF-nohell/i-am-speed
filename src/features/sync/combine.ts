import type { FingerStat, KeyStat } from "@/features/engine/metrics";
import type { LessonProgress, StoredData } from "@/features/storage/schema";
import type { Aggregates, ContribId, Contribution } from "./types";

export const emptyAggregates = (): Aggregates => ({
  keys: {},
  fingers: {},
  days: {},
  lessons: {},
  totals: { attempts: 0, timeMs: 0, chars: 0 },
});

/** Merge two lesson records: bests are maxima, `completed` is OR, `last*` comes from the later `lastAt`. */
function addLesson(a: LessonProgress, b: LessonProgress): LessonProgress {
  const bLater =
    b.lastAt !== a.lastAt
      ? b.lastAt > a.lastAt
      : b.lastWpm !== a.lastWpm
        ? b.lastWpm > a.lastWpm
        : b.lastAccuracy > a.lastAccuracy;
  const last = bLater ? b : a;
  return {
    completed: a.completed || b.completed,
    bestWpm: Math.max(a.bestWpm, b.bestWpm),
    bestAccuracy: Math.max(a.bestAccuracy, b.bestAccuracy),
    lastWpm: last.lastWpm,
    lastAccuracy: last.lastAccuracy,
    attempts: a.attempts + b.attempts,
    lastAt: Math.max(a.lastAt, b.lastAt),
  };
}

/**
 * Pure combination of two aggregate sets. Sums everywhere except lessons (see addLesson).
 * On a full tie the first argument's lesson `last*` is kept, so `combine` (sorted ids) is deterministic.
 */
export function addAggregates(a: Aggregates, b: Aggregates): Aggregates {
  const keys: Record<string, KeyStat> = { ...a.keys };
  for (const [k, s] of Object.entries(b.keys)) {
    const p = keys[k];
    keys[k] = p
      ? {
          attempts: p.attempts + s.attempts,
          errors: p.errors + s.errors,
          totalMs: p.totalMs + s.totalMs,
          timedHits: p.timedHits + s.timedHits,
        }
      : { ...s };
  }
  const fingers: Aggregates["fingers"] = { ...a.fingers };
  for (const [f, s] of Object.entries(b.fingers) as [keyof Aggregates["fingers"], FingerStat][]) {
    const p = fingers[f];
    fingers[f] = p ? { attempts: p.attempts + s.attempts, errors: p.errors + s.errors } : { ...s };
  }
  const days: Aggregates["days"] = { ...a.days };
  for (const [d, s] of Object.entries(b.days)) {
    const p = days[d];
    days[d] = p
      ? {
          attempts: p.attempts + s.attempts,
          wpmSum: p.wpmSum + s.wpmSum,
          accuracySum: p.accuracySum + s.accuracySum,
          timeMs: p.timeMs + s.timeMs,
        }
      : { ...s };
  }
  const lessons: Aggregates["lessons"] = { ...a.lessons };
  for (const [id, l] of Object.entries(b.lessons)) {
    const p = lessons[id];
    lessons[id] = p ? addLesson(p, l) : { ...l };
  }
  return {
    keys,
    fingers,
    days,
    lessons,
    totals: {
      attempts: a.totals.attempts + b.totals.attempts,
      timeMs: a.totals.timeMs + b.totals.timeMs,
      chars: a.totals.chars + b.totals.chars,
    },
  };
}

/** The displayed lifetime view: all contributions combined in id order (deterministic). */
export function combine(contribs: Record<ContribId, Contribution>): Aggregates {
  let acc = emptyAggregates();
  for (const id of Object.keys(contribs).sort()) acc = addAggregates(acc, contribs[id]);
  return acc;
}

/** Sets the materialised views from `sync.contribs`. */
export function withViews(data: StoredData): StoredData {
  const v = combine(data.sync.contribs);
  return {
    ...data,
    lessons: v.lessons,
    keys: v.keys,
    fingers: v.fingers,
    days: v.days,
    totals: v.totals,
  };
}
