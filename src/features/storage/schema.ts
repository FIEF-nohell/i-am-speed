import type { Lang } from "@/features/content/types";
import type { FingerStat, KeyStat, Metrics, WpmPoint } from "@/features/engine/metrics";
import type { Finger } from "@/features/keyboard/layout/types";
import { DEFAULT_SETTINGS, type Settings } from "@/features/settings/settings";

export const STORAGE_KEY = "i-am-speed:v1";
export const SCHEMA_VERSION = 1;
export const MAX_ATTEMPTS = 500;

/** Where an attempt came from: a lesson id, or a free-test mode like "test:time-30". */
export type AttemptSource = string;

export interface Attempt {
  id: string;
  /** Epoch milliseconds when the attempt finished. */
  at: number;
  source: AttemptSource;
  lang: Lang;
  netWpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  errors: number;
  durationMs: number;
  chars: number;
  passed: boolean;
}

export interface LessonProgress {
  completed: boolean;
  bestWpm: number;
  bestAccuracy: number;
  lastWpm: number;
  lastAccuracy: number;
  attempts: number;
  lastAt: number;
}

export interface DayTotals {
  attempts: number;
  wpmSum: number;
  accuracySum: number;
  timeMs: number;
}

/** Full detail of the latest attempt, so the results page survives a reload. */
export interface LastResult {
  attempt: Attempt;
  series: WpmPoint[];
  perKey: Record<string, KeyStat>;
  perFinger: Partial<Record<Finger, FingerStat>>;
  text: string;
}

export interface StoredData {
  version: number;
  settings: Settings;
  /** Newest last. Capped at MAX_ATTEMPTS. */
  attempts: Attempt[];
  lessons: Record<string, LessonProgress>;
  /** Lifetime per-key aggregates, kept separately so trimming attempts loses nothing. */
  keys: Record<string, KeyStat>;
  fingers: Partial<Record<Finger, FingerStat>>;
  /** Keyed by local date, YYYY-MM-DD. */
  days: Record<string, DayTotals>;
  totals: { attempts: number; timeMs: number; chars: number };
  lastResult: LastResult | null;
}

export function createEmptyData(): StoredData {
  return {
    version: SCHEMA_VERSION,
    settings: DEFAULT_SETTINGS,
    attempts: [],
    lessons: {},
    keys: {},
    fingers: {},
    days: {},
    totals: { attempts: 0, timeMs: 0, chars: 0 },
    lastResult: null,
  };
}

export type { Metrics };
