import { useSyncExternalStore } from "react";
import type { SyncActions, SyncState } from "./types";

const LOCAL: SyncState = { kind: "local" };

let state: SyncState = LOCAL;
let actions: SyncActions | null = null;
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getSyncState(): SyncState {
  return state;
}

export function setSyncState(next: SyncState): void {
  state = next;
  for (const cb of [...listeners]) cb();
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribe, getSyncState, () => LOCAL);
}

export function registerSyncActions(next: SyncActions | null): void {
  actions = next;
}

/** null while sync is not running. */
export function getSyncActions(): SyncActions | null {
  return actions;
}
