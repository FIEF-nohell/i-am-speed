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

## D13 Optional account and cloud sync

Context: PROJECT.md section 2 says no backend, no auth, all data in localStorage, no runtime network requests. Users asked to keep progress across devices. Decision: anonymous use stays exactly as specified (local only, zero runtime requests, no Firebase code loaded). Signing in with email and password or Google enables Firebase Auth and Firestore sync for that user only. PROJECT.md carries an amendment note pointing here. Reason: cross-device data needs an account; keeping it optional preserves the original promise for everyone who does not sign in. The Firebase web config is public by design and is committed in `src/config/firebase.ts`; access control is enforced by `firestore.rules` (owner-only, shape validated, monotonic `rev` and `settingsUpdatedAt`). App Check is not enabled yet and is a possible follow-up. Deleting means deleting the account and its cloud data; the local copy stays and can be reset separately.

## D14 Sync data model and merge semantics

Local storage stays the source of truth and carries `sync` metadata. Lifetime aggregates cannot be rebuilt from the 500-attempt history, so each device owns one contribution (`sync.ownId`) that only it increments, and holds read-only copies of the others. Merging keeps the higher `rev` per contribution id, and the displayed stats are the combination of all contributions (sums, OR for completed, max for bests, latest for last results). That makes merge commutative, associative and idempotent: repeated or concurrent merges never double count. Pre-sync (v1) data becomes a frozen contribution with a content-hash id (`legacy-<hash>`) and `rev` 0, so the same legacy data arriving from two devices is counted once. Attempts are unioned by stable id (`<ownId>-<rev>` for new ones, old ids kept as they are) and capped at the newest 500. Settings: on first link the account settings win if the cloud profile exists, otherwise local settings are uploaded; afterwards last writer wins by `settingsUpdatedAt`, with a monotonic check in the rules as a backstop. `lastResult` is device-local and never synced. Known limitation: two legacy exports of different ages imported into one account produce different hashes and double count their overlap. Accepted as rare.

## D15 Firestore Lite, lazy boundary and popup sign-in

Firestore Lite (`firebase/firestore/lite`) instead of the full SDK: smaller lazy chunk, no IndexedDB cache to keep coherent with localStorage, no listeners. Pulls happen on sign-in, focus, `online` and an explicit "sync now". Only modules under `src/features/firebase/` may import `firebase/*`, enforced by an ESLint `no-restricted-imports` rule, and they are reached only through dynamic `import()` when the user starts a sign-in or the local auth hint says the browser was signed in. Google sign-in uses the popup flow only: the redirect flow breaks under third-party storage partitioning without a same-origin `/__/auth` proxy, which a static export cannot provide. Switching to the full SDK later is contained in `src/features/firebase/cloud.ts`.

## D16 Design system evolution: panels, controls, header rails

Context: PROJECT.md section 8 asks for almost no borders or boxes. After the sync and account work the non-typing pages (settings, stats, results, account) read as flat lists with three unrelated control languages, link-like buttons, a floating footer and a header of five equal boxes. Decision: keep dark-first, one accent, no gradients, no shadows, no illustrations, no emoji, lowercase copy, mono for typing and figures, and the caret as signature, but allow **one level of quiet, flat panels** on non-typing pages, real bordered buttons and inputs, a stronger type scale and a grouped header. Panels never appear on the lesson list or on the typing screens, and a panel never contains a panel (inside use rows separated by 1px dividers).

- Tokens are additive: `--panel` and `--line-strong` per theme (from `brand/palette.json`), plus `--text-title`, `--text-section`, `--radius-control`, `--radius-panel`, `--control-sm`, `--control-md`, `--column-form`, `--header-h`. Existing values are frozen because the lesson list and typing screens consume them; `e2e/preserve.spec.ts` (`PRESERVE=1`) guards those screens pixel for pixel.
- Text-role rule: on `--panel` and `--surface` use `--text` and `--muted` only. `--dim` is canvas-only (untyped text, captions on canvas), because `dim` on `surface` measures 4.2 to 4.3:1 in every theme. Accent text sits on canvas or panel, never on surface. Control boundaries use `--line-strong` (at least 3:1, WCAG 1.4.11); dividers stay `--line`. `src/lib/color.test.ts` enforces the ratios.
- Buttons: `primary`, `secondary` (the default), `ghost`, `danger` (filled only on a final confirm), sizes `sm` and `md`. `Segmented` has a `text` variant (unchanged, used in lesson footers) and a `pill` variant. `Toggle` reads `--toggle-off-border`, which `Panel` raises to `--line-strong`, so toggles outside panels are unchanged.
- Header: wordmark left, a practise rail (lessons, test, zen, stats) and a utility rail (settings, account). Labels hide below 48rem. Header and footer carry `site-chrome` so Zen can fade them.
- Reviewed in screenshots at 1440 and 390 in all four themes; automated: axe (no serious or critical violations, dark and light) in `e2e/a11y.spec.ts`.

## D17 Zen mode

An endless typing mode at `/zen/` (nav rail and test toolbar). Text is shuffled sentences from the selected language's corpus (common words as fallback), seeded and extended so at least 400 untyped characters are always ahead; every character is typeable on the layout and no dead-key character appears. The engine state gained an `open` flag: it never finishes at the end of the target, only through an explicit end. Esc finishes, Tab restarts with fresh text.

- Source id `zen`. A session is saved only with at least five correct characters (one word by the wpm convention); otherwise Esc returns to `/test/` without saving. A saved session counts toward totals, days, keys and fingers and appears in recent attempts, but never creates or changes a lesson entry (`sourceKind` in `src/features/storage/source.ts`; before this, any source not starting with `test:` was treated as a lesson).
- Pauses longer than 5 s are removed from the clock, inside `TypingSession` (not the pure reducer, so engine tests stay deterministic). The key after a pause therefore records 0 ms latency; per-key stats already cap gaps at 3 s, so the bias is minor.
- Render window: `TypingText` with `windowed` renders the caret plus 240 characters and trims whole lines at measured line starts once the caret reaches the third line, with the transform transition suppressed for two frames, so work per keystroke is O(window). Measured: 3000 characters, p95 key handler well under the 8 ms budget (`e2e/motion.spec.ts`).
- Focus mode: after the first key `html[data-focus="zen"]` fades header and footer (layout unchanged); a single `esc` hint stays; moving the mouse shows a finish button for 2 s. `restartAfterN` is mapped to `continue`.

## D18 Key sounds

Synthesised in code instead of bundled samples: no licence risk, no network, no payload, and every press can vary. Four packs (`soft` default, `clicky`, `typewriter`, `bubble`), each with key, space, backspace and a muted error recipe. Recipes are damped sine partials, biquad-filtered noise transients and pitch glides, rendered to `Float32Array` from a seeded RNG (eight variants per recipe, frequency and decay jittered) off the key path in idle time.

- Latency: on a press the player picks a variant (never the same twice), starts one `AudioBufferSourceNode` through a gain node with rate (plus or minus 3%) and gain (plus or minus 12%) jitter, softer when the gap is under 90 ms, voice cap 16, inside try/catch. No rendering or allocation of buffers on that path. Volume 0 to 100 maps through `(v/100)^2`. A light compressor limits peaks.
- Gesture rules: no `AudioContext` exists until sound is on and the first capture-phase `pointerdown` or `keydown` creates and resumes it; the first key may be silent. The context suspends when the tab is hidden. With sound off no context is ever created (`e2e/sound.spec.ts`).
- Settings sync: three new settings fields (`soundPack`, `soundVolume`, `soundErrors`) flow through the existing sanitising and sync path. `firestore.rules` only bounds the settings map size (40 fields; 17 are used), so no rules deploy is needed. Caveat: a stale cached client drops unknown fields when it writes settings, so other devices fall back to the sound defaults (off). Rare and low impact.
- Not verifiable by tests: how the packs sound. Recipes were checked numerically (length, decay, zero-crossing rate); a listening pass by the owner is still open.

## D19 Zen is free type

Zen no longer has any target text. It supersedes the target-text part of D17 (shuffled sentences, the `open` engine flag, extending the text, Tab for new text, the windowed `TypingText`); those are deleted. The screen is a blank canvas with a caret and whatever the user types is their own text.

- Input: printable characters (`event.key` of one code point, so AltGr and umlauts work), Space, Enter (a line break) and Backspace (Ctrl or Alt with it deletes a word). Dead keys, Tab, shortcuts and modifier-only keys are ignored. Nothing can be wrong, so there is no error state and `useKeySound` is only ever called with `key`, `space` and `backspace`.
- State machine: `FreeTypeSession` in `src/features/engine/freeType.ts` (injected clock, 5 s idle gaps removed from the time, a compact press log for the series). Rendering is `FreeText`: one `pre-wrap` text node for the tail only (cut in 2000 character steps, snapped to a newline or space, 4000 to 6000 characters shown), bottom-scrolled in a three line frame.
- Metrics: net WPM counts the characters left in the buffer at the end, raw WPM counts every press that added a character, consistency comes from the per-second raw rate. Accuracy is not applicable and is stored as 100 with 0 errors, so the attempt document stays inside the deployed `firestore.rules` (accuracy 0 to 100) and the storage and sync shape is unchanged.
- Aggregates: a zen attempt adds to `totals` (attempts, time, characters), to the time of its day and to recent attempts. `recordAttempt` leaves `keys`, `fingers`, the day's attempts, speed sum and accuracy sum, and lessons untouched, so accuracy averages are not skewed. Consequence: a day with only zen sessions has no point in the daily charts, but its time counts in the totals. Per-key latency from zen is not recorded.
- Results and stats hide accuracy, errors, the error heatmap and slowest keys for zen; recent attempts show "-" for accuracy.
- Saved only with at least five characters left; Esc otherwise returns to `/test/`. Focus-mode fade of header and footer is unchanged.
