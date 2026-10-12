"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { FreeTypeSession, freeInputOf, type FreeTypeState } from "@/features/engine/freeType";
import { keyLikeFromEvent } from "@/features/engine/input";
import type { KeySoundHandler } from "@/features/sound/types";
import { isFormTarget } from "./useTypingSession";

interface Options {
  /** Called on Escape. */
  onEscape: () => void;
  /** Called after every consumed key press, outside the session (sound). Never receives "error". */
  onKey?: KeySoundHandler;
  /** Idle gaps longer than this are removed from the clock. */
  pauseAfterMs: number;
}

const EMPTY: FreeTypeState = { text: "", chars: 0, status: "idle" };

/** Owns a FreeTypeSession and the global key listener. Tab, dead keys and modifiers are ignored. */
export function useFreeTypeSession({ onEscape, onKey, pauseAfterMs }: Options) {
  const session = useMemo(() => new FreeTypeSession(undefined, pauseAfterMs), [pauseAfterMs]);
  const state = useSyncExternalStore(session.subscribe, session.getState, () => EMPTY);

  useEffect(() => {
    const down = (e: KeyboardEvent): void => {
      if (isFormTarget(e.target)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        return;
      }
      const input = freeInputOf(keyLikeFromEvent(e));
      if (!input) return;
      e.preventDefault();
      // Held keys: only backspace auto-repeats, so a stuck key cannot flood the text.
      if (e.repeat && input.kind !== "backspace" && input.kind !== "deleteWord") return;
      const changed = session.press(input);
      if (!changed || !onKey) return;
      if (changed === "delete") onKey("backspace");
      else
        onKey(
          input.kind === "newline" || (input.kind === "char" && input.char === " ")
            ? "space"
            : "key",
        );
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [session, onEscape, onKey]);

  return { session, state };
}
