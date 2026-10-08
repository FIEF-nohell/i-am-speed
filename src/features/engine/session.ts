import { createState, reduce, restart } from "./engine";
import { resolveKey, type KeyLike } from "./input";
import type { EngineConfig, EngineState } from "./types";

type Listener = () => void;

/**
 * Thin mutable holder around the pure reducer. It exists so the UI can feed key events
 * synchronously (no dropped chars when keys arrive faster than React renders) and subscribe
 * with useSyncExternalStore. It does no animation work and never waits.
 */
export class TypingSession {
  private state: EngineState;
  private listeners = new Set<Listener>();

  constructor(
    target: string,
    config: EngineConfig,
    private readonly now: () => number = () => performance.now(),
    /** Time-limited tests: keys arriving after the limit end the attempt instead of being typed. */
    private readonly limitMs: number | null = null,
  ) {
    this.state = createState(target, config);
  }

  getState = (): EngineState => this.state;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  /** Returns true when the key was consumed by typing (so the caller can preventDefault). */
  press(key: KeyLike): boolean {
    const r = resolveKey(key);
    if (r.kind === "ignore") return false;
    const t = this.now();
    const started = this.state.startedAt;
    if (
      this.limitMs !== null &&
      started !== null &&
      this.state.status === "running" &&
      t - started >= this.limitMs
    ) {
      this.endAfter(this.limitMs);
      return true;
    }
    this.state = reduce(
      this.state,
      r.kind === "backspace"
        ? { kind: "backspace", t }
        : r.kind === "dead"
          ? { kind: "dead", t, modifier: r.modifier }
          : { kind: "char", char: r.char, t, modifier: r.modifier },
    );
    this.emit();
    return true;
  }

  /** Finish a running attempt `elapsedMs` after its first keystroke (time-limited tests). */
  endAfter(elapsedMs: number): void {
    const startedAt = this.state.startedAt;
    if (startedAt === null) return;
    this.state = reduce(this.state, { kind: "end", t: startedAt + elapsedMs });
    this.emit();
  }

  restart(): void {
    this.state = restart(this.state);
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }
}
