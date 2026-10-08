import { describe, expect, it } from "vitest";
import { heatByCode } from "./heat";

describe("heatByCode", () => {
  it("normalises error rates to the worst key and maps chars to key codes", () => {
    const h = heatByCode({
      a: { attempts: 10, errors: 5, totalMs: 0, timedHits: 0 },
      s: { attempts: 10, errors: 1, totalMs: 0, timedHits: 0 },
      d: { attempts: 10, errors: 0, totalMs: 0, timedHits: 0 },
    });
    expect(h.KeyA).toBe(1);
    expect(h.KeyS).toBeCloseTo(0.2, 5);
    expect(h.KeyD).toBeUndefined();
  });
  it("is empty without errors", () => {
    expect(heatByCode({ a: { attempts: 5, errors: 0, totalMs: 0, timedHits: 0 } })).toEqual({});
  });
});
