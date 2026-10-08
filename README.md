# i am speed

A calm touch-typing trainer for the **Austrian QWERTZ keyboard**. Structured lessons teach ten-finger typing one key at a time, with an on-screen keyboard that shows which finger goes where. German or English text, honest stats, no account, no backend. Everything stays in your browser.

Live: https://speed.nohelll.com

- Next.js (App Router), React, TypeScript strict, static export (`output: 'export'`).
- 67 lessons in 11 phases, all open from the start. Passing is 95% accuracy and is only a mark, never a gate.
- Free test: 15/30/60 seconds or 10/25/50 words.
- Four themes (dark, light, dusk, ember), one accent each. Data export and import as JSON.

## Run

Needs Node 20.19 or newer.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export to out/
npm start            # serves out/ locally (needs a build first)
```

## Verify

```bash
npm run check        # lint, prettier, typecheck, unit tests, content validation, build, brand check
npm run test:e2e     # Playwright smoke tests against out/ (run a build first)
SHOTS=1 npx playwright test e2e/screenshots.spec.ts   # screenshots into screenshots/ (git-ignored)
```

The first e2e run needs a browser: `npx playwright install chromium`.

## Regenerate content

Text content is fetched once at prepare time and committed as static JSON in `src/content/`. The app never touches the network at runtime.

```bash
npm run fetch:content     # downloads Tatoeba + Project Gutenberg into the OS temp dir, rebuilds src/content/
npm run validate:content  # fails on untypeable characters, thin content, or lessons that leave their allowed set
```

If a download fails, small hand-written fallback content (`scripts/content/fallback.ts`) is used so lessons are never empty, and validation fails until the full corpora are back. Sources and licences: `SOURCES.md`. The MIT licence covers the code only; bundled text keeps its own licence.

## Regenerate brand assets

Hand-authored SVGs live in `brand/`; derived files are committed so the build never depends on the script.

```bash
npm run brand   # themes.css from brand/palette.json, favicon set, apple icon, PWA icons, og.png, twitter.png
```

`brand/palette.json` is the single palette source. OG text is converted to paths from the Geist font files, so renders do not depend on system fonts.

## Add a lesson

1. Add a step to the right phase in `src/features/lessons/curriculum.ts`. Give it a title, description, the new characters, a length target and a `spec` (`drill`, `symbols`, `words`, `sentences` ...). Ids are `<phase-slug>-NN` by position and are stored in user history, so append rather than reorder.
2. The allowed character set is explicit data (`chars`). Drills accumulate the unlocked keys automatically; other lessons list their set. Generation never leaves it.
3. `npm run validate:content` and `npm test` check every lesson in both languages across many seeds.

A new kind of lesson needs a generator in `src/features/lessons/generate.ts` and a `LessonSpec` variant in `types.ts`.

## Layout and fingers

`src/features/keyboard/layout/atQwertz.ts` is the single table (characters per layer, finger, board geometry). Everything else is derived from it. Input is judged by the produced character (`event.key`), never `event.code`, so any OS layout works. Dead keys (`^`, `´`, backtick) are excluded from all text and count as a wrong keystroke if pressed. AltGr is detected via `getModifierState("AltGraph")` and the Windows Ctrl+Alt report.

## Motion

One system, defined once: `src/lib/motion.ts` (durations, easings, stagger, `tween`, reduced-motion check) mirrored by CSS variables in `src/styles/motion.css`. A unit test fails if the two drift apart.

- Durations: fast 120 ms (hover, press, caret step), base 200 ms (colour), slow 320 ms (page entrance, theme fade), reveal 900 ms (the one-time results count-up and chart draw). UI transitions stay under 400 ms.
- Only `transform` and `opacity` animate (plus colour on the theme fade). No layout properties, no layout shift (tabular figures, fixed chart heights).
- Nothing runs on the keystroke path. The caret and character states are plain CSS transitions on state the engine already produced; the engine never waits on an animation. `e2e/motion.spec.ts` checks key-handler cost and long tasks.
- Reduced motion: the system preference or the in-app "reduce motion" switch turns durations to 0 and removes entrance animations; counts show their final value at once and charts do not draw.
- The results reveal is skippable: any key press or click jumps to the final numbers.

Add an animation: use the `.enter` class (optionally `style={staggerStyle(i)}`) for entrances, `--dur-*` and `--ease-*` variables for CSS transitions, `tween()` for number counting. Add a new duration or easing in `motion.ts` and `motion.css` together, never inline. Review aids: `MOTION=1 npx playwright test e2e/motion-capture.spec.ts` writes a video and frame sequences to `screenshots/`.

## Deploy (Vercel)

No special configuration. Standard settings:

- Framework preset: Next.js (auto-detected)
- Build command: `npm run build`
- Output directory: `out` (static export; the Next.js preset picks it up)
- Install command: `npm install`
- Optional env var: `NEXT_PUBLIC_SITE_URL` (defaults to `https://speed.nohelll.com`; used for canonical, OG, sitemap, robots)

Pushing to `main` deploys to production. The CI workflow is stored at `ci/github-actions-ci.yml` because the token used for the first push could not create workflow files. To enable it: `mkdir -p .github/workflows && git mv ci/github-actions-ci.yml .github/workflows/ci.yml` and push with a token that has the `workflow` scope. It runs `npm run check` and the e2e tests on every push and PR.

## Structure

```
src/app/                  routes (static)
src/features/keyboard     layout table, on-screen keyboard
src/features/engine       typing state machine and metrics (pure, tested)
src/features/lessons      curriculum and text generation (pure, tested)
src/features/content      corpus types and lazy loading
src/features/storage      versioned localStorage schema, migration, store
src/features/{typing,results,stats,settings}   screens
src/components/ui         Button, Toggle, Select, Slider, Section, Row, KeyCap, Stat, ChartFrame ...
src/lib                   rng, colour maths, motion
scripts/                  content, brand and check scripts
brand/                    SVG sources and palette
```

## Licence

MIT for the code (`LICENSE`). Text content and fonts keep their own licences, see `SOURCES.md`.
