import type { FingerStat, KeyStat } from "@/features/engine/metrics";
import type { Finger } from "@/features/keyboard/layout/types";
import type { Settings } from "@/features/settings/settings";
import type { Attempt, DayTotals, LessonProgress, StoredData } from "@/features/storage/schema";

/** Own ids: 20 chars [A-Za-z0-9]. Legacy ids: "legacy-" + 16 hex. Rules regex: ^[A-Za-z0-9_-]{8,64}$ */
export type ContribId = string;

export interface Totals {
  attempts: number;
  timeMs: number;
  chars: number;
}

export interface Aggregates {
  keys: Record<string, KeyStat>;
  fingers: Partial<Record<Finger, FingerStat>>;
  /** Keyed by local date YYYY-MM-DD of the device that recorded it. */
  days: Record<string, DayTotals>;
  lessons: Record<string, LessonProgress>;
  totals: Totals;
}

/** One device's lifetime counters. Only the device whose sync.ownId equals id increments it. */
export interface Contribution extends Aggregates {
  id: ContribId;
  /** Monotonic. +1 per recorded attempt. Merge keeps the higher rev per id. Legacy: always 0. */
  rev: number;
  updatedAt: number;
}

export interface SyncMeta {
  /** The one contribution this device increments. Regenerated on import and reset. */
  ownId: ContribId;
  /** Every known contribution including own. StoredData views === combine(contribs). */
  contribs: Record<ContribId, Contribution>;
  /** Account this data was last reconciled with. null = never linked, or unlinked after cloud delete/reset. */
  linkedUid: string | null;
  /** Attempt ids recorded locally and not yet confirmed in the cloud. Always a subset of attempts[].id. */
  unsyncedAttemptIds: string[];
  /** Highest rev per contribution confirmed written to linkedUid's cloud. */
  pushedRevs: Record<ContribId, number>;
  /** settingsUpdatedAt confirmed in the cloud; -1 = never pushed. */
  pushedSettingsAt: number;
}

export interface CloudProfile {
  settings: Settings;
  settingsUpdatedAt: number;
}

/** What a pull returns. profile === null means "no cloud data for this account yet". */
export interface CloudSnapshot {
  profile: CloudProfile | null;
  contribs: Contribution[];
  /** Newest first or any order; at most MAX_ATTEMPTS, newest by `at`. */
  attempts: Attempt[];
}

export interface CloudWrite {
  /** Written alone (not in the batch) so a rules rejection (older settings) cannot fail the rest. */
  profile: CloudProfile | null;
  contribs: Contribution[];
  attempts: Attempt[];
}

export type CloudErrorCode = "offline" | "permission-denied" | "stale-profile" | "unknown";

export class CloudError extends Error {
  constructor(
    readonly code: CloudErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface CloudAdapter {
  pull(uid: string): Promise<CloudSnapshot>;
  /** Idempotent sets. Throws CloudError. "stale-profile" = rules refused an older settingsUpdatedAt. */
  push(uid: string, write: CloudWrite): Promise<void>;
  /** Deletes users/{uid} and its attempts and contribs subcollections (paged, batched). */
  deleteAll(uid: string): Promise<void>;
}

export type LinkKind = "first-link" | "same-account" | "other-account";

export interface MergeContext {
  uid: string;
  now: number;
}

export interface MergeResult {
  data: StoredData;
  /** What must be written so cloud and local converge. */
  push: CloudWrite;
}

export type SyncState =
  | { kind: "local" } // signed out: anonymous, local only
  | { kind: "starting" } // loading Firebase or first pull
  | { kind: "confirm-link"; email: string | null } // device data belongs to another account
  | { kind: "syncing" }
  | { kind: "synced"; at: number }
  | { kind: "offline"; pending: number; retryAt: number | null }
  | { kind: "error"; message: string; retryAt: number | null };

export interface SyncActions {
  syncNow(): Promise<void>;
  resolveLink(choice: "merge" | "cancel"): Promise<void>;
  /** Pauses the engine, deletes the cloud subtree, unlinks local data. Caller re-authenticated first. */
  deleteCloudData(): Promise<{ ok: true } | { ok: false; message: string }>;
}
