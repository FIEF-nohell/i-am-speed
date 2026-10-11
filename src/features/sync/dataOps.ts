import { migrate } from "@/features/storage/migrate";
import { createEmptyData, type DataEnv, type StoredData } from "@/features/storage/schema";
import type { Settings } from "@/features/settings/settings";
import { emptyAggregates, withViews } from "./combine";
import { isEmptyContribution } from "./merge";
import type { ContribId, Contribution } from "./types";

/** Applies a settings change and stamps it. Strictly increasing so a same-millisecond change still counts as newer. */
export function applySettingsPatch(
  data: StoredData,
  patch: Partial<Settings>,
  now: number,
): StoredData {
  return {
    ...data,
    settings: { ...data.settings, ...patch },
    settingsUpdatedAt: Math.max(now, data.settingsUpdatedAt + 1),
  };
}

/**
 * Replace this device's data with an exported file. Every contribution in the file becomes read-only
 * (a fresh, empty own contribution is created), the account link is kept, and everything is marked
 * unsynced so it reaches the account on the next sync.
 */
export function importData(current: StoredData, raw: unknown, env: DataEnv): StoredData {
  const imported = migrate(raw, env);
  const contribs: Record<ContribId, Contribution> = {};
  for (const c of Object.values(imported.sync.contribs)) {
    if (!isEmptyContribution(c)) contribs[c.id] = c;
  }
  const ownId = env.newId();
  contribs[ownId] = { id: ownId, rev: 0, updatedAt: env.now, ...emptyAggregates() };
  return withViews({
    ...imported,
    settingsUpdatedAt: Math.max(env.now, current.settingsUpdatedAt + 1),
    sync: {
      ownId,
      contribs,
      linkedUid: current.sync.linkedUid,
      unsyncedAttemptIds: imported.attempts.map((a) => a.id),
      pushedRevs: {},
      pushedSettingsAt: -1,
    },
  });
}

/** Empty data, fresh own id, unlinked. */
export function resetData(env: DataEnv): StoredData {
  return createEmptyData(env);
}
