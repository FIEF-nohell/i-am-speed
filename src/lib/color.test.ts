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
    it(`${name}: typed text stays clearly brighter than untyped text`, () => {
      expect(contrastRatio(t.text, t.canvas) / contrastRatio(t.dim, t.canvas)).toBeGreaterThan(1.5);
    });
  }
});
