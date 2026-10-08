import type { Corpus, Lang } from "./types";

const cache = new Map<Lang, Promise<Corpus>>();

async function loadUncached(lang: Lang): Promise<Corpus> {
  // Separate dynamic imports keep each language in its own chunk, loaded only when needed.
  const [words, sentences, passages] =
    lang === "de"
      ? await Promise.all([
          import("@/content/de/words.json"),
          import("@/content/de/sentences.json"),
          import("@/content/de/passages.json"),
        ])
      : await Promise.all([
          import("@/content/en/words.json"),
          import("@/content/en/sentences.json"),
          import("@/content/en/passages.json"),
        ]);
  return {
    words: words.default as string[],
    sentences: sentences.default as string[],
    passages: passages.default as string[],
  };
}

export function loadCorpus(lang: Lang): Promise<Corpus> {
  let p = cache.get(lang);
  if (!p) {
    p = loadUncached(lang);
    cache.set(lang, p);
  }
  return p;
}
