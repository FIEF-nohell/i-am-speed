import type { Rng } from "@/lib/rng";
import { pick } from "@/lib/rng";

export const START_LIVES = 5;
/** Seconds between word tiers. */
export const TIER_SECONDS = 25;
/** Clean words in a row per combo step, and the highest multiplier. */
export const COMBO_STEP = 5;
export const MAX_MULTIPLIER = 4;
const MAX_WORDS = 9;

export interface FallingWord {
  id: number;
  text: string;
  /** Horizontal anchor, 0 (left edge) to 1 (right edge). */
  x: number;
  /** 0 at the top, 1 at the floor. */
  y: number;
}

export type RainStatus = "idle" | "running" | "over";

export interface RainState {
  status: RainStatus;
  words: readonly FallingWord[];
  /** Id of the word being typed, or null. */
  lockedId: number | null;
  /** Letters of the locked word typed so far. */
  typed: number;
  elapsed: number;
  lives: number;
  score: number;
  combo: number;
  cleared: number;
  keystrokes: number;
  mistakes: number;
  /** Bumped on every mistake and every lost life so the UI can flash. */
  mistakeTick: number;
  missTick: number;
  /** Best score before this run started, so the end screen can tell a new best. */
  bestAtStart: number;
}

/** Floors per second at game time `t`. Starts gentle, ends brisk. */
export function fallSpeed(t: number): number {
  return Math.min(0.28, 0.085 + 0.0022 * t);
}

/** Seconds between spawns at game time `t`. */
export function spawnInterval(t: number): number {
  return Math.max(0.85, 2.7 - 0.016 * t);
}

export function tierAt(t: number, tierCount: number): number {
  return Math.min(tierCount - 1, Math.floor(t / TIER_SECONDS));
}

export function multiplierFor(combo: number): number {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / COMBO_STEP));
}

export type PressResult = "ignored" | "hit" | "cleared" | "mistake";

/** The whole game without a DOM: feed it `tick` and `press`, read `state`. */
export class RainEngine {
  private nextId = 1;
  private untilSpawn = 0.4;
  private snapshot: RainState;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly pools: readonly (readonly string[])[],
    private readonly rng: Rng,
  ) {
    this.snapshot = this.fresh("idle");
  }

  get state(): RainState {
    return this.snapshot;
  }

  /** useSyncExternalStore contract: stable function, returns the unsubscribe. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private fresh(status: RainStatus, bestAtStart = 0): RainState {
    return {
      status,
      words: [],
      lockedId: null,
      typed: 0,
      elapsed: 0,
      lives: START_LIVES,
      score: 0,
      combo: 0,
      cleared: 0,
      keystrokes: 0,
      mistakes: 0,
      mistakeTick: 0,
      missTick: 0,
      bestAtStart,
    };
  }

  private set(patch: Partial<RainState>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const l of this.listeners) l();
  }

  start(bestAtStart = 0): void {
    this.nextId = 1;
    this.untilSpawn = 0.4;
    this.snapshot = this.fresh("running", bestAtStart);
    for (const l of this.listeners) l();
  }

  end(): void {
    if (this.snapshot.status === "running") this.set({ status: "over", lockedId: null, typed: 0 });
  }

  private spawn(): void {
    const s = this.snapshot;
    if (s.words.length >= MAX_WORDS) return;
    const pool = this.pools[tierAt(s.elapsed, this.pools.length)];
    // No two words share a first letter, so the first key always picks exactly one word.
    const taken = new Set(s.words.map((w) => w.text[0]));
    let text = "";
    for (let i = 0; i < 40 && !text; i++) {
      const candidate = pick(this.rng, pool);
      if (!taken.has(candidate[0])) text = candidate;
    }
    if (!text) return;
    const x = 0.04 + this.rng() * 0.92;
    this.set({ words: [...s.words, { id: this.nextId++, text, x, y: 0 }] });
  }

  tick(dt: number): void {
    if (this.snapshot.status !== "running") return;
    const step = Math.min(dt, 0.1);
    const elapsed = this.snapshot.elapsed + step;
    const speed = fallSpeed(elapsed);
    let lost = 0;
    let lockedId = this.snapshot.lockedId;
    let typed = this.snapshot.typed;
    const words: FallingWord[] = [];
    for (const w of this.snapshot.words) {
      const y = w.y + speed * step;
      if (y >= 1) {
        lost++;
        if (w.id === lockedId) {
          lockedId = null;
          typed = 0;
        }
      } else words.push({ ...w, y });
    }
    const lives = Math.max(0, this.snapshot.lives - lost);
    this.set({
      words,
      elapsed,
      lives,
      lockedId,
      typed,
      combo: lost ? 0 : this.snapshot.combo,
      missTick: this.snapshot.missTick + lost,
    });
    if (lives === 0) {
      this.end();
      return;
    }
    this.untilSpawn -= step;
    if (this.untilSpawn <= 0) {
      this.spawn();
      this.untilSpawn = spawnInterval(elapsed);
    }
  }

  /** A typed letter. There is no backspace in this mode: a wrong key restarts the word. */
  press(char: string): PressResult {
    const s = this.snapshot;
    if (s.status !== "running" || [...char].length !== 1) return "ignored";
    const c = char.toLowerCase();
    const locked = s.words.find((w) => w.id === s.lockedId);
    if (locked) {
      return locked.text[s.typed] === c ? this.advance(locked, s.typed + 1) : this.mistake();
    }
    // Nothing locked yet: take the lowest word that starts with this letter.
    const target = [...s.words].sort((a, b) => b.y - a.y).find((w) => w.text[0] === c);
    return target ? this.advance(target, 1) : this.mistake();
  }

  private advance(word: FallingWord, typed: number): PressResult {
    const s = this.snapshot;
    if (typed < word.text.length) {
      this.set({ lockedId: word.id, typed, keystrokes: s.keystrokes + 1 });
      return "hit";
    }
    this.set({
      words: s.words.filter((w) => w.id !== word.id),
      lockedId: null,
      typed: 0,
      keystrokes: s.keystrokes + 1,
      combo: s.combo + 1,
      cleared: s.cleared + 1,
      score: s.score + word.text.length * 10 * multiplierFor(s.combo),
    });
    return "cleared";
  }

  private mistake(): PressResult {
    const s = this.snapshot;
    this.set({
      lockedId: null,
      typed: 0,
      combo: 0,
      keystrokes: s.keystrokes + 1,
      mistakes: s.mistakes + 1,
      mistakeTick: s.mistakeTick + 1,
    });
    return "mistake";
  }
}
