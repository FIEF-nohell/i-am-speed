import { describe, expect, it } from "vitest";
import { countWords, freeInputOf, FreeTypeSession, type FreeInput } from "./freeType";
import type { KeyLike } from "./input";

const key = (k: string, extra: Partial<KeyLike> = {}): KeyLike => ({
  key: k,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  shiftKey: false,
  altGraph: false,
  ...extra,
});

function setup(pauseAfterMs: number | null = 5000) {
  let clock = 10_000;
  const session = new FreeTypeSession(() => clock, pauseAfterMs);
  const type = (s: string, step = 100): void => {
    for (const ch of s) {
      clock += step;
      session.press(ch === "\n" ? { kind: "newline" } : { kind: "char", char: ch });
    }
  };
  const send = (input: FreeInput, advance = 100): ReturnType<FreeTypeSession["press"]> => {
    clock += advance;
    return session.press(input);
  };
  const wait = (ms: number): void => {
    clock += ms;
  };
  return { session, type, send, wait };
}

describe("freeInputOf", () => {
  it("maps printable characters including AltGr and umlauts", () => {
    expect(freeInputOf(key("a"))).toEqual({ kind: "char", char: "a" });
    expect(freeInputOf(key("ä"))).toEqual({ kind: "char", char: "ä" });
    expect(freeInputOf(key("@", { altGraph: true }))).toEqual({ kind: "char", char: "@" });
    expect(freeInputOf(key("{", { ctrlKey: true, altKey: true }))).toEqual({
      kind: "char",
      char: "{",
    });
    expect(freeInputOf(key(" "))).toEqual({ kind: "char", char: " " });
  });
  it("maps enter and backspace", () => {
    expect(freeInputOf(key("Enter"))).toEqual({ kind: "newline" });
    expect(freeInputOf(key("Backspace"))).toEqual({ kind: "backspace" });
    expect(freeInputOf(key("Backspace", { ctrlKey: true }))).toEqual({ kind: "deleteWord" });
    expect(freeInputOf(key("Backspace", { altKey: true }))).toEqual({ kind: "deleteWord" });
  });
  it("ignores dead keys, Tab, Escape, modifiers and shortcuts", () => {
    for (const k of ["Dead", "Tab", "Escape", "Shift", "Control", "AltGraph", "F5", "Unidentified"])
      expect(freeInputOf(key(k))).toBeNull();
    expect(freeInputOf(key("r", { ctrlKey: true }))).toBeNull();
    expect(freeInputOf(key("c", { metaKey: true }))).toBeNull();
    expect(freeInputOf(key("Enter", { ctrlKey: true }))).toBeNull();
  });
});

describe("FreeTypeSession buffer", () => {
  it("starts idle and empty, appends, newlines and backspaces", () => {
    const { session, type, send } = setup();
    expect(session.getState()).toEqual({ text: "", chars: 0, status: "idle" });
    type("ab");
    send({ kind: "newline" });
    type("ä");
    expect(session.getState().text).toBe("ab\nä");
    expect(session.getState().chars).toBe(4);
    expect(session.getState().status).toBe("running");
    expect(send({ kind: "backspace" })).toBe("delete");
    expect(session.getState().text).toBe("ab\n");
  });
  it("backspace on an empty buffer does nothing and does not start the clock", () => {
    const { session, send } = setup();
    expect(send({ kind: "backspace" })).toBeNull();
    expect(send({ kind: "deleteWord" })).toBeNull();
    expect(session.getState().status).toBe("idle");
  });
  it("deletes whole words", () => {
    const { session, type, send } = setup();
    type("one two  ");
    send({ kind: "deleteWord" });
    expect(session.getState().text).toBe("one ");
    send({ kind: "deleteWord" });
    expect(session.getState().text).toBe("");
    expect(session.getState().chars).toBe(0);
  });
  it("removes an astral character as one", () => {
    const { session, type, send } = setup();
    type("a\u{1F600}");
    expect(session.getState().chars).toBe(2);
    send({ kind: "backspace" });
    expect(session.getState().text).toBe("a");
  });
  it("notifies subscribers once per change and ignores input after finish", () => {
    const { session, type, send } = setup();
    let calls = 0;
    session.subscribe(() => calls++);
    type("ab");
    send({ kind: "backspace" });
    expect(calls).toBe(3);
    session.finish();
    expect(calls).toBe(4);
    expect(send({ kind: "char", char: "x" })).toBeNull();
    expect(session.getState().text).toBe("a");
  });
  it("counts words by whitespace", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  \n ")).toBe(0);
    expect(countWords("a  b\nc\td ")).toBe(4);
  });
});

describe("FreeTypeSession clock", () => {
  it("measures from the first press, not from creation", () => {
    const { session, type } = setup();
    type("ab", 200);
    session.finish();
    expect(session.metrics().durationMs).toBe(200);
  });
  it("excludes gaps over the pause limit, keeps gaps at the limit", () => {
    const { session, type, wait } = setup();
    type("a", 100);
    type("b", 5000);
    type("c", 60_000);
    type("d", 100);
    wait(0);
    session.finish();
    expect(session.metrics().durationMs).toBe(5100);
  });
  it("drops an idle tail longer than the limit and keeps a short one", () => {
    const a = setup();
    a.type("ab", 1000);
    a.wait(30_000);
    a.session.finish();
    expect(a.session.metrics().durationMs).toBe(1000);
    const b = setup();
    b.type("ab", 1000);
    b.wait(300);
    b.session.finish();
    expect(b.session.metrics().durationMs).toBe(1300);
  });
  it("does not drop pauses without a limit", () => {
    const { session, type } = setup(null);
    type("a", 0);
    type("b", 60_000);
    session.finish();
    expect(session.metrics().durationMs).toBe(60_000);
  });
  it("finish before any press does nothing", () => {
    const { session } = setup();
    session.finish();
    expect(session.getState().status).toBe("idle");
  });
});

describe("FreeTypeSession metrics", () => {
  it("net counts what remains, raw counts every added character", () => {
    const { session, type, send } = setup(null);
    // 60 added in 60 s, then 10 deleted: first press at 0 s is the clock origin.
    type("a", 0);
    for (let i = 0; i < 59; i++) type("a", 1000);
    for (let i = 0; i < 10; i++) send({ kind: "backspace" }, 0);
    session.finish();
    const m = session.metrics();
    expect(m.durationMs).toBe(59_000);
    expect(m.typedChars).toBe(50);
    expect(m.netWpm).toBeCloseTo(50 / 5 / (59 / 60), 6);
    expect(m.rawWpm).toBeCloseTo(60 / 5 / (59 / 60), 6);
  });
  it("is not applicable for accuracy and produces no per-key data", () => {
    const { session, type } = setup();
    type("hello world", 150);
    session.finish();
    const m = session.metrics();
    expect(m.accuracy).toBe(100);
    expect(m.errors).toBe(0);
    expect(m.correctChars).toBe(m.typedChars);
    expect(m.perKey).toEqual({});
    expect(m.perFinger).toEqual({});
    expect(m.series.every((p) => p.errors === 0)).toBe(true);
  });
  it("builds a per-second series from net and raw counts", () => {
    const { session, type, send } = setup(null);
    type("a", 0);
    type("bcd", 400); // t = 400, 800, 1200
    send({ kind: "backspace" }, 100); // t = 1300
    session.finish();
    const [first, second] = session.metrics().series;
    expect(first.second).toBe(1);
    // By 1 s: 3 added (t 0, 400, 800), length 3, over 1000 ms.
    expect(first.raw).toBeCloseTo(3 / 5 / (1 / 60), 6);
    expect(first.wpm).toBeCloseTo(3 / 5 / (1 / 60), 6);
    // By the end (1300 ms): 4 added, 3 remain.
    expect(second.raw).toBeCloseTo(4 / 5 / (1300 / 60000), 6);
    expect(second.wpm).toBeCloseTo(3 / 5 / (1300 / 60000), 6);
  });
  it("gives a steady typist high consistency and stays within 0..100", () => {
    const { session, type } = setup(null);
    type("a", 0);
    type("a".repeat(50), 200);
    session.finish();
    const m = session.metrics();
    expect(m.consistency).toBeGreaterThan(90);
    expect(m.consistency).toBeLessThanOrEqual(100);
  });
  it("an empty session has zero speed", () => {
    const { session } = setup();
    const m = session.metrics();
    expect(m.netWpm).toBe(0);
    expect(m.durationMs).toBe(0);
    expect(m.series).toHaveLength(1);
  });
});
