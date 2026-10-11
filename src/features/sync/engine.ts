import type { AuthUser } from "@/features/auth/types";
import type { EngineDeps, SyncEngine } from "./engineTypes";
import {
  hasProgress,
  linkKind,
  markPushed,
  mergeWithCloud,
  pendingCount,
  pendingWrite,
  unlink,
} from "./merge";
import { PUSH_DEBOUNCE_MS, backoffDelay } from "./schedule";
import { CloudError, type CloudSnapshot, type CloudWrite, type SyncState } from "./types";

const isEmptyWrite = (w: CloudWrite): boolean =>
  w.profile === null && w.contribs.length === 0 && w.attempts.length === 0;

export type { EngineDeps, SyncEngine, SyncStore } from "./engineTypes";

export function createSyncEngine(deps: EngineDeps): SyncEngine {
  let gen = 0;
  let user: AuthUser | null = null;
  let unsubscribe: (() => void) | null = null;
  let pushTimer: unknown = null;
  let retryTimer: unknown = null;
  let retryAt: number | null = null;
  let failures = 0;
  let staleRetried = false;
  let paused = false;
  let hasSynced = false;
  let pendingLink: CloudSnapshot | null = null;
  let deferred: CloudSnapshot | null = null;
  let state: SyncState = { kind: "local" };
  let queue: Promise<void> = Promise.resolve();

  const publish = (next: SyncState): void => {
    state = next;
    deps.setState(next);
  };
  const live = (g: number): boolean => g === gen && user !== null && !paused;

  function clearTimers(): void {
    if (pushTimer !== null) deps.clearTimer(pushTimer);
    if (retryTimer !== null) deps.clearTimer(retryTimer);
    pushTimer = null;
    retryTimer = null;
    retryAt = null;
  }

  /** Tasks run strictly one after another so a pull never overlaps a push. */
  function enqueue(task: () => Promise<void>): Promise<void> {
    const run = queue.then(task).catch(() => undefined);
    queue = run;
    return run;
  }

  function markSynced(): void {
    hasSynced = true;
    failures = 0;
    staleRetried = false;
    publish({ kind: "synced", at: deps.now() });
  }

  function fail(e: unknown, g: number): void {
    if (!live(g)) return;
    const code = e instanceof CloudError ? e.code : "unknown";
    if (code === "stale-profile" && !staleRetried) {
      // A newer profile exists in the cloud: pull and re-merge, the newer settings win.
      staleRetried = true;
      void enqueue(() => fullSync(g));
      return;
    }
    if (code === "permission-denied" || code === "stale-profile") {
      publish({
        kind: "error",
        message: "The server refused the sync. Sign out and in again, or try later.",
        retryAt: null,
      });
      return;
    }
    failures += 1;
    const delay = backoffDelay(failures);
    retryAt = deps.now() + delay;
    publish(
      code === "offline"
        ? { kind: "offline", pending: pendingCount(deps.store.get()), retryAt }
        : { kind: "error", message: "Sync failed. Trying again soon.", retryAt },
    );
    retryTimer = deps.setTimer(() => {
      retryTimer = null;
      retryAt = null;
      const linked = deps.store.get().sync.linkedUid === user?.uid;
      void enqueue(() => (linked ? pushPending(g) : fullSync(g)));
    }, delay);
  }

  async function fullSync(g: number): Promise<void> {
    const u = user;
    if (!live(g) || u === null || pendingLink) return;
    publish(hasSynced ? { kind: "syncing" } : { kind: "starting" });
    let snap: CloudSnapshot;
    try {
      snap = await deps.cloud.pull(u.uid);
    } catch (e) {
      fail(e, g);
      return;
    }
    if (!live(g)) return;
    const local = deps.store.get();
    if (linkKind(local, u.uid) === "other-account" && hasProgress(local)) {
      pendingLink = snap;
      publish({ kind: "confirm-link", email: u.email });
      return;
    }
    await mergeAndPush(snap, g);
  }

  async function mergeAndPush(snap: CloudSnapshot, g: number): Promise<void> {
    const u = user;
    if (!live(g) || u === null) return;
    if (deps.isTypingRoute()) {
      // Never change data under a typing session. The kept snapshot is merged on route change.
      deferred = snap;
      if (!hasSynced) publish({ kind: "syncing" });
      return;
    }
    deferred = null;
    const at = deps.now();
    deps.store.apply((cur) => mergeWithCloud(cur, snap, { uid: u.uid, now: at }).data);
    await pushPending(g);
  }

  async function pushPending(g: number): Promise<void> {
    const u = user;
    if (!live(g) || u === null || pendingLink) return;
    if (deps.store.get().sync.linkedUid !== u.uid) {
      if (deferred === null) await fullSync(g);
      return;
    }
    const write = pendingWrite(deps.store.get());
    if (isEmptyWrite(write)) {
      markSynced();
      return;
    }
    publish({ kind: "syncing" });
    try {
      await deps.cloud.push(u.uid, write);
    } catch (e) {
      fail(e, g);
      return;
    }
    if (!live(g)) return;
    deps.store.apply((cur) => markPushed(cur, write));
    if (isEmptyWrite(pendingWrite(deps.store.get()))) markSynced();
    else {
      failures = 0;
      schedulePush();
    }
  }

  function schedulePush(): void {
    if (user === null || paused || pendingLink) return;
    if (retryTimer !== null) {
      // A retry is already scheduled: only refresh what the user sees.
      if (state.kind === "offline") {
        publish({ ...state, pending: pendingCount(deps.store.get()) });
      }
      return;
    }
    if (pushTimer !== null) deps.clearTimer(pushTimer);
    const g = gen;
    pushTimer = deps.setTimer(() => {
      pushTimer = null;
      deps.idle(() => void enqueue(() => pushPending(g)));
    }, PUSH_DEBOUNCE_MS);
  }

  function detach(): void {
    gen += 1;
    clearTimers();
    unsubscribe?.();
    unsubscribe = null;
    user = null;
    pendingLink = null;
    deferred = null;
    paused = false;
    hasSynced = false;
    failures = 0;
    staleRetried = false;
    publish({ kind: "local" });
  }

  return {
    attach(next) {
      detach();
      user = next;
      const g = gen;
      unsubscribe = deps.store.subscribe((_data, cause) => {
        if (cause !== "remote") schedulePush();
      });
      publish({ kind: "starting" });
      return enqueue(() => fullSync(g));
    },
    detach,
    syncNow() {
      if (user === null || paused) return Promise.resolve();
      clearTimers();
      failures = 0;
      const g = gen;
      return enqueue(() => fullSync(g));
    },
    async resolveLink(choice) {
      const snap = pendingLink;
      if (snap === null || user === null) return;
      pendingLink = null;
      if (choice === "cancel") {
        await deps.signOut();
        detach();
        return;
      }
      const g = gen;
      await enqueue(() => mergeAndPush(snap, g));
    },
    async deleteCloudData() {
      const u = user;
      if (u === null) return { ok: false, message: "You are not signed in." };
      paused = true;
      clearTimers();
      pendingLink = null;
      deferred = null;
      let result: { ok: true } | { ok: false; message: string } = { ok: true };
      await enqueue(async () => {
        try {
          await deps.cloud.deleteAll(u.uid);
          deps.store.apply(unlink);
        } catch {
          paused = false;
          result = { ok: false, message: "Could not delete the cloud data. Try again." };
        }
      });
      return result;
    },
    onRouteChange() {
      const snap = deferred;
      if (snap === null || deps.isTypingRoute()) return;
      deferred = null;
      const g = gen;
      void enqueue(() => mergeAndPush(snap, g));
    },
  };
}
