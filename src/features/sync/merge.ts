import { MAX_ATTEMPTS, type Attempt, type StoredData } from "@/features/storage/schema";
import { withViews } from "./combine";
import { stableHash } from "./hash";
import type {
  CloudSnapshot,
  CloudWrite,
  ContribId,
  Contribution,
  LinkKind,
  MergeContext,
  MergeResult,
} from "./types";

/** Nothing recorded yet (a fresh own contribution). Not worth a cloud document. */
export function isEmptyContribution(c: Contribution): boolean {
  return (
    c.rev === 0 &&
    c.totals.attempts === 0 &&
    c.totals.timeMs === 0 &&
    c.totals.chars === 0 &&
    Object.keys(c.keys).length === 0 &&
    Object.keys(c.fingers).length === 0 &&
    Object.keys(c.days).length === 0 &&
    Object.keys(c.lessons).length === 0
  );
}

/** Total preorder: higher rev, then more attempts, then newer, then hash order. Ties are identical data. */
function preferred(x: Contribution, y: Contribution): Contribution {
  if (x.rev !== y.rev) return x.rev > y.rev ? x : y;
  if (x.totals.attempts !== y.totals.attempts) return x.totals.attempts > y.totals.attempts ? x : y;
  if (x.updatedAt !== y.updatedAt) return x.updatedAt > y.updatedAt ? x : y;
  return stableHash(x) >= stableHash(y) ? x : y;
}

/** Per id keep the preferred copy. Commutative, associative and idempotent. */
export function mergeContribs(
  a: Record<ContribId, Contribution>,
  b: readonly Contribution[],
): Record<ContribId, Contribution> {
  const out: Record<ContribId, Contribution> = { ...a };
  for (const c of b) {
    const prev = out[c.id];
    out[c.id] = prev ? preferred(prev, c) : c;
  }
  return out;
}

/** Union by id (first seen wins), sorted by (at, id) ascending, newest `cap` kept. */
export function mergeAttempts(
  a: readonly Attempt[],
  b: readonly Attempt[],
  cap: number = MAX_ATTEMPTS,
): Attempt[] {
  const byId = new Map<string, Attempt>();
  for (const x of [...a, ...b]) if (!byId.has(x.id)) byId.set(x.id, x);
  const all = [...byId.values()].sort((p, q) =>
    p.at !== q.at ? p.at - q.at : p.id < q.id ? -1 : p.id > q.id ? 1 : 0,
  );
  return all.length > cap ? all.slice(all.length - cap) : all;
}

export function linkKind(local: StoredData, uid: string): LinkKind {
  const linked = local.sync.linkedUid;
  if (linked === null) return "first-link";
  return linked === uid ? "same-account" : "other-account";
}

export function hasProgress(data: StoredData): boolean {
  return (
    data.attempts.length > 0 || Object.values(data.sync.contribs).some((c) => c.totals.attempts > 0)
  );
}

const byId = (a: { id: string }, b: { id: string }): number =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/**
 * THE merge. Pure. Combines local and cloud, sets linkedUid, and computes what still has to be written
 * so that cloud and local converge. Applying it twice with the same snapshot changes nothing.
 */
export function mergeWithCloud(
  local: StoredData,
  cloud: CloudSnapshot,
  ctx: MergeContext,
): MergeResult {
  const kind = linkKind(local, ctx.uid);
  const contribs = mergeContribs(local.sync.contribs, cloud.contribs);
  const attempts = mergeAttempts(local.attempts, cloud.attempts);

  // Settings: the cloud wins on a first or foreign link; same account is last-writer-wins.
  const cloudAt = cloud.profile?.settingsUpdatedAt ?? -1;
  let settings = local.settings;
  let settingsUpdatedAt = local.settingsUpdatedAt;
  let profile: CloudWrite["profile"] = null;
  if (cloud.profile && (kind !== "same-account" || cloudAt > local.settingsUpdatedAt)) {
    settings = cloud.profile.settings;
    settingsUpdatedAt = cloud.profile.settingsUpdatedAt;
  } else if (!cloud.profile || local.settingsUpdatedAt > cloudAt) {
    profile = { settings, settingsUpdatedAt };
  }

  const cloudRevs: Record<ContribId, number> = {};
  for (const c of cloud.contribs) cloudRevs[c.id] = Math.max(cloudRevs[c.id] ?? -1, c.rev);
  const pushContribs = Object.values(contribs)
    .filter((c) => c.rev > (cloudRevs[c.id] ?? -1) && !isEmptyContribution(c))
    .sort(byId);

  const inCloud = new Set(cloud.attempts.map((a) => a.id));
  const unsynced = new Set(local.sync.unsyncedAttemptIds);
  const pushAttempts = attempts.filter((a) => !inCloud.has(a.id) || unsynced.has(a.id));

  const data = withViews({
    ...local,
    settings,
    settingsUpdatedAt,
    attempts,
    sync: {
      ...local.sync,
      contribs,
      linkedUid: ctx.uid,
      unsyncedAttemptIds: pushAttempts.map((a) => a.id),
      pushedRevs: cloudRevs,
      pushedSettingsAt: cloudAt,
    },
  });
  return { data, push: { profile, contribs: pushContribs, attempts: pushAttempts } };
}

/** Everything not yet confirmed as written to the linked account. */
export function pendingWrite(data: StoredData): CloudWrite {
  const { pushedRevs, unsyncedAttemptIds, pushedSettingsAt } = data.sync;
  const unsynced = new Set(unsyncedAttemptIds);
  return {
    profile:
      data.settingsUpdatedAt > pushedSettingsAt
        ? { settings: data.settings, settingsUpdatedAt: data.settingsUpdatedAt }
        : null,
    contribs: Object.values(data.sync.contribs)
      .filter((c) => c.rev > (pushedRevs[c.id] ?? -1) && !isEmptyContribution(c))
      .sort(byId),
    attempts: data.attempts.filter((a) => unsynced.has(a.id)),
  };
}

/**
 * Number of changes to show a user: attempts plus settings. Contributions ride along with their
 * attempts, so they only count on their own (for example a legacy contribution with no history).
 */
export function pendingCount(data: StoredData): number {
  const w = pendingWrite(data);
  return (
    w.attempts.length + (w.profile ? 1 : 0) + (w.attempts.length === 0 ? w.contribs.length : 0)
  );
}

/** Records exactly what was written (not the current state), so changes made meanwhile stay pending. */
export function markPushed(data: StoredData, written: CloudWrite): StoredData {
  const pushedRevs = { ...data.sync.pushedRevs };
  for (const c of written.contribs) pushedRevs[c.id] = Math.max(pushedRevs[c.id] ?? -1, c.rev);
  const done = new Set(written.attempts.map((a) => a.id));
  return {
    ...data,
    sync: {
      ...data.sync,
      pushedRevs,
      unsyncedAttemptIds: data.sync.unsyncedAttemptIds.filter((id) => !done.has(id)),
      pushedSettingsAt: written.profile
        ? Math.max(data.sync.pushedSettingsAt, written.profile.settingsUpdatedAt)
        : data.sync.pushedSettingsAt,
    },
  };
}

/** Forget the cloud: everything becomes pending again for whichever account links next. */
export function unlink(data: StoredData): StoredData {
  return {
    ...data,
    sync: {
      ...data.sync,
      linkedUid: null,
      pushedRevs: {},
      pushedSettingsAt: -1,
      unsyncedAttemptIds: data.attempts.map((a) => a.id),
    },
  };
}
