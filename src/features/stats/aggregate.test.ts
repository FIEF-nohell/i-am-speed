import { describe, expect, it } from "vitest";
import type { Attempt } from "@/features/storage/schema";
import { LESSONS } from "@/features/lessons/curriculum";
import {
  activitySeries,
  activitySummary,
  weekdayAverages,
  completedPerPhase,
  dailySeries,
  filterDays,
  formatRelative,
  recentAttempts,
  weakestFinger,
  fingerAccuracies,
  formatDuration,
  keyLatency,
  weakestKeys,
} from "./aggregate";

describe("stats aggregation", () => {
  it("ranks weakest keys by error rate and ignores thin data", () => {
    const w = weakestKeys(
      {
        a: { attempts: 100, errors: 2, totalMs: 0, timedHits: 0 },
        b: { attempts: 20, errors: 10, totalMs: 0, timedHits: 0 },
        c: { attempts: 3, errors: 3, totalMs: 0, timedHits: 0 },
        " ": { attempts: 50, errors: 40, totalMs: 0, timedHits: 0 },
      },
      5,
    );
    expect(w.map((x) => x.key)).toEqual(["b", "a"]);
  });
  it("computes finger accuracy and null for untouched fingers", () => {
    const f = fingerAccuracies({ leftPinky: { attempts: 10, errors: 1 } });
    expect(f.find((x) => x.finger === "leftPinky")?.accuracy).toBeCloseTo(90, 5);
    expect(f.find((x) => x.finger === "rightRing")?.accuracy).toBeNull();
  });
  it("builds a sorted daily series of averages", () => {
    const s = dailySeries({
      "2026-10-02": { attempts: 2, wpmSum: 60, accuracySum: 190, timeMs: 120000 },
      "2026-10-01": { attempts: 1, wpmSum: 20, accuracySum: 90, timeMs: 60000 },
    });
    expect(s.map((p) => p.date)).toEqual(["2026-10-01", "2026-10-02"]);
    expect(s[1].wpm).toBe(30);
    expect(s[1].accuracy).toBe(95);
  });
  it("counts completed lessons per phase", () => {
    const p = completedPerPhase(
      LESSONS,
      {
        "home-01": {
          completed: true,
          bestWpm: 1,
          bestAccuracy: 100,
          lastWpm: 1,
          lastAccuracy: 100,
          attempts: 1,
          lastAt: 1,
        },
      },
      [1, 2],
    );
    expect(p[0]).toMatchObject({ phase: 1, completed: 1 });
    expect(p[1].completed).toBe(0);
  });
  it("latency needs enough hits; durations format", () => {
    expect(keyLatency({ attempts: 5, errors: 0, totalMs: 900, timedHits: 3 })).toBe(300);
    expect(keyLatency({ attempts: 5, errors: 0, totalMs: 900, timedHits: 1 })).toBeNull();
    expect(formatDuration(65000)).toBe("1m 5s");
    expect(formatDuration(3_900_000)).toBe("1h 5m");
  });

  describe("ranges and recent attempts", () => {
    const point = (date: string) => ({ date, wpm: 30, accuracy: 95, attempts: 1, minutes: 1 });
    const series = ["2026-08-01", "2026-09-20", "2026-10-04", "2026-10-05", "2026-10-11"].map(
      point,
    );

    it("keeps only days inside the window, today included", () => {
      expect(filterDays(series, "7d", "2026-10-11").map((d) => d.date)).toEqual([
        "2026-10-05",
        "2026-10-11",
      ]);
      expect(filterDays(series, "30d", "2026-10-11").map((d) => d.date)).toEqual([
        "2026-09-20",
        "2026-10-04",
        "2026-10-05",
        "2026-10-11",
      ]);
      expect(filterDays(series, "all", "2026-10-11")).toHaveLength(5);
    });
    it("handles a window that crosses a month boundary", () => {
      const s = ["2026-09-30", "2026-10-01"].map(point);
      expect(filterDays(s, "7d", "2026-10-03")).toHaveLength(2);
    });
    it("returns the newest attempts first", () => {
      const at = (n: number) => ({ id: `${n}`, at: n }) as Attempt;
      const out = recentAttempts([at(1), at(2), at(3), at(4)], 3);
      expect(out.map((a) => a.at)).toEqual([4, 3, 2]);
      expect(recentAttempts([], 10)).toEqual([]);
    });
    it("formats relative times", () => {
      const now = new Date(2026, 9, 11, 15, 0, 0).getTime();
      const ago = (ms: number) => now - ms;
      expect(formatRelative(ago(20_000), now)).toBe("just now");
      expect(formatRelative(ago(5 * 60_000), now)).toBe("5 min ago");
      expect(formatRelative(ago(2 * 3_600_000), now)).toBe("2 h ago");
      expect(formatRelative(new Date(2026, 9, 10, 23, 0).getTime(), now)).toBe("yesterday");
      expect(formatRelative(new Date(2026, 9, 8, 9, 0).getTime(), now)).toBe("3 days ago");
      expect(formatRelative(new Date(2026, 8, 3, 9, 0).getTime(), now)).toBe("3 sep");
    });
    it("names the weakest finger only with enough data", () => {
      const acc = fingerAccuracies({
        leftPinky: { attempts: 100, errors: 20 },
        rightIndex: { attempts: 100, errors: 2 },
        leftRing: { attempts: 5, errors: 5 },
      });
      expect(weakestFinger(acc)?.finger).toBe("leftPinky");
      expect(
        weakestFinger(fingerAccuracies({ leftPinky: { attempts: 100, errors: 20 } })),
      ).toBeNull();
    });
  });
});

describe("activity stats", () => {
  const day = (timeMin: number, chars?: number) => ({
    attempts: 1,
    wpmSum: 30,
    accuracySum: 95,
    timeMs: timeMin * 60000,
    ...(chars === undefined ? {} : { chars }),
  });

  it("fills quiet days with zeros and keeps legacy days without chars as null", () => {
    const s = activitySeries(
      { "2026-10-09": day(5, 300), "2026-10-11": day(2) },
      [],
      "7d",
      "2026-10-11",
    );
    expect(s.map((d) => d.date)).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
    expect(s[4]).toMatchObject({ minutes: 5, chars: 300 });
    expect(s[5]).toMatchObject({ minutes: 0, chars: 0 });
    expect(s[6]).toMatchObject({ minutes: 2, chars: null });
  });
  it("counts zen-only days and returns nothing without activity", () => {
    const zen = { attempts: 0, wpmSum: 0, accuracySum: 0, timeMs: 60000, chars: 40 };
    expect(activitySeries({ "2026-10-11": zen }, [], "7d", "2026-10-11")[6].chars).toBe(40);
    expect(activitySeries({}, [], "30d", "2026-10-11")).toEqual([]);
  });
  it("computes streaks, which survive a not-yet-practised today", () => {
    const days = {
      "2026-10-01": day(1),
      "2026-10-02": day(1),
      "2026-10-03": day(1),
      "2026-10-09": day(4),
      "2026-10-10": day(2),
    };
    const a = activitySummary(days, "2026-10-11");
    expect(a.streak).toBe(2);
    expect(a.longestStreak).toBe(3);
    expect(a.todayMs).toBe(0);
    expect(a.activeDays).toBe(5);
    expect(a.bestDay).toEqual({ date: "2026-10-09", ms: 240000 });
    expect(activitySummary(days, "2026-10-13").streak).toBe(0);
  });
  it("averages practice per weekday, Monday first", () => {
    // 2026-10-05 and 2026-10-12 are Mondays.
    const w = weekdayAverages({ "2026-10-05": day(10), "2026-10-12": day(20) });
    expect(w[0]).toEqual({ day: "mon", minutes: 15 });
    expect(w[1].minutes).toBe(0);
  });
});
