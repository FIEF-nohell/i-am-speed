import { describe, expect, it } from "vitest";
import { createState, reduce } from "@/features/engine/engine";
import { FreeTypeSession } from "@/features/engine/freeType";
import { computeMetrics } from "@/features/engine/metrics";
import { DEFAULT_ENGINE_CONFIG } from "@/features/engine/types";
import { DEFAULT_SETTINGS } from "@/features/settings/settings";
import { migrate, parseStored } from "./migrate";
import { dayKey, recordAttempt } from "./record";
import { combine } from "@/features/sync/combine";
import { attemptToDoc, contribToDoc, docToAttempt, docToContrib } from "@/features/sync/serialize";
import { legacyContribId } from "@/features/sync/hash";
import {
  MAX_ATTEMPTS,
  SCHEMA_VERSION,
  createEmptyData,
  type DataEnv,
  type StoredData,
} from "./schema";

/** Deterministic env: ids "own-000001", "own-000002", ... and a fixed clock. */
function testEnv(now = 1_700_000_000_000): DataEnv {
  let n = 0;
  return { newId: () => `own-${String(++n).padStart(6, "0")}`, now };
}

function metricsFor(target: string, typed: string) {
  let s = createState(target, DEFAULT_ENGINE_CONFIG);
  let t = 0;
  for (const ch of typed) {
    t += 120;
    s = reduce(s, { kind: "char", char: ch, t, modifier: "none" });
  }
  return computeMetrics(s);
}

describe("migrate and recovery", () => {
  it("returns defaults for null, garbage and wrong types", () => {
    expect(parseStored(null, testEnv())).toEqual({
      data: createEmptyData(testEnv()),
      recovered: false,
    });
    expect(parseStored("{not json", testEnv())).toEqual({
      data: createEmptyData(testEnv()),
      recovered: true,
    });
    expect(migrate(42).settings).toEqual(DEFAULT_SETTINGS);
    expect(migrate([]).attempts).toEqual([]);
  });
  it("upgrades unversioned data and keeps valid fields", () => {
    const d = migrate({ settings: { theme: "light", lang: "en" }, totals: { attempts: 3 } });
    expect(d.version).toBe(SCHEMA_VERSION);
    expect(d.settings.theme).toBe("light");
    expect(d.settings.lang).toBe("en");
    expect(d.totals.attempts).toBe(3);
  });
  it("migrates stored settings without the sound fields to their defaults", () => {
    const d = migrate({ settings: { theme: "light", sound: true } });
    expect(d.settings.sound).toBe(true);
    expect(d.settings.soundPack).toBe(DEFAULT_SETTINGS.soundPack);
    expect(d.settings.soundVolume).toBe(DEFAULT_SETTINGS.soundVolume);
    expect(d.settings.soundErrors).toBe(DEFAULT_SETTINGS.soundErrors);
  });
  it("repairs invalid settings and drops bad rows", () => {
    const d = migrate({
      settings: {
        theme: "neon",
        restartAfter: 99,
        onError: "nope",
        testMode: { kind: "time", value: 7 },
      },
      attempts: [{ nope: true }, null, 5],
      lessons: { "home-01": "bad", "home-02": { completed: true, bestWpm: 20 } },
      keys: { a: { attempts: "x" } },
    });
    expect(d.settings.theme).toBe("dark");
    expect(d.settings.restartAfter).toBe(10);
    expect(d.settings.onError).toBe("continue");
    expect(d.settings.testMode).toEqual({ kind: "time", value: 30 });
    expect(d.attempts).toEqual([]);
    expect(Object.keys(d.lessons)).toEqual(["home-02"]);
    expect(d.keys.a.attempts).toBe(0);
  });
  it("round-trips through JSON", () => {
    const d = recordAttempt(createEmptyData(), {
      source: "home-01",
      lang: "de",
      text: "ab",
      metrics: metricsFor("ab", "ab"),
      at: 1_700_000_000_000,
    });
    expect(migrate(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
  it("is deterministic with an injected env", () => {
    const raw = {
      settings: { theme: "light" },
      totals: { attempts: 2 },
      keys: { a: { attempts: 2 } },
    };
    expect(migrate(raw, testEnv())).toEqual(migrate(raw, testEnv()));
    expect(createEmptyData(testEnv()).sync.ownId).toBe("own-000001");
  });
});

describe("v1 to v2 migration", () => {
  const v1 = {
    version: 1,
    settings: { theme: "light" },
    attempts: [
      {
        id: "100-0",
        at: 100,
        source: "home-01",
        lang: "de",
        netWpm: 30,
        accuracy: 97,
        passed: true,
      },
      { id: "200-1", at: 200, source: "test:time-30", lang: "en", netWpm: 40, accuracy: 90 },
    ],
    lessons: {
      "home-01": {
        completed: true,
        bestWpm: 30,
        bestAccuracy: 97,
        lastWpm: 30,
        lastAccuracy: 97,
        attempts: 1,
        lastAt: 100,
      },
    },
    keys: { a: { attempts: 5, errors: 1, totalMs: 900, timedHits: 4 } },
    fingers: { leftPinky: { attempts: 5, errors: 1 } },
    days: { "2026-10-01": { attempts: 2, wpmSum: 70, accuracySum: 187, timeMs: 5000 } },
    totals: { attempts: 2, timeMs: 5000, chars: 80 },
    lastResult: null,
  };
  it("keeps every stats view deep-equal", () => {
    const d = migrate(v1, testEnv());
    expect(d.version).toBe(2);
    expect(d.keys).toEqual(v1.keys);
    expect(d.fingers).toEqual(v1.fingers);
    expect(d.days).toEqual(v1.days);
    expect(d.lessons).toEqual(v1.lessons);
    expect(d.totals).toEqual(v1.totals);
    expect(d.attempts).toHaveLength(2);
  });
  it("creates a frozen legacy contribution and a fresh empty own one", () => {
    const d = migrate(v1, testEnv());
    const ids = Object.keys(d.sync.contribs);
    expect(ids).toHaveLength(2);
    const legacy = ids.find((i) => i.startsWith("legacy-"));
    expect(legacy).toBeDefined();
    expect(d.sync.contribs[legacy as string].rev).toBe(0);
    expect(d.sync.contribs[d.sync.ownId].totals.attempts).toBe(0);
    expect(d.sync.ownId).toBe("own-000001");
    expect(d.settingsUpdatedAt).toBe(0);
    expect(d.sync.linkedUid).toBeNull();
    expect(d.sync.pushedSettingsAt).toBe(-1);
    expect(d.sync.unsyncedAttemptIds).toEqual(d.attempts.map((a) => a.id));
  });
  it("gives the same legacy id on every device for the same data", () => {
    const a = migrate(v1, testEnv());
    const b = migrate(JSON.parse(JSON.stringify(v1)), { ...testEnv(), now: 5 });
    const la = Object.keys(a.sync.contribs).find((i) => i.startsWith("legacy-"));
    const lb = Object.keys(b.sync.contribs).find((i) => i.startsWith("legacy-"));
    expect(la).toBe(lb);
    expect(a.sync.contribs[la as string]).toEqual(b.sync.contribs[lb as string]);
    expect(la).toBe(legacyContribId(combine(a.sync.contribs)));
  });
  it("creates no legacy contribution for empty v1 data and keeps working afterwards", () => {
    const d = migrate({ version: 1 }, testEnv());
    expect(Object.keys(d.sync.contribs)).toEqual([d.sync.ownId]);
    const next = recordAttempt(migrate(v1, testEnv()), {
      source: "home-01",
      lang: "de",
      text: "ab",
      metrics: metricsFor("ab", "ab"),
      at: 300,
    });
    expect(next.totals.attempts).toBe(3);
    expect(next.lessons["home-01"].attempts).toBe(2);
  });
});

describe("v2 sanitising", () => {
  it("repairs bad sync metadata and recomputes views from contributions", () => {
    const base = recordAttempt(createEmptyData(testEnv()), {
      source: "home-01",
      lang: "de",
      text: "ab",
      metrics: metricsFor("ab", "ab"),
      at: 10,
    });
    const broken = JSON.parse(JSON.stringify(base));
    broken.totals = { attempts: 999, timeMs: 0, chars: 0 };
    broken.keys = {};
    broken.sync.unsyncedAttemptIds = [broken.attempts[0].id, "ghost", 5];
    broken.sync.pushedRevs = { good_id_01: 3, "bad id": 2, other_id_1: "x" };
    broken.sync.contribs["bad id"] = { rev: 1 };
    broken.sync.contribs.notanobject1 = 7;
    broken.sync.linkedUid = 12;
    const d = migrate(broken, testEnv());
    expect(d.totals.attempts).toBe(1);
    expect(d.keys.a.attempts).toBe(1);
    expect(d.sync.unsyncedAttemptIds).toEqual([base.attempts[0].id]);
    expect(d.sync.pushedRevs).toEqual({ good_id_01: 3 });
    expect(Object.keys(d.sync.contribs)).toEqual([base.sync.ownId]);
    expect(d.sync.linkedUid).toBeNull();
  });
  it("repairs a missing own contribution and a bad own id", () => {
    const base = createEmptyData(testEnv());
    const a = JSON.parse(JSON.stringify(base));
    a.sync.contribs = {};
    const fixed = migrate(a, testEnv());
    expect(fixed.sync.contribs[fixed.sync.ownId]).toBeDefined();
    const b = JSON.parse(JSON.stringify(base));
    b.sync.ownId = "legacy-0123456789abcdef";
    const fixedB = migrate(b, testEnv());
    expect(fixedB.sync.ownId.startsWith("legacy-")).toBe(false);
    expect(fixedB.sync.contribs[fixedB.sync.ownId]).toBeDefined();
  });
});

describe("recordAttempt", () => {
  it("folds into the own contribution, bumps rev and tracks unsynced ids", () => {
    let d = createEmptyData(testEnv());
    const own = d.sync.ownId;
    d = recordAttempt(d, {
      source: "home-01",
      lang: "de",
      text: "ab",
      metrics: metricsFor("ab", "ab"),
      at: 50,
    });
    d = recordAttempt(d, {
      source: "home-01",
      lang: "de",
      text: "ab",
      metrics: metricsFor("ab", "ab"),
      at: 60,
    });
    expect(d.sync.contribs[own].rev).toBe(2);
    expect(d.sync.contribs[own].updatedAt).toBe(60);
    expect(d.attempts.map((a) => a.id)).toEqual([`${own}-1`, `${own}-2`]);
    expect(d.sync.unsyncedAttemptIds).toEqual([`${own}-1`, `${own}-2`]);
    expect(d.totals).toEqual(combine(d.sync.contribs).totals);
    expect(d.keys).toEqual(combine(d.sync.contribs).keys);
  });
  it("trims unsynced ids with the attempt cap", () => {
    let d = createEmptyData(testEnv());
    const m = metricsFor("a", "a");
    for (let i = 0; i < MAX_ATTEMPTS + 5; i++)
      d = recordAttempt(d, { source: "home-01", lang: "de", text: "a", metrics: m, at: i + 1 });
    expect(d.sync.unsyncedAttemptIds).toHaveLength(MAX_ATTEMPTS);
    expect(d.sync.contribs[d.sync.ownId].rev).toBe(MAX_ATTEMPTS + 5);
  });
  it("marks a lesson complete at 95% accuracy and tracks bests", () => {
    let d = createEmptyData();
    d = recordAttempt(d, {
      source: "home-01",
      lang: "de",
      text: "ab",
      metrics: metricsFor("abcdefghij", "abxcdefghij"),
      at: 1,
    });
    expect(d.lessons["home-01"].completed).toBe(false);
    d = recordAttempt(d, {
      source: "home-01",
      lang: "de",
      text: "ab",
      metrics: metricsFor("ab", "ab"),
      at: 2,
    });
    expect(d.lessons["home-01"].completed).toBe(true);
    expect(d.lessons["home-01"].attempts).toBe(2);
    expect(d.lessons["home-01"].bestWpm).toBeGreaterThan(0);
    expect(d.totals.attempts).toBe(2);
    expect(d.lastResult?.attempt.source).toBe("home-01");
  });
  it("does not create lesson progress for free tests", () => {
    const d = recordAttempt(createEmptyData(), {
      source: "test:time-30",
      lang: "en",
      text: "ab",
      metrics: metricsFor("ab", "ab"),
      at: 1,
    });
    expect(d.lessons).toEqual({});
    expect(d.attempts).toHaveLength(1);
  });
  describe("zen attempts", () => {
    const at = new Date(2026, 9, 11, 12).getTime();
    const zenMetrics = () => {
      let clock = 0;
      const session = new FreeTypeSession(() => clock, 5000);
      for (const ch of "hello world, wie geht's?") {
        clock += 150;
        session.press({ kind: "char", char: ch });
      }
      session.finish();
      return session.metrics();
    };
    const zen = (data: StoredData) =>
      recordAttempt(data, { source: "zen", lang: "de", text: "hello", metrics: zenMetrics(), at });
    const lesson = (data: StoredData) =>
      recordAttempt(data, {
        source: "home-01",
        lang: "de",
        text: "ab",
        metrics: metricsFor("abcdefghij", "abxcdefghij"),
        at,
      });

    it("never creates lesson progress", () => {
      const d = zen(createEmptyData(testEnv()));
      expect(d.lessons).toEqual({});
      expect(d.sync.contribs[d.sync.ownId].lessons).toEqual({});
      expect(d.attempts[0].source).toBe("zen");
      expect(d.lastResult?.attempt.source).toBe("zen");
    });

    it("increments totals, time per day and recent attempts", () => {
      const m = zenMetrics();
      const d = zen(createEmptyData(testEnv()));
      expect(d.totals).toEqual({ attempts: 1, timeMs: m.durationMs, chars: m.typedChars });
      expect(d.days["2026-10-11"].timeMs).toBe(m.durationMs);
      expect(d.attempts).toHaveLength(1);
      expect(d.attempts[0].accuracy).toBe(100);
    });

    it("leaves every accuracy-based aggregate untouched", () => {
      const before = lesson(createEmptyData(testEnv()));
      const after = zen(before);
      expect(after.keys).toEqual(before.keys);
      expect(after.fingers).toEqual(before.fingers);
      const day = before.days["2026-10-11"];
      expect(after.days["2026-10-11"].accuracySum).toBe(day.accuracySum);
      expect(after.days["2026-10-11"].attempts).toBe(day.attempts);
      expect(after.days["2026-10-11"].wpmSum).toBe(day.wpmSum);
      expect(after.lessons).toEqual(before.lessons);
      expect(after.totals.attempts).toBe(before.totals.attempts + 1);
      expect(after.lastResult?.perKey).toEqual({});
      expect(after.lastResult?.perFinger).toEqual({});
    });

    it("keeps even a hostile metrics object out of key and finger aggregates", () => {
      const m = { ...zenMetrics(), perKey: metricsFor("ab", "ax").perKey };
      const d = recordAttempt(createEmptyData(testEnv()), {
        source: "zen",
        lang: "en",
        text: "x",
        metrics: { ...m, perFinger: metricsFor("ab", "ax").perFinger },
        at,
      });
      expect(d.keys).toEqual({});
      expect(d.fingers).toEqual({});
    });

    it("survives serialisation within the deployed rule limits", () => {
      const d = zen(lesson(createEmptyData(testEnv())));
      const own = d.sync.contribs[d.sync.ownId];
      expect(docToContrib(own.id, JSON.parse(JSON.stringify(contribToDoc(own))))).toEqual(own);
      const doc = attemptToDoc(d.attempts[1]);
      expect(doc.accuracy).toBe(100);
      for (const f of ["netWpm", "rawWpm", "consistency", "errors", "durationMs", "chars"]) {
        expect(Number.isFinite(doc[f])).toBe(true);
        expect(doc[f] as number).toBeGreaterThanOrEqual(0);
      }
      expect(docToAttempt(d.attempts[1].id, JSON.parse(JSON.stringify(doc)))).toEqual(
        d.attempts[1],
      );
      for (const day of Object.values(own.days))
        for (const v of Object.values(day)) expect(v).toBeGreaterThanOrEqual(0);
      expect(docToContrib(own.id, contribToDoc(own))?.totals).toEqual(own.totals);
    });

    it("merges with another device like any other contribution", () => {
      const a = zen(createEmptyData(testEnv()));
      const b = lesson(createEmptyData({ ...testEnv(), newId: () => "other-000001" }));
      const merged = combine({ ...a.sync.contribs, ...b.sync.contribs });
      expect(merged.totals.attempts).toBe(2);
      expect(merged.lessons["home-01"].attempts).toBe(1);
      expect(merged.keys).toEqual(b.keys);
      expect(merged.days["2026-10-11"].attempts).toBe(1);
    });
  });
  it("caps history but keeps aggregates", () => {
    let d = createEmptyData();
    const m = metricsFor("a", "a");
    for (let i = 0; i < MAX_ATTEMPTS + 20; i++)
      d = recordAttempt(d, { source: "home-01", lang: "de", text: "a", metrics: m, at: i + 1 });
    expect(d.attempts).toHaveLength(MAX_ATTEMPTS);
    expect(d.totals.attempts).toBe(MAX_ATTEMPTS + 20);
    expect(d.keys.a.attempts).toBe(MAX_ATTEMPTS + 20);
    expect(Object.values(d.days).reduce((a, x) => a + x.attempts, 0)).toBe(MAX_ATTEMPTS + 20);
  });
  it("formats day keys in local time", () => {
    expect(dayKey(new Date(2026, 9, 9, 12).getTime())).toBe("2026-10-09");
  });
});
