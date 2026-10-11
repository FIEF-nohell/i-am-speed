import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GOOD, withAttempt } from "@/features/sync/testing/harness";
import { STORAGE_KEY, createEmptyData, type StoredData } from "./schema";

type Store = typeof import("./store");

class MemoryStorage {
  readonly map = new Map<string, string>();
  failWrites = false;
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    if (this.failWrites) throw new Error("quota");
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

let storage: MemoryStorage;

async function freshStore(): Promise<Store> {
  vi.resetModules();
  return import("./store");
}

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("window", {
    localStorage: storage,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const stored = (): StoredData => JSON.parse(storage.map.get(STORAGE_KEY) ?? "{}") as StoredData;

describe("store commit bridge", () => {
  it("reports the cause of every commit", async () => {
    const s = await freshStore();
    const causes: string[] = [];
    s.subscribeCommits((_d, cause) => causes.push(cause));
    s.updateSettings({ theme: "light" });
    s.applyRemote((d) => d);
    s.importJson(JSON.stringify(createEmptyData()));
    s.resetAll();
    expect(causes).toEqual(["local", "remote", "import", "reset"]);
  });

  it("stops notifying after unsubscribe", async () => {
    const s = await freshStore();
    const seen: string[] = [];
    const off = s.subscribeCommits((_d, c) => seen.push(c));
    off();
    s.updateSettings({ theme: "light" });
    expect(seen).toEqual([]);
  });

  it("stamps settings changes and keeps the stamp strictly increasing", async () => {
    const s = await freshStore();
    s.updateSettings({ theme: "light" });
    const first = stored().settingsUpdatedAt;
    expect(first).toBeGreaterThan(0);
    s.updateSettings({ theme: "dusk" });
    expect(stored().settingsUpdatedAt).toBeGreaterThan(first);
    expect(stored().settings.theme).toBe("dusk");
  });

  it("commitAttempt builds on what another tab saved meanwhile", async () => {
    const s = await freshStore();
    s.getData();
    const other = withAttempt(createEmptyData(), 1000);
    storage.map.set(STORAGE_KEY, JSON.stringify(other));
    s.commitAttempt({ source: "home-01", lang: "de", text: "abc", metrics: GOOD, at: 2000 });
    expect(stored().attempts).toHaveLength(2);
    expect(stored().totals.attempts).toBe(2);
  });

  it("applyRemote applies a pure function to the latest stored data", async () => {
    const s = await freshStore();
    s.getData();
    storage.map.set(STORAGE_KEY, JSON.stringify(withAttempt(createEmptyData(), 1000)));
    s.applyRemote((d) => ({ ...d, settingsUpdatedAt: 77 }));
    expect(stored().settingsUpdatedAt).toBe(77);
    expect(stored().attempts).toHaveLength(1);
    expect(s.getData().attempts).toHaveLength(1);
  });

  it("keeps working from memory when storage cannot be written", async () => {
    const s = await freshStore();
    storage.failWrites = true;
    s.updateSettings({ theme: "light" });
    s.updateSettings({ fontSize: "xl" });
    expect(s.getData().settings).toMatchObject({ theme: "light", fontSize: "xl" });
  });
});

describe("import and reset", () => {
  it("rejects files that are not exports and changes nothing", async () => {
    const s = await freshStore();
    const before = s.getData();
    expect(s.importJson("{}")).toMatch(/not an i am speed export/);
    expect(s.importJson("nope")).toMatch(/not valid JSON/);
    expect(s.getData()).toBe(before);
  });

  it("import keeps the account link and queues everything for the account", async () => {
    const s = await freshStore();
    s.applyRemote((d) => ({ ...d, sync: { ...d.sync, linkedUid: "alice" } }));
    const file = withAttempt(createEmptyData(), 1000);
    expect(s.importJson(JSON.stringify(file))).toBeNull();
    const d = s.getData();
    expect(d.sync.linkedUid).toBe("alice");
    expect(d.sync.unsyncedAttemptIds).toEqual(d.attempts.map((a) => a.id));
    expect(d.totals.attempts).toBe(1);
  });

  it("reset gives empty, unlinked data with a fresh own id", async () => {
    const s = await freshStore();
    s.applyRemote((d) => ({
      ...withAttempt(d, 1000),
      sync: { ...withAttempt(d, 1000).sync, linkedUid: "a" },
    }));
    const oldOwn = s.getData().sync.ownId;
    s.resetAll();
    const d = s.getData();
    expect(d.attempts).toEqual([]);
    expect(d.sync.linkedUid).toBeNull();
    expect(d.sync.ownId).not.toBe(oldOwn);
    expect(stored().sync.ownId).toBe(d.sync.ownId);
  });
});
