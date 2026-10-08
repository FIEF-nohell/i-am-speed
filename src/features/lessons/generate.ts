import { fingerOf } from "@/features/keyboard/layout/atQwertz";
import type { Corpus } from "@/features/content/types";
import { pick, type Rng } from "@/lib/rng";
import { TextBuilder, capitalise, digitsToken, fill, isLettersOnly } from "./builder";
import { DIGITS, LOWER } from "./charsets";
import { generateDrill } from "./drill";
import { dateToken, symbolToken } from "./templates";
import type { Lesson, LessonSpec } from "./types";

const LETTERS = new Set(LOWER);

/** Plain lowercase words (letters only) from a slice of the ranked list. */
function wordPool(corpus: Corpus, from: number, to: number, maxLen = 9): string[] {
  const out: string[] = [];
  for (const w of corpus.words.slice(from, to)) {
    const lower = w.toLowerCase();
    if (lower.length >= 2 && lower.length <= maxLen && isLettersOnly(lower, LETTERS)) out.push(lower);
  }
  return out.length ? out : ["haus", "tag", "zeit"];
}

/** Scale a [0, 4000) style band to the actual list length. */
function slice<T>(items: readonly T[], band: readonly [number, number], scaleTo: number): T[] {
  const k = items.length / scaleTo;
  return items.slice(Math.floor(band[0] * k), Math.max(Math.ceil(band[1] * k), Math.floor(band[0] * k) + 1));
}

function fromSentences(lesson: Lesson, pool: readonly string[], rng: Rng): string {
  const b = new TextBuilder(lesson.chars, lesson.lengthTarget);
  const list = pool.length ? pool : ["The key is calm."];
  fill(b, () => pick(rng, list));
  return b.text();
}

type Gen<S extends LessonSpec["type"]> = (lesson: Lesson, spec: Extract<LessonSpec, { type: S }>, corpus: Corpus, rng: Rng) => string;

const capsText: Gen<"caps"> = (lesson, spec, corpus, rng) => {
  if (spec.mode === "sentences") {
    const easy = corpus.sentences.slice(0, 1500);
    const withCaps = easy.filter((s) => /\s[A-ZÄÖÜ]/.test(s));
    return fromSentences(lesson, withCaps.length >= 20 ? withCaps : easy, rng);
  }
  const words = wordPool(corpus, 0, 3000, 8);
  const side = spec.mode === "rightHand" ? "right" : "left";
  const pool = spec.mode === "rightHand" || spec.mode === "leftHand" ? words.filter((w) => fingerOf(w[0])?.startsWith(side)) : words;
  const b = new TextBuilder(lesson.chars, lesson.lengthTarget);
  fill(b, () => {
    const w = pick(rng, pool);
    if (spec.mode === "both") return capitalise(w);
    if (spec.mode === "mixed") return rng() < 0.55 ? capitalise(w) : w;
    return rng() < 0.75 ? capitalise(w) : w;
  });
  return b.text();
};

const digitsText: Gen<"digits"> = (lesson, _spec, _corpus, rng) => {
  const digits = [...lesson.chars].filter((c) => DIGITS.includes(c)).join("");
  const b = new TextBuilder(lesson.chars, lesson.lengthTarget);
  fill(b, () => digitsToken(rng, digits, 1, 4));
  return b.text();
};

const datesText: Gen<"dates"> = (lesson, _spec, _corpus, rng) => {
  const b = new TextBuilder(lesson.chars, lesson.lengthTarget);
  fill(b, () => dateToken(rng));
  return b.text();
};

function numberAndWords(lesson: Lesson, corpus: Corpus, rng: Rng, from: number, to: number, digitShare: number): string {
  const words = wordPool(corpus, from, to, 7);
  const b = new TextBuilder(lesson.chars, lesson.lengthTarget);
  fill(b, () => {
    const roll = rng();
    if (roll >= digitShare) return pick(rng, words);
    const n = digitsToken(rng, DIGITS, 1, 4);
    return rng() < 0.5 ? `${pick(rng, words)}${n}` : n;
  });
  return b.text();
}

const symbolsText: Gen<"symbols"> = (lesson, spec, corpus, rng) => {
  const words = wordPool(corpus, 0, 2500, 7);
  const ctx = { rng, word: () => pick(rng, words) };
  const b = new TextBuilder(lesson.chars, lesson.lengthTarget);
  fill(b, () => (rng() < 0.15 ? ctx.word() : symbolToken(ctx, spec.symbols)));
  return b.text();
};

const wordsText: Gen<"words"> = (lesson, spec, corpus, rng) => {
  const scale = corpus.words.length / 30000;
  const pool = wordPool(corpus, Math.floor(spec.band[0] * scale), Math.ceil(spec.band[1] * scale), 14);
  const b = new TextBuilder(lesson.chars, lesson.lengthTarget);
  fill(b, () => {
    const w = pick(rng, pool);
    if (spec.variant === "lower") return w;
    if (spec.variant === "caps") return rng() < 0.6 ? capitalise(w) : w;
    return rng() < 0.3 ? digitsToken(rng, DIGITS, 1, 4) : w;
  });
  return b.text();
};

const sentencesText: Gen<"sentences"> = (lesson, spec, corpus, rng) => {
  let pool = slice(corpus.sentences, spec.band, 4000);
  if (spec.punctuationRich) {
    const rich = pool.filter((s) => /[,;:!?"()]/.test(s));
    if (rich.length >= 20) pool = rich;
  }
  return fromSentences(lesson, pool, rng);
};

const paragraphsText: Gen<"paragraphs"> = (lesson, spec, corpus, rng) => {
  if (spec.withNumbers) {
    const rich = corpus.sentences.filter((s) => /\d/.test(s) || (s.match(/[,;:!?"()]/g)?.length ?? 0) >= 2);
    return fromSentences(lesson, rich.length >= 20 ? rich : corpus.sentences, rng);
  }
  const sorted = [...corpus.passages].sort((a, b) => a.length - b.length);
  const pool = slice(sorted, spec.band, sorted.length);
  const first = pick(rng, pool);
  const b = new TextBuilder(lesson.chars, lesson.lengthTarget);
  b.push(first);
  fill(b, () => pick(rng, pool));
  return b.text();
};

/** Text for one attempt of a lesson. Never contains a character outside `lesson.chars`. */
export function generateLessonText(lesson: Lesson, corpus: Corpus, rng: Rng): string {
  const spec = lesson.spec;
  let text: string;
  switch (spec.type) {
    case "drill":
      text = generateDrill(lesson, corpus, rng);
      break;
    case "caps":
      text = capsText(lesson, spec, corpus, rng);
      break;
    case "digits":
      text = digitsText(lesson, spec, corpus, rng);
      break;
    case "dates":
      text = datesText(lesson, spec, corpus, rng);
      break;
    case "wordsWithDigits":
      text = numberAndWords(lesson, corpus, rng, 0, 2000, 0.45);
      break;
    case "symbols":
      text = symbolsText(lesson, spec, corpus, rng);
      break;
    case "words":
      text = wordsText(lesson, spec, corpus, rng);
      break;
    case "sentences":
      text = sentencesText(lesson, spec, corpus, rng);
      break;
    case "paragraphs":
      text = paragraphsText(lesson, spec, corpus, rng);
      break;
  }
  // Last line of defence, and a guarantee for the validator: an empty result becomes a safe drill.
  const allowed = new Set(lesson.chars);
  const clean = [...text].filter((c) => allowed.has(c)).join("").replace(/\s+/g, " ").trim();
  return clean || [...lesson.chars].filter((c) => c !== " ").slice(0, 8).join("");
}
