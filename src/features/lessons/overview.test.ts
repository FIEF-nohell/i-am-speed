import { describe, expect, it } from "vitest";
import type { Attempt, LessonProgress } from "@/features/storage/schema";
import { LESSONS } from "./curriculum";
import { nextUp, overviewOf, recentSpeeds, sparkPoints } from "./overview";

const done = (bestWpm = 40): LessonProgress => ({
  completed: true,
  bestWpm,
  bestAccuracy: 98,
  lastWpm: bestWpm,
  lastAccuracy: 98,
  attempts: 1,
  lastAt: 1,
});

const attempt = (source: string, netWpm: number): Attempt => ({
  id: `${source}${netWpm}`,
  at: 1,
  source,
  lang: "en",
  netWpm,
  rawWpm: netWpm,
  accuracy: 97,
  consistency: 90,
  errors: 1,
  durationMs: 30000,
  chars: 100,
  passed: true,
});

describe("nextUp", () => {
  it("is the first lesson when nothing is passed and skips passed ones in order", () => {
    expect(nextUp({})?.id).toBe(LESSONS[0].id);
    expect(nextUp({ [LESSONS[0].id]: done() })?.id).toBe(LESSONS[1].id);
  });
  it("is null when every lesson is passed", () => {
    expect(nextUp(Object.fromEntries(LESSONS.map((l) => [l.id, done()])))).toBeNull();
  });
});

describe("overviewOf", () => {
  it("is empty before the first attempt", () => {
    const o = overviewOf({}, [], {});
    expect(o).toEqual({ avgWpm: null, bestWpm: null, avgAccuracy: null, passed: 0 });
  });
  it("averages over days and takes the best from attempts and lessons", () => {
    const days = {
      "2026-10-01": { attempts: 2, wpmSum: 80, accuracySum: 190, timeMs: 1000 },
      "2026-10-02": { attempts: 2, wpmSum: 120, accuracySum: 196, timeMs: 1000 },
    };
    const o = overviewOf(days, [attempt("home-01", 55)], { "home-01": done(61) });
    expect(o.avgWpm).toBe(50);
    expect(o.avgAccuracy).toBe(96.5);
    expect(o.bestWpm).toBe(61);
    expect(o.passed).toBe(1);
  });
});

describe("sparkline", () => {
  it("takes the newest scored attempts, oldest first, without zen", () => {
    const list = [attempt("home-01", 30), attempt("zen", 99), attempt("home-02", 40)];
    expect(recentSpeeds(list, 5)).toEqual([30, 40]);
    expect(recentSpeeds(list, 1)).toEqual([40]);
  });
  it("maps the lowest value to the bottom and handles flat and single series", () => {
    const pts = sparkPoints([10, 20], 100, 20, 0).split(" ");
    expect(pts[0]).toBe("0.0,20.0");
    expect(pts[1]).toBe("100.0,0.0");
    expect(sparkPoints([5, 5, 5], 100, 20, 0)).toBe("0.0,10.0 50.0,10.0 100.0,10.0");
    expect(sparkPoints([5], 100, 20)).toBe("50.0,10.0");
    expect(sparkPoints([], 100, 20)).toBe("");
  });
});
