import type { Metrics } from "@/features/engine/metrics";
import type { Lang } from "@/features/content/types";
import { PASS_ACCURACY } from "@/features/lessons/types";
import { MAX_ATTEMPTS, type Attempt, type DayTotals, type StoredData } from "./schema";

export interface AttemptInput {
  source: string;
  lang: Lang;
  text: string;
  metrics: Metrics;
  at: number;
}

export function dayKey(at: number): string {
  const d = new Date(at);
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Pure: returns new data with the attempt folded into history and every aggregate. */
export function recordAttempt(data: StoredData, input: AttemptInput): StoredData {
  const { metrics: m } = input;
  const passed = m.accuracy >= PASS_ACCURACY;
  const attempt: Attempt = {
    id: `${input.at}-${data.totals.attempts}`,
    at: input.at,
    source: input.source,
    lang: input.lang,
    netWpm: m.netWpm,
    rawWpm: m.rawWpm,
    accuracy: m.accuracy,
    consistency: m.consistency,
    errors: m.errors,
    durationMs: m.durationMs,
    chars: m.typedChars,
    passed,
  };

  const keys = { ...data.keys };
  for (const [k, s] of Object.entries(m.perKey)) {
    const prev = keys[k] ?? { attempts: 0, errors: 0, totalMs: 0, timedHits: 0 };
    keys[k] = {
      attempts: prev.attempts + s.attempts,
      errors: prev.errors + s.errors,
      totalMs: prev.totalMs + s.totalMs,
      timedHits: prev.timedHits + s.timedHits,
    };
  }
  const fingers = { ...data.fingers };
  for (const [f, s] of Object.entries(m.perFinger) as [
    keyof typeof fingers,
    { attempts: number; errors: number },
  ][]) {
    const prev = fingers[f] ?? { attempts: 0, errors: 0 };
    fingers[f] = { attempts: prev.attempts + s.attempts, errors: prev.errors + s.errors };
  }

  const dk = dayKey(input.at);
  const day: DayTotals = data.days[dk] ?? { attempts: 0, wpmSum: 0, accuracySum: 0, timeMs: 0 };

  const isLesson = !input.source.startsWith("test:");
  const lessons = { ...data.lessons };
  if (isLesson) {
    const prev = lessons[input.source];
    lessons[input.source] = {
      completed: (prev?.completed ?? false) || passed,
      bestWpm: Math.max(prev?.bestWpm ?? 0, passed ? m.netWpm : 0),
      bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, m.accuracy),
      lastWpm: m.netWpm,
      lastAccuracy: m.accuracy,
      attempts: (prev?.attempts ?? 0) + 1,
      lastAt: input.at,
    };
  }

  return {
    ...data,
    attempts: [...data.attempts, attempt].slice(-MAX_ATTEMPTS),
    lessons,
    keys,
    fingers,
    days: {
      ...data.days,
      [dk]: {
        attempts: day.attempts + 1,
        wpmSum: day.wpmSum + m.netWpm,
        accuracySum: day.accuracySum + m.accuracy,
        timeMs: day.timeMs + m.durationMs,
      },
    },
    totals: {
      attempts: data.totals.attempts + 1,
      timeMs: data.totals.timeMs + m.durationMs,
      chars: data.totals.chars + m.typedChars,
    },
    lastResult: {
      attempt,
      series: m.series,
      perKey: m.perKey,
      perFinger: m.perFinger,
      text: input.text,
    },
  };
}
