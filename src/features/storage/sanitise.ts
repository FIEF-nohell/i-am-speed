import type { FingerStat, KeyStat } from "@/features/engine/metrics";
import { FINGERS } from "@/features/keyboard/layout/atQwertz";
import type { Aggregates, Contribution } from "@/features/sync/types";
import type { Attempt, DayTotals, LastResult, LessonProgress } from "./schema";

export type Obj = Record<string, unknown>;
export const isObj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
export const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

export function sanitiseAttempt(v: unknown): Attempt | null {
  if (!isObj(v) || typeof v.id !== "string" || typeof v.source !== "string") return null;
  return {
    id: v.id,
    at: num(v.at),
    source: v.source,
    lang: v.lang === "en" ? "en" : "de",
    netWpm: num(v.netWpm),
    rawWpm: num(v.rawWpm),
    accuracy: num(v.accuracy),
    consistency: num(v.consistency),
    errors: num(v.errors),
    durationMs: num(v.durationMs),
    chars: num(v.chars),
    passed: v.passed === true,
  };
}

function sanitiseLesson(v: unknown): LessonProgress | null {
  if (!isObj(v)) return null;
  return {
    completed: v.completed === true,
    bestWpm: num(v.bestWpm),
    bestAccuracy: num(v.bestAccuracy),
    lastWpm: num(v.lastWpm),
    lastAccuracy: num(v.lastAccuracy),
    attempts: num(v.attempts),
    lastAt: num(v.lastAt),
  };
}

function sanitiseDay(v: unknown): DayTotals | null {
  if (!isObj(v)) return null;
  return {
    attempts: num(v.attempts),
    wpmSum: num(v.wpmSum),
    accuracySum: num(v.accuracySum),
    timeMs: num(v.timeMs),
  };
}

export function mapRecord<T>(v: unknown, fn: (x: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObj(v)) return out;
  for (const [k, val] of Object.entries(v)) {
    const r = fn(val);
    if (r) out[k] = r;
  }
  return out;
}

const keyStat = (v: unknown): KeyStat | null =>
  isObj(v)
    ? {
        attempts: num(v.attempts),
        errors: num(v.errors),
        totalMs: num(v.totalMs),
        timedHits: num(v.timedHits),
      }
    : null;
const fingerStat = (v: unknown): FingerStat | null =>
  isObj(v) ? { attempts: num(v.attempts), errors: num(v.errors) } : null;

function sanitiseFingers(v: unknown): Aggregates["fingers"] {
  const out: Aggregates["fingers"] = {};
  if (isObj(v)) {
    for (const f of FINGERS) {
      const s = fingerStat(v[f]);
      if (s) out[f] = s;
    }
  }
  return out;
}

/** Reads the five aggregate fields from any object; missing or invalid pieces become empty. */
export function sanitiseAggregates(raw: unknown): Aggregates {
  const o = isObj(raw) ? raw : {};
  const totals = isObj(o.totals) ? o.totals : {};
  return {
    keys: mapRecord(o.keys, keyStat),
    fingers: sanitiseFingers(o.fingers),
    days: mapRecord(o.days, sanitiseDay),
    lessons: mapRecord(o.lessons, sanitiseLesson),
    totals: {
      attempts: num(totals.attempts),
      timeMs: num(totals.timeMs),
      chars: num(totals.chars),
    },
  };
}

/** A contribution under a known id. Null when `raw` is not an object. */
export function sanitiseContribution(id: string, raw: unknown): Contribution | null {
  if (!isObj(raw)) return null;
  return {
    ...sanitiseAggregates(raw),
    id,
    rev: Math.max(0, Math.floor(num(raw.rev))),
    updatedAt: num(raw.updatedAt),
  };
}

export function sanitiseLast(v: unknown): LastResult | null {
  if (!isObj(v)) return null;
  const attempt = sanitiseAttempt(v.attempt);
  if (!attempt) return null;
  const series = Array.isArray(v.series)
    ? v.series.filter(isObj).map((p) => ({
        second: num(p.second),
        wpm: num(p.wpm),
        raw: num(p.raw),
        errors: num(p.errors),
      }))
    : [];
  return {
    attempt,
    series,
    perKey: mapRecord(v.perKey, keyStat),
    perFinger: sanitiseFingers(v.perFinger),
    text: str(v.text),
  };
}
