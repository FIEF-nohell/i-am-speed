import { describe, expect, it } from "vitest";
import type { WpmPoint } from "@/features/engine/metrics";
import { downsample } from "./downsample";

const make = (n: number): WpmPoint[] =>
  Array.from({ length: n }, (_, i) => ({
    second: i,
    wpm: i,
    raw: i + 1,
    errors: i % 3 === 0 ? 1 : 0,
  }));

const errorSum = (xs: WpmPoint[]): number => xs.reduce((a, p) => a + p.errors, 0);

describe("downsample", () => {
  it("leaves short series untouched", () => {
    const s = make(50);
    expect(downsample(s)).toEqual(s);
  });

  it("caps the length and keeps first and last", () => {
    const s = make(1000);
    const d = downsample(s, 240);
    expect(d.length).toBeLessThanOrEqual(240);
    expect(d[0]).toEqual(s[0]);
    expect(d[d.length - 1]).toEqual(s[999]);
  });

  it("preserves the error sum and stays ordered", () => {
    const s = make(1000);
    const d = downsample(s, 240);
    expect(errorSum(d)).toBe(errorSum(s));
    for (let i = 1; i < d.length; i++) expect(d[i]!.second).toBeGreaterThan(d[i - 1]!.second);
  });

  it("averages speeds inside a bucket", () => {
    const d = downsample(make(1000), 12);
    expect(d[1]!.raw - d[1]!.wpm).toBeCloseTo(1);
  });
});
