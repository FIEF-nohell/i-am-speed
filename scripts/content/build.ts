import { BLOCKED_NAMES, isOffensive, normaliseText } from "./normalise";

export type Lang = "de" | "en";

const WORD_RE = /[A-Za-zÄÖÜäöüß]+(?:'[A-Za-z]+)*/g;
export const MAX_WORD_LENGTH = 14;

export function tokenise(text: string): string[] {
  return text.match(WORD_RE)?.filter((w) => !w.includes("'")) ?? [];
}

interface WordCount {
  total: number;
  surfaces: Map<string, number>;
  lower: number;
}

/** Ranked, canonical-case word list from raw sentence/paragraph texts. */
export function buildWordList(
  texts: Iterable<string>,
  lang: Lang,
  limit: number,
  minCount: number,
): string[] {
  const counts = new Map<string, WordCount>();
  for (const text of texts) {
    for (const w of tokenise(text)) {
      const key = w.toLowerCase();
      const c = counts.get(key) ?? { total: 0, surfaces: new Map(), lower: 0 };
      c.total++;
      c.surfaces.set(w, (c.surfaces.get(w) ?? 0) + 1);
      if (w === key) c.lower++;
      counts.set(key, c);
    }
  }
  const out: [string, number][] = [];
  for (const [key, c] of counts) {
    if (c.total < minCount || key.length > MAX_WORD_LENGTH) continue;
    if (key.length < 2 && !(lang === "en" && key === "a")) continue;
    if (BLOCKED_NAMES.has(key) || isOffensive(key)) continue;
    // English proper nouns are almost never lowercase. German nouns legitimately are capitalised.
    if (lang === "en" && key !== "i" && c.lower / c.total < 0.2) continue;
    // German nouns are capitalised everywhere; other words are only capitalised at sentence start.
    const mostly = [...c.surfaces.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const word = lang === "en" || c.lower / c.total >= 0.1 ? key : mostly;
    const normalised = normaliseText(word);
    if (normalised) out.push([normalised, c.total]);
  }
  return out
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

const SENTENCE_END = /[.!?]$/;

export function acceptSentence(raw: string, min = 28, max = 95): string | null {
  const s = normaliseText(raw);
  if (!s || s.length < min || s.length > max || !SENTENCE_END.test(s)) return null;
  if (isOffensive(s)) return null;
  if (tokenise(s).some((w) => BLOCKED_NAMES.has(w.toLowerCase()))) return null;
  if (/\d{5,}/.test(s) || (/["]/.test(s) && (s.match(/"/g)?.length ?? 0) % 2 === 1)) return null;
  return s;
}

/** Sentences easiest first: common words and short length score lower. */
export function rankSentences(
  sentences: string[],
  wordRank: Map<string, number>,
  limit: number,
): string[] {
  const score = (s: string): number => {
    const words = tokenise(s);
    if (words.length === 0) return 1e9;
    const rarity =
      words.reduce((a, w) => a + Math.log1p(wordRank.get(w.toLowerCase()) ?? 50000), 0) /
      words.length;
    return rarity * 10 + s.length / 8;
  };
  const unique = [...new Set(sentences)];
  return unique
    .map((s) => [s, score(s)] as const)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([s]) => s);
}

const OLD_GERMAN = /\b\w*(Thür|thun\b|Theil|\bseyn\b|\bsey\b|Rath\b|Thränen|Thier|giebt|Muth)\w*/;

export function acceptPassage(raw: string, lang: Lang): string | null {
  const s = normaliseText(raw);
  if (!s || s.length < 200 || s.length > 560 || !SENTENCE_END.test(s.replace(/["']$/, "")))
    return null;
  if (isOffensive(s) || /\d/.test(s) || /[A-Z]{5,}/.test(s)) return null;
  if (lang === "de" && OLD_GERMAN.test(s)) return null;
  if ((s.match(/"/g)?.length ?? 0) % 2 === 1) return null;
  return s;
}

/** Strip the Project Gutenberg header/footer and split into unwrapped paragraphs. */
export function gutenbergParagraphs(text: string): string[] {
  const start = text.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\n/);
  const end = text.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG EBOOK/);
  const startLen = text.slice(start).indexOf("\n") + 1;
  const body = start >= 0 ? text.slice(start + startLen, end > start ? end : undefined) : text;
  return body
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").replace(/_/g, "").trim())
    .filter(Boolean);
}

/** Evenly spread a pick of at most `count` items across the list. */
export function spread<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)]);
}
