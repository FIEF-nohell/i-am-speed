import { describe, expect, it } from "vitest";
import { createRng } from "./rng";
import {
  BURST_FACTOR,
  GAIN_JITTER,
  MAX_GAIN,
  RATE_JITTER,
  burstFactor,
  gainJitter,
  pickVariant,
  rateJitter,
  volumeToGain,
} from "./variation";

describe("pickVariant", () => {
  it("never repeats the previous variant and covers the whole range", () => {
    const rand = createRng(3);
    let last = -1;
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const next = pickVariant(8, last, rand);
      expect(next).not.toBe(last);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(8);
      seen.add(next);
      last = next;
    }
    expect(seen.size).toBe(8);
  });

  it("handles degenerate counts and edge random values", () => {
    expect(pickVariant(1, 0, () => 0.5)).toBe(0);
    expect(pickVariant(8, 7, () => 0.999999)).toBe(6);
    expect(pickVariant(8, 0, () => 0)).toBe(1);
  });
});

describe("jitter", () => {
  it("stays within the documented bounds", () => {
    const rand = createRng(9);
    for (let i = 0; i < 1000; i++) {
      expect(Math.abs(rateJitter(rand) - 1)).toBeLessThanOrEqual(RATE_JITTER);
      expect(Math.abs(gainJitter(rand) - 1)).toBeLessThanOrEqual(GAIN_JITTER);
    }
    expect(rateJitter(() => 0)).toBeCloseTo(1 - RATE_JITTER);
    expect(gainJitter(() => 1)).toBeCloseTo(1 + GAIN_JITTER);
  });
});

describe("burst and volume", () => {
  it("softens fast bursts only", () => {
    expect(burstFactor(50)).toBe(BURST_FACTOR);
    expect(burstFactor(89)).toBe(BURST_FACTOR);
    expect(burstFactor(90)).toBe(1);
    expect(burstFactor(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("maps volume perceptually and clamps", () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(100)).toBeCloseTo(MAX_GAIN);
    expect(volumeToGain(50)).toBeCloseTo(MAX_GAIN / 4);
    expect(volumeToGain(-5)).toBe(0);
    expect(volumeToGain(500)).toBeCloseTo(MAX_GAIN);
    expect(volumeToGain(Number.NaN)).toBe(0);
  });
});
