import type { WpmPoint } from "@/features/engine/metrics";

/** The chart never needs more points than this; long zen sessions are averaged down to it. */
export const MAX_POINTS = 240;

/**
 * Bucket-averages a series to at most `max` points. Speeds are averaged, errors are summed so no
 * mistake disappears, and the first and last points are kept as they are.
 */
export function downsample(series: readonly WpmPoint[], max = MAX_POINTS): WpmPoint[] {
  if (series.length <= max || max < 3) return series.slice();
  const first = series[0]!;
  const last = series[series.length - 1]!;
  const middle = series.slice(1, -1);
  const buckets = max - 2;
  const size = middle.length / buckets;
  const out: WpmPoint[] = [first];
  for (let b = 0; b < buckets; b++) {
    const part = middle.slice(Math.round(b * size), Math.round((b + 1) * size));
    if (part.length === 0) continue;
    const n = part.length;
    out.push({
      second: part[Math.floor(n / 2)]!.second,
      wpm: part.reduce((s, p) => s + p.wpm, 0) / n,
      raw: part.reduce((s, p) => s + p.raw, 0) / n,
      errors: part.reduce((s, p) => s + p.errors, 0),
    });
  }
  out.push(last);
  return out;
}
