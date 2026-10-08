import type { Finger } from "@/features/keyboard/layout/types";
import type { EngineState, Keystroke } from "./types";

export interface KeyStat {
  attempts: number;
  errors: number;
  /** Sum of milliseconds between this key and the previous keystroke, for correct hits. */
  totalMs: number;
  timedHits: number;
}

export interface FingerStat {
  attempts: number;
  errors: number;
}

export interface WpmPoint {
  /** Whole seconds since the first keystroke. */
  second: number;
  wpm: number;
  raw: number;
  errors: number;
}

export interface Metrics {
  durationMs: number;
  netWpm: number;
  rawWpm: number;
  /** 0 to 100. */
  accuracy: number;
  /** 0 to 100, higher is steadier. */
  consistency: number;
  errors: number;
  correctChars: number;
  typedChars: number;
  perKey: Record<string, KeyStat>;
  perFinger: Partial<Record<Finger, FingerStat>>;
  series: WpmPoint[];
}

/** Pauses longer than this are not counted as key latency. */
const MAX_KEY_GAP_MS = 3000;

export const wpmOf = (chars: number, ms: number): number =>
  ms <= 0 ? 0 : chars / 5 / (ms / 60000);

export function consistencyOf(samples: readonly number[]): number {
  if (samples.length < 2) return 100;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  if (mean === 0) return 0;
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
  return Math.max(0, Math.min(100, 100 * (1 - Math.sqrt(variance) / mean)));
}

function buildSeries(keystrokes: readonly Keystroke[], durationMs: number): WpmPoint[] {
  const seconds = Math.max(1, Math.ceil(durationMs / 1000));
  const points: WpmPoint[] = [];
  let i = 0;
  let correct = 0;
  let typed = 0;
  for (let s = 1; s <= seconds; s++) {
    const edge = s * 1000;
    let errors = 0;
    while (i < keystrokes.length && keystrokes[i].t < edge) {
      const k = keystrokes[i++];
      typed++;
      if (k.correct) correct++;
      else errors++;
    }
    const ms = Math.min(edge, Math.max(durationMs, 1));
    points.push({ second: s, wpm: wpmOf(correct, ms), raw: wpmOf(typed, ms), errors });
  }
  return points;
}

export function computeMetrics(state: EngineState): Metrics {
  const { keystrokes } = state;
  const durationMs = Math.max(state.elapsed, 0);
  const perKey: Record<string, KeyStat> = {};
  const perFinger: Partial<Record<Finger, FingerStat>> = {};
  let correctHits = 0;
  let prevT: number | null = null;

  for (const k of keystrokes) {
    const key = (perKey[k.expected] ??= { attempts: 0, errors: 0, totalMs: 0, timedHits: 0 });
    const fin = (perFinger[k.finger] ??= { attempts: 0, errors: 0 });
    key.attempts++;
    fin.attempts++;
    if (k.correct) {
      correctHits++;
      if (prevT !== null) {
        key.totalMs += Math.min(k.t - prevT, MAX_KEY_GAP_MS);
        key.timedHits++;
      }
    } else {
      key.errors++;
      fin.errors++;
    }
    prevT = k.t;
  }

  const correctChars = state.entries.filter((e) => e.correct).length;
  const series = buildSeries(keystrokes, durationMs);
  // The last bucket is usually partial, so steadiness is judged on the per-second raw rate.
  const perSecond = series.map((p, idx) => {
    const prev = idx === 0 ? 0 : (series[idx - 1].raw * Math.min(idx * 1000, durationMs)) / 12000;
    const cur = (p.raw * Math.min((idx + 1) * 1000, durationMs)) / 12000;
    return cur - prev;
  });
  const whole = perSecond.length > 2 ? perSecond.slice(0, -1) : perSecond;

  return {
    durationMs,
    netWpm: wpmOf(correctChars, durationMs),
    rawWpm: wpmOf(keystrokes.length, durationMs),
    accuracy: keystrokes.length === 0 ? 100 : (correctHits / keystrokes.length) * 100,
    consistency: consistencyOf(whole),
    errors: keystrokes.length - correctHits,
    correctChars,
    typedChars: keystrokes.length,
    perKey,
    perFinger,
    series,
  };
}

export function slowestKeys(
  perKey: Record<string, KeyStat>,
  count: number,
): { key: string; ms: number }[] {
  return Object.entries(perKey)
    .filter(([key, s]) => key !== " " && s.timedHits >= 2)
    .map(([key, s]) => ({ key, ms: s.totalMs / s.timedHits }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, count);
}
