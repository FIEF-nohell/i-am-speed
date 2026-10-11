import { createBiquad } from "./biquad";
import { createRng } from "./rng";
import type { Recipe } from "./recipe";

export const SAMPLE_RATE = 48000;
export const PEAK = 0.9;
const ATTACK = 0.0006;
const FADE_OUT = 0.006;
/** Variant spread: frequency plus or minus 4%, decay plus or minus 10%. */
export const FREQ_SPREAD = 0.04;
export const DECAY_SPREAD = 0.1;

/** Renders one variant of a recipe to mono samples, normalised to `PEAK * recipe.level`. */
export function renderRecipe(recipe: Recipe, seed: number): Float32Array {
  const rand = createRng(seed);
  const spread = (amount: number) => 1 + (rand() * 2 - 1) * amount;
  const n = Math.round(recipe.length * SAMPLE_RATE);
  const mix = new Float32Array(n);
  const dt = 1 / SAMPLE_RATE;

  for (const p of recipe.partials) {
    const f0 = p.freq * spread(FREQ_SPREAD);
    const decay = p.decay * spread(DECAY_SPREAD);
    const start = Math.round((p.delay ?? 0) * SAMPLE_RATE);
    let phase = rand() * Math.PI * 2;
    for (let i = start; i < n; i++) {
      const t = (i - start) * dt;
      const f = p.glide ? f0 * (1 + (p.glide.ratio - 1) * (1 - Math.exp(-t / p.glide.time))) : f0;
      phase += 2 * Math.PI * f * dt;
      mix[i]! += Math.sin(phase) * p.gain * Math.min(1, t / ATTACK) * Math.exp(-t / decay);
    }
  }

  for (const s of recipe.noise ?? []) {
    const filter = createBiquad(s.filter, s.freq * spread(FREQ_SPREAD), s.q, SAMPLE_RATE);
    const decay = s.decay * spread(DECAY_SPREAD);
    const start = Math.round((s.delay ?? 0) * SAMPLE_RATE);
    for (let i = start; i < n; i++) {
      const t = (i - start) * dt;
      mix[i]! += filter(rand() * 2 - 1) * s.gain * Math.min(1, t / ATTACK) * Math.exp(-t / decay);
    }
  }

  if (recipe.tone) {
    const tone = createBiquad("lowpass", recipe.tone, 0.707, SAMPLE_RATE);
    for (let i = 0; i < n; i++) mix[i] = tone(mix[i]!);
  }

  const fade = Math.min(n, Math.round(FADE_OUT * SAMPLE_RATE));
  for (let k = 0; k < fade; k++) {
    mix[n - 1 - k]! *= 0.5 - 0.5 * Math.cos((Math.PI * k) / fade);
  }

  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(mix[i]!));
  const scale = peak > 0 ? (PEAK * recipe.level) / peak : 0;
  for (let i = 0; i < n; i++) mix[i]! *= scale;
  return mix;
}
