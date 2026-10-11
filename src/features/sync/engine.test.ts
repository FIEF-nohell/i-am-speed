import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { combine } from "./combine";
import { applySettingsPatch } from "./dataOps";
import { pendingCount, pendingWrite } from "./merge";
import { FakeCloud } from "./testing/fakeCloud";
import { createDevice, userOf, withAttempt, type Device } from "./testing/harness";

const ALICE = userOf("alice");
const BOB = userOf("bob");

let cloud: FakeCloud;
let devices: Device[];

function newDevice(prefix: string): Device {
  const d = createDevice(prefix, cloud);
  devices.push(d);
  return d;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-11T12:00:00Z"));
  cloud = new FakeCloud();
  devices = [];
});

afterEach(() => {
  devices.forEach((d) => d.engine.detach());
  vi.useRealTimers();
});

const settle = async (ms: number): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms);
};

describe("first link and cross-device convergence", () => {
  it("pushes everything on first link and a second device pulls identical stats", async () => {
    const a = newDevice("aaaa");
    a.commit((d) => withAttempt(withAttempt(d, 1000), 2000, "home-02"));
    await a.engine.attach(ALICE);

    expect(a.state().kind).toBe("synced");
    expect(a.data().sync.linkedUid).toBe("alice");
    expect(pendingCount(a.data())).toBe(0);
    expect(cloud.snapshot("alice").attempts).toHaveLength(2);

    const b = newDevice("bbbb");
    await b.engine.attach(ALICE);
    expect(b.data().totals).toEqual(a.data().totals);
    expect(b.data().keys).toEqual(a.data().keys);
    expect(b.data().lessons).toEqual(a.data().lessons);
    expect(b.data().attempts.map((x) => x.id)).toEqual(a.data().attempts.map((x) => x.id));
  });

  it("uploads local settings to an empty account and downloads cloud settings otherwise", async () => {
    const a = newDevice("aaaa");
    a.commit((d) => applySettingsPatch(d, { theme: "ember" }, Date.now()));
    await a.engine.attach(ALICE);
    expect(cloud.snapshot("alice").profile?.settings.theme).toBe("ember");

    const b = newDevice("bbbb");
    await b.engine.attach(ALICE);
    expect(b.data().settings.theme).toBe("ember");
  });

  it("repeated syncNow never double counts", async () => {
    const a = newDevice("aaaa");
    a.commit((d) => withAttempt(d, 1000));
    await a.engine.attach(ALICE);
    const totals = a.data().totals;
    for (let i = 0; i < 3; i++) await a.engine.syncNow();
    expect(a.data().totals).toEqual(totals);
    expect(combine(a.data().sync.contribs).totals.attempts).toBe(1);
    const b = newDevice("bbbb");
    await b.engine.attach(ALICE);
    await b.engine.syncNow();
    await a.engine.syncNow();
    expect(a.data().totals.attempts).toBe(1);
    expect(b.data().totals.attempts).toBe(1);
  });

  it("merges work done on two devices without losing or doubling anything", async () => {
    const a = newDevice("aaaa");
    const b = newDevice("bbbb");
    await a.engine.attach(ALICE);
    await b.engine.attach(ALICE);
    a.commit((d) => withAttempt(d, 1000));
    b.commit((d) => withAttempt(withAttempt(d, 2000), 3000));
    await settle(2100);
    await a.engine.syncNow();
    await b.engine.syncNow();
    expect(a.data().totals.attempts).toBe(3);
    expect(b.data().totals.attempts).toBe(3);
    expect(a.data().attempts).toHaveLength(3);
    expect(a.data().keys).toEqual(b.data().keys);
  });
});

describe("push scheduling", () => {
  it("batches three quick commits into one push after the debounce", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    const base = cloud.calls.push; // first link uploads the settings profile
    a.commit((d) => withAttempt(d, 1000));
    await settle(500);
    a.commit((d) => withAttempt(d, 2000));
    await settle(500);
    a.commit((d) => withAttempt(d, 3000));
    await settle(1900);
    expect(cloud.calls.push).toBe(base);
    await settle(200);
    expect(cloud.calls.push).toBe(base + 1);
    expect(cloud.writes[base].attempts).toHaveLength(3);
    expect(a.state().kind).toBe("synced");
    expect(pendingCount(a.data())).toBe(0);
  });

  it("ignores commits caused by sync itself", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    const base = cloud.calls.push;
    a.commit((d) => d, "remote");
    await settle(5000);
    expect(cloud.calls.push).toBe(base);
  });

  it("keeps a change made during a push pending and pushes it next", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    const base = cloud.calls.push;
    let once = true;
    cloud.beforePush = () => {
      if (!once) return;
      once = false;
      a.commit((d) => withAttempt(d, 5000));
    };
    a.commit((d) => withAttempt(d, 1000));
    await settle(2100);
    expect(cloud.calls.push).toBe(base + 1);
    expect(pendingWrite(a.data()).attempts).toHaveLength(1);
    await settle(2100);
    expect(cloud.calls.push).toBe(base + 2);
    expect(pendingCount(a.data())).toBe(0);
    expect(cloud.snapshot("alice").attempts).toHaveLength(2);
  });

  it("pushes an import and a reset-relink through the same path", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    a.commit((d) => withAttempt(d, 1000), "import");
    await settle(2100);
    expect(cloud.snapshot("alice").attempts).toHaveLength(1);
  });
});

describe("offline tolerance", () => {
  it("queues while offline, backs off 5s, 15s, 60s, 5min, and recovers", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    cloud.offline = true;
    a.commit((d) => withAttempt(d, 1000));
    await settle(2000);
    expect(a.state()).toMatchObject({ kind: "offline", pending: 1 });
    expect(pendingCount(a.data())).toBe(1);

    const gaps: number[] = [];
    for (const expected of [5000, 15000, 60000, 300000, 300000]) {
      const before = cloud.calls.push + cloud.calls.pull;
      await settle(expected - 1);
      expect(cloud.calls.push + cloud.calls.pull).toBe(before);
      await settle(1);
      expect(cloud.calls.push + cloud.calls.pull).toBe(before + 1);
      gaps.push(expected);
    }
    expect(gaps).toEqual([5000, 15000, 60000, 300000, 300000]);

    cloud.offline = false;
    await settle(300000);
    expect(a.state().kind).toBe("synced");
    expect(pendingCount(a.data())).toBe(0);
    expect(cloud.snapshot("alice").attempts).toHaveLength(1);
  });

  it("updates the pending count on new commits during backoff without extra requests", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    cloud.offline = true;
    a.commit((d) => withAttempt(d, 1000));
    await settle(2100);
    const calls = cloud.calls.push;
    a.commit((d) => withAttempt(d, 2000));
    expect(a.state()).toMatchObject({ kind: "offline", pending: 2 });
    expect(cloud.calls.push).toBe(calls);
  });

  it("pushes pending work after a reload (new engine on the same stored data)", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    cloud.offline = true;
    a.commit((d) => withAttempt(d, 1000));
    await settle(2100);
    expect(pendingCount(a.data())).toBe(1);

    a.restart();
    cloud.offline = false;
    await a.engine.attach(ALICE);
    expect(a.state().kind).toBe("synced");
    expect(pendingCount(a.data())).toBe(0);
    expect(cloud.snapshot("alice").attempts).toHaveLength(1);
  });

  it("goes offline when the first pull fails and links once the network returns", async () => {
    const a = newDevice("aaaa");
    a.commit((d) => withAttempt(d, 1000));
    cloud.offline = true;
    await a.engine.attach(ALICE);
    expect(a.state().kind).toBe("offline");
    expect(a.data().sync.linkedUid).toBeNull();
    cloud.offline = false;
    await settle(5000);
    expect(a.state().kind).toBe("synced");
    expect(a.data().sync.linkedUid).toBe("alice");
  });

  it("reports unknown failures as an error with a retry", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    cloud.failNext("push", "unknown");
    a.commit((d) => withAttempt(d, 1000));
    await settle(2100);
    expect(a.state()).toMatchObject({ kind: "error", retryAt: expect.any(Number) });
    await settle(5000);
    expect(a.state().kind).toBe("synced");
  });
});

describe("refusals", () => {
  it("stale-profile: pulls, the newer cloud settings win, then syncs", async () => {
    const a = newDevice("aaaa");
    a.commit((d) => applySettingsPatch(d, { theme: "dusk" }, Date.now()));
    await a.engine.attach(ALICE);
    cloud.seed("alice", {
      profile: {
        settings: { ...a.data().settings, theme: "light" },
        settingsUpdatedAt: Date.now() + 1e9,
      },
      contribs: [],
      attempts: [],
    });
    a.commit((d) => applySettingsPatch(d, { theme: "ember" }, Date.now()));
    await settle(2100);
    expect(a.data().settings.theme).toBe("light");
    expect(a.state().kind).toBe("synced");
    expect(pendingCount(a.data())).toBe(0);
  });

  it("a repeated stale-profile ends in an error instead of looping", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    cloud.failNext("push", "stale-profile");
    cloud.failNext("push", "stale-profile");
    a.commit((d) => applySettingsPatch(d, { theme: "ember" }, Date.now()));
    await settle(2100);
    expect(a.state()).toMatchObject({ kind: "error", retryAt: null });
    const pulls = cloud.calls.pull;
    await settle(600000);
    expect(cloud.calls.pull).toBe(pulls);
  });

  it("permission-denied is an error with no retry", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    cloud.failNext("push", "permission-denied");
    a.commit((d) => withAttempt(d, 1000));
    await settle(2100);
    expect(a.state()).toMatchObject({ kind: "error", retryAt: null });
    const pushes = cloud.calls.push;
    await settle(600000);
    expect(cloud.calls.push).toBe(pushes);
  });
});

describe("other account", () => {
  async function linkedToAlice(): Promise<Device> {
    const a = newDevice("aaaa");
    a.commit((d) => withAttempt(d, 1000));
    await a.engine.attach(ALICE);
    a.engine.detach();
    return a;
  }

  it("asks before merging into a different account, then merges everything", async () => {
    cloud.seed("bob", { profile: null, contribs: [], attempts: [] });
    const other = newDevice("bbbb");
    other.commit((d) => withAttempt(d, 500));
    await other.engine.attach(BOB);
    const a = await linkedToAlice();

    await a.engine.attach(BOB);
    expect(a.state()).toEqual({ kind: "confirm-link", email: "bob@example.com" });
    expect(a.data().sync.linkedUid).toBe("alice");
    expect(cloud.snapshot("bob").attempts).toHaveLength(1);

    await a.engine.resolveLink("merge");
    expect(a.state().kind).toBe("synced");
    expect(a.data().sync.linkedUid).toBe("bob");
    expect(a.data().totals.attempts).toBe(2);
    expect(cloud.snapshot("bob").attempts).toHaveLength(2);
  });

  it("cancel signs out and leaves local data untouched", async () => {
    const a = await linkedToAlice();
    const before = a.data();
    await a.engine.attach(BOB);
    expect(a.state().kind).toBe("confirm-link");
    await a.engine.resolveLink("cancel");
    expect(a.signOut).toHaveBeenCalledTimes(1);
    expect(a.data()).toBe(before);
    expect(a.state().kind).toBe("local");
    expect(cloud.snapshot("bob").attempts).toHaveLength(0);
  });

  it("does not ask when the device has no progress to protect", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    a.engine.detach();
    await a.engine.attach(BOB);
    expect(a.state().kind).toBe("synced");
    expect(a.data().sync.linkedUid).toBe("bob");
  });

  it("does not push while waiting for the answer", async () => {
    const a = await linkedToAlice();
    await a.engine.attach(BOB);
    const pushes = cloud.calls.push;
    a.commit((d) => withAttempt(d, 9000));
    await settle(10000);
    expect(cloud.calls.push).toBe(pushes);
    expect(a.state().kind).toBe("confirm-link");
  });
});

describe("typing routes", () => {
  it("defers the remote merge while typing and applies it on route change", async () => {
    const b = newDevice("bbbb");
    b.commit((d) => withAttempt(d, 1000));
    await b.engine.attach(ALICE);

    const a = newDevice("aaaa");
    a.route.typing = true;
    await a.engine.attach(ALICE);
    expect(a.data().totals.attempts).toBe(0);
    expect(a.data().sync.linkedUid).toBeNull();
    a.engine.onRouteChange();
    expect(a.data().totals.attempts).toBe(0);

    a.route.typing = false;
    a.engine.onRouteChange();
    await settle(0);
    expect(a.data().totals.attempts).toBe(1);
    expect(a.state().kind).toBe("synced");
  });

  it("does not pull again for every commit while a merge is deferred", async () => {
    const a = newDevice("aaaa");
    a.route.typing = true;
    await a.engine.attach(ALICE);
    const pulls = cloud.calls.pull;
    a.commit((d) => withAttempt(d, 1000));
    await settle(3000);
    expect(cloud.calls.pull).toBe(pulls);
    a.route.typing = false;
    a.engine.onRouteChange();
    await settle(0);
    expect(cloud.snapshot("alice").attempts).toHaveLength(1);
  });
});

describe("detach and delete", () => {
  it("detach stops pending pushes and returns to local", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    const base = cloud.calls.push;
    a.commit((d) => withAttempt(d, 1000));
    a.engine.detach();
    await settle(10000);
    expect(cloud.calls.push).toBe(base);
    expect(a.state().kind).toBe("local");
    a.commit((d) => withAttempt(d, 2000));
    await settle(10000);
    expect(cloud.calls.push).toBe(base);
  });

  it("detach during an in-flight pull applies nothing", async () => {
    const b = newDevice("bbbb");
    b.commit((d) => withAttempt(d, 1000));
    await b.engine.attach(ALICE);
    const a = newDevice("aaaa");
    const attached = a.engine.attach(ALICE);
    a.engine.detach();
    await attached;
    expect(a.data().totals.attempts).toBe(0);
    expect(a.state().kind).toBe("local");
  });

  it("deleteCloudData removes the cloud subtree, unlinks, and never pushes again", async () => {
    const a = newDevice("aaaa");
    a.commit((d) => withAttempt(d, 1000));
    await a.engine.attach(ALICE);
    expect(cloud.hasUser("alice")).toBe(true);

    const result = await a.engine.deleteCloudData();
    expect(result).toEqual({ ok: true });
    expect(cloud.hasUser("alice")).toBe(false);
    expect(a.data().sync.linkedUid).toBeNull();
    expect(a.data().attempts).toHaveLength(1);

    const pushes = cloud.calls.push;
    a.commit((d) => withAttempt(d, 2000));
    await settle(10000);
    await a.engine.syncNow();
    expect(cloud.calls.push).toBe(pushes);
    expect(cloud.hasUser("alice")).toBe(false);
  });

  it("a failed delete resumes syncing and reports the failure", async () => {
    const a = newDevice("aaaa");
    await a.engine.attach(ALICE);
    cloud.failNext("deleteAll", "offline");
    const result = await a.engine.deleteCloudData();
    expect(result.ok).toBe(false);
    a.commit((d) => withAttempt(d, 1000));
    await settle(2100);
    expect(cloud.snapshot("alice").attempts).toHaveLength(1);
  });

  it("syncNow and deleteCloudData are harmless when not attached", async () => {
    const a = newDevice("aaaa");
    await a.engine.syncNow();
    expect(cloud.calls.pull).toBe(0);
    expect((await a.engine.deleteCloudData()).ok).toBe(false);
  });
});
