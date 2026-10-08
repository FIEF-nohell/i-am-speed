export interface SourceInfo {
  id: string;
  name: string;
  url: string;
  licence: string;
  licenceUrl: string;
  attribution: string;
  usedFor: string;
}

export const TATOEBA = {
  de: "https://downloads.tatoeba.org/exports/per_language/deu/deu_sentences.tsv.bz2",
  en: "https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2",
} as const;

export interface Book {
  id: number;
  lang: "de" | "en";
  title: string;
  author: string;
}

export const BOOKS: Book[] = [
  { id: 1342, lang: "en", title: "Pride and Prejudice", author: "Jane Austen" },
  { id: 11, lang: "en", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll" },
  { id: 1661, lang: "en", title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle" },
  { id: 98, lang: "en", title: "A Tale of Two Cities", author: "Charles Dickens" },
  { id: 84, lang: "en", title: "Frankenstein", author: "Mary Shelley" },
  { id: 1400, lang: "en", title: "Great Expectations", author: "Charles Dickens" },
  { id: 22367, lang: "de", title: "Die Verwandlung", author: "Franz Kafka" },
  { id: 5323, lang: "de", title: "Effi Briest", author: "Theodor Fontane" },
  { id: 53628, lang: "de", title: "Der Stechlin", author: "Theodor Fontane" },
  { id: 26686, lang: "de", title: "Unterm Birnbaum", author: "Theodor Fontane" },
  { id: 9200, lang: "de", title: "Klein Zaches, genannt Zinnober", author: "E. T. A. Hoffmann" },
  { id: 18148, lang: "de", title: "Casanovas Heimfahrt", author: "Arthur Schnitzler" },
  { id: 35312, lang: "de", title: "Aus dem Leben eines Taugenichts", author: "Joseph von Eichendorff" },
];

export const gutenbergUrl = (id: number): string =>
  `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;

export const SOURCES: SourceInfo[] = [
  {
    id: "tatoeba",
    name: "Tatoeba sentences (German, English)",
    url: "https://tatoeba.org",
    licence: "CC BY 2.0 FR",
    licenceUrl: "https://creativecommons.org/licenses/by/2.0/fr/",
    attribution: "Sentences from the Tatoeba Project, contributed by the Tatoeba community, CC BY 2.0 FR. Normalised and filtered; word frequencies counted from them.",
    usedFor: "Short sentences and the ranked word lists (together with the Gutenberg texts)",
  },
  {
    id: "gutenberg",
    name: "Project Gutenberg texts",
    url: "https://www.gutenberg.org",
    licence: "Public domain (authors died more than 70 years ago; US public domain)",
    licenceUrl: "https://www.gutenberg.org/policy/permission.html",
    attribution: "Paragraphs excerpted from public-domain eBooks of Project Gutenberg (titles listed in SOURCES.md). Gutenberg headers, licence text and trademark are not included.",
    usedFor: "Long passages and extra word frequency counts",
  },
];

export const gutenbergAltUrl = (id: number): string =>
  `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`;
