import { vi } from "vitest";
import type { AuthUser } from "@/features/auth/types";
import { computeMetrics } from "@/features/engine/metrics";
import { createState, reduce } from "@/features/engine/engine";
import { DEFAULT_ENGINE_CONFIG } from "@/features/engine/types";
import { recordAttempt } from "@/features/storage/record";
import { createEmptyData, type StoredData } from "@/features/storage/schema";
import type { CommitCause } from "@/features/storage/store";
import { createSyncEngine, type SyncEngine, type SyncStore } from "../engine";
import type { SyncState } from "../types";
import type { FakeCloud } from "./fakeCloud";

function metricsFor(target: string, typed: string) {
  let s = createState(target, DEFAULT_ENGINE_CONFIG);
  let t = 0;
  for (const ch of typed) {
    t += 120;
    s = reduce(s, { kind: "char", char: ch, t, modifier: "none" });
  }
  return computeMetrics(s);
}

export const GOOD = metricsFor("abc", "abc");

export const userOf = (uid: string): AuthUser => ({
  uid,
  email: `${uid}@example.com`,
  displayName: null,
  providerIds: ["password"],
  emailVerified: true,
});

/** Pure helper: one more finished lesson attempt. */
export function withAttempt(d: StoredData, at: number, source = "home-01"): StoredData {
  return recordAttempt(d, { source, lang: "de", text: "abc", metrics: GOOD, at });
}

/** One simulated browser: its own local data and sync engine over a shared FakeCloud. */
export interface Device {
  engine: SyncEngine;
  signOut: ReturnType<typeof vi.fn<() => Promise<void>>>;
  states: SyncState[];
  route: { typing: boolean };
  data(): StoredData;
  state(): SyncState;
  /** A local user change (attempt finish, settings), reported to the engine as cause "local". */
  commit(fn: (d: StoredData) => StoredData, cause?: CommitCause): void;
  /** New engine on the same stored data, like a page reload. */
  restart(): void;
}

export function createDevice(prefix: string, cloud: FakeCloud): Device {
  let n = 0;
  let data = createEmptyData({
    newId: () => `${prefix}${String(++n).padStart(8, "0")}`,
    now: 1000,
  });
  const listeners = new Set<(d: StoredData, c: CommitCause) => void>();
  const emit = (c: CommitCause): void => listeners.forEach((l) => l(data, c));
  const store: SyncStore = {
    get: () => data,
    apply(fn) {
      data = fn(data);
      emit("remote");
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  const states: SyncState[] = [];
  const route = { typing: false };
  const signOut = vi.fn<() => Promise<void>>(() => Promise.resolve());
  const make = (): SyncEngine =>
    createSyncEngine({
      cloud,
      store,
      now: () => Date.now(),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      idle: (cb) => cb(),
      isTypingRoute: () => route.typing,
      signOut,
      setState: (s) => states.push(s),
    });
  const device: Device = {
    engine: make(),
    signOut,
    states,
    route,
    data: () => data,
    state: () => states[states.length - 1] ?? { kind: "local" },
    commit(fn, cause = "local") {
      data = fn(data);
      emit(cause);
    },
    restart() {
      device.engine.detach();
      device.engine = make();
    },
  };
  return device;
}
