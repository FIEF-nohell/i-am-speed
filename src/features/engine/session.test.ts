import { describe, expect, it } from "vitest";
import { TypingSession } from "./session";
import { DEFAULT_ENGINE_CONFIG, type EngineConfig } from "./types";
import type { KeyLike } from "./input";

const key = (k: string): KeyLike => ({
  key: k,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  shiftKey: false,
  altGraph: false,
});

const config: EngineConfig = { ...DEFAULT_ENGINE_CONFIG, onError: "continue" };

function setup(target: string, pauseAfterMs: number | null = 5000) {
  let clock = 10_000;
  const session = new TypingSession(target, config, () => clock, null, {
    open: true,
    pauseAfterMs,
  });
  const press = (k: string, advance: number): void => {
    clock += advance;
    session.press(key(k));
  };
  const advance = (ms: number): void => {
    clock += ms;
  };
  return { session, press, advance };
}

describe("open-ended session", () => {
  it("does not finish at the end of the target and can be extended", () => {
    const { session, press } = setup("ab");
    press("a", 0);
    press("b", 100);
    expect(session.getState().status).toBe("running");
    session.extend(" cd");
    press(" ", 100);
    expect(session.getState().entries).toHaveLength(3);
    expect(session.getState().target).toBe("ab cd");
  });

  it("notifies subscribers on extend", () => {
    const { session } = setup("ab");
    let calls = 0;
    session.subscribe(() => calls++);
    session.extend("c");
    expect(calls).toBe(1);
  });

  it("finish ends at the time of the last key plus the live gap", () => {
    const { session, press, advance } = setup("abc def");
    press("a", 0);
    press("b", 200);
    advance(300);
    session.finish();
    expect(session.getState().status).toBe("finished");
    expect(session.getState().elapsed).toBe(500);
  });

  it("excludes pauses longer than the limit from the clock", () => {
    const { session, press } = setup("abcdef");
    press("a", 0);
    press("b", 200);
    press("c", 60_000);
    press("d", 200);
    const ks = session.getState().keystrokes;
    expect(ks.map((k) => k.t)).toEqual([0, 200, 200, 400]);
    expect(session.getState().elapsed).toBe(400);
  });

  it("keeps gaps at or under the limit", () => {
    const { session, press } = setup("abc");
    press("a", 0);
    press("b", 5000);
    expect(session.getState().keystrokes.map((k) => k.t)).toEqual([0, 5000]);
  });

  it("drops an idle tail longer than the limit when finishing", () => {
    const { session, press, advance } = setup("abc def");
    press("a", 0);
    press("b", 1000);
    advance(30_000);
    session.finish();
    expect(session.getState().elapsed).toBe(1000);
  });

  it("does not drop pauses when no limit is set", () => {
    const { session, press } = setup("abc", null);
    press("a", 0);
    press("b", 60_000);
    expect(session.getState().elapsed).toBe(60_000);
  });

  it("finish before the first key does nothing, restart clears the pause clock", () => {
    const { session, press } = setup("abc");
    session.finish();
    expect(session.getState().status).toBe("idle");
    press("a", 0);
    press("b", 20_000);
    session.restart();
    expect(session.getState().open).toBe(true);
    press("a", 0);
    press("b", 100);
    expect(session.getState().elapsed).toBe(100);
  });
});
