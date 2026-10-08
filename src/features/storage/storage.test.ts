import { describe, expect, it } from "vitest";
import { createState, reduce } from "@/features/engine/engine";
import { computeMetrics } from "@/features/engine/metrics";
import { DEFAULT_ENGINE_CONFIG } from "@/features/engine/types";
import { DEFAULT_SETTINGS } from "@/features/settings/settings";
import { migrate, parseStored } from "./migrate";
import { dayKey, recordAttempt } from "./record";
import { MAX_ATTEMPTS, SCHEMA_VERSION, createEmptyData } from "./schema";

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
    expect(parseStored(null)).toEqual({ data: createEmptyData(), recovered: false });
    expect(parseStored("{not json")).toEqual({ data: createEmptyData(), recovered: true });
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
    expect(d.settings.onError).toBe("block");
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
});

describe("recordAttempt", () => {
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
