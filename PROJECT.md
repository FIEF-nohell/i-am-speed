# PROJECT.md: "i am speed"

You are building "i am speed", a touch-typing trainer for the Austrian keyboard layout (QWERTZ, ISO). Read this whole file, write PLAN.md from it, then execute the plan autonomously until the definition of done is met. Do not ask me questions. When something is ambiguous, decide and log the decision in DECISIONS.md.

The name is a deliberate meme name. Keep it exactly: "i am speed", lowercase, in the UI, metadata and README. Slug: `i-am-speed`.

## 0. Operating conditions (read first)

- You run overnight, unattended. I am asleep and CANNOT answer questions. Do not stop and wait for me, and do not end your turn with a question. Stalling is the worst possible outcome.
- Permission prompts are disabled for this session. Stay disciplined anyway: work only inside this project directory (temp clones go in the OS temp directory, never inside the repo), never touch files outside it, never run destructive commands (no `rm -rf` outside build output, no force-push, no history rewrites), never install global packages, never print or commit secrets.
- Default behaviour for ambiguity: decide, log it in DECISIONS.md, move on.
- For an IMPORTANT question only (one that blocks progress, or is expensive to reverse, or changes the product direction), use this protocol instead of guessing:
  1. Spawn five sub-agents in parallel, each given the same neutral description of the problem and the options, but a different perspective: (a) a beginner learning touch typing, (b) an experienced typist who wants Monkeytype-level polish, (c) a strict, minimalist designer, (d) a pragmatic senior engineer focused on maintainability and scope, (e) a sceptical QA reviewer looking for what breaks.
  2. Have each answer independently with a recommendation and its main risk. Do not let them see each other's answers.
  3. You then synthesise: choose the option with the best support, note dissenting arguments, and write the question, the five positions and your decision into DECISIONS.md.
  4. Continue immediately. Do not use this protocol for small or reversible choices, it costs time. Budget at most a handful of uses for the whole run.
- Prioritise: a working, deployed, clean core (lessons, engine, results, settings, brand) beats a half-finished long tail. If time or context runs short, cut scope from the tail of the curriculum and the stats page, never from correctness, tests or design quality, and say what was cut in the final report.

## 1. Goal

Monkeytype is a typing speed test with a very clean UI, but it does not teach touch typing. Build an app with Monkeytype's visual calm that teaches 10-finger typing on the Austrian layout through structured lessons, and shows the user how they did.

## 2. Hard constraints

- Next.js (App Router), React, TypeScript strict. Static export (`output: 'export'`). No backend, no database, no auth, no analytics.
- All user data lives in localStorage only. No runtime network requests (self-host fonts via `next/font`). Network is allowed at build/prepare time only (see Content).
- Desktop-first. On touch-only devices show a short "needs a physical keyboard" notice.
- UI language is English. Typing text language is switchable: German or English.
- All lessons are open from the start. No unlocking. Completion is a mark, not a gate.
- Design is a strict requirement (see Design). If it looks busy, it is wrong.
- The repository is PUBLIC. Never commit secrets, tokens, `.env` files with values, personal data or machine-specific paths. Add a proper `.gitignore`. There is no backend, so nothing should need a key. If you think something needs one, you are doing it wrong.

## 3. Repository, deploy and git workflow

- The repo is being connected to GitHub and Vercel by me. Pushing to the production branch auto-deploys to Vercel. Check `git remote -v` and the current branch at the start and use the existing production branch. If no remote exists yet, commit locally and carry on, and say so in the final report.
- Vercel must build this without special configuration: standard `npm run build` with static export. Make sure the output directory and settings Vercel needs are correct for a static export, and document them in README.md.
- Production domain: `https://speed.nohelll.com`. Centralise it in one `src/config/site.ts` (default to that URL, overridable via `NEXT_PUBLIC_SITE_URL`), used for metadata base, OG tags, canonical URL, sitemap and robots. Do not hardcode the domain anywhere else.
- Auto-deploy to production on push is intended and accepted. Commit at every milestone. PUSH only when the full local check (`npm run check`: lint, typecheck, unit tests, content validation, build) is green, so production never gets a broken state. Push after each major milestone and at the end.
- License: add a `LICENSE` file with the MIT license (copyright holder: "Noel", current year 2026) and set `"license": "MIT"` in package.json. State in README.md and SOURCES.md that the MIT license covers the code only, and that bundled text content keeps its own source licences.
- Add a `check` script that runs everything. Add a GitHub Actions workflow running the same checks on push and PR (no secrets needed).

## 4. Brand and palette: use my claude-bootstrap

I maintain a repository called `claude-bootstrap`: `https://github.com/FIEF-nohell/claude-bootstrap`, branch `master`. It has a `modules/` directory containing `design-studio` (published as v5, with a brand-signature workflow) and a `registry.json`. It includes a command or workflow that comes up with the colour palette and overall brand identity for a new app. It is normally run interactively with a human. You must run it headless, with no human present.

Steps:

1. Find it. Check whether it is already installed locally (the project's `.claude/` folder, `~/.claude/`, sibling directories). If not, clone it (`git clone` or `gh repo clone`, into a temp directory OUTSIDE this project, never commit it into this repo). If the repo is private and cloning fails, log that in DECISIONS.md and do the palette work yourself following the rules in section 8.
2. Read `registry.json` and the `design-studio` module's docs to find the exact command and any non-interactive options. Do not guess command names. If you do not know what I am talking about, look it up in that repo.
3. Run it headless. Where it would ask a human questions, answer them yourself from this file: calm, minimal, dark-first, one accent colour, Monkeytype-like restraint, a typing trainer for the Austrian keyboard, name "i am speed". If it cannot run non-interactively at all, work through its workflow by hand and follow its output format.
4. Save its raw output into `brand/` (e.g. `brand/palette.json` or whatever it produces) and log what it did and what you answered for it in DECISIONS.md.
5. Feed the result into the design system: CSS variable theme tokens, the favicon, the OG image. The palette must still satisfy section 8 (one accent, muted, readable contrast). If the bootstrap output conflicts with section 8, section 8 wins, and you log the deviation.
6. Do this early (milestone 1), because everything visual depends on it.

## 5. Branding assets (all built from vector sources)

Everything below starts from hand-authored SVG source files in `brand/` (committed), and a script (`npm run brand`) that renders the derived files. Derived files are committed so the build never depends on the script.

- Logo mark: a simple, original SVG mark that fits "i am speed" and the calm look. No mascots, no gradients. Also a wordmark SVG.
- Favicon set: `src/app/icon.svg` (vector, supports light/dark via `prefers-color-scheme` inside the SVG), `src/app/favicon.ico` (rendered from SVG), `src/app/apple-icon.png` (180x180), plus 192 and 512 PNG icons and a maskable icon, and `manifest.webmanifest` (name "i am speed", theme and background colours from the palette).
- OG and social image: 1200x630 PNG, plus a Twitter card image, rendered from an SVG source with the real brand fonts (convert text to paths or embed the font file, so the render does not depend on system fonts). Set full `metadata` in the root layout: title template, description, `openGraph`, `twitter` (summary_large_image), icons, manifest, theme-color, canonical. Per-page titles.
- Because of static export, prefer pre-rendered static PNGs in `public/` for OG over dynamic OG routes. Verify the OG image URL resolves in the built `out/` directory.
- Render scripts may use `sharp` or `@resvg/resvg-js` (dev dependencies). No raster-only logos.
- Also generate `robots.txt` and `sitemap.xml` (static, using `src/config/site.ts`).

## 6. Icons in the app

- Use one icon library for general UI icons (e.g. `lucide-react`), imported per icon so the bundle stays small. Stroke weight and size consistent everywhere.
- Any custom icon (finger indicators, hand diagrams, key glyphs, anything the library lacks) must be a hand-written SVG React component in `src/components/icons/`, using `currentColor`, no raster images, no icon fonts.
- No emoji in the UI.

## 7. Code quality

Clean, modular, reusable code is a hard requirement, not a nice-to-have.

- Feature-oriented structure, e.g. `src/features/{lessons,engine,keyboard,stats,settings,content}`, shared UI in `src/components/ui`, pure logic in `src/lib`. No god components, no files over about 250 lines without a reason.
- The typing engine, layout data, lesson generation, stats aggregation and storage are pure TypeScript with no React imports, and are unit tested.
- UI primitives (Button, Toggle, Select, Slider, Section, Row, KeyCap, Stat, ChartFrame) built once and reused. No copy-pasted styling. Design tokens only via CSS variables, no hardcoded colours in components.
- Strict TypeScript, no `any`, no unexplained `ts-ignore`. ESLint and Prettier configured. Meaningful names, small functions, short comments only where the why is not obvious.
- Accessibility basics: semantic HTML, visible focus states, labelled controls, sufficient contrast, reduced motion respected.
- Add `README.md` (run, build, regenerate content, regenerate brand assets, add a lesson, deploy), `DECISIONS.md`, `SOURCES.md`.

## 8. Design (strict)

- Reference: Monkeytype's calm look. Dark default with a muted background, ONE accent colour, lots of whitespace, almost no borders or boxes, lowercase minimal navigation at the top, monospace typing text with generous line height, centred narrow content column, dimmed untyped text, bright typed text, red only for errors, smooth caret animation, no gradients, no shadows, no illustrations, no mascots.
- Themes via CSS variables: at least dark (default), light, and two more muted ones. Respect `prefers-reduced-motion`.
- Do not copy Monkeytype assets, code or branding. Original implementation, original name.
- Typography: one monospace for typing, one clean sans for UI, via `next/font`.
- Lesson list: phases as quiet sections, lessons as plain rows with a small completion mark and best WPM. No cards-in-cards.
- Charts must follow the design system: muted, thin lines, no chart junk, no heavy gridlines.

## 9. Keyboard model (Austrian QWERTZ, ISO)

- Rows: `^ 1 2 3 4 5 6 7 8 9 0 ß ´` / `Q W E R T Z U I O P Ü +` / `A S D F G H J K L Ö Ä #` / `< Y X C V B N M , . -` / space.
- Shift layer, as a starting point to verify: `^`->`°`, `1`->`!`, `2`->`"`, `3`->`§`, `4`->`$`, `5`->`%`, `6`->`&`, `7`->`/`, `8`->`(`, `9`->`)`, `0`->`=`, `ß`->`?`, `+`->`*`, `#`->`'`, `<`->`>`, `,`->`;`, `.`->`:`, `-`->`_`.
- AltGr layer, as a starting point to verify: `Q`->`@`, `E`->euro sign, `7`->`{`, `8`->`[`, `9`->`]`, `0`->`}`, `ß`->`\`, `+`->`~`, `<`->`|`.
- Verify this table yourself against a reliable source before encoding it. Put it in one data file (`src/features/keyboard/layout/atQwertz.ts`) that everything else derives from.
- Finger mapping (verify and document the final version): left pinky `^ 1 Q A <` and left Shift. Left ring `2 W S Y`. Left middle `3 E D X`. Left index `4 5 R T F G C V B`. Right index `6 7 Z U H J N M`. Right middle `8 I K ,`. Right ring `9 O L .`. Right pinky `0 ß ´ P Ü + Ö Ä # -` and right Shift. Thumbs: space. AltGr: right thumb.
- Judge correctness by the produced character (`event.key`), NOT `event.code`, so it works whatever OS layout is active. Use `event.code` only for highlighting keys on the on-screen guide.
- Dead keys: `^`, `´` and the backtick arrive as `event.key === "Dead"`. Exclude dead-key characters from all lesson text and the free test. Do not crash when the user presses them: count it as a wrong keystroke.
- AltGr: detect via `getModifierState("AltGraph")` and handle the Windows ctrl+alt quirk. Typing `@ { } [ ] \ ~ |` must work with Windows, Linux and macOS key events.

## 10. Lesson curriculum

Phases, each roughly 5 to 10 lessons, each lesson roughly 1 to 2 minutes:

1. Home row: f j, then d k, s l, a ö, then g h, ä, full home row. One new finger or key per lesson.
2. Top row: r u, e i, w o, q p, t z, ü, mixed top row.
3. Bottom row: v m, c comma, x period, y minus, b n, mixed.
4. Full letters and umlauts: ä ö ü ß in real words.
5. Shift and capitals: left Shift for right-hand letters and the reverse, capitalised words, German noun capitalisation.
6. Numbers: number row, one finger pair at a time, then numbers inside words and dates.
7. Punctuation: `. , ; : - _ ? ! " ' ( ) / % & § $ = * #` and combinations.
8. AltGr symbols: `@ { [ ] } \ ~ |` and euro sign, in code-like and email-like contexts.
9. Words: real words, three variants per level: lowercase only, with capitals, with numbers mixed in.
10. Sentences: coherent sentences, easy to harder, then with punctuation.
11. Paragraphs: longer complex passages, mixed case, numbers and punctuation.

For phases 1 to 4, generate drills Keybr-style: pick real words from the frequency list that use only the unlocked key set, weighted towards the newest keys, and fall back to pseudo-words only when too few real words exist. The allowed character set per lesson is explicit data, and generation must never leave it. Each lesson has a stable id, title, short description, target character set, length target, and completion rule (accuracy >= 95%).

Also provide a free test mode (Monkeytype-like: time 15/30/60 or word count 10/25/50) in the selected text language.

## 11. Content (German and English)

- Fetch at build/prepare time with a script (`scripts/fetch-content.ts`), then commit the resulting JSON. The app ships static JSON only. Network access is available to you during this step.
- Needed: ranked word frequency lists (aim for 20k+ words per language), short coherent sentences, longer passages.
- Candidate sources: frequency lists from open corpora, Tatoeba for sentences, Project Gutenberg for passages. I have not verified any licences. This repo is PUBLIC and redistributes the content, so check each source's licence yourself, prefer public domain or clearly permissive, honour attribution requirements, record source, URL and licence in SOURCES.md, and add an attribution page in the app. Drop any source whose licence does not allow redistribution.
- Normalise text: curly quotes and dashes to typeable ASCII, German quotes to `"`, drop anything not typeable on the Austrian layout (including dead-key characters), collapse whitespace, remove offensive or junk entries, drop very long words and too-short sentences.
- Fallback: if the network fails for a source, hand-write curated content for that gap, so the build never ends with empty lessons.
- `npm run validate:content` must fail if any lesson text uses a character outside its allowed set, any text contains untypeable characters, or any language/phase has too little content.

## 12. Typing engine

- Pure, unit-tested state machine separate from React. Tracks per keystroke: expected, typed, timestamp, correct, finger, modifier used.
- Metrics: net WPM `((correct chars / 5) / minutes)`, raw WPM, accuracy, consistency, per-key accuracy and speed, per-finger accuracy, WPM over time within a lesson.
- Global setting "On error", options (default: Block):
  1. Continue: wrong char is marked and counted, caret advances (Monkeytype style).
  2. Block: wrong keystroke is counted, caret does not advance until the correct key is typed.
  3. Stop at word end: can type on, but cannot leave the word (space blocked) until errors are fixed; backspace allowed.
  4. Restart after N errors: lesson restarts after N mistakes (N configurable 1 to 10).
- Backspace setting: allowed within word / allowed fully / disabled.
- Tab or Esc restarts, Enter continues. Support held keys and fast input without dropping characters.

## 13. On-screen guide

- On-screen Austrian ISO keyboard (SVG or CSS grid), keys colour-coded by finger, next key highlighted, and the required Shift or AltGr key highlighted when relevant. Subtle, never louder than the text.
- Settings toggles: show keyboard, colour by finger, highlight next key, hint which finger to use. Defaults on for phases 1 to 8, can be turned off globally.
- Design decision is yours (I did not specify details), but keep it quiet and consistent with section 8. Log it.

## 14. Results and stats (use Recharts unless you find a clearly better fit)

- After each lesson: net WPM, accuracy, raw WPM, consistency, time, errors, a line chart of WPM and errors over time within the lesson, a per-key error heatmap on the keyboard, slowest keys, pass or retry, buttons for retry, next lesson, back to list.
- Stats page: progress over time (WPM and accuracy per day or per attempt), per-lesson best and last, per-finger accuracy bars, weakest keys overall, completed lessons per phase, totals (time typed, characters).

## 15. Settings (one global page plus quick access)

Text language (DE/EN), on-error behaviour, backspace behaviour, theme, font size, caret style, keyboard guide toggles, sound off by default (optional subtle key sounds), export/import data as JSON, reset all data (with confirmation).

## 16. Storage

Single versioned localStorage schema with a migration function, try/catch around every access, SSR-safe (no hydration mismatches: read storage only on the client, e.g. with `useSyncExternalStore`). Cap stored history (e.g. last 500 attempts, with per-key aggregates kept separately so old stats are not lost).

## 17. Verification (you are unattended, so prove it works)

1. Unit tests (Vitest): layout table (every typeable char maps to exactly one key plus modifier and one finger, no duplicates), engine (all four error modes, backspace modes, metrics maths), lesson generation never leaves its allowed set, storage migration and corrupt-data recovery.
2. `npm run validate:content` passes.
3. `npm run lint`, `npm run typecheck`, `npm run build` (static export) all pass. `npm run check` runs all of them.
4. Playwright e2e smoke test: open a lesson, type it using real key events including Shift and an AltGr character, reach the results page, see charts render, change a setting and confirm it persists after reload.
5. Brand check: the built `out/` contains the favicon set, manifest, OG image, robots and sitemap, and the HTML head references them correctly.
6. Take Playwright screenshots of lesson list, lesson run, results and stats at 1440px and 390px width, look at them, critique them against section 8, and iterate until they are clean.

Fix every failure. Do not weaken tests to make them pass.

## 17b. Motion design final pass (LAST milestone)

Do this only after everything else meets the definition of done below and the green state is pushed. Treat it as a separate, final polish phase and use the remaining time and budget on it. If it breaks anything, revert to the last green commit.

Goal: beautiful, high-craft motion design that makes the app feel alive and expensive, while keeping the calm, minimal Monkeytype restraint from section 8. The motion must be elegant, not loud. If an animation draws attention away from the text being typed, remove it.

- Define a small motion system first, in one file (`src/lib/motion.ts` plus CSS variables): a few durations, easings and spring presets, reused everywhere. No ad-hoc timings scattered through components.
- Ideas to consider, pick what actually looks good: smooth caret movement with a subtle settle, per-character state transitions (typed, error) that are quick and clean, page and route transitions, staggered fade-in of lesson rows and phase sections, a refined lesson-complete moment (stats count up, charts draw in line by line, pass mark animates in), animated heatmap reveal on the keyboard, key press feedback on the on-screen keyboard, smooth theme switching, settings toggles and selects with tactile micro-interactions, an animated logo mark on load, number tweening for WPM and accuracy.
- You may add a motion library (e.g. `motion`) if it clearly beats CSS. Keep the bundle small, import only what is used, and prefer CSS or the Web Animations API for simple cases. Use only transform and opacity for animation, never animate layout properties, and avoid layout shift.
- Hard rules: respect `prefers-reduced-motion` everywhere (replace motion with instant or opacity-only changes, and add an in-app "reduce motion" setting too). Animations must never add input latency: the keystroke handling path must stay free of animation work, and the engine must not wait on any animation. No animation may delay the user from retrying or continuing (skippable, under about 400 ms for UI transitions, longer only for the one-time results reveal).
- Verify: all unit tests, e2e tests and `npm run check` still pass. Record Playwright videos or frame sequences of the key interactions (typing a lesson, lesson complete, page transitions, theme switch), review them critically, and iterate until the motion feels smooth and intentional. Check performance (no dropped frames on a normal laptop, no long tasks during typing).
- Log the motion decisions in DECISIONS.md and add a short "Motion" section to README.md explaining the system and how to add new animations.

## 18. Working method

- `git init` if needed, commit at every milestone. Write PLAN.md first with milestones: 1 scaffold, bootstrap brand run and design system, 2 layout data and engine with tests, 3 content pipeline and validation, 4 lesson runner and guide, 5 results and stats, 6 settings and storage, 7 branding assets and metadata, 8 polish, e2e, deploy check, 9 motion design final pass (section 17b, only after 1 to 8 are green and pushed). Tick them off as you go.
- Never stop to ask. If a source or package fails, work around it and log it in DECISIONS.md.

## 19. Definition of done

All verification steps pass, all phases have content in both languages, the app works fully offline after build, the brand assets and metadata are in place, the last green state is pushed to the production branch (if a remote exists), the motion design final pass (17b) is done and also green and pushed, and your final message lists what exists, what is weak or unfinished, and the exact commands to run it.
