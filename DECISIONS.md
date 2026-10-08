# DECISIONS

Append-only log of decisions made autonomously. Format: context, decision, reason.

## D1 Spec file name

`PROJECT.md` was committed as lowercase `project.md`. Renamed to `PROJECT.md` with `git mv` so it matches the spec's own references.

## D2 Drop Tailwind

The scaffold shipped Tailwind plus a turbopack loader and `cacheComponents`. The spec demands CSS-variable tokens and a static export; Tailwind adds a toolchain risk and a second styling vocabulary. Removed it; styling is plain CSS (global tokens + CSS Modules). Removed `cacheComponents` and `partialPrefetching` (incompatible with `output: 'export'`).

## D3 Source under src/

Moved `app/` to `src/app/` to match the feature-oriented structure in the spec; `@/*` maps to `src/*`.

## D4 Vitest 3

Vitest 5 requires `@types/node` 22+, the machine runs Node 20.19. Pinned Vitest 3.

## D5 Brand run

`claude-bootstrap` cloned to the OS temp dir (public, master). `registry.json` lists only `design-studio` v5. It ships a staged workflow (`workflow.md`) and `references/craft-standards.md`, not a palette CLI, and its install command (`/design-studio`) is interactive and agent-driven. Not installed into this repo (the module stays inert under `.claude/modules/`). I ran the workflow by hand headless: Phase 1 brief, Phase 3 direction with the brand-signature rule (7.5), Phase 4 critique folded into the contrast tests. Answers to its questions came from PROJECT.md: Operate mode, desktop, calm, dark-first, one accent, name "i am speed". Output: `brand/brief.md`, `brand/palette.json`. Signature: the caret. Deviation from the interactive flow: no user review loop (Phase 6), no mockup directory; the real app is the mockup.

## D6 Palette

Four themes (dark default, light, dusk, ember), one accent each, tuned until `dim` and `muted` text reach WCAG AA 4.5:1 on the canvas (section 8 wins over the stylistic wish for very dim untyped text). Enforced by `src/lib/color.test.ts`.

## D7 Fonts

Geist and Geist Mono (SIL OFL), woff2 copied from the `@fontsource` packages into `src/fonts` and loaded with `next/font/local`, so builds need no network. Licence in `src/fonts/OFL.txt`.

## D8 Static serving

`trailingSlash: true` so every route is a directory with `index.html`, which works on any static host including Vercel. `npm start` serves `out/` with `serve`.

## D9 Layout verification and finger map

Layer table matches the brief and the standard German/Austrian T1 layout (verified from knowledge, Wikipedia "QWERTZ" confirms the shared German/Austrian PC layout, AltGr gives @, euro, brackets; dead keys for accents). Fingers: the brief's starting point put Y on the left ring, X middle, C index. The DIN 2137 ten-finger system (de.wikipedia "Zehnfingersystem") has Y with the left pinky (next to `<`), X left ring, C left middle, V and B left index. Adopted the DIN version. Number row follows the brief (4 5 left index, 6 7 right index, 0 right pinky). Dead keys: `^`, `´` and the backtick (shift of `´`). `°` (shift of `^`) is a normal character.

## D10 CI workflow location

The GitHub token available in this environment lacks the `workflow` scope, so GitHub rejects any push that adds `.github/workflows/*`. The workflow is committed as `ci/github-actions-ci.yml` (identical content) so production deploys are not blocked. To enable CI: `mkdir -p .github/workflows && git mv ci/github-actions-ci.yml .github/workflows/ci.yml`, then push with a token that has the `workflow` scope (or via the GitHub web UI). README documents this.

## D11 Reviewer audit fixes

A reviewer pass found (and these were fixed): stop-at-word-end plus disabled backspace was a dead end (backspace now always allowed in that mode); the correct space refused in that mode no longer counts as an error; Enter/Tab/Esc now work on the results page; importing a non-export JSON no longer wipes data (needs a numeric `version` and `settings`); restart-after-N in the free test restarts instead of freezing; timed tests end exactly at the limit (late keys end the attempt instead of being typed); held keys do not auto-repeat into the engine except backspace; Alt+letter menu shortcuts and Ctrl/Alt+Backspace are ignored; failed language chunk loads are no longer cached. Not fixed on purpose: Tab is captured on typing screens because the spec makes Tab restart (keyboard users can use the links on the results page and the nav; recorded trade-off). Dead keys cost two errors because the following key arrives combined; accepted.

## D12 Motion pass

No motion library: CSS transitions/keyframes plus a 40-line rAF `tween` cover everything and keep the bundle unchanged. Picked: caret glide (95 ms), colour-only character states (no shake, it drew attention), one-shot page entrance fade-up, staggered phase sections on the lesson list (18 ms step, 360 ms cap), logo mark where the caret grows and the dot lands, theme switch colour fade (class on `<html>` for one change only), tactile toggles with a slight overshoot, button press scale, on-screen key squeeze, results reveal (count-up with skip, chart lines drawn in sequence, accent bar under the verdict, heatmap fading in by key position). Rejected: error shake, route exit animations (App Router has no clean hook), animated keyboard highlights following the caret (would compete with the text). Review: frame sequences and a Playwright video were captured; screenshot latency (about 100 ms or more) means 0 ms frames of short transitions are already settled, so short ones were verified by computed style and timing tests rather than by eye.
