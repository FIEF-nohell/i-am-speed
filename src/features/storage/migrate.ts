import { sanitiseSettings } from "@/features/settings/settings";
import { FINGERS } from "@/features/keyboard/layout/atQwertz";
import {
  MAX_ATTEMPTS,
  SCHEMA_VERSION,
  createEmptyData,
  type Attempt,
  type DayTotals,
  type LastResult,
  type LessonProgress,
  type StoredData,
} from "./schema";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

function sanitiseAttempt(v: unknown): Attempt | null {
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

function mapRecord<T>(v: unknown, fn: (x: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObj(v)) return out;
  for (const [k, val] of Object.entries(v)) {
    const r = fn(val);
    if (r) out[k] = r;
  }
  return out;
}

const keyStat = (v: unknown) =>
  isObj(v)
    ? {
        attempts: num(v.attempts),
        errors: num(v.errors),
        totalMs: num(v.totalMs),
        timedHits: num(v.timedHits),
      }
    : null;
const fingerStat = (v: unknown) =>
  isObj(v) ? { attempts: num(v.attempts), errors: num(v.errors) } : null;

function sanitiseLast(v: unknown): LastResult | null {
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
  const perFinger: LastResult["perFinger"] = {};
  if (isObj(v.perFinger)) {
    for (const f of FINGERS) {
      const s = fingerStat(v.perFinger[f]);
      if (s) perFinger[f] = s;
    }
  }
  return { attempt, series, perKey: mapRecord(v.perKey, keyStat), perFinger, text: str(v.text) };
}

/**
 * Turn whatever was in storage (or an imported file) into valid current-version data.
 * Never throws: corrupt pieces are dropped, missing pieces get defaults.
 * Add a `case` per old version here when the schema changes.
 */
export function migrate(raw: unknown): StoredData {
  if (!isObj(raw)) return createEmptyData();
  // v0 (no version field) shares the v1 shape for every field we read, so one pass covers both.
  const totals = isObj(raw.totals) ? raw.totals : {};
  const attempts = (Array.isArray(raw.attempts) ? raw.attempts : [])
    .map(sanitiseAttempt)
    .filter((a): a is Attempt => a !== null)
    .slice(-MAX_ATTEMPTS);
  const fingers: StoredData["fingers"] = {};
  if (isObj(raw.fingers)) {
    for (const f of FINGERS) {
      const s = fingerStat(raw.fingers[f]);
      if (s) fingers[f] = s;
    }
  }
  return {
    version: SCHEMA_VERSION,
    settings: sanitiseSettings(raw.settings),
    attempts,
    lessons: mapRecord(raw.lessons, sanitiseLesson),
    keys: mapRecord(raw.keys, keyStat),
    fingers,
    days: mapRecord(raw.days, sanitiseDay),
    totals: {
      attempts: num(totals.attempts),
      timeMs: num(totals.timeMs),
      chars: num(totals.chars),
    },
    lastResult: sanitiseLast(raw.lastResult),
  };
}

/** Parse stored JSON text. Corrupt text yields fresh data and `recovered: true`. */
export function parseStored(text: string | null): { data: StoredData; recovered: boolean } {
  if (text === null) return { data: createEmptyData(), recovered: false };
  try {
    return { data: migrate(JSON.parse(text)), recovered: false };
  } catch {
    return { data: createEmptyData(), recovered: true };
  }
}
