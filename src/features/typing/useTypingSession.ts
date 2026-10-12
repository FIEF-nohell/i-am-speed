"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { TypingSession } from "@/features/engine/session";
import { keyLikeFromEvent } from "@/features/engine/input";
import type { EngineConfig, EngineState } from "@/features/engine/types";
import type { KeySoundHandler, KeySoundKind } from "@/features/sound/types";

interface Options {
  text: string | null;
  config: EngineConfig;
  /** Called on Tab or Escape. */
  onRestart: () => void;
  /** Called on Escape instead of onRestart (Tab still restarts). */
  onEscape?: () => void;
  /** Called after every consumed key press, outside the engine (sound). */
  onKey?: KeySoundHandler;
  /** Time limit in ms for timed tests. */
  limitMs?: number | null;
  /** Called when "restart after N" fails the attempt. */
  onFail?: () => void;
  /** Bumped by the caller to start a fresh session with the same text. */
  runId: number;
}

const EMPTY_STATE: EngineState = {
  target: "",
  config: { onError: "block", restartAfter: 3, backspace: "word" },
  status: "idle",
  entries: [],
  keystrokes: [],
  backspaces: 0,
  startedAt: null,
  elapsed: 0,
};

export function isFormTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

/** What a consumed key did, from the state before and after. O(1). Null when nothing was recorded. */
function soundKind(before: EngineState, after: EngineState): KeySoundKind | null {
  if (after.backspaces > before.backspaces) return "backspace";
  if (after.keystrokes.length === before.keystrokes.length) return null;
  const last = after.keystrokes[after.keystrokes.length - 1];
  if (!last.correct) return "error";
  return last.expected === " " ? "space" : "key";
}

/** Owns a TypingSession, wires the global key listener, and tracks physically held keys. */
export function useTypingSession({
  text,
  config,
  onRestart,
  onEscape,
  onKey,
  onFail,
  runId,
  limitMs = null,
}: Options) {
  const { onError, restartAfter, backspace } = config;
  const session = useMemo(
    () =>
      text
        ? new TypingSession(text, { onError, restartAfter, backspace }, undefined, limitMs)
        : null,
    // runId deliberately restarts the session with identical text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, onError, restartAfter, backspace, runId, limitMs],
  );
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());

  const state = useSyncExternalStore(
    session ? session.subscribe : noopSubscribe,
    session ? session.getState : () => EMPTY_STATE,
    () => EMPTY_STATE,
  );

  useEffect(() => {
    if (!session || !onFail) return;
    return session.subscribe(() => {
      if (session.getState().status === "failed") onFail();
    });
  }, [session, onFail]);

  useEffect(() => {
    if (!session) return;
    const down = (e: KeyboardEvent): void => {
      if (isFormTarget(e.target)) return;
      setPressed((p) => (p.has(e.code) ? p : new Set(p).add(e.code)));
      if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        if (e.key === "Escape" && onEscape) onEscape();
        else onRestart();
        return;
      }
      // Held keys: only backspace auto-repeats. A held letter would otherwise count as a burst of mistakes.
      if (e.repeat && e.key !== "Backspace") {
        e.preventDefault();
        return;
      }
      const before = session.getState();
      if (session.press(keyLikeFromEvent(e))) {
        e.preventDefault();
        const kind = onKey ? soundKind(before, session.getState()) : null;
        if (kind) onKey?.(kind);
      }
    };
    const up = (e: KeyboardEvent): void =>
      setPressed((p) => {
        if (!p.has(e.code)) return p;
        const n = new Set(p);
        n.delete(e.code);
        return n;
      });
    const clear = (): void => setPressed(new Set());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [session, onRestart, onEscape, onKey]);

  return { session, state, pressed };
}

const noopSubscribe = (): (() => void) => () => {};
