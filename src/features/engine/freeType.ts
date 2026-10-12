import { resolveKey, type KeyLike } from "./input";
import { seriesConsistency, wpmOf, type Metrics, type WpmPoint } from "./metrics";

/** What a key press means in free type. There is no target, so nothing can be wrong. */
export type FreeInput =
  | { kind: "char"; char: string }
  | { kind: "newline" }
  | { kind: "backspace" }
  | { kind: "deleteWord" };

/** Maps a key event to free-type input. Dead keys, Tab, Esc, shortcuts and modifier-only keys give null. */
export function freeInputOf(k: KeyLike): FreeInput | null {
  if (k.key === "Backspace") {
    if (k.metaKey) return null;
    return k.ctrlKey || k.altKey ? { kind: "deleteWord" } : { kind: "backspace" };
  }
  if (k.key === "Enter") return k.ctrlKey || k.metaKey || k.altKey ? null : { kind: "newline" };
  const r = resolveKey(k);
  return r.kind === "char" ? { kind: "char", char: r.char } : null;
}

export type FreeStatus = "idle" | "running" | "finished";

/** Immutable snapshot for rendering. */
export interface FreeTypeState {
  text: string;
  /** Characters in the buffer (code points). */
  chars: number;
  status: FreeStatus;
}

/** Words are whitespace separated chunks. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

const IDLE: FreeTypeState = { text: "", chars: 0, status: "idle" };

/** Index where a Ctrl+Backspace deletion starts: trailing whitespace, then one run of non-whitespace. */
function wordDeleteStart(text: string): number {
  let i = text.length;
  while (i > 0 && /\s/.test(text[i - 1])) i--;
  while (i > 0 && !/\s/.test(text[i - 1])) i--;
  return i;
}

/**
 * Free-type buffer with its own clock. Mutable on purpose (like TypingSession): keys arrive faster
 * than React renders, and each press must stay O(1) apart from the string append. Gaps longer than
 * `pauseAfterMs` between presses are removed from the clock. The clock is injected for tests.
 */
export class FreeTypeSession {
  private state: FreeTypeState = IDLE;
  private listeners = new Set<() => void>();
  private pausedMs = 0;
  private lastRaw: number | null = null;
  private startedAt: number | null = null;
  private elapsed = 0;
  /** One entry per press that changed the buffer: active time, length after, and whether it added. */
  private times: number[] = [];
  private lengths: number[] = [];
  private added: boolean[] = [];

  constructor(
    private readonly now: () => number = () => performance.now(),
    private readonly pauseAfterMs: number | null = null,
  ) {}

  getState = (): FreeTypeState => this.state;

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private activeNow(): number {
    const raw = this.now();
    if (
      this.pauseAfterMs !== null &&
      this.lastRaw !== null &&
      raw - this.lastRaw > this.pauseAfterMs
    ) {
      this.pausedMs += raw - this.lastRaw;
    }
    this.lastRaw = raw;
    return raw - this.pausedMs;
  }

  private commit(text: string, chars: number, adds: boolean): void {
    const t = this.activeNow();
    this.startedAt ??= t;
    this.elapsed = t - this.startedAt;
    this.times.push(this.elapsed);
    this.lengths.push(chars);
    this.added.push(adds);
    this.state = { text, chars, status: "running" };
    this.listeners.forEach((l) => l());
  }

  /** Applies one input. Returns what happened: "add", "delete" or null when nothing changed. */
  press(input: FreeInput): "add" | "delete" | null {
    const { text, chars, status } = this.state;
    if (status === "finished") return null;
    switch (input.kind) {
      case "char":
      case "newline": {
        const ch = input.kind === "char" ? input.char : "\n";
        this.commit(text + ch, chars + 1, true);
        return "add";
      }
      case "backspace": {
        if (chars === 0) return null;
        // A character outside the BMP is two UTF-16 units.
        const low = text.charCodeAt(text.length - 1);
        const cut = low >= 0xdc00 && low <= 0xdfff && text.length > 1 ? 2 : 1;
        this.commit(text.slice(0, -cut), chars - 1, false);
        return "delete";
      }
      case "deleteWord": {
        if (chars === 0) return null;
        const next = text.slice(0, wordDeleteStart(text));
        this.commit(next, [...next].length, false);
        return "delete";
      }
    }
  }

  /** Ends a running session. An idle tail longer than the pause limit is not counted. */
  finish(): void {
    if (this.state.status !== "running" || this.lastRaw === null) return;
    const idle = this.now() - this.lastRaw;
    const tail = this.pauseAfterMs !== null && idle > this.pauseAfterMs ? 0 : idle;
    this.elapsed += tail;
    this.state = { ...this.state, status: "finished" };
    this.listeners.forEach((l) => l());
  }

  /** Metrics for the session so far. Net counts the characters left in the buffer. */
  metrics(): Metrics {
    return freeMetrics(this.times, this.lengths, this.added, this.elapsed);
  }
}

function buildSeries(
  times: readonly number[],
  lengths: readonly number[],
  added: readonly boolean[],
  durationMs: number,
): WpmPoint[] {
  const seconds = Math.max(1, Math.ceil(durationMs / 1000));
  const points: WpmPoint[] = [];
  let i = 0;
  let adds = 0;
  let len = 0;
  for (let s = 1; s <= seconds; s++) {
    const edge = s * 1000;
    while (i < times.length && times[i] < edge) {
      if (added[i]) adds++;
      len = lengths[i];
      i++;
    }
    const ms = Math.min(edge, Math.max(durationMs, 1));
    points.push({ second: s, wpm: wpmOf(len, ms), raw: wpmOf(adds, ms), errors: 0 });
  }
  return points;
}

/**
 * Pure metrics from the press log. Accuracy is not applicable (nothing is a target), so it is
 * stored as 100 with zero errors, and no per-key or per-finger data is produced.
 */
export function freeMetrics(
  times: readonly number[],
  lengths: readonly number[],
  added: readonly boolean[],
  durationMs: number,
): Metrics {
  const chars = lengths.length === 0 ? 0 : lengths[lengths.length - 1];
  const adds = added.filter(Boolean).length;
  const series = buildSeries(times, lengths, added, durationMs);
  return {
    durationMs,
    netWpm: wpmOf(chars, durationMs),
    rawWpm: wpmOf(adds, durationMs),
    accuracy: 100,
    consistency: seriesConsistency(series, durationMs),
    errors: 0,
    correctChars: chars,
    typedChars: chars,
    perKey: {},
    perFinger: {},
    series,
  };
}
