import { describe, expect, it } from "vitest";
import palette from "../../brand/palette.json";
import { contrastRatio } from "./color";

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for identical colours", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#336699", "#336699")).toBeCloseTo(1, 5);
  });
});

describe("brand palette", () => {
  for (const [name, t] of Object.entries(palette.themes)) {
    it(`${name}: text roles are readable on the canvas`, () => {
      expect(contrastRatio(t.text, t.canvas)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(t.muted, t.canvas)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.dim, t.canvas)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.accent, t.canvas)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.error, t.canvas)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.accentInk, t.accent)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: text roles are readable on the panel`, () => {
      expect(contrastRatio(t.text, t.panel)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(t.muted, t.panel)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.accent, t.panel)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.error, t.panel)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: text and muted stay readable on the surface (dim and accent are canvas or panel only)`, () => {
      expect(contrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: control boundaries reach 3:1 against the canvas and the panel`, () => {
      expect(contrastRatio(t.lineStrong, t.canvas)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(t.lineStrong, t.panel)).toBeGreaterThanOrEqual(3);
    });
    it(`${name}: the panel is a distinct fill from the canvas, and the divider line stays quiet`, () => {
      expect(t.panel).not.toBe(t.canvas);
      expect(contrastRatio(t.line, t.canvas)).toBeLessThan(contrastRatio(t.lineStrong, t.canvas));
    });
    it(`${name}: typed text stays clearly brighter than untyped text`, () => {
      expect(contrastRatio(t.text, t.canvas) / contrastRatio(t.dim, t.canvas)).toBeGreaterThan(1.5);
    });
  }
});
