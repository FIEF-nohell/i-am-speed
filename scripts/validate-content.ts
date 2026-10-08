/**
 * Fails (exit 1) when content is missing, untypeable, or when any lesson can leave its allowed set.
 *   npm run validate:content
 */
import { LANGS } from "../src/features/content/types";
import { DEAD_CHARS, isTypeable } from "../src/features/keyboard/layout/atQwertz";
import { LESSONS, PHASES } from "../src/features/lessons/curriculum";
import { generateLessonText } from "../src/features/lessons/generate";
import { createRng } from "../src/lib/rng";
import { readCorpus } from "../src/test/corpus";

const MIN = { words: 20000, sentences: 3000, passages: 300 };
const SEEDS = 25;
const errors: string[] = [];
const fail = (msg: string): void => {
  errors.push(msg);
};

function untypeable(text: string): string | null {
  for (const ch of text) if (!isTypeable(ch) || DEAD_CHARS.has(ch)) return ch;
  return null;
}

for (const lang of LANGS) {
  const corpus = readCorpus(lang);
  for (const [name, min] of Object.entries(MIN) as [keyof typeof MIN, number][]) {
    if (corpus[name].length < min) fail(`${lang}.${name}: ${corpus[name].length} entries, need ${min}`);
    corpus[name].forEach((t, i) => {
      const bad = untypeable(t);
      if (bad) fail(`${lang}.${name}[${i}] has untypeable "${bad}" (U+${bad.codePointAt(0)?.toString(16)})`);
      if (t !== t.trim() || /\s{2,}/.test(t)) fail(`${lang}.${name}[${i}] has stray whitespace`);
    });
    if (new Set(corpus[name]).size !== corpus[name].length) fail(`${lang}.${name} has duplicates`);
  }
  if (corpus.words.some((w) => w.length > 14)) fail(`${lang}.words has an over-long word`);

  for (const phase of PHASES) {
    const lessons = LESSONS.filter((l) => l.phase === phase.id);
    if (lessons.length === 0) fail(`phase ${phase.id} has no lessons`);
    for (const lesson of lessons) {
      const allowed = new Set(lesson.chars);
      for (const ch of allowed) if (!isTypeable(ch)) fail(`${lesson.id}: allowed set has untypeable "${ch}"`);
      for (let seed = 1; seed <= SEEDS; seed++) {
        const text = generateLessonText(lesson, corpus, createRng(seed * 104729));
        if (text.length < Math.min(40, lesson.lengthTarget * 0.6)) fail(`${lesson.id} (${lang}) seed ${seed}: too little text (${text.length})`);
        for (const ch of text) {
          if (!allowed.has(ch)) {
            fail(`${lesson.id} (${lang}) seed ${seed}: "${ch}" is outside the allowed set`);
            break;
          }
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`Content validation failed (${errors.length}):`);
  for (const e of errors.slice(0, 40)) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`Content OK: ${LANGS.length} languages, ${LESSONS.length} lessons, ${SEEDS} seeds each.`);
