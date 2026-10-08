import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DURATION, EASING, STAGGER, easeOutCubic, lerp, staggerStyle, tween } from "./motion";

const css = readFileSync(path.resolve(__dirname, "../styles/motion.css"), "utf8");

describe("motion tokens", () => {
  it("match the CSS variables", () => {
    for (const [name, ms] of Object.entries(DURATION)) {
      expect(css, `--dur-${name}`).toContain(`--dur-${name}: ${ms}ms;`);
    }
    for (const [name, curve] of Object.entries(EASING)) {
      const cssName = name === "inOut" ? "ease-in-out" : `ease-${name}`;
      expect(css, cssName).toContain(`--${cssName}: ${curve};`);
    }
    expect(css).toContain(`--stagger: ${STAGGER.step}ms;`);
  });
  it("keeps UI transitions under 400 ms", () => {
    expect(DURATION.slow).toBeLessThan(400);
  });
});

describe("helpers", () => {
  it("eases from 0 to 1 and clamps", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(lerp(10, 20, 0.5)).toBe(15);
  });
  it("caps stagger delay", () => {
    expect((staggerStyle(2) as Record<string, string>)["--delay"]).toBe("36ms");
    expect((staggerStyle(500) as Record<string, string>)["--delay"]).toBe(`${STAGGER.max}ms`);
  });
  it("tween finishes instantly with reduced motion", () => {
    const seen: number[] = [];
    tween(0, 42, 900, (v) => seen.push(v), true);
    expect(seen).toEqual([42]);
  });
});
