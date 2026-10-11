"use client";

import { useSyncExternalStore } from "react";
import type { Settings } from "@/features/settings/settings";
import { applySettingsPatch, importData, resetData } from "@/features/sync/dataOps";
import { hasStored, readStored, writeStored } from "./persist";
import { recordAttempt, type AttemptInput } from "./record";
import { STORAGE_KEY, createEmptyData, defaultEnv, type StoredData } from "./schema";

/** Why the stored data changed. "remote" is sync work (merge result, push confirmation). */
export type CommitCause = "local" | "remote" | "import" | "reset";
type CommitListener = (next: StoredData, cause: CommitCause) => void;

const SERVER_SNAPSHOT: StoredData = createEmptyData();
let current: StoredData | null = null;
const listeners = new Set<() => void>();
const commitListeners = new Set<CommitListener>();

function emit(): void {
  listeners.forEach((l) => l());
}

function snapshot(): StoredData {
  if (current === null) current = readStored().data;
  return current;
}

function commit(next: StoredData, cause: CommitCause): void {
  current = next;
  writeStored(next);
  emit();
  commitListeners.forEach((l) => l(next, cause));
}

/**
 * Latest persisted state, so a write never overwrites what another tab saved meanwhile.
 * When nothing is persisted (blocked storage, private window) the in-memory copy is the truth.
 */
function fresh(): StoredData {
  if (typeof window === "undefined" || !hasStored()) return snapshot();
  const data = readStored().data;
  current = data;
  return data;
}

/** Sync hook: called after every commit, with the reason. Not called for cross-tab storage events. */
export function subscribeCommits(cb: CommitListener): () => void {
  commitListeners.add(cb);
  return () => {
    commitListeners.delete(cb);
  };
}

/** Applies a pure function to the latest stored data and commits it with cause "remote". */
export function applyRemote(fn: (current: StoredData) => StoredData): void {
  commit(fn(fresh()), "remote");
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STORAGE_KEY || e.key === null) {
      current = readStored().data;
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Whole persisted state. Server and first client render see defaults, then the real data. */
export function useData(): StoredData {
  return useSyncExternalStore(subscribe, snapshot, () => SERVER_SNAPSHOT);
}

export function useSettings(): Settings {
  return useData().settings;
}

const noopSubscribe = (): (() => void) => () => {};
/** False during SSR and hydration, true afterwards. Gates anything that depends on stored data. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function getData(): StoredData {
  return snapshot();
}

export function updateSettings(patch: Partial<Settings>): void {
  commit(applySettingsPatch(fresh(), patch, Date.now()), "local");
}

export function commitAttempt(input: AttemptInput): void {
  commit(recordAttempt(fresh(), input), "local");
}

export function exportJson(): string {
  return JSON.stringify(snapshot(), null, 2);
}

/** Returns an error message, or null on success. */
export function importJson(text: string): string | null {
  try {
    const parsed: unknown = JSON.parse(text);
    const o = parsed as Record<string, unknown>;
    const looksRight =
      typeof parsed === "object" &&
      parsed !== null &&
      typeof o.version === "number" &&
      typeof o.settings === "object" &&
      o.settings !== null;
    if (!looksRight) return "That file is not an i am speed export. Nothing was changed.";
    commit(importData(fresh(), parsed, defaultEnv()), "import");
    return null;
  } catch {
    return "That file is not valid JSON.";
  }
}

export function resetAll(): void {
  commit(resetData(defaultEnv()), "reset");
}
