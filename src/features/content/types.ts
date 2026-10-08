export type Lang = "de" | "en";

export const LANGS: readonly Lang[] = ["de", "en"];

export const LANG_LABEL: Record<Lang, string> = { de: "deutsch", en: "english" };

/** Static text data for one language, produced by `npm run fetch:content`. */
export interface Corpus {
  /** Ranked by frequency, most common first. German nouns keep their capital. */
  words: readonly string[];
  /** Whole sentences, easiest first. */
  sentences: readonly string[];
  /** Longer paragraphs. */
  passages: readonly string[];
}
