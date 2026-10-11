import { describe, expect, it } from "vitest";
import { readCorpus } from "@/test/corpus";
import type { Corpus } from "@/features/content/types";
import { LANGS } from "@/features/content/types";
import { targetFor } from "@/features/keyboard/target";
import { createRng } from "@/lib/rng";
import { createZenStream } from "./zenText";

const EMPTY: Corpus = { words: [], sentences: [], passages: [] };

function take(corpus: Corpus, seed: number, calls = 5, min = 300): string {
  const stream = createZenStream(corpus, createRng(seed));
  return Array.from({ length: calls }, () => stream.next(min)).join("");
}

describe("zen stream", () => {
  for (const lang of LANGS) {
    it(`${lang}: long, typeable, no dead keys, no double spaces`, () => {
      const text = take(readCorpus(lang), 7, 20);
      expect(text.length).toBeGreaterThan(5000);
      for (const ch of new Set(text))
        expect(targetFor(ch), `char ${JSON.stringify(ch)}`).not.toBe(null);
      expect(text).not.toMatch(/ {2}/);
      expect(text.startsWith(" ")).toBe(false);
      expect(text.endsWith(" ")).toBe(false);
    });

    it(`${lang}: deterministic per seed and varied across seeds`, () => {
      const corpus = readCorpus(lang);
      expect(take(corpus, 3)).toBe(take(corpus, 3));
      expect(take(corpus, 3)).not.toBe(take(corpus, 4));
    });
  }

  it("honours the minimum length and joins chunks with one space", () => {
    const corpus = readCorpus("en");
    const stream = createZenStream(corpus, createRng(1));
    const first = stream.next(200);
    const second = stream.next(200);
    expect(first.length).toBeGreaterThanOrEqual(200);
    expect(second.length).toBeGreaterThanOrEqual(200);
    expect(second.startsWith(" ")).toBe(true);
    expect(second.startsWith("  ")).toBe(false);
  });

  it("falls back to common words, then to built-in text, and never returns empty", () => {
    const words: Corpus = { ...EMPTY, words: ["haus", "baum", "tisch", "Wald"] };
    const fromWords = take(words, 2);
    expect(fromWords.length).toBeGreaterThan(300);
    expect(new Set(fromWords.split(/ +/))).toEqual(new Set(words.words));
    expect(take(EMPTY, 2).length).toBeGreaterThan(300);
    expect(createZenStream(EMPTY, createRng(1)).next(0)).not.toBe("");
  });

  it("skips sentences with characters that cannot be typed", () => {
    const sentences = Array.from({ length: 20 }, (_, i) => `A fine plain sentence number ${i}.`);
    const bad = "This one has a “quote” that is not on the keyboard.";
    const text = take({ ...EMPTY, sentences: [...sentences, bad] }, 5, 20, 400);
    expect(text).not.toContain("“");
  });
});
