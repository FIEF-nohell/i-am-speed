import { sanitiseSettings } from "@/features/settings/settings";
import { withViews } from "@/features/sync/combine";
import { legacyContribId } from "@/features/sync/hash";
import { isContribId } from "@/features/sync/ids";
import type { Aggregates, ContribId, Contribution, SyncMeta } from "@/features/sync/types";
import {
  isObj,
  num,
  sanitiseAggregates,
  sanitiseAttempt,
  sanitiseContribution,
  sanitiseLast,
} from "./sanitise";
import {
  MAX_ATTEMPTS,
  SCHEMA_VERSION,
  createEmptyData,
  defaultEnv,
  type Attempt,
  type DataEnv,
  type StoredData,
} from "./schema";

const LEGACY_PREFIX = "legacy-";

function isEmptyAggregates(a: Aggregates): boolean {
  return (
    Object.keys(a.keys).length === 0 &&
    Object.keys(a.fingers).length === 0 &&
    Object.keys(a.days).length === 0 &&
    Object.keys(a.lessons).length === 0 &&
    a.totals.attempts === 0 &&
    a.totals.timeMs === 0 &&
    a.totals.chars === 0
  );
}

function emptyContribution(id: ContribId, now: number): Contribution {
  return { id, rev: 0, updatedAt: now, ...sanitiseAggregates(null) };
}

function latestStamp(aggs: Aggregates, attempts: Attempt[]): number {
  let t = attempts.reduce((m, a) => Math.max(m, a.at), 0);
  for (const l of Object.values(aggs.lessons)) t = Math.max(t, l.lastAt);
  return t;
}

/** v0/v1 had no per-device contributions: its aggregates become one frozen, content-addressed contribution. */
function migrateLegacy(raw: Record<string, unknown>, attempts: Attempt[], env: DataEnv): SyncMeta {
  const aggs = sanitiseAggregates(raw);
  const own = emptyContribution(env.newId(), env.now);
  const contribs: Record<ContribId, Contribution> = { [own.id]: own };
  if (!isEmptyAggregates(aggs)) {
    const id = legacyContribId(aggs);
    contribs[id] = { id, rev: 0, updatedAt: latestStamp(aggs, attempts), ...aggs };
  }
  return {
    ownId: own.id,
    contribs,
    linkedUid: null,
    unsyncedAttemptIds: attempts.map((a) => a.id),
    pushedRevs: {},
    pushedSettingsAt: -1,
  };
}

/** Sanitise stored v2 sync metadata. Anything invalid is dropped or repaired, never thrown on. */
function sanitiseSync(raw: Record<string, unknown>, attempts: Attempt[], env: DataEnv): SyncMeta {
  const contribs: Record<ContribId, Contribution> = {};
  if (isObj(raw.contribs)) {
    for (const [id, v] of Object.entries(raw.contribs)) {
      if (!isContribId(id)) continue;
      const c = sanitiseContribution(id, v);
      if (c) contribs[id] = c;
    }
  }
  let ownId = raw.ownId;
  if (!isContribId(ownId) || ownId.startsWith(LEGACY_PREFIX)) ownId = env.newId();
  const own = ownId as ContribId;
  if (!contribs[own]) contribs[own] = emptyContribution(own, env.now);

  const existing = new Set(attempts.map((a) => a.id));
  const unsynced = Array.isArray(raw.unsyncedAttemptIds)
    ? raw.unsyncedAttemptIds.filter(
        (id): id is string => typeof id === "string" && existing.has(id),
      )
    : [];
  const pushedRevs: Record<ContribId, number> = {};
  if (isObj(raw.pushedRevs)) {
    for (const [id, v] of Object.entries(raw.pushedRevs)) {
      if (isContribId(id) && typeof v === "number" && Number.isFinite(v))
        pushedRevs[id] = Math.max(0, Math.floor(v));
    }
  }
  return {
    ownId: own,
    contribs,
    linkedUid: typeof raw.linkedUid === "string" && raw.linkedUid.length > 0 ? raw.linkedUid : null,
    unsyncedAttemptIds: [...new Set(unsynced)],
    pushedRevs,
    pushedSettingsAt: num(raw.pushedSettingsAt, -1),
  };
}

/**
 * Turn whatever was in storage (or an imported file) into valid current-version data.
 * Never throws: corrupt pieces are dropped, missing pieces get defaults.
 * Add a branch per old version here when the schema changes.
 */
export function migrate(raw: unknown, env: DataEnv = defaultEnv()): StoredData {
  if (!isObj(raw)) return createEmptyData(env);
  const attempts = (Array.isArray(raw.attempts) ? raw.attempts : [])
    .map(sanitiseAttempt)
    .filter((a): a is Attempt => a !== null)
    .slice(-MAX_ATTEMPTS);
  const isV2 = typeof raw.version === "number" && raw.version >= 2 && isObj(raw.sync);
  const sync = isV2
    ? sanitiseSync(raw.sync as Record<string, unknown>, attempts, env)
    : migrateLegacy(raw, attempts, env);
  return withViews({
    version: SCHEMA_VERSION,
    settings: sanitiseSettings(raw.settings),
    settingsUpdatedAt: Math.max(0, num(raw.settingsUpdatedAt)),
    attempts,
    lessons: {},
    keys: {},
    fingers: {},
    days: {},
    totals: { attempts: 0, timeMs: 0, chars: 0 },
    lastResult: sanitiseLast(raw.lastResult),
    sync,
  });
}

/** Parse stored JSON text. Corrupt text yields fresh data and `recovered: true`. */
export function parseStored(
  text: string | null,
  env: DataEnv = defaultEnv(),
): { data: StoredData; recovered: boolean } {
  if (text === null) return { data: createEmptyData(env), recovered: false };
  try {
    return { data: migrate(JSON.parse(text), env), recovered: false };
  } catch {
    return { data: createEmptyData(env), recovered: true };
  }
}
