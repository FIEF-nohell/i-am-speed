import type { Corpus } from "@/features/content/types";
import { LOWER } from "@/features/lessons/charsets";

const LETTERS = new Set(LOWER);

/** One difficulty step: which slice of the ranked word list and how long the words may be. */
export interface Tier {
  from: number;
  to: number;
  minLen: number;
  maxLen: number;
}

/** Ranks are on a 30,000-word scale and are rescaled to the real list length. */
export const TIERS: readonly Tier[] = [
  { from: 0, to: 500, minLen: 2, maxLen: 4 },
  { from: 0, to: 1000, minLen: 3, maxLen: 5 },
  { from: 0, to: 3000, minLen: 4, maxLen: 6 },
  { from: 1000, to: 6000, minLen: 4, maxLen: 8 },
  { from: 3000, to: 12000, minLen: 5, maxLen: 9 },
  { from: 5000, to: 20000, minLen: 6, maxLen: 11 },
];

const FALLBACK = ["tag", "haus", "zeit", "wort"];

/** Lowercase letter-only words for every tier. A tier that ends up thin reuses the previous one. */
export function buildTierPools(corpus: Corpus): string[][] {
  const scale = corpus.words.length / 30000;
  const pools: string[][] = [];
  for (const t of TIERS) {
    const seen = new Set<string>();
    for (const w of corpus.words.slice(Math.floor(t.from * scale), Math.ceil(t.to * scale))) {
      const lower = w.toLowerCase();
      if (lower.length < t.minLen || lower.length > t.maxLen) continue;
      if ([...lower].every((c) => LETTERS.has(c))) seen.add(lower);
    }
    pools.push(seen.size >= 10 ? [...seen] : (pools[pools.length - 1] ?? FALLBACK));
  }
  return pools;
}
