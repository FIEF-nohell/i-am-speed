import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootAuth, getAuthAdapter, resetAuthForTests, signOut, subscribeAuth } from "./session";
import { AUTH_HINT_KEY, type AuthAdapter, type AuthResult, type AuthUser } from "./types";

const USER: AuthUser = {
  uid: "u1",
  email: "a@b.c",
  displayName: null,
  providerIds: ["password"],
  emailVerified: false,
};
const OK: AuthResult = { ok: true };

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

function fakeAdapter() {
  let cb: (u: AuthUser | null) => void = () => {};
  const adapter: AuthAdapter = {
    onChange: (fn) => {
      cb = fn;
      return () => {};
    },
    signInEmail: async () => OK,
    signUpEmail: async () => OK,
    signInGoogle: async () => OK,
    sendPasswordReset: async () => OK,
    sendVerificationEmail: async () => OK,
    changePassword: async () => OK,
    reauthenticate: async () => OK,
    deleteUser: async () => OK,
    signOut: vi.fn(async () => cb(null)),
  };
  return { adapter, emit: (u: AuthUser | null) => cb(u) };
}

describe("auth session", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });
  afterEach(() => {
    resetAuthForTests();
    vi.unstubAllGlobals();
  });

  it("anonymous boot never calls the loader and reports signed-out", () => {
    const { adapter } = fakeAdapter();
    const loader = vi.fn(async () => adapter);
    resetAuthForTests(loader);
    const seen: (AuthUser | null)[] = [];
    subscribeAuth((u) => seen.push(u));
    bootAuth();
    expect(loader).not.toHaveBeenCalled();
    expect(seen).toEqual([null]);
  });

  it("boots the adapter when the hint is set and signs in from its events", async () => {
    vi.stubGlobal("localStorage", memoryStorage({ [AUTH_HINT_KEY]: "1" }));
    const f = fakeAdapter();
    const loader = vi.fn(async () => f.adapter);
    resetAuthForTests(loader);
    const seen: (AuthUser | null)[] = [];
    subscribeAuth((u) => seen.push(u));
    bootAuth();
    await getAuthAdapter();
    expect(loader).toHaveBeenCalledTimes(1);
    f.emit(USER);
    expect(seen).toEqual([USER]);
  });

  it("toggles the hint key on sign in and sign out", async () => {
    const f = fakeAdapter();
    resetAuthForTests(async () => f.adapter);
    bootAuth();
    await getAuthAdapter();
    f.emit(USER);
    expect(localStorage.getItem(AUTH_HINT_KEY)).toBe("1");
    await signOut();
    expect(f.adapter.signOut).toHaveBeenCalled();
    expect(localStorage.getItem(AUTH_HINT_KEY)).toBeNull();
  });

  it("memoises the adapter and retries after a failed load", async () => {
    const f = fakeAdapter();
    const loader = vi
      .fn<() => Promise<AuthAdapter>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(f.adapter);
    resetAuthForTests(loader);
    await expect(getAuthAdapter()).rejects.toThrow("offline");
    const a = await getAuthAdapter();
    const b = await getAuthAdapter();
    expect(a).toBe(b);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("signOut is a no-op when the adapter was never loaded", async () => {
    const loader = vi.fn();
    resetAuthForTests(loader);
    await signOut();
    expect(loader).not.toHaveBeenCalled();
  });
});
