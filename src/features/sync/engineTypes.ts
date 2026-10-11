import type { AuthUser } from "@/features/auth/types";
import type { StoredData } from "@/features/storage/schema";
import type { CommitCause } from "@/features/storage/store";
import type { CloudAdapter, SyncState } from "./types";

export interface SyncStore {
  get(): StoredData;
  /** Re-reads the latest data, applies the pure function, persists and emits with cause "remote". */
  apply(fn: (current: StoredData) => StoredData): void;
  subscribe(cb: (next: StoredData, cause: CommitCause) => void): () => void;
}

export interface EngineDeps {
  cloud: CloudAdapter;
  store: SyncStore;
  now(): number;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  /** Runs `cb` when the browser is idle (or soon after). */
  idle(cb: () => void): void;
  isTypingRoute(): boolean;
  signOut(): Promise<void>;
  setState(state: SyncState): void;
}

export interface SyncEngine {
  attach(user: AuthUser): Promise<void>;
  detach(): void;
  syncNow(): Promise<void>;
  resolveLink(choice: "merge" | "cancel"): Promise<void>;
  deleteCloudData(): Promise<{ ok: true } | { ok: false; message: string }>;
  onRouteChange(): void;
}
