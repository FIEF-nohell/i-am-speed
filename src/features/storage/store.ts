"use client";

import { useSyncExternalStore } from "react";
import type { Settings } from "@/features/settings/settings";
import { migrate } from "./migrate";
import { clearStored, readStored, writeStored } from "./persist";
import { recordAttempt, type AttemptInput } from "./record";
import { STORAGE_KEY, createEmptyData, type StoredData } from "./schema";

const SERVER_SNAPSHOT: StoredData = createEmptyData();
let current: StoredData | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function snapshot(): StoredData {
  if (current === null) current = readStored().data;
  return current;
}

function commit(next: StoredData): void {
  current = next;
  writeStored(next);
  emit();
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
  const d = snapshot();
  commit({ ...d, settings: { ...d.settings, ...patch } });
}

export function commitAttempt(input: AttemptInput): void {
  commit(recordAttempt(snapshot(), input));
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
    commit(migrate(parsed));
    return null;
  } catch {
    return "That file is not valid JSON.";
  }
}

export function resetAll(): void {
  clearStored();
  current = createEmptyData();
  emit();
}
