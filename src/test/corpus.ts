import { readFileSync } from "node:fs";
import path from "node:path";
import type { Corpus, Lang } from "@/features/content/types";

/** Node-side corpus reader for tests and scripts (the app uses dynamic imports instead). */
export function readCorpus(lang: Lang): Corpus {
  const read = (name: string): string[] =>
    JSON.parse(
      readFileSync(path.resolve(__dirname, "../content", lang, `${name}.json`), "utf8"),
    ) as string[];
  return { words: read("words"), sentences: read("sentences"), passages: read("passages") };
}
