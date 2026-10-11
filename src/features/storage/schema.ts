import type { Lang } from "@/features/content/types";
import type { FingerStat, KeyStat, Metrics, WpmPoint } from "@/features/engine/metrics";
import type { Finger } from "@/features/keyboard/layout/types";
import { DEFAULT_SETTINGS, type Settings } from "@/features/settings/settings";
import { emptyAggregates } from "@/features/sync/combine";
import { newContribId } from "@/features/sync/ids";
import type { SyncMeta } from "@/features/sync/types";

/** The key name is historical ("v1"); it stays so existing users and ThemeScript keep working. */
export const STORAGE_KEY = "i-am-speed:v1";
export const SCHEMA_VERSION = 2;
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
  /** Epoch ms of the last local settings change. 0 = never changed on this device. */
  settingsUpdatedAt: number;
  /** Newest last. Capped at MAX_ATTEMPTS. */
  attempts: Attempt[];
  // Derived views, always === combine(sync.contribs). Kept materialised so the UI does not change.
  lessons: Record<string, LessonProgress>;
  /** Lifetime per-key aggregates, kept separately so trimming attempts loses nothing. */
  keys: Record<string, KeyStat>;
  fingers: Partial<Record<Finger, FingerStat>>;
  /** Keyed by local date, YYYY-MM-DD. */
  days: Record<string, DayTotals>;
  totals: { attempts: number; timeMs: number; chars: number };
  /** Device-local only, never synced. */
  lastResult: LastResult | null;
  sync: SyncMeta;
}

/** Injectable id source and clock so migration and data operations are deterministic in tests. */
export interface DataEnv {
  newId: () => string;
  now: number;
}

export const defaultEnv = (): DataEnv => ({ newId: newContribId, now: Date.now() });

export function createEmptyData(env: DataEnv = defaultEnv()): StoredData {
  const ownId = env.newId();
  return {
    version: SCHEMA_VERSION,
    settings: DEFAULT_SETTINGS,
    settingsUpdatedAt: 0,
    attempts: [],
    lessons: {},
    keys: {},
    fingers: {},
    days: {},
    totals: { attempts: 0, timeMs: 0, chars: 0 },
    lastResult: null,
    sync: {
      ownId,
      contribs: { [ownId]: { id: ownId, rev: 0, updatedAt: env.now, ...emptyAggregates() } },
      linkedUid: null,
      unsyncedAttemptIds: [],
      pushedRevs: {},
      pushedSettingsAt: -1,
    },
  };
}

export type { Metrics };
