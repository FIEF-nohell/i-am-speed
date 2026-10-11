import { describe, expect, it } from "vitest";
import type { LessonProgress } from "@/features/storage/schema";
import { addAggregates, combine, emptyAggregates, withViews } from "./combine";
import type { Aggregates, Contribution } from "./types";
import { createEmptyData } from "@/features/storage/schema";

const lesson = (o: Partial<LessonProgress> = {}): LessonProgress => ({
  completed: false,
  bestWpm: 0,
  bestAccuracy: 0,
  lastWpm: 0,
  lastAccuracy: 0,
  attempts: 1,
  lastAt: 0,
  ...o,
});

const contrib = (id: string, o: Partial<Aggregates> = {}): Contribution => ({
  id,
  rev: 1,
  updatedAt: 1,
  ...emptyAggregates(),
  ...o,
});

describe("addAggregates", () => {
  it("sums keys, fingers, days and totals", () => {
    const a: Aggregates = {
      ...emptyAggregates(),
      keys: { a: { attempts: 1, errors: 1, totalMs: 10, timedHits: 1 } },
      fingers: { thumb: { attempts: 2, errors: 0 } },
      days: { "2026-01-01": { attempts: 1, wpmSum: 30, accuracySum: 90, timeMs: 100 } },
      totals: { attempts: 1, timeMs: 100, chars: 5 },
    };
    const b: Aggregates = {
      ...emptyAggregates(),
      keys: {
        a: { attempts: 2, errors: 0, totalMs: 5, timedHits: 2 },
        b: { attempts: 1, errors: 0, totalMs: 1, timedHits: 1 },
      },
      fingers: { thumb: { attempts: 1, errors: 1 }, leftPinky: { attempts: 3, errors: 0 } },
      days: { "2026-01-01": { attempts: 2, wpmSum: 50, accuracySum: 180, timeMs: 200 } },
      totals: { attempts: 2, timeMs: 200, chars: 7 },
    };
    const s = addAggregates(a, b);
    expect(s.keys.a).toEqual({ attempts: 3, errors: 1, totalMs: 15, timedHits: 3 });
    expect(s.keys.b.attempts).toBe(1);
    expect(s.fingers.thumb).toEqual({ attempts: 3, errors: 1 });
    expect(s.fingers.leftPinky?.attempts).toBe(3);
    expect(s.days["2026-01-01"]).toEqual({
      attempts: 3,
      wpmSum: 80,
      accuracySum: 270,
      timeMs: 300,
    });
    expect(s.totals).toEqual({ attempts: 3, timeMs: 300, chars: 12 });
  });
  it("does not mutate its inputs", () => {
    const a = { ...emptyAggregates(), lessons: { x: lesson() } };
    const b = { ...emptyAggregates(), lessons: { x: lesson() } };
    const before = JSON.stringify([a, b]);
    addAggregates(a, b);
    expect(JSON.stringify([a, b])).toBe(before);
  });
});

describe("lessons", () => {
  it("ORs completed, maxes bests, sums attempts and takes last* from the latest lastAt", () => {
    const a = contrib("aaaaaaaa", {
      lessons: {
        l: lesson({
          completed: true,
          bestWpm: 40,
          bestAccuracy: 96,
          lastWpm: 40,
          lastAccuracy: 96,
          attempts: 3,
          lastAt: 100,
        }),
      },
    });
    const b = contrib("bbbbbbbb", {
      lessons: {
        l: lesson({
          completed: false,
          bestWpm: 30,
          bestAccuracy: 99,
          lastWpm: 25,
          lastAccuracy: 90,
          attempts: 2,
          lastAt: 200,
        }),
      },
    });
    const v = combine({ [a.id]: a, [b.id]: b }).lessons.l;
    expect(v).toEqual({
      completed: true,
      bestWpm: 40,
      bestAccuracy: 99,
      lastWpm: 25,
      lastAccuracy: 90,
      attempts: 5,
      lastAt: 200,
    });
  });
  it("breaks lastAt ties by greater lastWpm, then contribution id order", () => {
    const mk = (id: string, wpm: number) =>
      contrib(id, { lessons: { l: lesson({ lastWpm: wpm, lastAccuracy: wpm, lastAt: 5 }) } });
    const hi = mk("zzzzzzzz", 50);
    const lo = mk("aaaaaaaa", 20);
    expect(combine({ [hi.id]: hi, [lo.id]: lo }).lessons.l.lastWpm).toBe(50);
    const x = mk("aaaaaaaa", 30);
    const y = { ...mk("bbbbbbbb", 30) };
    y.lessons = { l: lesson({ lastWpm: 30, lastAccuracy: 30, lastAt: 5 }) };
    expect(combine({ [x.id]: x, [y.id]: y }).lessons.l.lastWpm).toBe(30);
  });
  it("is independent of insertion order", () => {
    const a = contrib("aaaaaaaa", { totals: { attempts: 1, timeMs: 1, chars: 1 } });
    const b = contrib("bbbbbbbb", { totals: { attempts: 2, timeMs: 2, chars: 2 } });
    expect(combine({ [a.id]: a, [b.id]: b })).toEqual(combine({ [b.id]: b, [a.id]: a }));
  });
});

describe("withViews", () => {
  it("sets the materialised views from the contributions", () => {
    const d = createEmptyData();
    const own = d.sync.contribs[d.sync.ownId];
    own.totals = { attempts: 4, timeMs: 8, chars: 12 };
    own.keys = { a: { attempts: 4, errors: 0, totalMs: 1, timedHits: 4 } };
    const v = withViews(d);
    expect(v.totals).toEqual({ attempts: 4, timeMs: 8, chars: 12 });
    expect(v.keys.a.attempts).toBe(4);
    expect(v.sync).toBe(d.sync);
  });
});
