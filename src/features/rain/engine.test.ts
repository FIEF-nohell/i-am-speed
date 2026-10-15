import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/rng";
import {
  RainEngine,
  START_LIVES,
  TIER_SECONDS,
  fallSpeed,
  multiplierFor,
  spawnInterval,
  tierAt,
} from "./engine";

const POOLS = [["apple", "berry", "cherry", "dog", "eel"]];

function started(pools: readonly (readonly string[])[] = POOLS): RainEngine {
  const e = new RainEngine(pools, createRng(7));
  e.start();
  // Advance until the first word has spawned.
  for (let i = 0; i < 10 && e.state.words.length === 0; i++) e.tick(0.1);
  return e;
}

describe("difficulty curve", () => {
  it("speeds up, spawns faster, and moves through the tiers", () => {
    expect(fallSpeed(60)).toBeGreaterThan(fallSpeed(0));
    expect(spawnInterval(60)).toBeLessThan(spawnInterval(0));
    expect(fallSpeed(10_000)).toBe(0.28);
    expect(spawnInterval(10_000)).toBe(0.85);
    expect(tierAt(0, 6)).toBe(0);
    expect(tierAt(TIER_SECONDS * 2 + 1, 6)).toBe(2);
    expect(tierAt(10_000, 6)).toBe(5);
  });

  it("raises the multiplier every five clean words up to a cap", () => {
    expect(multiplierFor(0)).toBe(1);
    expect(multiplierFor(5)).toBe(2);
    expect(multiplierFor(500)).toBe(4);
  });
});

describe("typing", () => {
  it("clears a word typed correctly and scores it", () => {
    const e = started();
    const word = e.state.words[0].text;
    for (const c of word) e.press(c);
    expect(e.state.words).toHaveLength(0);
    expect(e.state.cleared).toBe(1);
    expect(e.state.score).toBe(word.length * 10);
    expect(e.state.mistakes).toBe(0);
  });

  it("resets the word and the combo on any wrong key", () => {
    const e = started();
    const word = e.state.words[0].text;
    e.press(word[0]);
    expect(e.state.typed).toBe(1);
    const result = e.press(word[0] === "z" ? "y" : "z");
    expect(result).toBe("mistake");
    expect(e.state.typed).toBe(0);
    expect(e.state.lockedId).toBeNull();
    expect(e.state.mistakes).toBe(1);
    // The word is still there and can be started again from its first letter.
    for (const c of word) e.press(c);
    expect(e.state.cleared).toBe(1);
  });

  it("counts a key that matches no word as a mistake", () => {
    const e = started();
    expect(e.press("#")).toBe("mistake");
    expect(e.press("é")).toBe("mistake");
  });

  it("accepts capitals for lowercase words", () => {
    const e = started();
    const word = e.state.words[0].text;
    for (const c of word.toUpperCase()) e.press(c);
    expect(e.state.cleared).toBe(1);
  });

  it("never spawns two words with the same first letter", () => {
    const e = new RainEngine([["aa", "ab", "ac", "ba", "bb", "ca"]], createRng(3));
    e.start();
    for (let i = 0; i < 100; i++) {
      e.tick(0.1);
      const firsts = e.state.words.map((w) => w.text[0]);
      expect(new Set(firsts).size).toBe(firsts.length);
    }
  });
});

describe("lives and game over", () => {
  it("loses a life when a word reaches the floor and ends at zero", () => {
    const e = new RainEngine(POOLS, createRng(5));
    e.start();
    let ticks = 0;
    while (e.state.status === "running" && ticks++ < 100_000) e.tick(0.1);
    expect(e.state.status).toBe("over");
    expect(e.state.lives).toBe(0);
    expect(e.state.missTick).toBeGreaterThanOrEqual(START_LIVES);
  });

  it("ignores input when not running", () => {
    const e = new RainEngine(POOLS, createRng(1));
    expect(e.press("a")).toBe("ignored");
    e.start();
    e.end();
    expect(e.press("a")).toBe("ignored");
  });

  it("is deterministic for a seed", () => {
    const run = (): string => {
      const e = new RainEngine(POOLS, createRng(11));
      e.start();
      for (let i = 0; i < 200; i++) e.tick(0.05);
      return JSON.stringify(e.state);
    };
    expect(run()).toBe(run());
  });
});
