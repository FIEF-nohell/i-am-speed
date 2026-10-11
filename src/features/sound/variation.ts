export const VARIANTS_PER_RECIPE = 8;
export const RATE_JITTER = 0.03;
export const GAIN_JITTER = 0.12;
export const BURST_GAP_MS = 90;
export const BURST_FACTOR = 0.85;
export const MAX_GAIN = 0.9;

/** Random variant index in [0, count) that never equals `last` (when count > 1). */
export function pickVariant(count: number, last: number, rand: () => number): number {
  if (count <= 1) return 0;
  if (last < 0 || last >= count) return Math.floor(rand() * count);
  const n = Math.floor(rand() * (count - 1));
  return n >= last ? n + 1 : n;
}

/** Playback rate within 1 plus or minus 3%. */
export function rateJitter(rand: () => number): number {
  return 1 + (rand() * 2 - 1) * RATE_JITTER;
}

/** Gain factor within 1 plus or minus 12%. */
export function gainJitter(rand: () => number): number {
  return 1 + (rand() * 2 - 1) * GAIN_JITTER;
}

/** Quieter when keys come in fast bursts. */
export function burstFactor(gapMs: number): number {
  return gapMs < BURST_GAP_MS ? BURST_FACTOR : 1;
}

/** Perceptual volume curve: 0..100 maps to 0..MAX_GAIN quadratically. */
export function volumeToGain(volume: number): number {
  const v = Math.min(100, Math.max(0, Number.isFinite(volume) ? volume : 0)) / 100;
  return v * v * MAX_GAIN;
}
