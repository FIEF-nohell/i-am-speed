export type LessonSpec =
  /** Keybr-style: real words from the unlocked key set, weighted to the newest keys. */
  | { type: "drill"; newChars: string }
  | { type: "caps"; mode: "rightHand" | "leftHand" | "mixed" | "both" | "sentences" }
  | { type: "digits" }
  | { type: "dates" }
  | { type: "wordsWithDigits" }
  | { type: "symbols"; symbols: string }
  | { type: "words"; band: readonly [number, number]; variant: "lower" | "caps" | "numbers" }
  | { type: "sentences"; band: readonly [number, number]; punctuationRich?: boolean }
  | { type: "paragraphs"; band: readonly [number, number]; withNumbers?: boolean };

export interface Lesson {
  /** Stable. Stored in the user's history, never rename. */
  id: string;
  phase: number;
  title: string;
  description: string;
  /** Every character the generated text may contain. Generation never leaves this set. */
  chars: string;
  /** Characters this lesson introduces (shown in the guide as "new"). */
  newChars: string;
  /** Approximate number of characters to type. */
  lengthTarget: number;
  spec: LessonSpec;
}

export interface Phase {
  id: number;
  slug: string;
  title: string;
  description: string;
}

/** A lesson passes at this accuracy or better. */
export const PASS_ACCURACY = 95;
