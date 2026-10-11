import { describe, expect, it } from "vitest";
import { computeMetrics } from "@/features/engine/metrics";
import { createState, reduce } from "@/features/engine/engine";
import { DEFAULT_ENGINE_CONFIG } from "@/features/engine/types";
import { DEFAULT_SETTINGS } from "@/features/settings/settings";
import { migrate } from "@/features/storage/migrate";
import { recordAttempt } from "@/features/storage/record";
import {
  MAX_ATTEMPTS,
  createEmptyData,
  type Attempt,
  type DataEnv,
  type StoredData,
} from "@/features/storage/schema";
import { createRng, int, pick, type Rng } from "@/lib/rng";
import { combine, emptyAggregates } from "./combine";
import {
  hasProgress,
  linkKind,
  markPushed,
  mergeAttempts,
  mergeContribs,
  mergeWithCloud,
  pendingCount,
  pendingWrite,
  unlink,
} from "./merge";
import type { CloudSnapshot, CloudWrite, ContribId, Contribution } from "./types";

function metricsFor(target: string, typed: string) {
  let s = createState(target, DEFAULT_ENGINE_CONFIG);
  let t = 0;
  for (const ch of typed) {
    t += 120;
    s = reduce(s, { kind: "char", char: ch, t, modifier: "none" });
  }
  return computeMetrics(s);
}

const GOOD = metricsFor("abc", "abc");
const BAD = metricsFor("abcdefghij", "abxcdefghij");

function env(prefix: string): DataEnv {
  let n = 0;
  return { newId: () => `${prefix}${String(++n).padStart(8, "0")}`, now: 1000 };
}

function device(prefix: string): StoredData {
  return createEmptyData(env(prefix));
}

function record(d: StoredData, at: number, source = "home-01", good = true): StoredData {
  return recordAttempt(d, {
    source,
    lang: "de",
    text: "abc",
    metrics: good ? GOOD : BAD,
    at,
  });
}

const EMPTY_CLOUD: CloudSnapshot = { profile: null, contribs: [], attempts: [] };

/** A tiny in-memory account: what a perfect Firestore would hold after the engine pushes. */
class Account {
  profile: CloudSnapshot["profile"] = null;
  contribs = new Map<ContribId, Contribution>();
  attempts = new Map<string, Attempt>();

  snapshot(): CloudSnapshot {
    return {
      profile: this.profile,
      contribs: [...this.contribs.values()],
      attempts: mergeAttempts([...this.attempts.values()], []),
    };
  }
  apply(w: CloudWrite): void {
    if (
      w.profile &&
      (!this.profile || w.profile.settingsUpdatedAt >= this.profile.settingsUpdatedAt)
    )
      this.profile = w.profile;
    for (const c of w.contribs) {
      const prev = this.contribs.get(c.id);
      if (!prev || c.rev >= prev.rev) this.contribs.set(c.id, c);
    }
    for (const a of w.attempts) this.attempts.set(a.id, a);
  }
  /** Pull, merge, push, confirm: one full sync round for a device. */
  sync(d: StoredData, uid = "u1", now = 5000): StoredData {
    const r = mergeWithCloud(d, this.snapshot(), { uid, now });
    this.apply(r.push);
    return markPushed(r.data, r.push);
  }
}

const dataOnly = (d: StoredData) => ({ ...d, lastResult: null });

describe("mergeWithCloud basics", () => {
  it("(a) empty with empty pushes nothing", () => {
    const local = device("aaaa");
    const r = mergeWithCloud(local, EMPTY_CLOUD, { uid: "u1", now: 1 });
    expect(r.data.totals.attempts).toBe(0);
    expect(r.data.attempts).toEqual([]);
    expect(r.push.attempts).toEqual([]);
    expect(r.push.contribs).toEqual([]);
    expect(r.data.sync.linkedUid).toBe("u1");
    expect(hasProgress(r.data)).toBe(false);
  });

  it("(b) first link with an empty cloud pushes everything and uploads local settings", () => {
    let local = device("aaaa");
    local = { ...local, settings: { ...DEFAULT_SETTINGS, theme: "light" }, settingsUpdatedAt: 77 };
    local = record(record(local, 10), 20);
    const r = mergeWithCloud(local, EMPTY_CLOUD, { uid: "u1", now: 1 });
    expect(r.push.attempts.map((a) => a.id)).toEqual(local.attempts.map((a) => a.id));
    expect(r.push.contribs.map((c) => c.id)).toEqual([local.sync.ownId]);
    expect(r.push.profile).toEqual({ settings: local.settings, settingsUpdatedAt: 77 });
    expect(r.data.totals).toEqual(local.totals);
    expect(pendingWrite(r.data)).toEqual(r.push);
  });

  it("(c) first link with cloud data: union deduped by id, cloud settings win, nothing is lost", () => {
    const acct = new Account();
    let other = device("bbbb");
    other = { ...other, settings: { ...DEFAULT_SETTINGS, theme: "dusk" }, settingsUpdatedAt: 50 };
    other = record(record(other, 5), 15);
    other = acct.sync(other);

    let local = device("aaaa");
    local = { ...local, settings: { ...DEFAULT_SETTINGS, theme: "light" }, settingsUpdatedAt: 90 };
    local = record(record(record(local, 10), 20), 30);
    const merged = acct.sync(local);

    expect(merged.settings.theme).toBe("dusk");
    expect(merged.settingsUpdatedAt).toBe(50);
    expect(merged.attempts).toHaveLength(5);
    expect(new Set(merged.attempts.map((a) => a.id)).size).toBe(5);
    expect(merged.attempts.map((a) => a.at)).toEqual([5, 10, 15, 20, 30]);
    expect(merged.totals.attempts).toBe(5);
    expect(merged.keys.a.attempts).toBe(5);
    expect(pendingCount(merged)).toBe(0);
    // The other device converges to the same data after its next sync.
    const otherAfter = acct.sync(other);
    expect(otherAfter.totals).toEqual(merged.totals);
    expect(otherAfter.keys).toEqual(merged.keys);
    expect(otherAfter.attempts).toEqual(merged.attempts);
  });

  it("(d) applying the merge twice equals once and totals never grow", () => {
    const acct = new Account();
    let other = acct.sync(record(device("bbbb"), 5));
    other = record(other, 6);
    acct.sync(other);
    let local = record(record(device("aaaa"), 10), 20);
    local = { ...local, settingsUpdatedAt: 10 };
    const snap = acct.snapshot();
    const once = mergeWithCloud(local, snap, { uid: "u1", now: 1 });
    const twice = mergeWithCloud(once.data, snap, { uid: "u1", now: 2 });
    expect(twice.data).toEqual(once.data);
    expect(twice.push).toEqual(once.push);
    let d = once.data;
    for (let i = 0; i < 5; i++) {
      d = mergeWithCloud(d, snap, { uid: "u1", now: 3 + i }).data;
      expect(d.totals.attempts).toBe(4);
    }
  });
});

describe("contribution and attempt merge laws", () => {
  function randomContrib(rng: Rng, id: string): Contribution {
    const keys: Record<
      string,
      { attempts: number; errors: number; totalMs: number; timedHits: number }
    > = {};
    if (rng() < 0.7)
      keys.a = {
        attempts: int(rng, 0, 5),
        errors: int(rng, 0, 2),
        totalMs: int(rng, 0, 99),
        timedHits: 1,
      };
    return {
      ...emptyAggregates(),
      keys,
      totals: { attempts: int(rng, 0, 4), timeMs: int(rng, 0, 9), chars: int(rng, 0, 9) },
      id,
      rev: int(rng, 0, 3),
      updatedAt: int(rng, 0, 3),
    };
  }
  function randomList(rng: Rng): Contribution[] {
    const out: Contribution[] = [];
    const n = int(rng, 0, 5);
    for (let i = 0; i < n; i++)
      out.push(randomContrib(rng, pick(rng, ["id000001", "id000002", "id000003"])));
    return out;
  }
  const asMap = (l: Contribution[]) => mergeContribs({}, l);

  it("(e) mergeContribs is commutative, associative and idempotent", () => {
    const rng = createRng(1234);
    for (let i = 0; i < 300; i++) {
      const a = asMap(randomList(rng));
      const b = randomList(rng);
      const c = randomList(rng);
      expect(mergeContribs(a, b)).toEqual(mergeContribs(asMap(b), Object.values(a)));
      expect(mergeContribs(mergeContribs(a, b), c)).toEqual(
        mergeContribs(a, Object.values(mergeContribs(asMap(b), c))),
      );
      expect(mergeContribs(a, Object.values(a))).toEqual(a);
    }
  });

  it("(h) the higher rev wins in both directions", () => {
    const older = { ...randomContrib(createRng(1), "id000001"), rev: 2 };
    const newer = { ...older, rev: 5, totals: { attempts: 5, timeMs: 1, chars: 1 } };
    expect(mergeContribs({ [older.id]: older }, [newer])[older.id].rev).toBe(5);
    expect(mergeContribs({ [newer.id]: newer }, [older])[older.id].rev).toBe(5);
  });

  it("(h) a newer own contribution in the cloud (another tab) beats a stale local copy", () => {
    const local = record(device("aaaa"), 10);
    const ownId = local.sync.ownId;
    const ahead = record(record(local, 20), 30);
    const snap: CloudSnapshot = {
      profile: null,
      contribs: [ahead.sync.contribs[ownId]],
      attempts: ahead.attempts,
    };
    const r = mergeWithCloud(local, snap, { uid: "u1", now: 1 });
    expect(r.data.sync.contribs[ownId].rev).toBe(3);
    expect(r.data.totals.attempts).toBe(3);
    expect(r.push.contribs).toEqual([]);
    // And newer locally wins over an older cloud copy, which is then pushed.
    const behind: CloudSnapshot = {
      profile: null,
      contribs: [local.sync.contribs[ownId]],
      attempts: [],
    };
    const r2 = mergeWithCloud(ahead, behind, { uid: "u1", now: 1 });
    expect(r2.data.sync.contribs[ownId].rev).toBe(3);
    expect(r2.push.contribs.map((c) => c.rev)).toEqual([3]);
  });

  it("(i) the attempt cap keeps the newest with deterministic tie order", () => {
    const mk = (id: string, at: number): Attempt => ({
      id,
      at,
      source: "s",
      lang: "de",
      netWpm: 0,
      rawWpm: 0,
      accuracy: 0,
      consistency: 0,
      errors: 0,
      durationMs: 0,
      chars: 0,
      passed: false,
    });
    const a = [mk("a", 1), mk("b", 5), mk("c", 5)];
    const b = [mk("d", 5), mk("e", 9), mk("a", 1)];
    expect(mergeAttempts(a, b, 3).map((x) => x.id)).toEqual(["c", "d", "e"]);
    expect(mergeAttempts(b, a, 3).map((x) => x.id)).toEqual(["c", "d", "e"]);
    expect(mergeAttempts(a, b).map((x) => x.id)).toEqual(["a", "b", "c", "d", "e"]);
    const many = Array.from({ length: MAX_ATTEMPTS + 30 }, (_, i) => mk(`x${i}`, i));
    const capped = mergeAttempts(many, []);
    expect(capped).toHaveLength(MAX_ATTEMPTS);
    expect(capped[0].at).toBe(30);
  });
});

describe("lessons across devices", () => {
  it("(f) best is the max, completed is OR, last is the latest", () => {
    const acct = new Account();
    // Device A: completes the lesson early with a good run.
    let a = record(device("aaaa"), 100, "home-01", true);
    a = acct.sync(a);
    // Device B: later, a failed run.
    let b = record(device("bbbb"), 200, "home-01", false);
    b = acct.sync(b);
    const l = b.lessons["home-01"];
    expect(l.completed).toBe(true);
    expect(l.attempts).toBe(2);
    expect(l.lastAt).toBe(200);
    expect(l.lastAccuracy).toBe(BAD.accuracy);
    expect(l.bestAccuracy).toBe(Math.max(GOOD.accuracy, BAD.accuracy));
    expect(l.bestWpm).toBe(GOOD.netWpm);
    a = acct.sync(a);
    expect(a.lessons).toEqual(b.lessons);
  });
});

describe("legacy data", () => {
  const v1 = {
    version: 1,
    keys: { a: { attempts: 9, errors: 1, totalMs: 100, timedHits: 8 } },
    totals: { attempts: 9, timeMs: 1000, chars: 90 },
    days: { "2026-01-01": { attempts: 9, wpmSum: 270, accuracySum: 900, timeMs: 1000 } },
  };
  it("(g) the same legacy data arriving from two devices is counted once", () => {
    const acct = new Account();
    const a = acct.sync(migrate(v1, env("aaaa")));
    const b = acct.sync(migrate(JSON.parse(JSON.stringify(v1)), env("bbbb")));
    expect(a.totals.attempts).toBe(9);
    expect(b.totals.attempts).toBe(9);
    expect(b.keys.a.attempts).toBe(9);
    expect(acct.contribs.size).toBe(1);
    expect(Object.keys(b.sync.contribs).filter((i) => i.startsWith("legacy-"))).toHaveLength(1);
  });
  it("legacy data is pushed (it is worth a document) while a fresh own contribution is not", () => {
    const r = mergeWithCloud(migrate(v1, env("aaaa")), EMPTY_CLOUD, { uid: "u1", now: 1 });
    expect(r.push.contribs).toHaveLength(1);
    expect(r.push.contribs[0].id.startsWith("legacy-")).toBe(true);
  });
});

describe("settings", () => {
  const cloudWith = (theme: "dusk" | "ember", at: number): CloudSnapshot => ({
    profile: { settings: { ...DEFAULT_SETTINGS, theme }, settingsUpdatedAt: at },
    contribs: [],
    attempts: [],
  });
  const linked = (at: number): StoredData => {
    const d = device("aaaa");
    return {
      ...d,
      settings: { ...DEFAULT_SETTINGS, theme: "light" },
      settingsUpdatedAt: at,
      sync: { ...d.sync, linkedUid: "u1", pushedSettingsAt: at },
    };
  };
  it("(j) same account: the newer side wins in both directions", () => {
    const localNewer = mergeWithCloud(linked(100), cloudWith("dusk", 50), { uid: "u1", now: 1 });
    expect(localNewer.data.settings.theme).toBe("light");
    expect(localNewer.push.profile?.settingsUpdatedAt).toBe(100);
    const cloudNewer = mergeWithCloud(linked(100), cloudWith("dusk", 150), { uid: "u1", now: 1 });
    expect(cloudNewer.data.settings.theme).toBe("dusk");
    expect(cloudNewer.data.settingsUpdatedAt).toBe(150);
    expect(cloudNewer.push.profile).toBeNull();
    const equal = mergeWithCloud(linked(100), cloudWith("dusk", 100), { uid: "u1", now: 1 });
    expect(equal.data.settings.theme).toBe("light");
    expect(equal.push.profile).toBeNull();
  });
  it("first link and other account: cloud wins when it has a profile, else local is uploaded", () => {
    const first = mergeWithCloud(device("aaaa"), cloudWith("ember", 5), { uid: "u1", now: 1 });
    expect(first.data.settings.theme).toBe("ember");
    expect(first.push.profile).toBeNull();
    const foreign = mergeWithCloud(linked(100), cloudWith("ember", 5), { uid: "u2", now: 1 });
    expect(foreign.data.settings.theme).toBe("ember");
    expect(foreign.data.sync.linkedUid).toBe("u2");
    const none = mergeWithCloud(linked(100), EMPTY_CLOUD, { uid: "u2", now: 1 });
    expect(none.data.settings.theme).toBe("light");
    expect(none.push.profile?.settingsUpdatedAt).toBe(100);
  });
  it("linkKind", () => {
    expect(linkKind(device("aaaa"), "u1")).toBe("first-link");
    expect(linkKind(linked(1), "u1")).toBe("same-account");
    expect(linkKind(linked(1), "u2")).toBe("other-account");
  });
});

describe("(k) other account", () => {
  it("keeps all local and cloud data and re-pushes local data to the new account", () => {
    const acct1 = new Account();
    let dev = record(record(device("aaaa"), 10), 20);
    dev = acct1.sync(dev, "u1");
    const acct2 = new Account();
    let other = acct2.sync(record(device("bbbb"), 15), "u2");
    expect(other.sync.linkedUid).toBe("u2");
    expect(linkKind(dev, "u2")).toBe("other-account");
    expect(hasProgress(dev)).toBe(true);
    dev = acct2.sync(dev, "u2");
    expect(dev.totals.attempts).toBe(3);
    expect(dev.attempts.map((a) => a.at)).toEqual([10, 15, 20]);
    expect(pendingCount(dev)).toBe(0);
    expect(acct2.attempts.size).toBe(3);
    // Account 1 is untouched.
    expect(acct1.attempts.size).toBe(2);
    other = acct2.sync(other, "u2");
    expect(other.totals.attempts).toBe(3);
  });
});

describe("(l) property: many devices, random order", () => {
  it("views always equal combine(contribs) and nothing is double counted or lost", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rng = createRng(seed * 7919);
      const acct = new Account();
      const devs = [device("aaaa"), device("bbbb"), device("cccc")].map((d, i) => ({
        d,
        legacy: i === 0,
      }));
      devs[0].d = migrate(
        {
          version: 1,
          totals: { attempts: 3, timeMs: 3, chars: 3 },
          keys: { a: { attempts: 3, errors: 0, totalMs: 3, timedHits: 3 } },
        },
        env("aaaa"),
      );
      let recorded = 3;
      let at = 100;
      for (let step = 0; step < 40; step++) {
        const i = int(rng, 0, devs.length - 1);
        if (rng() < 0.6) {
          devs[i].d = record(
            devs[i].d,
            ++at,
            pick(rng, ["home-01", "home-02", "test:time-30"]),
            rng() < 0.7,
          );
          recorded++;
        } else {
          devs[i].d = acct.sync(devs[i].d);
        }
        const d = devs[i].d;
        const v = combine(d.sync.contribs);
        expect(d.totals).toEqual(v.totals);
        expect(d.keys).toEqual(v.keys);
        expect(d.lessons).toEqual(v.lessons);
        expect(d.days).toEqual(v.days);
      }
      for (let pass = 0; pass < 2; pass++) for (const x of devs) x.d = acct.sync(x.d);
      for (const x of devs) {
        expect(x.d.totals.attempts).toBe(recorded);
        expect(x.d.keys.a.attempts).toBe(devs[0].d.keys.a.attempts);
        expect(x.d.attempts.length).toBe(Math.min(MAX_ATTEMPTS, recorded - 3));
        expect(pendingCount(x.d)).toBe(0);
        expect(dataOnly(x.d).totals).toEqual(dataOnly(devs[0].d).totals);
        expect(x.d.lessons).toEqual(devs[0].d.lessons);
      }
    }
  });
});

describe("(m) pending work and markPushed", () => {
  it("a change recorded between push start and confirm stays pending", () => {
    let d = mergeWithCloud(record(device("aaaa"), 10), EMPTY_CLOUD, { uid: "u1", now: 1 }).data;
    d = markPushed(d, pendingWrite(d));
    expect(pendingCount(d)).toBe(0);

    d = record(d, 20);
    const inFlight = pendingWrite(d);
    expect(inFlight.attempts).toHaveLength(1);
    expect(inFlight.contribs).toHaveLength(1);
    d = record(d, 30); // typed while the push was running
    d = markPushed(d, inFlight);
    const rest = pendingWrite(d);
    expect(rest.attempts.map((a) => a.at)).toEqual([30]);
    expect(rest.contribs.map((c) => c.rev)).toEqual([3]);
    expect(pendingCount(d)).toBe(1);
    d = markPushed(d, rest);
    expect(pendingCount(d)).toBe(0);
  });
  it("settings changes are pending until pushed, and only the written stamp is recorded", () => {
    let d = mergeWithCloud(device("aaaa"), EMPTY_CLOUD, { uid: "u1", now: 1 }).data;
    d = markPushed(d, pendingWrite(d));
    expect(pendingWrite(d).profile).toBeNull();
    d = { ...d, settingsUpdatedAt: 10 };
    const w = pendingWrite(d);
    expect(w.profile?.settingsUpdatedAt).toBe(10);
    d = { ...d, settingsUpdatedAt: 11 };
    d = markPushed(d, w);
    expect(d.sync.pushedSettingsAt).toBe(10);
    expect(pendingWrite(d).profile?.settingsUpdatedAt).toBe(11);
  });
  it("unlink makes everything pending again", () => {
    let d = mergeWithCloud(record(record(device("aaaa"), 10), 20), EMPTY_CLOUD, {
      uid: "u1",
      now: 1,
    }).data;
    d = markPushed(d, pendingWrite(d));
    expect(pendingCount(d)).toBe(0);
    const u = unlink(d);
    expect(u.sync.linkedUid).toBeNull();
    expect(u.sync.pushedRevs).toEqual({});
    expect(u.sync.pushedSettingsAt).toBe(-1);
    expect(u.sync.unsyncedAttemptIds).toEqual(u.attempts.map((a) => a.id));
    expect(pendingWrite(u).contribs).toHaveLength(1);
    expect(u.totals).toEqual(d.totals);
  });
});
