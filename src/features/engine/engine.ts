import { fingerOf } from "@/features/keyboard/layout/atQwertz";
import {
  DEAD,
  type EngineConfig,
  type EngineInput,
  type EngineState,
  type Entry,
  type Keystroke,
} from "./types";

export function createState(target: string, config: EngineConfig): EngineState {
  return {
    target,
    config,
    status: "idle",
    entries: [],
    keystrokes: [],
    backspaces: 0,
    startedAt: null,
    elapsed: 0,
  };
}

export function restart(state: EngineState): EngineState {
  return createState(state.target, state.config);
}

export function errorKeystrokes(state: EngineState): number {
  return state.keystrokes.filter((k) => !k.correct).length;
}

function hasUncorrectedErrors(entries: readonly Entry[], from: number, to: number): boolean {
  for (let i = from; i < to; i++) if (!entries[i].correct) return true;
  return false;
}

/** Index where the word containing position `pos` begins (the char after the previous space). */
export function wordStart(target: string, pos: number): number {
  let i = pos;
  while (i > 0 && target[i - 1] !== " ") i--;
  return i;
}

function wordsAreClean(state: EngineState): boolean {
  return !hasUncorrectedErrors(state.entries, 0, state.entries.length);
}

function isDone(state: EngineState): boolean {
  if (state.entries.length < state.target.length) return false;
  // "stop at word end" cannot finish with an unfixed error in the last word.
  return state.config.onError !== "stopAtWordEnd" || wordsAreClean(state);
}

function record(state: EngineState, ks: Keystroke, entries: readonly Entry[]): EngineState {
  const next: EngineState = {
    ...state,
    entries,
    keystrokes: [...state.keystrokes, ks],
    status: "running",
    elapsed: ks.t,
  };
  if (state.config.onError === "restartAfterN" && !ks.correct) {
    if (errorKeystrokes(next) >= next.config.restartAfter) return { ...next, status: "failed" };
  }
  return isDone(next) ? { ...next, status: "finished" } : next;
}

function applyChar(
  state: EngineState,
  typed: string,
  t: number,
  modifier: Keystroke["modifier"],
  isDead: boolean,
): EngineState {
  const startedAt = state.startedAt ?? t;
  const rel = t - startedAt;
  const base: EngineState = { ...state, startedAt };
  const pos = state.entries.length;
  // Past the end (only reachable while "stop at word end" waits for fixes): ignore extra chars.
  if (pos >= state.target.length) return state;

  const expected = state.target[pos];
  const leavingDirty =
    state.config.onError === "stopAtWordEnd" &&
    expected === " " &&
    hasUncorrectedErrors(state.entries, wordStart(state.target, pos), pos);
  // "Stop at word end": even the right space is refused while the word still has errors.
  const correct = !isDead && typed === expected && !leavingDirty;
  const ks: Keystroke = {
    pos,
    expected,
    typed,
    t: rel,
    correct,
    finger: fingerOf(expected) ?? "thumb",
    modifier,
  };

  if (correct) return record(base, ks, [...state.entries, { typed, correct: true }]);

  // Wrong keystroke. A dead key never produces a character, so it never advances.
  const stay = (): EngineState => record(base, ks, state.entries);
  if (isDead) return stay();

  switch (state.config.onError) {
    case "block":
      return stay();
    case "stopAtWordEnd": {
      // The space ending a word is a wall: no extra chars, and no leaving with errors.
      return expected === " " || typed === " "
        ? stay()
        : record(base, ks, [...state.entries, { typed, correct: false }]);
    }
    case "continue":
    case "restartAfterN":
      return record(base, ks, [...state.entries, { typed, correct: false }]);
  }
}

function canBackspace(state: EngineState): boolean {
  const pos = state.entries.length;
  if (pos === 0 || state.config.backspace === "off") return false;
  if (state.config.backspace === "full") return true;
  return pos > wordStart(state.target, pos);
}

function applyBackspace(state: EngineState): EngineState {
  if (!canBackspace(state)) return state;
  return { ...state, entries: state.entries.slice(0, -1), backspaces: state.backspaces + 1 };
}

/** Pure reducer. Finished and failed states are terminal until `restart`. */
export function reduce(state: EngineState, input: EngineInput): EngineState {
  if (state.status === "finished" || state.status === "failed") return state;
  switch (input.kind) {
    case "char":
      return applyChar(state, input.char, input.t, input.modifier, false);
    case "dead":
      return applyChar(state, DEAD, input.t, input.modifier, true);
    case "backspace":
      return applyBackspace(state);
    case "end":
      return state.status === "running" && state.startedAt !== null
        ? { ...state, status: "finished", elapsed: Math.max(0, input.t - state.startedAt) }
        : state;
  }
}
