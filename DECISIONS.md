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
