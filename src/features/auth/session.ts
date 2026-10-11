import { useSyncExternalStore } from "react";
import { AUTH_HINT_KEY, type AuthAdapter, type AuthState, type AuthUser } from "./types";

const SERVER_STATE: AuthState = { status: "unknown", user: null };

let state: AuthState = SERVER_STATE;
let booted = false;
let adapterPromise: Promise<AuthAdapter> | null = null;
let unsubscribeAdapter: (() => void) | null = null;
const stateListeners = new Set<() => void>();
const userListeners = new Set<(user: AuthUser | null) => void>();

/** Dynamic import of the only module that touches the Firebase SDK. Replaceable in tests. */
type Loader = () => Promise<AuthAdapter>;
const realLoader: Loader = async () => {
  const [{ loadFirebase }, { createFirebaseAuthAdapter }] = await Promise.all([
    import("@/features/firebase/client"),
    import("@/features/firebase/auth"),
  ]);
  return createFirebaseAuthAdapter(await loadFirebase());
};
let loader: Loader = realLoader;

function setState(next: AuthState): void {
  state = next;
  for (const cb of [...stateListeners]) cb();
}

function writeHint(on: boolean): void {
  try {
    if (on) localStorage.setItem(AUTH_HINT_KEY, "1");
    else localStorage.removeItem(AUTH_HINT_KEY);
  } catch {
    // storage unavailable: the hint only speeds up boot, so ignore
  }
}

function readHint(): boolean {
  try {
    return localStorage.getItem(AUTH_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function onUser(user: AuthUser | null): void {
  writeHint(user !== null);
  setState(user ? { status: "signed-in", user } : { status: "signed-out", user: null });
  for (const cb of [...userListeners]) cb(user);
}

function subscribeState(cb: () => void): () => void {
  stateListeners.add(cb);
  return () => {
    stateListeners.delete(cb);
  };
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    subscribeState,
    () => state,
    () => SERVER_STATE,
  );
}

export function subscribeAuth(cb: (user: AuthUser | null) => void): () => void {
  userListeners.add(cb);
  if (state.status !== "unknown") cb(state.user);
  return () => {
    userListeners.delete(cb);
  };
}

/** Lazily imports the Firebase auth adapter (memoised) and wires its changes into the store. */
export function getAuthAdapter(): Promise<AuthAdapter> {
  if (!adapterPromise) {
    adapterPromise = loader().then(
      (adapter) => {
        unsubscribeAdapter?.();
        unsubscribeAdapter = adapter.onChange(onUser);
        return adapter;
      },
      (e: unknown) => {
        adapterPromise = null;
        throw e;
      },
    );
  }
  return adapterPromise;
}

/** Called once on the client. Anonymous browsers never import Firebase. */
export function bootAuth(): void {
  if (booted) return;
  booted = true;
  if (!readHint()) {
    setState({ status: "signed-out", user: null });
    for (const cb of [...userListeners]) cb(null);
    return;
  }
  getAuthAdapter().catch(() => {
    // Offline or blocked: stay signed-out in the UI, keep the hint so the next boot retries.
    setState({ status: "signed-out", user: null });
  });
}

export async function signOut(): Promise<void> {
  if (!adapterPromise) return;
  const adapter = await adapterPromise.catch(() => null);
  await adapter?.signOut();
}

/** Test seam: replace the adapter loader and reset all module state. Pass nothing to restore. */
export function resetAuthForTests(testLoader?: Loader): void {
  unsubscribeAdapter?.();
  unsubscribeAdapter = null;
  adapterPromise = null;
  booted = false;
  loader = testLoader ?? realLoader;
  userListeners.clear();
  setState(SERVER_STATE);
}
