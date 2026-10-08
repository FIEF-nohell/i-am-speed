/**
 * Build-time content pipeline. Network is used here only; the app ships static JSON.
 * Downloads are cached in the OS temp directory (never inside the repo).
 *   npm run fetch:content
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  acceptPassage,
  acceptSentence,
  buildWordList,
  gutenbergParagraphs,
  rankSentences,
  spread,
  tokenise,
  type Lang,
} from "./content/build";
import { FALLBACK } from "./content/fallback";
import { BOOKS, SOURCES, TATOEBA, gutenbergAltUrl, gutenbergUrl } from "./content/sources";
import { normaliseText } from "./content/normalise";

const CACHE = path.join(os.tmpdir(), "i-am-speed-content");
const OUT = path.resolve(import.meta.dirname, "../src/content");
const LANGS: Lang[] = ["de", "en"];
const WORD_LIMIT = 30000;
const SENTENCE_LIMIT = 4000;
const PASSAGES_PER_BOOK = 90;

async function download(url: string, file: string): Promise<string | null> {
  mkdirSync(CACHE, { recursive: true });
  const target = path.join(CACHE, file);
  if (existsSync(target)) return target;
  for (const attempt of [1, 2, 3]) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(180_000),
        headers: {
          "user-agent": "i-am-speed-content-script (+https://github.com/FIEF-nohell/i-am-speed)",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(target, Buffer.from(await res.arrayBuffer()));
      return target;
    } catch (err) {
      console.warn(`! download failed (${url}, try ${attempt}): ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  return null;
}

async function tatoebaSentences(lang: Lang): Promise<string[] | null> {
  const archive = await download(TATOEBA[lang], `${lang}.tsv.bz2`);
  if (!archive) return null;
  const tsv = execFileSync("bzip2", ["-dc", archive], { maxBuffer: 1 << 30 }).toString("utf8");
  return tsv
    .split("\n")
    .map((line) => line.split("\t")[2] ?? "")
    .filter(Boolean);
}

async function bookParagraphs(lang: Lang): Promise<string[] | null> {
  const picked: string[] = [];
  let ok = false;
  for (const book of BOOKS.filter((b) => b.lang === lang)) {
    const file =
      (await download(gutenbergUrl(book.id), `pg${book.id}.txt`)) ??
      (await download(gutenbergAltUrl(book.id), `pg${book.id}.txt`));
    if (!file) continue;
    ok = true;
    const good = gutenbergParagraphs(readFileSync(file, "utf8"))
      .map((p) => acceptPassage(p, lang))
      .filter((p): p is string => p !== null);
    picked.push(...spread(good, PASSAGES_PER_BOOK));
  }
  return ok ? picked : null;
}

async function buildLanguage(lang: Lang): Promise<void> {
  const fb = FALLBACK[lang];
  const raw = await tatoebaSentences(lang);
  const paragraphs = await bookParagraphs(lang);
  if (!raw) console.warn(`! ${lang}: using fallback sentences/words (Tatoeba unavailable)`);
  if (!paragraphs) console.warn(`! ${lang}: using fallback passages (Gutenberg unavailable)`);

  const wordTexts = [...(raw ?? fb.sentences), ...(paragraphs ?? fb.passages)];
  const words = buildWordList(wordTexts, lang, WORD_LIMIT, raw ? 3 : 1);
  const rank = new Map(words.map((w, i) => [w.toLowerCase(), i]));

  const accepted = (raw ?? fb.sentences)
    .map((s) => acceptSentence(s))
    .filter((s): s is string => s !== null);
  // Keep only sentences made of words that are in the ranked list, so lessons stay familiar.
  const familiar = accepted.filter((s) => tokenise(s).every((w) => rank.has(w.toLowerCase())));
  const sentences = rankSentences(familiar.length ? familiar : accepted, rank, SENTENCE_LIMIT);
  const passages = [
    ...new Set(
      (paragraphs ?? fb.passages)
        .map((p) => normaliseText(p))
        .filter((p): p is string => p !== null),
    ),
  ];

  mkdirSync(path.join(OUT, lang), { recursive: true });
  const write = (name: string, data: string[]): void =>
    writeFileSync(path.join(OUT, lang, `${name}.json`), JSON.stringify(data) + "\n");
  write("words", words);
  write("sentences", sentences);
  write("passages", passages);
  console.log(
    `${lang}: ${words.length} words, ${sentences.length} sentences, ${passages.length} passages`,
  );
}

async function main(): Promise<void> {
  for (const lang of LANGS) await buildLanguage(lang);
  writeFileSync(
    path.join(OUT, "sources.json"),
    JSON.stringify({ sources: SOURCES, books: BOOKS }, null, 2) + "\n",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
