# i am speed

A calm touch-typing trainer for the **Austrian QWERTZ keyboard**. Structured lessons teach ten-finger typing one key at a time, with an on-screen keyboard that shows which finger goes where. German or English text, honest stats. No account needed and nothing leaves your browser; optional sign-in syncs your progress across devices.

Live: https://speed.nohelll.com

- Next.js (App Router), React, TypeScript strict, static export (`output: 'export'`).
- 67 lessons in 11 phases, all open from the start. Passing is 95% accuracy and is only a mark, never a gate.
- Free test: 15/30/60 seconds or 10/25/50 words.
- Zen mode: free type on a blank canvas, no target text, saved on Esc (see below).
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
npm run test:rules   # Firestore security rules against the emulator (needs Java, not part of check)
SHOTS=1 npx playwright test e2e/screenshots.spec.ts   # screenshots into screenshots/ (git-ignored)
```

The first e2e run needs a browser: `npx playwright install chromium`.

## Cloud sync (optional)

Anonymous use is local only: no account, no network requests, no Firebase code loaded. Signing in (email and password, or Google) syncs settings, attempt history and stats across devices. Local storage stays the source of truth; the account is a background copy. See `DECISIONS.md` D13 to D15.

- What syncs: settings, the last 500 attempts, and lifetime stats (per-device contributions that merge without double counting). The full detail of your latest result stays on the device.
- Config: the public Firebase web config lives in `src/config/firebase.ts`. It is not a secret; access is enforced by `firestore.rules` (owner only, shape validated). Default project: `speed-pwa` (`.firebaserc`).
- Deploy rules and indexes: `firebase deploy --only firestore:rules,firestore:indexes`.
- Rules tests: `npm run test:rules` starts the Firestore emulator and needs Java (JDK 21 or newer is safest). It is not part of `npm run check`.
- Authorized domains in the Firebase console (Authentication, Settings): `speed.nohelll.com` and `localhost`. Google sign-in uses a popup.
- Firebase code is only reached through dynamic imports under `src/features/firebase/`; an ESLint rule keeps it out of the initial bundle.

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

## Zen mode

`/zen/` (linked from the nav and the test toolbar) is free type: a blank canvas with a caret and no text to copy. Whatever you type appears as your own text; `Enter` starts a new line, `Backspace` deletes a character (`Ctrl` or `Alt` with it deletes a word), `Tab` and dead keys do nothing. Nothing is a target, so nothing is wrong: no error colours, no error sound, no accuracy. Once you type, the header and footer fade out and only a small `esc` hint remains. `Esc` finishes and opens the results page. A session is saved only if at least five characters are left (otherwise `Esc` goes back to the test). Results show speed, words, raw speed, consistency, time and characters. A session counts toward time typed, characters, attempts and recent attempts, and never toward lessons, accuracy or per-key and per-finger stats. Pauses over 5 s do not count as time. Only the newest few thousand characters are rendered, so long sessions stay as cheap as short ones. Details: DECISIONS.md D17 and D19.

## Sound

Key sounds are off by default (settings, "sound"). They are synthesised in the browser, with four packs (`soft`, `clicky`, `typewriter`, `bubble`), a volume and an optional error sound; nothing is downloaded and no samples are used. The audio context is created on your first click or key press after you switch sounds on. Code: `src/features/sound/` (`synth.ts` renders, `packs.ts` holds the recipes, `player.ts` plays). Details: DECISIONS.md D18.

## Design system

Tokens live in `brand/palette.json` (colours per theme, run `npm run brand`), `src/styles/globals.css` (space, type, radius, control sizes, page widths) and `src/styles/motion.css`. Primitives are in `src/components/ui/`: `Panel`, `PageHeader`, `Button` and `ButtonLink` (`primary`, `secondary`, `ghost`, `danger`), `Field` with `TextInput`, `Select`, `Segmented` (`text` or `pill`), `Toggle`, `Slider`, `Row`, `Notice`, `EmptyState`, `Stat`, `ChartFrame`, `Kbd`, `KeyCap`.

- Panel rule: one level of flat panels on non-typing pages; never on the lesson list or typing screens; a panel never contains a panel (use `Row` dividers).
- Text-role rule: on `--panel` and `--surface` use `--text` and `--muted`; `--dim` is for the canvas only; control borders use `--line-strong`. `src/lib/color.test.ts` enforces the contrast ratios.
- Add a page: create `src/app/<route>/page.tsx` with a `PageHeader`, put content in `Panel`s (pass `index` for the staggered entrance), pick the width with `page-narrow`, `page-wide` or `page-form`, add it to `e2e/a11y.spec.ts` and `e2e/screenshots.spec.ts`.
- Header: a column-wide bar of text tabs on a hairline with a gliding accent indicator; signed out shows `sign in`, signed in shows an avatar menu with sync status; two rows on phones. See DECISIONS.md D20.
- Guards: `PRESERVE=1 npx playwright test e2e/preserve.spec.ts` compares the lesson list, lesson screen and test typing area with baselines (record with `--update-snapshots`; the baselines are git-ignored). `SHOTS=1 THEMES=dark,light,dusk,ember npx playwright test e2e/screenshots.spec.ts` captures every page at 1440, 768 and 390 for review and asserts no horizontal scroll. `e2e/a11y.spec.ts` runs axe on every page. Playwright refuses to reuse a server already on port 4173; set `PW_REUSE_SERVER=1` only when you serve `out/` yourself.
- Design rationale: DECISIONS.md D16.

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
src/features/auth         sign-in state and account screens
src/features/sync         merge model, serialisation, sync engine (pure, tested)
src/features/firebase     lazy Firebase client, auth and Firestore adapters (only place that imports firebase)
src/features/sound        synthesised key sounds (synth, packs, player, hook)
src/features/{typing,results,stats,settings}   screens (typing includes Zen)
src/components/ui         Panel, Button, Field, Segmented, Toggle, Select, Slider, Row, Notice, EmptyState, Stat, ChartFrame ...
src/lib                   rng, colour maths, motion
scripts/                  content, brand and check scripts
brand/                    SVG sources and palette
```

## Licence

MIT for the code (`LICENSE`). Text content and fonts keep their own licences, see `SOURCES.md`.
