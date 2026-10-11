import type { Corpus } from "@/features/content/types";
import { isTypeable } from "@/features/keyboard/layout/atQwertz";
import { int, pick, type Rng } from "@/lib/rng";

const MIN_SENTENCE = 15;
const MAX_SENTENCE = 160;
/** Fewer usable sentences than this and the stream builds lines from common words instead. */
const MIN_POOL = 8;
const FALLBACK = ["the quick brown fox jumps over the lazy dog", "ein ruhiger Tag am See"];

export interface ZenStream {
  /**
   * Text to append, at least `minChars` long and never empty. Sentences are joined with single
   * spaces; every call after the first starts with a space so appended chunks join cleanly.
   */
  next(minChars: number): string;
}

const typeable = (s: string): boolean => [...s].every(isTypeable);

function sentencePool(corpus: Corpus): string[] {
  return corpus.sentences
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length >= MIN_SENTENCE && s.length <= MAX_SENTENCE && typeable(s));
}

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = int(rng, 0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A line of common words, used when a corpus has too few sentences. */
function wordLine(words: readonly string[], rng: Rng): string {
  const count = int(rng, 6, 12);
  return Array.from({ length: count }, () => pick(rng, words)).join(" ");
}

/** Endless text for Zen: shuffled sentences, deterministic for a given seed. */
export function createZenStream(corpus: Corpus, rng: Rng): ZenStream {
  const pool = sentencePool(corpus);
  const words = corpus.words.slice(0, 2000).filter((w) => w.length <= 10 && typeable(w));
  const useSentences = pool.length >= MIN_POOL;
  let queue: string[] = [];
  let started = false;
  let last = "";

  const sentence = (): string => {
    if (!useSentences) return words.length ? wordLine(words, rng) : pick(rng, FALLBACK);
    if (queue.length === 0) queue = shuffled(pool, rng);
    let s = queue.pop() as string;
    // A reshuffle can repeat the previous sentence at the seam.
    if (s === last && queue.length > 0) s = queue.pop() as string;
    last = s;
    return s;
  };

  return {
    next(minChars) {
      let out = started ? "" : sentence();
      while (out.length < minChars || out.length === 0) out += (out ? " " : "") + sentence();
      const chunk = started ? ` ${out}` : out;
      started = true;
      return chunk;
    },
  };
}
