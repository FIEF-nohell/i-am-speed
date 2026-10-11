import { signOut, subscribeAuth } from "@/features/auth/session";
import type { AuthUser } from "@/features/auth/types";
import { applyRemote, getData, subscribeCommits } from "@/features/storage/store";
import { createSyncEngine, type SyncEngine } from "./engine";
import { isTypingPath } from "./schedule";
import { registerSyncActions, setSyncState } from "./state";

const LOCK_NAME = "i-am-speed-sync";
const FOCUS_THROTTLE_MS = 60_000;

let active: SyncEngine | null = null;

/** Called when the route changes: lets the engine apply a merge it held back during typing. */
export function notifyRouteChange(): void {
  active?.onRouteChange();
}

function idle(cb: () => void): void {
  if (typeof window.requestIdleCallback === "function")
    window.requestIdleCallback(cb, { timeout: 4000 });
  else window.setTimeout(cb, 0);
}

/** Loads the Firebase chunks. Only ever reached after a sign-in action or with a stored auth hint. */
async function createEngine(): Promise<SyncEngine> {
  const [{ loadFirebase }, { createFirestoreCloud }] = await Promise.all([
    import("@/features/firebase/client"),
    import("@/features/firebase/cloud"),
  ]);
  const handles = await loadFirebase();
  return createSyncEngine({
    cloud: createFirestoreCloud(handles),
    store: { get: getData, apply: applyRemote, subscribe: subscribeCommits },
    now: () => Date.now(),
    setTimer: (fn, ms) => window.setTimeout(fn, ms),
    clearTimer: (h) => window.clearTimeout(h as number),
    idle,
    isTypingRoute: () => isTypingPath(window.location.pathname),
    signOut,
    setState: setSyncState,
  });
}

/** Pull on focus (throttled) and when the network returns. Returns the cleanup. */
function installTriggers(engine: SyncEngine): () => void {
  let last = Date.now();
  const pull = (): void => {
    last = Date.now();
    void engine.syncNow();
  };
  const onFocus = (): void => {
    if (Date.now() - last >= FOCUS_THROTTLE_MS) pull();
  };
  const onVisible = (): void => {
    if (document.visibilityState === "visible") onFocus();
  };
  window.addEventListener("focus", onFocus);
  window.addEventListener("online", pull);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("online", pull);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/** Starts syncing for one signed-in user. Returns a function that stops everything. */
function runFor(user: AuthUser): () => void {
  let stopped = false;
  let release: (() => void) | null = null;
  let removeTriggers = (): void => {};
  const abort = new AbortController();

  async function lead(): Promise<void> {
    setSyncState({ kind: "starting" });
    let engine: SyncEngine;
    try {
      engine = await createEngine();
    } catch {
      if (!stopped) {
        setSyncState({
          kind: "error",
          message: "Could not load sync. Check your connection.",
          retryAt: null,
        });
      }
      return;
    }
    if (stopped) return;
    active = engine;
    registerSyncActions({
      syncNow: () => engine.syncNow(),
      resolveLink: (choice) => engine.resolveLink(choice),
      deleteCloudData: () => engine.deleteCloudData(),
    });
    removeTriggers = installTriggers(engine);
    await engine.attach(user);
  }

  /** Runs `lead` and, when a lock is held, keeps it until stopped. */
  async function hold(): Promise<void> {
    await lead();
    if (stopped) return;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  }

  function follow(): void {
    // Another tab syncs; this tab sees its changes through the storage event.
    setSyncState({ kind: "synced", at: Date.now() });
    registerSyncActions({
      syncNow: () => Promise.resolve(),
      resolveLink: () => Promise.resolve(),
      deleteCloudData: () =>
        Promise.resolve({
          ok: false as const,
          message: "Another tab is syncing. Close other i am speed tabs and try again.",
        }),
    });
    void navigator.locks
      .request(LOCK_NAME, { signal: abort.signal }, () => (stopped ? undefined : hold()))
      .catch(() => {});
  }

  if (typeof navigator !== "undefined" && "locks" in navigator) {
    void navigator.locks
      .request(LOCK_NAME, { ifAvailable: true }, (lock) => (lock ? hold() : follow()))
      .catch(() => void lead());
  } else {
    void lead();
  }

  return () => {
    stopped = true;
    abort.abort();
    removeTriggers();
    release?.();
    active?.detach();
    active = null;
    registerSyncActions(null);
    setSyncState({ kind: "local" });
  };
}

/** Client only. Follows the auth state: starts the engine on sign-in, stops it on sign-out. */
export function startSync(): () => void {
  let stop: (() => void) | null = null;
  const unsubscribe = subscribeAuth((user) => {
    stop?.();
    stop = user ? runFor(user) : null;
    if (!user) setSyncState({ kind: "local" });
  });
  return () => {
    unsubscribe();
    stop?.();
    stop = null;
  };
}
