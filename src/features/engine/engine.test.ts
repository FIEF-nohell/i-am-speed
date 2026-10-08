import { describe, expect, it } from "vitest";
import { createState, reduce, wordStart } from "./engine";
import { computeMetrics, consistencyOf, slowestKeys, wpmOf } from "./metrics";
import { resolveKey, type KeyLike } from "./input";
import { DEFAULT_ENGINE_CONFIG, type EngineConfig, type EngineInput, type EngineState } from "./types";

const cfg = (over: Partial<EngineConfig> = {}): EngineConfig => ({ ...DEFAULT_ENGINE_CONFIG, ...over });

/** Types a string, 100 ms per key; "<" means backspace, "!" is a dead key. */
function run(target: string, keys: string, config: Partial<EngineConfig> = {}): EngineState {
  let s = createState(target, cfg(config));
  let t = 1000;
  for (const ch of keys) {
    t += 100;
    const input: EngineInput =
      ch === "<" ? { kind: "backspace", t } : ch === "!" ? { kind: "dead", t, modifier: "none" } : { kind: "char", char: ch, t, modifier: "none" };
    s = reduce(s, input);
  }
  return s;
}

describe("continue mode", () => {
  it("marks wrong chars, advances and finishes", () => {
    const s = run("abc", "axc", { onError: "continue" });
    expect(s.entries.map((e) => e.correct)).toEqual([true, false, true]);
    expect(s.status).toBe("finished");
    expect(computeMetrics(s).errors).toBe(1);
  });
});

describe("block mode", () => {
  it("counts the error but does not advance", () => {
    const s = run("abc", "ax", { onError: "block" });
    expect(s.entries).toHaveLength(1);
    expect(computeMetrics(s).errors).toBe(1);
    const done = run("abc", "axbc", { onError: "block" });
    expect(done.status).toBe("finished");
    expect(computeMetrics(done).accuracy).toBeCloseTo(75, 5);
  });
});

describe("stop at word end", () => {
  it("lets you type on within a word but blocks the space while errors remain", () => {
    let s = run("ab cd", "xb", { onError: "stopAtWordEnd" });
    expect(s.entries).toHaveLength(2);
    s = reduce(s, { kind: "char", char: " ", t: 5000, modifier: "none" });
    expect(s.entries).toHaveLength(2);
    s = reduce(s, { kind: "backspace", t: 5100 });
    s = reduce(s, { kind: "backspace", t: 5100 });
    expect(s.entries).toHaveLength(0);
    for (const ch of "ab cd") s = reduce(s, { kind: "char", char: ch, t: 6000, modifier: "none" });
    expect(s.status).toBe("finished");
  });
  it("blocks extra characters at the word boundary", () => {
    const s = run("ab cd", "abx", { onError: "stopAtWordEnd" });
    expect(s.entries).toHaveLength(2);
  });
  it("does not finish with an unfixed error in the last word", () => {
    const s = run("ab", "ax", { onError: "stopAtWordEnd" });
    expect(s.entries).toHaveLength(2);
    expect(s.status).toBe("running");
    const fixed = run("ab", "ax<b", { onError: "stopAtWordEnd" });
    expect(fixed.status).toBe("finished");
  });
});

describe("restart after N", () => {
  it("fails once N mistakes are made and stays failed", () => {
    const s = run("abcdef", "axbxcx", { onError: "restartAfterN", restartAfter: 3 });
    expect(s.status).toBe("failed");
    const after = reduce(s, { kind: "char", char: "a", t: 9999, modifier: "none" });
    expect(after).toBe(s);
  });
  it("does not fail below N", () => {
    const s = run("abcdef", "axb", { onError: "restartAfterN", restartAfter: 3 });
    expect(s.status).toBe("running");
  });
});

describe("backspace modes", () => {
  it("off ignores backspace", () => {
    const s = run("abc", "ax<", { onError: "continue", backspace: "off" });
    expect(s.entries).toHaveLength(2);
  });
  it("word stops at the word start", () => {
    const s = run("ab cd", "ab c<<<", { onError: "continue", backspace: "word" });
    expect(s.entries).toHaveLength(3);
  });
  it("full crosses word boundaries", () => {
    const s = run("ab cd", "ab c<<<<", { onError: "continue", backspace: "full" });
    expect(s.entries).toHaveLength(0);
  });
  it("wordStart finds the char after the previous space", () => {
    expect(wordStart("ab cd", 4)).toBe(3);
    expect(wordStart("ab cd", 3)).toBe(3);
  });
});

describe("dead keys", () => {
  it("count as a wrong keystroke and never advance", () => {
    for (const onError of ["continue", "block", "stopAtWordEnd", "restartAfterN"] as const) {
      const s = run("abc", "!", { onError });
      expect(s.entries).toHaveLength(0);
      expect(s.keystrokes[0].correct).toBe(false);
    }
  });
});

describe("metrics", () => {
  it("computes wpm from correct chars", () => {
    expect(wpmOf(50, 60000)).toBeCloseTo(10, 5);
    const s = run("hello", "hello", { onError: "continue" });
    const m = computeMetrics(s);
    expect(m.durationMs).toBe(400);
    expect(m.netWpm).toBeCloseTo(wpmOf(5, 400), 5);
    expect(m.rawWpm).toBeCloseTo(m.netWpm, 5);
    expect(m.accuracy).toBe(100);
  });
  it("raw counts wrong keystrokes, net counts only correct final chars", () => {
    const s = run("abcd", "axbcd", { onError: "block" });
    const m = computeMetrics(s);
    expect(m.rawWpm).toBeGreaterThan(m.netWpm);
    expect(m.errors).toBe(1);
  });
  it("tracks per-key and per-finger stats", () => {
    const s = run("aa", "xaa", { onError: "block" });
    const m = computeMetrics(s);
    expect(m.perKey["a"].attempts).toBe(3);
    expect(m.perKey["a"].errors).toBe(1);
    expect(m.perFinger.leftPinky?.errors).toBe(1);
  });
  it("consistency is 100 for steady input and lower for erratic input", () => {
    expect(consistencyOf([50, 50, 50])).toBe(100);
    expect(consistencyOf([10, 90, 10, 90])).toBeLessThan(50);
  });
  it("series has one point per second and ranks slow keys", () => {
    let s = createState("ab", cfg({ onError: "continue" }));
    s = reduce(s, { kind: "char", char: "a", t: 0, modifier: "none" });
    s = reduce(s, { kind: "char", char: "b", t: 2500, modifier: "none" });
    const m = computeMetrics(s);
    expect(m.series).toHaveLength(3);
    expect(slowestKeys({ b: { attempts: 2, errors: 0, totalMs: 900, timedHits: 2 } }, 3)[0].key).toBe("b");
  });
});

describe("resolveKey", () => {
  const k = (over: Partial<KeyLike>): KeyLike => ({ key: "a", ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, altGraph: false, ...over });
  it("accepts plain, shifted and AltGr chars (Linux AltGraph state)", () => {
    expect(resolveKey(k({ key: "a" }))).toEqual({ kind: "char", char: "a", modifier: "none" });
    expect(resolveKey(k({ key: "A", shiftKey: true }))).toEqual({ kind: "char", char: "A", modifier: "shift" });
    expect(resolveKey(k({ key: "@", altGraph: true }))).toEqual({ kind: "char", char: "@", modifier: "altgr" });
  });
  it("treats Windows Ctrl+Alt as AltGr, not a shortcut", () => {
    expect(resolveKey(k({ key: "{", ctrlKey: true, altKey: true }))).toEqual({ kind: "char", char: "{", modifier: "altgr" });
  });
  it("accepts macOS Option chars and ignores real shortcuts", () => {
    expect(resolveKey(k({ key: "|", altKey: true }))).toEqual({ kind: "char", char: "|", modifier: "altgr" });
    expect(resolveKey(k({ key: "c", ctrlKey: true }))).toEqual({ kind: "ignore" });
    expect(resolveKey(k({ key: "c", metaKey: true }))).toEqual({ kind: "ignore" });
  });
  it("handles dead, backspace and named keys", () => {
    expect(resolveKey(k({ key: "Dead" })).kind).toBe("dead");
    expect(resolveKey(k({ key: "Backspace" })).kind).toBe("backspace");
    expect(resolveKey(k({ key: "Shift" })).kind).toBe("ignore");
    expect(resolveKey(k({ key: "Enter" })).kind).toBe("ignore");
  });
});
