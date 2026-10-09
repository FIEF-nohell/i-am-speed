import type { Lang } from "@/features/content/types";
import type { BackspaceMode, EngineConfig, OnError } from "@/features/engine/types";

export type ThemeId = "dark" | "light" | "dusk" | "ember";
export type FontSize = "sm" | "md" | "lg" | "xl";
export type CaretStyle = "line" | "block" | "underline";
export type KeyboardVisibility = "phases1to8" | "always" | "never";
export type TestMode =
  { kind: "time"; value: 15 | 30 | 60 } | { kind: "words"; value: 10 | 25 | 50 };

export interface Settings {
  lang: Lang;
  onError: OnError;
  restartAfter: number;
  backspace: BackspaceMode;
  theme: ThemeId;
  fontSize: FontSize;
  caret: CaretStyle;
  keyboard: KeyboardVisibility;
  colorByFinger: boolean;
  highlightNext: boolean;
  fingerHint: boolean;
  sound: boolean;
  reduceMotion: boolean;
  testMode: TestMode;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: "de",
  onError: "block",
  restartAfter: 3,
  backspace: "word",
  theme: "dark",
  fontSize: "md",
  caret: "line",
  keyboard: "phases1to8",
  colorByFinger: true,
  highlightNext: true,
  fingerHint: true,
  sound: false,
  reduceMotion: false,
  testMode: { kind: "time", value: 30 },
};

export const THEMES: readonly ThemeId[] = ["dark", "light", "dusk", "ember"];
const ON_ERROR: readonly OnError[] = ["continue", "block", "stopAtWordEnd", "restartAfterN"];
const BACKSPACE: readonly BackspaceMode[] = ["word", "full", "off"];
const FONT_SIZES: readonly FontSize[] = ["sm", "md", "lg", "xl"];
const CARETS: readonly CaretStyle[] = ["line", "block", "underline"];
const KEYBOARD: readonly KeyboardVisibility[] = ["phases1to8", "always", "never"];
const TIME_VALUES = [15, 30, 60] as const;
const WORD_VALUES = [10, 25, 50] as const;

function oneOf<T>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

function sanitiseTestMode(v: unknown): TestMode {
  const o = (v ?? {}) as { kind?: unknown; value?: unknown };
  if (o.kind === "words") return { kind: "words", value: oneOf(o.value, WORD_VALUES, 25) };
  return { kind: "time", value: oneOf(o.value, TIME_VALUES, 30) };
}

/** Accepts anything, returns a complete valid Settings. Unknown or invalid fields fall back. */
export function sanitiseSettings(input: unknown): Settings {
  const s = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const restart = typeof s.restartAfter === "number" ? Math.round(s.restartAfter) : d.restartAfter;
  return {
    lang: oneOf<Lang>(s.lang, ["de", "en"], d.lang),
    // Caret-advancing modes were removed: a wrong key never moves the caret past the letter.
    onError: oneOf(
      s.onError === "continue" || s.onError === "stopAtWordEnd" ? "block" : s.onError,
      ON_ERROR,
      d.onError,
    ),
    restartAfter: Math.min(10, Math.max(1, restart)),
    backspace: oneOf(s.backspace, BACKSPACE, d.backspace),
    theme: oneOf(s.theme, THEMES, d.theme),
    fontSize: oneOf(s.fontSize, FONT_SIZES, d.fontSize),
    caret: oneOf(s.caret, CARETS, d.caret),
    keyboard: oneOf(s.keyboard, KEYBOARD, d.keyboard),
    colorByFinger: bool(s.colorByFinger, d.colorByFinger),
    highlightNext: bool(s.highlightNext, d.highlightNext),
    fingerHint: bool(s.fingerHint, d.fingerHint),
    sound: bool(s.sound, d.sound),
    reduceMotion: bool(s.reduceMotion, d.reduceMotion),
    testMode: sanitiseTestMode(s.testMode),
  };
}

export function engineConfigOf(s: Settings): EngineConfig {
  return { onError: s.onError, restartAfter: s.restartAfter, backspace: s.backspace };
}

/** Should the on-screen keyboard show for a lesson in this phase? */
export function keyboardVisible(s: Settings, phase: number | null): boolean {
  if (s.keyboard === "never") return false;
  if (s.keyboard === "always") return true;
  return phase !== null && phase <= 8;
}
