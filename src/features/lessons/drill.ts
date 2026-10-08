import { int, pick, pickWeighted, type Rng } from "@/lib/rng";
import type { Corpus } from "@/features/content/types";
import { TextBuilder, fill, isLettersOnly } from "./builder";
import { LOWER } from "./charsets";
import type { Lesson } from "./types";

const PUNCT = ",.-";

function pseudoWord(rng: Rng, letters: string, focus: string): string {
  const len = int(rng, 2, 5);
  let out = "";
  for (let i = 0; i < len; i++) {
    let ch = focus && rng() < 0.55 ? pick(rng, [...focus]) : pick(rng, [...letters]);
    // No triple repeats, they read badly and train nothing.
    if (out.length >= 2 && out[out.length - 1] === ch && out[out.length - 2] === ch) ch = pick(rng, [...letters]);
    out += ch;
  }
  return out;
}

/** Keybr-style drill: real words from the unlocked set, weighted to the newest keys. */
export function generateDrill(lesson: Lesson, corpus: Corpus, rng: Rng): string {
  const allowedLetters = [...lesson.chars].filter((c) => LOWER.includes(c)).join("");
  const letterSet = new Set(allowedLetters);
  const focus = [...lesson.newChars].filter((c) => letterSet.has(c)).join("");
  const newPunct = [...lesson.newChars].filter((c) => PUNCT.includes(c)).join("");
  const punct = [...PUNCT].filter((c) => lesson.chars.includes(c)).join("");

  const real: string[] = [];
  for (const w of corpus.words) {
    const lower = w.toLowerCase();
    if (lower.length >= 2 && lower.length <= 9 && isLettersOnly(lower, letterSet)) real.push(lower);
    if (real.length >= 4000) break;
  }
  const hasFocus = (w: string): boolean => [...focus].some((c) => w.includes(c));
  const focusedCount = focus ? real.filter(hasFocus).length : real.length;
  // Pseudo-words only when real ones are scarce.
  const needPseudo = real.length < 30 || focusedCount < 10;
  const rank = new Map(real.map((w, i) => [w, i]));

  const builder = new TextBuilder(lesson.chars, lesson.lengthTarget);
  const word = (): string =>
    needPseudo && rng() < (real.length < 30 ? 1 : 0.5)
      ? pseudoWord(rng, allowedLetters, focus)
      : pickWeighted(rng, real, (w) => (focus && hasFocus(w) ? 9 : 1) / Math.sqrt(1 + (rank.get(w) ?? 0) / 300));

  fill(builder, () => {
    const w = word();
    if (!punct) return w;
    const roll = rng();
    const boost = newPunct ? 0.4 : 0.15;
    if (punct.includes("-") && roll < (newPunct.includes("-") ? 0.3 : 0.08)) return `${w}-${word()}`;
    if (punct.includes(",") && roll > 1 - (newPunct.includes(",") ? boost : 0.15)) return `${w},`;
    if (punct.includes(".") && roll > 0.5 && roll < 0.5 + (newPunct.includes(".") ? boost : 0.12)) return `${w}.`;
    return w;
  });
  return builder.text().replace(/-$/, "");
}
