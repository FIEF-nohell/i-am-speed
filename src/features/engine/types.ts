import type { Finger, Modifier } from "@/features/keyboard/layout/types";

export type OnError = "continue" | "block" | "stopAtWordEnd" | "restartAfterN";
export type BackspaceMode = "word" | "full" | "off";

export interface EngineConfig {
  onError: OnError;
  /** Used by "restartAfterN": number of mistakes (1 to 10) that fail the run. */
  restartAfter: number;
  backspace: BackspaceMode;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  onError: "block",
  restartAfter: 3,
  backspace: "word",
};

/** Typed value recorded for a dead key press. */
export const DEAD = "Dead";

export interface Keystroke {
  /** Index in the target the keystroke was aimed at. */
  pos: number;
  expected: string;
  typed: string;
  /** Milliseconds since the first keystroke. */
  t: number;
  correct: boolean;
  finger: Finger;
  modifier: Modifier;
}

export interface Entry {
  typed: string;
  correct: boolean;
}

export type Status = "idle" | "running" | "finished" | "failed";

export interface EngineState {
  target: string;
  config: EngineConfig;
  status: Status;
  /** One entry per typed position. entries.length is the caret position. */
  entries: readonly Entry[];
  keystrokes: readonly Keystroke[];
  backspaces: number;
  /** Absolute timestamp (ms) of the first keystroke. */
  startedAt: number | null;
  /** Milliseconds from the first keystroke to the end. */
  elapsed: number;
}

/** What the caller feeds in. Time is injected so the engine stays pure. */
export type EngineInput =
  | { kind: "char"; char: string; t: number; modifier: Modifier }
  | { kind: "dead"; t: number; modifier: Modifier }
  | { kind: "backspace"; t: number };
