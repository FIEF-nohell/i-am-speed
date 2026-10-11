import { describe, expect, it } from "vitest";
import { SOUND_PACKS } from "@/features/settings/settings";
import { KEY_SOUND_KINDS, PACKS } from "./packs";
import { renderVariants } from "./render";
import { createRng, hashSeed } from "./rng";
import { PEAK, renderRecipe, SAMPLE_RATE } from "./synth";
import { VARIANTS_PER_RECIPE } from "./variation";

function zeroCrossingRate(data: Float32Array): number {
  let crossings = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i - 1]! < 0 !== data[i]! < 0) crossings++;
  }
  return crossings / data.length;
}

describe("rng", () => {
  it("is deterministic and within [0, 1)", () => {
    const a = createRng(7);
    const b = createRng(7);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("hashes different strings to different seeds", () => {
    expect(hashSeed("soft:key:0")).not.toBe(hashSeed("soft:key:1"));
  });
});

describe("packs", () => {
  it("define every kind for every pack with sane parameters", () => {
    for (const pack of SOUND_PACKS) {
      for (const kind of KEY_SOUND_KINDS) {
        const r = PACKS[pack][kind];
        expect(r.length).toBeGreaterThanOrEqual(0.02);
        expect(r.length).toBeLessThanOrEqual(0.18);
        expect(r.level).toBeGreaterThan(0.3);
        expect(r.level).toBeLessThanOrEqual(1);
        expect(r.partials.length).toBeGreaterThan(0);
        for (const p of r.partials) {
          expect(p.freq).toBeGreaterThan(40);
          expect(p.freq).toBeLessThan(8000);
          expect(p.decay).toBeGreaterThan(0.001);
          expect(p.decay).toBeLessThan(0.1);
          expect((p.delay ?? 0) + 0.005).toBeLessThan(r.length);
        }
        for (const n of r.noise ?? []) {
          expect(n.freq).toBeGreaterThan(100);
          expect(n.freq).toBeLessThan(10000);
          expect(n.decay).toBeLessThan(0.02);
        }
      }
    }
  });
});

describe("synth", () => {
  it("renders finite, normalised, correctly sized samples for every recipe", () => {
    for (const pack of SOUND_PACKS) {
      for (const kind of KEY_SOUND_KINDS) {
        const variants = renderVariants(pack, kind);
        expect(variants).toHaveLength(VARIANTS_PER_RECIPE);
        const level = PACKS[pack][kind].level;
        for (const data of variants) {
          const ms = (data.length / SAMPLE_RATE) * 1000;
          expect(ms).toBeGreaterThanOrEqual(20);
          expect(ms).toBeLessThanOrEqual(180);
          let peak = 0;
          let finite = true;
          for (const x of data) {
            if (!Number.isFinite(x)) finite = false;
            peak = Math.max(peak, Math.abs(x));
          }
          expect(finite).toBe(true);
          expect(peak).toBeLessThanOrEqual(PEAK + 1e-6);
          expect(peak).toBeCloseTo(PEAK * level, 3);
          expect(Math.abs(data[0]!)).toBeLessThan(0.05);
          expect(Math.abs(data[data.length - 1]!)).toBeLessThan(0.01);
        }
      }
    }
  });

  it("is deterministic per seed and differs between seeds", () => {
    const recipe = PACKS.soft.key;
    expect(renderRecipe(recipe, 1)).toEqual(renderRecipe(recipe, 1));
    expect(renderRecipe(recipe, 1)).not.toEqual(renderRecipe(recipe, 2));
    const variants = renderVariants("clicky", "key");
    for (let i = 1; i < variants.length; i++) expect(variants[i]).not.toEqual(variants[0]);
  });

  it("makes the error sound darker than the key sound in every pack", () => {
    for (const pack of SOUND_PACKS) {
      const key = renderVariants(pack, "key").map(zeroCrossingRate);
      const error = renderVariants(pack, "error").map(zeroCrossingRate);
      const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      expect(mean(error)).toBeLessThan(mean(key));
    }
  });
});
