import { describe, expect, it } from "vitest";
import { LESSONS } from "@/features/lessons/curriculum";
import {
  completedPerPhase,
  dailySeries,
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
});
