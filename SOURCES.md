# Sources and licences

The MIT licence in `LICENSE` covers the **code** only. Bundled text content (everything under `src/content/`) keeps the licence of its source, listed below. Fonts keep their own licence too.

Content is fetched at prepare time by `scripts/fetch-content.ts` (`npm run fetch:content`), normalised to characters typeable on the Austrian layout, filtered, and committed as static JSON. The app makes no network requests at runtime.

## Tatoeba sentences (German, English)

- Source: https://tatoeba.org (per-language sentence exports, `deu_sentences.tsv.bz2`, `eng_sentences.tsv.bz2`)
- Licence: CC BY 2.0 FR, https://creativecommons.org/licenses/by/2.0/fr/ (attribution required)
- Attribution: "Sentences from the Tatoeba Project, contributed by the Tatoeba community." Shown in the app on the about page.
- Used for: short sentences (phase 10 and part of phase 11) and, together with the Gutenberg texts, the ranked word frequency lists. Sentences are filtered (length, names, offensive terms, untypeable characters) and sorted by difficulty. Individual sentences are not modified beyond punctuation normalisation.

## Project Gutenberg texts

- Source: https://www.gutenberg.org (plain-text eBooks, headers and licence text stripped)
- Licence: the works are in the public domain in the United States (all authors died more than 70 years ago). The Project Gutenberg trademark and licence text are not included.
- Used for: long passages (phase 11) and extra word counts.

| Language | Title | Author | Gutenberg ID |
|----------|-------|--------|--------------|
| en | Pride and Prejudice | Jane Austen | 1342 |
| en | Alice's Adventures in Wonderland | Lewis Carroll | 11 |
| en | The Adventures of Sherlock Holmes | Arthur Conan Doyle | 1661 |
| en | A Tale of Two Cities | Charles Dickens | 98 |
| en | Frankenstein | Mary Shelley | 84 |
| en | Great Expectations | Charles Dickens | 1400 |
| de | Die Verwandlung | Franz Kafka | 22367 |
| de | Effi Briest | Theodor Fontane | 5323 |
| de | Der Stechlin | Theodor Fontane | 53628 |
| de | Unterm Birnbaum | Theodor Fontane | 26686 |
| de | Klein Zaches, genannt Zinnober | E. T. A. Hoffmann | 9200 |
| de | Casanovas Heimfahrt | Arthur Schnitzler | 18148 |

(Two further German candidates failed to download during the prepare step and are not used.)

## Fonts

- Geist and Geist Mono, SIL Open Font License 1.1 (`src/fonts/OFL.txt`), (c) The Geist Project Authors, https://github.com/vercel/geist-font. Self-hosted, loaded with `next/font/local`.

## Hand-written fallback content

`scripts/content/fallback.ts` holds a tiny hand-written set of words, sentences and passages that is used only when a download fails. It is original text by the project author, covered by the project's MIT licence. The committed `src/content/` was built from the full sources above.

## Layout and finger data

The Austrian QWERTZ (ISO, T1) layer table was cross-checked against the standard German/Austrian layout; the finger assignment follows DIN 2137 ten-finger typing. See `DECISIONS.md` (D9).
