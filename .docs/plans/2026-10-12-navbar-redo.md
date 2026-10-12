---
status: in-progress
created: 2026-10-12
updated: 2026-10-12
base: e919791892d6b75c7d4e0957605d19a3b01c371b
goal: Replace the boxed icon-tab header with a calm, column-aligned text tab bar on a hairline, a gliding accent caret indicator, a real sign-in button or avatar account menu, and a two-row compact layout on phones, without changing the lesson list or typing screens.
---

# Navbar redo

## Goal

Replace the boxed icon-tab header with a calm, column-aligned text tab bar on a hairline, a gliding accent caret indicator, a real sign-in button or avatar account menu, and a two-row compact layout on phones, without changing the lesson list or typing screens.

## Inputs

### Rules, learnings, decisions consulted

- Rules (all active universal): `.docs/rules/plan-execution.md` (this format, tick protocol), `.docs/rules/verification.md` (`npm run check`, `npm run test:e2e`), `.docs/rules/docs-current-state-only.md` (AGENTS.md stays current-state; no AGENTS change is planned), `.docs/rules/agent-docs-sync.md` (not triggered: no agent files change).
- Retrieval helper `.claude/hooks/retrieve.py` is still broken on this machine (`ModuleNotFoundError: No module named 'yaml'`). Rules were selected by hand. Learnings: none exist (`.docs/learnings/` holds only its README). `.docs/decisions/` and `.docs/styleguide/` have no entries.
- `DECISIONS.md`: D6 (palette, contrast), D11 (Tab is captured on typing screens, keyboard users reach the nav elsewhere), D12 (motion system: CSS transitions only, entrance only, reduced motion), D16 (panels, controls, text-role rule, "Header" bullet that this plan supersedes), D17 and D19 (zen focus mode fades `.site-chrome`). `PROJECT.md` section 8 line 86 ("lowercase minimal navigation at the top", Monkeytype calm) and the D16 amendment on line 92. `brand/brief.md` (signature: "the single accent bar that glides along the line").
- Commit hygiene from AGENTS.md: no `Co-Authored-By` trailer, no generated-with footer, no emoji, no em dashes. AGENTS.md overrides any harness attribution default.

### Code read in full

`src/components/layout/{Header.tsx,Header.module.css,Footer.tsx,Footer.module.css}`, `src/styles/{globals.css,themes.css,motion.css}`, `src/components/ui/{Button.tsx,Button.module.css,Segmented.tsx,Segmented.module.css,segmentedNav.ts}`, `src/components/icons/Mark.tsx`, `src/components/PageTransition.tsx`, `src/app/layout.tsx`, `src/features/auth/{SyncBadge.tsx,SyncPill.tsx,syncStatus.ts,session.ts,types.ts}` and the sign-out/sync part of `AccountView.tsx`, `src/features/sync/state.ts`, `src/lib/{focusMode.ts,color.test.ts}`, `src/features/typing/{ZenRunner.tsx,ZenRunner.module.css}`, the key listener in `useTypingSession.ts`, `src/features/firebase/client.ts` (persistence), every spec in `e2e/` that touches the header, `playwright.config.ts`, `vitest.config.ts`, `README.md` design section.

### Facts that shape the plan (verified)

1. The header is the only consumer of `--header-h` (4.5rem today). Nothing else depends on header height.
2. `e2e/preserve.spec.ts` screenshots elements, not the viewport: `main .page-narrow > div` (list), `main` (lesson, includes `main`'s own `padding-top: var(--space-5)`), and a clip around the test info bar plus text area. Header height changes therefore should not change these pixels. Do not touch `.page` padding: it is inside the lesson `main` capture. Baselines live in git-ignored `screenshots/preserve/` and were recorded on 2026-10-11, before 4c84457 and e919791.
3. Typing screens listen for `keydown` on `window` and ignore only form targets (`useTypingSession.ts` line 90, `useFreeTypeSession.ts` line 27). Tab and Escape are captured there (D11). A key pressed while focus is in a header menu reaches the typing session unless the menu stops propagation. React listens at the document root, so `event.stopPropagation()` in a React handler stops the native event before it reaches `window`.
4. Zen focus mode sets `html[data-focus="zen"]` (`src/lib/focusMode.ts`), and `globals.css` fades every `.site-chrome` element. The header must keep the `site-chrome` class on its root `<header>`. Lesson and test screens do not fade the header; that stays as is.
5. Auth state: `useAuth()` is `unknown` on the server and before `bootAuth()`; anonymous browsers become `signed-out` synchronously on mount (no Firebase load). `signOut()` exists in `session.ts`. `describeSync()` and `toneFor()` in `syncStatus.ts` give the status sentence and tone. `SyncBadge` is also used by `src/features/settings/groups/AccountCard.tsx`, so it stays.
6. Firebase auth uses `[indexedDBLocalPersistence, browserLocalPersistence]` (`client.ts` line 22). E2E tests abort every Google request (`blockAuthNetwork` in `auth-screens.spec.ts`). Firebase keeps a persisted user when the reload request fails with a network error, which makes an offline signed-in e2e fixture plausible (see Unknowns).
7. Contrast (`src/lib/color.test.ts`, `brand/palette.json`): `--muted`, `--text`, `--accent`, `--error` reach 4.5:1 on canvas and panel; `--text` and `--muted` reach 4.5:1 on surface; `--line-strong` reaches 3:1 on canvas and panel. Every colour pairing in this plan uses only these tested pairs, so no palette change and no new contrast assertion is needed. `--dim` is not used anywhere in the header.
8. Current screenshots (`screenshots/*`, captured 22:41 to 22:42, after HEAD) show the problem: a 1px-bordered capsule of six icon plus label tabs floating right of the wordmark, with an unexplained empty strip at its left end (thumb width plus left padding), a divider, a filled thumb, accent icons; at 390 the wordmark disappears and the bar is six bare icons. Light screenshots are older (two-rail header) and will be recaptured.

### Current design critique (why it is wrong at the concept level)

- It is a box of buttons sitting next to a calm page: the only bordered, filled, iconised object on the lesson list and typing screens. Every other surface on those screens is type on canvas.
- Six icons plus six labels plus a divider plus a fill plus an accent icon is five visual channels for one piece of information (where am I).
- The capsule does not share an edge with anything: it is not aligned to the content column's left, its height (46px) relates to nothing, and on 390 it turns into a row of glyphs with no wordmark.
- The previous iterations changed container shape (links, pills, two rails, one rail) but never changed the concept. This plan changes the concept: the header becomes a ruled line of words that frames the page, like the footer below it.

## Design

### Directions evaluated

**A. Text tab bar on a hairline (chosen).** Column-aligned header: wordmark left, five lowercase text tabs, a 1px `--line` hairline under the whole bar (mirroring the footer's top hairline), a 2px accent bar that sits on the hairline under the current tab and glides between tabs, settings pushed right, then one real control: a bordered `sign in` button, or a round avatar initial that opens a small account menu with sync status. Phones get the same bar in two rows: wordmark plus account on top, the five tabs as an evenly spaced row below.

**B. Bottom tab bar on phones, sidebar or top bar on desktop.** A fixed bottom bar needs icons to fit five destinations, which reintroduces the icon clutter the user rejected; costs about 56px plus the home-indicator inset on every phone screen; needs `viewport-fit=cover` and safe-area padding; collides with the sticky footer; and must be hidden separately in focus mode. Phones cannot even use the trainer (`NeedsKeyboard`), so mobile visits are for stats, settings and the lesson list, where a scrolling top bar is enough. A desktop left sidebar would take width from the 56rem column and would stack a second left rail next to the settings section index.

**C. Command palette with keyboard shortcuts.** Elegant for power users, but the audience is people learning to type; a hidden palette is not discoverable, and the typing screens already capture every printable key plus Tab and Escape (D11), so global shortcuts would collide with typing. Phones have no keyboard. It could be an addition later, never the primary navigation.

**D. Keep the capsule and refine it.** Rejected by the user three times. Any boxed container of tabs keeps the same problem.

**Also rejected inside A:** a filled accent "next lesson" call to action in the header (it competes with the accent indicator, duplicates the lesson list and the results page's primary action, and is noise on typing screens); a full-bleed tinted header band (adds a second surface colour above every typing screen and would not line up with the column-wide footer rule); a sticky header (needs a background and a shadow or border over scrolling content; the app is calm and pages are short enough); merging test and zen into a "practise" dropdown (puts a menu into the primary row, hides a destination behind a click, and five short words already fit at 390). Zen stays a top-level tab and stays in the test toolbar.

### Why A fits the app

- It is the brand signature applied to navigation: the accent caret bar gliding along a line of words, the same motion as the typing caret.
- It reuses language the user already likes: the `Segmented` pill's 2px accent underline, the settings index's caret bar, the footer's column-wide hairline. Header and footer now bracket the content column with the same rule.
- It is "less minimalistic" than bare links through structure, not boxes: a defined bar with a baseline, 56px tall hit areas, a clear current-page mark, hover feedback on the baseline, and one real button for the account. It is less cluttered than the capsule: no icons, no fills, no borders around tabs.
- It matches PROJECT.md section 8 ("lowercase minimal navigation at the top") without being bare.

### Information architecture

| Slot | Items | Notes |
|------|-------|-------|
| Brand | mark plus "i am speed" | Link to `/`, `aria-label="i am speed, home"` (unchanged). Wordmark visible at every width. |
| Primary tabs | `lessons`, `test`, `zen`, `stats` | Left group, starting `--space-6` after the brand. |
| Utility tab | `settings` | Same tab style, pushed to the right end of the tab row on desktop; fifth tab on phones. |
| Account control | signed out: `sign in` button to `/login/`; signed in: avatar menu | Outside the tab row, right edge. The avatar menu holds identity, sync status, `account`, `sign out`. |
| Footer (unchanged) | `about`, `privacy`, `source` | Footer stays exactly as is. |

Current-tab mapping (one function, unit-tested): `/` is `lessons` (exact, `aria-current="page"`); `/lesson/*` is `lessons` (section, `aria-current="true"`); `/test` is `test`; `/zen` is `zen`; `/stats` is `stats`; `/settings` is `settings` (all exact, `"page"`). `/results`, `/about`, `/account`, `/login`, `/signup`, `/forgot-password` have no current tab: the indicator fades out. `/login` sets `aria-current="page"` on the `sign in` button. `/account` marks the avatar (accent ring) and sets `aria-current="page"` on the menu's `account` item.

### Desktop layout (40.0625rem and wider: tablet 768 and desktop 1440)

```
1440 viewport, 56rem column, gutter 2rem. Signed out, on /stats/.

   |<------------------------------- content width (column minus gutters) ------------------------------>|
   
   (i) i am speed      lessons     test     zen     stats                          settings    [ sign in ]
   ------------------------------------------------------=====---------------------------------------------
                                                         ^ 2px accent bar on the 1px --line hairline,
                                                           exactly as wide as the word "stats"

   learn to type with ten fingers ...                     (page content starts 36px below the hairline)


Signed in, menu open, on /account/ (avatar ring is accent, menu item "account" carries the caret bar):

   (i) i am speed      lessons     test     zen     stats                          settings       (n)*
   ---------------------------------------------------------------------------------------------------------
                                                                                      +--------------------+
                                                                                      | Noel               |
                                                                                      | noel@example.com   |
                                                                                      | * Synced just now. |
                                                                                      |--------------------|
                                                                                      || account           |
                                                                                      |  sign out          |
                                                                                      +--------------------+
   (n)* = 2rem circle, initial "n", sync dot at its lower right.
```

Exact values (desktop):

| Element | Value |
|---------|-------|
| `<header class="site-chrome header">` | `position: relative; z-index: 10; width: 100%; max-width: var(--column); margin: 0 auto var(--space-3); padding: var(--space-2) var(--gutter) 0;` |
| `.bar` (inner row) | `display: flex; align-items: stretch; height: var(--header-h);` with `--header-h: 3.5rem` (56px) in `globals.css`; `border-bottom: var(--stroke) solid var(--line);` |
| Total header box | 8px top padding + 56px bar + 1px hairline + 12px margin = 77px before `main` (today about 72px). Page content starts about 5px lower than today. |
| `.brand` | `display: inline-flex; align-items: center; gap: var(--space-2); margin-right: var(--space-6); font-size: var(--text-base); font-weight: 600; letter-spacing: -0.01em; color: var(--text); white-space: nowrap;` `Mark size={22}` (unchanged animation). `.brand:hover { color: var(--text); }` to cancel the global accent hover. |
| `.nav` (`<nav aria-label="main">`) | `flex: 1; display: flex; min-width: 0;` |
| `.track` (div wrapping the list and the indicator) | `position: relative; flex: 1; display: flex;` |
| `.links` (`<ul>`) | `display: flex; flex: 1; align-items: stretch;` each `li { display: flex; }`; the settings `li` has class `.end { margin-left: auto; }` |
| `.link` (each tab `<a>`) | `display: flex; align-items: stretch; justify-content: center; min-width: 2.75rem; padding: 0 var(--space-3); font-size: var(--text-sm); font-weight: 500; color: var(--muted); white-space: nowrap; transition: color var(--dur-base) var(--ease-out); -webkit-tap-highlight-color: transparent;` |
| `.label` (`<span data-label>` inside each tab) | `position: relative; display: flex; align-items: center; transition: transform var(--dur-fast) var(--ease-out);` Its box defines the indicator geometry: indicator width equals the label's width. |
| Account slot `.account` | `position: relative; flex: none; display: flex; align-items: center; justify-content: flex-end; width: 5.5rem; margin-left: var(--space-2);` Fixed width so `settings` never moves when the auth state resolves. |
| `sign in` | `ButtonLink variant="secondary" size="sm"` (2rem tall, `--panel` fill, `--line-strong` border, `--text`), no icon, `href="/login/"`. |
| Avatar button | `<button>` 2.75rem square, transparent, `border: 0; border-radius: 50%; margin-right: -0.375rem;` (circle edge aligns with the column edge). Inside: `.avatar` 2rem circle, `background: var(--surface); border: var(--stroke) solid var(--line-strong); color: var(--text); font-size: var(--text-sm); font-weight: 600; line-height: 1;` lowercase initial. Fallback when no name and no email: lucide `User` at 16px, `aria-hidden`. |
| Sync dot | `<span aria-hidden="true">` with the existing `AccountView.module.css` `.dot` class and `data-tone={toneFor(sync)}`, positioned `position: absolute; right: 0.375rem; bottom: 0.375rem; outline: 2px solid var(--canvas);` (outline, not a shadow). |
| Menu panel | `position: absolute; top: calc(100% + var(--space-2)); right: 0; width: 16rem; max-width: calc(100vw - 2 * var(--gutter)); padding: var(--space-2); background: var(--panel); border: var(--stroke) solid var(--line-strong); border-radius: var(--radius-panel); z-index: 20;` |

Typography: tabs are Geist sans 14px weight 500, lowercase, no letter-spacing change. The current tab changes colour only, never weight, so labels never change width (no layout shift). Mono is not used in the header.

### States

| State | Tabs | Sign in | Avatar | Menu items |
|-------|------|---------|--------|------------|
| Rest | `--muted` text | secondary button | circle border `--line-strong` | `--text` on `--panel` |
| Hover (only inside `@media (hover: hover)`) | text `--text`; a 2px `--line-strong` "ghost" bar appears on the hairline under the label (`.label::before`, opacity 0 to 1, `--dur-base`); not on the current tab | existing secondary hover (`--surface` fill) | circle border `--muted` | `background: var(--surface); color: var(--text);` |
| Outside hover media | `.link:hover { color: var(--muted); }` so touch devices never get the global accent hover or a sticky state | | | |
| Pressed (`:active`) | `.label { transform: translateY(1px); }` (same as `Segmented` text) | existing `scale(0.97)` | `.avatar { transform: scale(0.96); }` | none |
| Focus-visible | `outline: 2px solid var(--accent); outline-offset: -0.375rem; border-radius: var(--radius-control);` (inset ring, never covers the hairline) | global ring | `outline-offset: 0; border-radius: 50%;` | `outline-offset: -2px;` |
| Current page | `color: var(--text)` plus the accent indicator | `/login/`: `aria-current="page"`, `border-color: var(--accent)` | `/account/`: `data-current`, circle border `--accent` | `account` on `/account/`: `aria-current="page"` and a 2px by 1rem accent caret bar at the item's left edge (same as the settings index) |
| Menu open | | | `aria-expanded="true"`, circle border `--accent` | |
| Signed out / unknown / signed in | | `signed-out`: shown | `signed-in`: shown | `unknown` (server render, pre-hydration): an empty slot of the same size, `aria-hidden` |
| Sync | | | dot tone `ok` accent, `idle` muted, `error` error | identity block shows the dot plus `describeSync(sync)` in `--text-xs --muted` |

### Active indicator and motion (D12 compliant)

- One element: `<span class="indicator" data-nav-indicator aria-hidden="true">` inside `.track`, after the `<ul>`. CSS: `position: absolute; left: 0; bottom: -1px; width: 1px; height: 2px; background: var(--accent); transform-origin: 0 50%; opacity: 0; pointer-events: none;` No border radius (it is scaled). Position and width come only from `transform: translateX(<x>px) scaleX(<w>)`, set inline. `bottom: -1px` puts the 2px bar over the 1px hairline so its bottom edge matches the hairline's bottom edge.
- `[data-visible] { opacity: 1; }`. `[data-ready] { transition: opacity var(--dur-base) var(--ease-out); }`. `[data-ready][data-glide] { transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-slow) var(--ease-out); }`. Only transform and opacity ever animate.
- No animation on first paint, and no pop at hydration: every `.label` also has an `::after` bar with identical geometry (`left: 0; right: 0; bottom: -1px; height: 2px; background: var(--accent); opacity: 0;`). Rule: `.track:not([data-glide-on]) .link[aria-current] .label::after { opacity: 1; }`. The static HTML already has `aria-current` (static export renders `usePathname()` per route), so the bar is correct before JavaScript. After the hook measures, it sets `data-glide-on` on `.track` and `data-visible` on the indicator in the same commit, in a layout effect, so the swap from the `::after` bar to the indicator happens before paint at the same pixels. `data-ready` is set one animation frame later, so nothing transitions on the first placement.
- State transitions are a pure function `nextIndicator(prev, box, cause)` in `src/components/layout/navIndicator.ts` (state `{ x, w, visible, glide }`):
  - `box === null` (no current tab): `{ ...prev, visible: false, glide: false }` (fades out in place).
  - `cause === "init"` or `"resize"`: `{ x, w, visible: true, glide: false }` (snaps).
  - `cause === "route"` and `prev.visible`: `{ x, w, visible: true, glide: true }` (glides).
  - `cause === "route"` and `!prev.visible`: `{ x, w, visible: true, glide: false }` (appears in place, fades in).
- Measuring (hook `useNavIndicator` in `src/components/layout/useNavIndicator.ts`): `x = label.getBoundingClientRect().left - track.getBoundingClientRect().left`, `w = label.getBoundingClientRect().width`, rounded to 0.5px. Label lookup: `track.querySelector('[data-href="<href>"] [data-label]')`. Remeasure with cause `"route"` when the current href changes, and with cause `"resize"` from one `ResizeObserver` observing the track and every label (covers the 40rem breakpoint and font swaps), plus `document.fonts.ready.then(...)`. Skip `setState` when nothing changed.
- Reduced motion: the duration tokens are already 0ms under `prefers-reduced-motion: reduce` and `[data-motion="reduce"]` (`motion.css`), so transitions disappear; no extra rule needed. The menu entrance gets explicit `animation: none` under both conditions.
- Menu entrance: the panel is always rendered and toggled with the `hidden` attribute; `.menu { animation: menu-in var(--dur-base) var(--ease-out); }` with `@keyframes menu-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }` restarts on every open because `hidden` removes it from rendering. Close is instant. Tab colour changes use `--dur-base`.
- Route change motion budget: indicator glide 320ms plus the existing page fade-up 320ms run together; both are transform and opacity on separate layers.

### Phone layout (40rem and narrower) and small phones (22.5rem and narrower)

```
390 x 844, gutter 1rem, signed out, on /stats/

+--------------------------------------+
|  (i) i am speed            [ sign in ] |   row 1: 3.25rem (52px), brand left, account right
|  lessons  test  zen  stats  settings  |   row 2: 2.75rem (44px), tabs spread edge to edge
|  ------------------------=====--------|   hairline, accent bar under "stats"
|                                      |
|  stats                               |
|  3 attempts over 1 day.              |
```

- `@media (max-width: 40rem)`: `.header { padding-top: 0; }` `.bar { display: grid; grid-template-columns: 1fr auto; grid-template-areas: "brand account" "nav nav"; height: auto; }` `.brand { grid-area: brand; height: 3.25rem; margin-right: 0; }` `.account { grid-area: account; width: auto; height: 3.25rem; }` `.nav { grid-area: nav; height: 2.75rem; margin: 0 calc(var(--space-3) * -1); }` (the negative margin aligns the first and last labels with the column edges) `.links { justify-content: space-between; }` `.end { margin-left: 0; }` sign in button `min-height: 2.75rem;` menu items `min-height: 2.75rem;`.
- `@media (max-width: 22.5rem)`: `.link { padding: 0 var(--space-2); }` `.nav { margin: 0 calc(var(--space-2) * -1); }`.
- Width check at 390: content 358px plus 24px of negative margin; five labels about 188px plus 5 x 24px padding is about 308px. At 320: about 268px in 304px. Every tab is at least 44 x 44px.
- No fixed or sticky elements, so no safe-area insets are needed; do not add `viewport-fit=cover`. The wordmark stays visible (the old `max-width: 30rem` rule that hid it is deleted).
- Tablet 768: desktop single row (content about 706px; needs about 550px).

### Keyboard and semantics

- DOM and tab order: skip link (unchanged in `layout.tsx`), brand, `lessons`, `test`, `zen`, `stats`, `settings`, account control, then the menu panel contents when open. Plain tab order, no roving tabindex: these are navigation links, not a composite widget.
- `<header>` is the banner landmark; `<nav aria-label="main">` wraps only the tab list (name kept so `e2e/zen.spec.ts` keeps working). The footer nav keeps `aria-label="footer"`.
- `aria-current`: `"page"` for an exact match, `"true"` for `/lesson/*` under `lessons`. CSS targets `[aria-current]`, so both values style identically.
- Account menu is a WAI-ARIA disclosure (not `role="menu"`, which is for application menus): `<button aria-expanded aria-controls="account-menu" aria-label="account menu" aria-describedby="account-sync">`; the hidden span `#account-sync` (class `sr-only`) holds `describeSync(sync)`. The panel `<div id="account-menu" hidden={!open}>` contains the identity block (plain text) and a `<ul>` with an `account` `<Link>` and a `sign out` `<button>`.
- Key handling on the account wrapper (pure decision function `menuKeyAction` in `headerModel.ts`, unit-tested):
  - `Escape` while open: close, focus the avatar button, `preventDefault` and `stopPropagation` (the lesson and test screens would restart, zen would finish).
  - `Tab`, `Shift+Tab`, `Enter`, `Space`: `stopPropagation` only (default behaviour, never fed to a typing session).
  - `ArrowDown`, `ArrowUp`, `Home`, `End` while open: move focus between the panel's items with `nextIndex` from `src/components/ui/segmentedNav.ts`; `ArrowDown` on the button while open focuses the first item. `preventDefault`.
  - Any other single printable key without Ctrl, Alt or Meta while open: close the panel and let the event continue (typing keeps working).
  - Everything else: pass.
- Close triggers: `Escape` (focus returns to the button), `pointerdown` outside the wrapper (focus stays where the user clicked), focus leaving the wrapper (`onBlur` with a non-null `relatedTarget` outside), pathname change, activating `account`.
- Sign out: close the panel, call `signOut()`, and when the auth state becomes `signed-out` focus the `sign in` link (wrapper ref, `querySelector("a")?.focus()`), so focus never drops to `<body>`.
- Typing screens: Tab stays captured there (D11, unchanged), so keyboard users reach the header from non-typing pages or with the mouse. Do not change the typing listeners.

### Zen and typing screens

- `<header>` keeps `className="site-chrome ..."`; zen fades the whole header including an open menu; nothing else changes. `e2e/zen.spec.ts` keeps asserting `header.site-chrome` opacity 0.
- Lesson and test screens keep the header visible, as today.
- The lesson list and typing screens must look exactly as they do now below the header; `e2e/preserve.spec.ts` guards it.

### Themes and contrast

Every pairing is an already tested one (fact 7): tab text `--muted` and `--text` on canvas; indicator and focus ring `--accent` on canvas and panel; hover ghost bar and control borders `--line-strong` on canvas; avatar initial `--text` on `--surface`; menu text `--text` and `--muted` on `--panel` and hover `--surface`; dot tones accent, error, muted on canvas. Check all four themes in the visual review; light is the riskiest (hairline `--line` is faint by design, same as the footer).

## Affected files

| Path | Change |
|------|--------|
| `src/components/layout/Header.tsx` | Rewrite: brand, `<nav aria-label="main">` with track, tab list, indicator; renders `AccountControl`. No icons. |
| `src/components/layout/Header.module.css` | Rewrite with the values above (desktop, 40rem, 22.5rem). |
| `src/components/layout/headerModel.ts` | New: `NAV_ITEMS`, `normalisePath`, `currentNav(pathname)`, `initialFor(user)`, `menuKeyAction(...)`. Pure, no React. |
| `src/components/layout/headerModel.test.ts` | New Vitest tests for the above. |
| `src/components/layout/navIndicator.ts` | New: `IndicatorState`, `nextIndicator(prev, box, cause)`. |
| `src/components/layout/navIndicator.test.ts` | New Vitest tests for the transition table. |
| `src/components/layout/useNavIndicator.ts` | New client hook: measuring, ResizeObserver, fonts, ready frame. |
| `src/components/layout/AccountControl.tsx` | New: reads hydration, auth, sync, pathname; renders placeholder, `sign in`, or `UserMenu`; focus after sign out. |
| `src/components/layout/UserMenu.tsx` | New: avatar disclosure button and panel. |
| `src/components/layout/UserMenu.module.css` | New: avatar, dot position, panel, items, entrance animation, reduced motion. |
| `src/styles/globals.css` | `--header-h: 3.5rem` (was 4.5rem). Nothing else. |
| `src/components/layout/Footer.tsx`, `Footer.module.css` | Unchanged (explicitly). |
| `e2e/fixtures/auth.ts` | New: `blockAuthNetwork(page)` (moved from `auth-screens.spec.ts`) and `seedSignedInUser(page, user)`. |
| `e2e/nav.spec.ts` | New: aria-current per route, tab order, indicator geometry and motion, menu behaviour, phone and tablet layout, no horizontal scroll. |
| `e2e/auth-screens.spec.ts` | Import `blockAuthNetwork` from the fixture; replace the "header offers an account entry" test with a `sign in` test. |
| `e2e/motion-capture.spec.ts` | Scope the `lessons` link click to `navigation "main"`. |
| `e2e/a11y.spec.ts` | Add a signed-in pass with the account menu open (dark and light). |
| `e2e/screenshots.spec.ts` | Add the 768 size; add an `account-menu` capture with a seeded user. |
| `screenshots/preserve/*` (git-ignored) | Re-record only after a diff check, if at all. |
| `DECISIONS.md` | Append D20 (header navigation), superseding the "Header" bullet of D16. |
| `README.md` | Design system section: one bullet describing the header. |
| `.docs/evidence/2026-10-12-navbar-redo.md` | New task evidence record, learning disposition `pending`. |

## Risks / Unknowns

- **Taste risk (highest).** The user has rejected four headers. Mitigation: the concept changes (no container, no icons), and milestone 8 is a strict visual review against a checklist at three widths and four themes before anything is called done. If the user rejects it anyway, `headerModel.ts`, the indicator logic and the e2e specs carry over to any next design.
- **Signed-in e2e fixture is unverified (guess).** Plan: seed `localStorage["firebase:authUser:<apiKey>:[DEFAULT]"]` with a fake user JSON (`uid`, `email`, `emailVerified`, `displayName`, `isAnonymous: false`, `providerData: [{ providerId: "password", uid, email, displayName: null, phoneNumber: null, photoURL: null }]`, `stsTokenManager: { refreshToken: "e2e", accessToken: "e2e", expirationTime: Date.now() + 3600000 }`, `createdAt`, `lastLoginAt` as millisecond strings, `apiKey`, `appName: "[DEFAULT]"`) and `localStorage["i-am-speed:auth"] = "1"` via `page.addInitScript`, with all Google traffic aborted. Firebase should keep the user because the reload fails with a network error. Time-box: one focused session. If it does not work, keep the fixture out, cover `menuKeyAction` and `initialFor` with unit tests, verify the menu manually in a dev session with a real test account, record the manual checks in the Log, and mark the signed-in e2e tasks as replaced (edit the task text, do not leave them unchecked).
- **`usePathname()` with `trailingSlash: true`** may return paths with or without the trailing slash. `normalisePath` strips one trailing slash (except for `/`) and tests cover both forms.
- **Preserve baselines predate two commits.** Run the guard at base first (milestone 0). If it already fails at base, re-record at base before any change and log it, so the guard measures only this plan.
- **Font swap and measuring.** `next/font` uses `display: swap`; if the fallback font is measured first, the ResizeObserver on labels plus `document.fonts.ready` corrects it with a snap (cause `"resize"`), never a glide.
- **Menu over the page entrance.** `main`'s `.page-enter` transform creates a stacking context; the header's `position: relative; z-index: 10` keeps the panel above it. Verify on stats (charts) and settings (sticky index).
- **Hover ghost bar on touch.** Hover rules live only inside `@media (hover: hover)`; verify with Playwright's mobile emulation that a tap leaves no grey bar.

## Done criteria

- The header matches the Design section at 1440, 768 and 390 in dark, light, dusk and ember, signed out and signed in (menu closed and open).
- No icons in the header except the avatar fallback glyph; no bordered container around tabs.
- `npm run check` green; `npm run test:e2e` green (including the new `e2e/nav.spec.ts`); `PRESERVE=1 npx playwright test e2e/preserve.spec.ts` green, or re-recorded only after a documented diff check showing the change is header-only.
- Axe: no serious or critical violations on every page in dark and light, plus the signed-in menu-open pass (or the documented fallback).
- No horizontal scroll on any page at 390, 768 and 1440; every header touch target is at least 44 x 44px at 390.
- The indicator never animates on first load, glides between tabs on client navigation, and has no animations under reduced motion.
- Zen still fades the header; lesson and test screens look exactly as before below the header.
- D20 in `DECISIONS.md`, README bullet, evidence record written; plan `status: done`.

## Milestones

### Milestone 0: Baseline

Outcome: a known-green starting point and before-shots for comparison.

- [x] Run `npm run check` at base `e919791`; record the result in the Log.
- [x] Run `PRESERVE=1 npx playwright test e2e/preserve.spec.ts` at base. If it fails, inspect the diff images in `test-results/`, re-record with `--update-snapshots` at base, and log why.
- [x] Copy the current `screenshots/dark-1440-*.png`, `dark-390-*.png` and `light-1440-*.png` to the session scratchpad as "before" images (do not commit them).

### Milestone 1: Pure model and tests

Outcome: routing, initials, key decisions and indicator transitions are defined and unit-tested before any UI.

- [x] Create `src/components/layout/headerModel.ts` with `NAV_ITEMS: readonly { href: string; label: string; end?: boolean }[]` = lessons `/`, test `/test/`, zen `/zen/`, stats `/stats/`, settings `/settings/` (`end: true`); `normalisePath(p)`; `currentNav(pathname): { href: string; current: "page" | "true" } | null` (segment-boundary match: `p === base || p.startsWith(base + "/")`, `/lesson` maps to `/` with `"true"`); `isPath(pathname, "/login")`-style helper; `initialFor(user: { displayName: string | null; email: string | null }): string | null` (first character of trimmed displayName, else email, lowercased, else null); `menuKeyAction(key, mods: { ctrl: boolean; alt: boolean; meta: boolean }, open: boolean): "close-and-focus" | "move" | "stop" | "close-and-pass" | "pass"` per the Keyboard section.
- [x] Create `src/components/layout/headerModel.test.ts`: `currentNav` for `/`, `/lesson/home-01/`, `/lesson/home-01`, `/test/`, `/test`, `/zen/`, `/stats/`, `/settings/`, and null for `/results/`, `/about/`, `/account/`, `/login/`, `/signup/`, `/forgot-password/`, `/statsx/`; `initialFor` for name, email only, whitespace, neither; `menuKeyAction` for Escape open and closed, Tab, Enter, Space, arrows open and closed, `a` open and closed, `Control+a` open.
- [x] Create `src/components/layout/navIndicator.ts` (`IndicatorState = { x: number; w: number; visible: boolean; glide: boolean }`, `INITIAL_INDICATOR`, `nextIndicator(prev, box, cause: "init" | "route" | "resize")`) and `navIndicator.test.ts` covering all four rows of the transition table plus "same box returns the same object" (so callers can skip renders).
- [x] `npm run test` green.

### Milestone 2: Desktop header structure and CSS (no glide yet)

Outcome: the new bar renders at 1440 and 768 with the static accent bar from `aria-current`, correct tab order, and no icons.

- [x] Set `--header-h: 3.5rem` in `src/styles/globals.css`.
- [x] Rewrite `src/components/layout/Header.tsx`: `"use client"`; `<header className={\`site-chrome ${styles.header}\`}>` then `<div className={styles.bar}>` containing the brand `Link` (unchanged markup and label), `<nav aria-label="main" className={styles.nav}><div className={styles.track}><ul className={styles.links}>` with one `<li>` per `NAV_ITEMS` entry (`className={item.end ? styles.end : undefined}`), each `<Link href className={styles.link} data-href={item.href} aria-current={...}><span className={styles.label} data-label>{item.label}</span></Link>`, then `</ul>` and the indicator `<span className={styles.indicator} data-nav-indicator aria-hidden="true" />` (no data attributes yet), `</div></nav>`, then `<AccountControl />` (temporary stub returning the fixed-width empty slot until milestone 4). Remove lucide imports, `useThumb`, `SyncBadge` import and all thumb code.
- [x] Rewrite `src/components/layout/Header.module.css` with every desktop value from the Design section: `.header`, `.bar`, `.brand`, `.nav`, `.track`, `.links`, `.end`, `.link`, `.label`, `.label::before` (ghost bar), `.label::after` (static accent bar), the `:not([data-glide-on])` rule, hover rules inside `@media (hover: hover)`, `.link:hover { color: var(--muted); }` outside it, `[aria-current]` colour, `:active` label shift, focus-visible ring, `.indicator` base and `[data-visible]`, `[data-ready]`, `[data-glide]` rules, `.account`.
- [x] Create `e2e/nav.spec.ts` with: (a) for each route in the mapping table, the `navigation "main"` has exactly the expected link with `aria-current` (`page` or `true`) or none; (b) on `/stats/` at 1440, pressing Tab from a fresh load focuses, in order, `skip to content`, `i am speed, home`, `lessons`, `test`, `zen`, `stats`, `settings`, `sign in` (the last one after milestone 4; mark it `test.fixme` until then and remove the fixme in milestone 4); (c) the header contains no `svg` other than the mark (`header svg` count is 1 when signed out).
- [x] `npm run build` then `npx playwright test e2e/nav.spec.ts` green; look at `/`, `/stats/` and `/lesson/top-01/` at 1440 and 768 in the dev server and compare with the mockup.

### Milestone 3: Gliding indicator

Outcome: the accent bar glides between tabs on client navigation, fades on routes without a tab, never animates on first paint, and is static under reduced motion.

- [x] Create `src/components/layout/useNavIndicator.ts`: `useNavIndicator(trackRef, href: string | null)` returning `{ state, ready, measured }`; `useLayoutEffect` measures on mount (`"init"`) and on href change (`"route"`), a `ResizeObserver` on the track and every `[data-label]` triggers `"resize"`, `document.fonts?.ready.then(() => measure("resize"))`; `ready` becomes true one `requestAnimationFrame` after the first measurement; cancel the frame and disconnect the observer on cleanup.
- [x] Wire it in `Header.tsx`: `.track` gets `data-glide-on` once `measured`; the indicator gets `style={{ transform: \`translateX(${x}px) scaleX(${w})\` }}`, `data-visible`, `data-ready`, `data-glide` from state. Never set inline `transition` or `width`.
- [x] Extend `e2e/nav.spec.ts`: (a) on `/stats/` the indicator's bounding box matches the `stats` label's left and width within 1px and its bottom equals the bar's bottom within 1px; (b) right after `page.goto`, `document.querySelector('[data-nav-indicator]').getAnimations().length` is 0; (c) clicking `settings` then waiting 400ms puts the box under the `settings` label; during the move (sample at about 100ms) `getAnimations()` has one running transition on `transform`; (d) navigating to `/about/` via the footer link leaves the indicator with computed opacity 0 after 300ms; (e) with `page.emulateMedia({ reducedMotion: "reduce" })`, clicking between tabs never produces animations.
- [x] `npm run build` then `npx playwright test e2e/nav.spec.ts e2e/zen.spec.ts` green.

### Milestone 4: Account control and menu

Outcome: signed-out visitors see a real `sign in` button; signed-in users get an avatar disclosure with identity, sync status, `account` and `sign out`, fully keyboard operable.

- [x] Create `src/components/layout/AccountControl.tsx` (`"use client"`): `useHydrated()`, `useAuth()`, `useSyncState()`, `usePathname()`; wrapper `<div className={styles.account} ref={wrapperRef}>`; `!hydrated || status === "unknown"` renders nothing inside the fixed slot; `signed-out` renders `<ButtonLink href="/login/" variant="secondary" size="sm" className={styles.signIn} aria-current={isLogin ? "page" : undefined}>sign in</ButtonLink>`; `signed-in` renders `<UserMenu user={auth.user} sync={sync} current={isAccount} onSignOut={...} />`; after a sign-out started from the menu, focus the `sign in` link once it renders. Add `.signIn[aria-current] { border-color: var(--accent); }` and the phone `min-height` to `Header.module.css`.
- [x] Create `src/components/layout/UserMenu.tsx`: state `open`; the button and panel exactly as in the Keyboard section (`aria-expanded`, `aria-controls="account-menu"`, `aria-label="account menu"`, `aria-describedby="account-sync"`, `data-current` when on `/account/`); avatar initial from `initialFor` or the `User` glyph; sync dot span with `data-tone={toneFor(sync)}`; panel with identity block (display name line only if present, email line, dot plus `describeSync(sync)`), divider, `<ul>` with `account` link (`aria-current="page"` on `/account/`) and `sign out` button; `onKeyDown` on the wrapper applies `menuKeyAction`; `pointerdown` listener on `document` only while open; `onBlur` close rule; close on pathname change.
- [x] Create `src/components/layout/UserMenu.module.css` with the avatar, dot, panel, identity, item, current caret bar, hover and focus values from the Design section, the `menu-in` keyframes, and `animation: none` under `@media (prefers-reduced-motion: reduce)` and `[data-motion="reduce"]`.
- [x] Create `e2e/fixtures/auth.ts` with `blockAuthNetwork(page)` (moved verbatim from `e2e/auth-screens.spec.ts`) and `seedSignedInUser(page, { email, displayName })` as described in Risks (import `FIREBASE_CONFIG.apiKey` from `../../src/config/firebase` if that module is side-effect free, else hardcode the public key). Update `e2e/auth-screens.spec.ts` to import `blockAuthNetwork` from it.
- [x] Replace the `header offers an account entry for signed-out visitors` test in `e2e/auth-screens.spec.ts` with `header offers sign in for signed-out visitors`: `page.getByRole("banner").getByRole("link", { name: "sign in" })` navigates to `/login/`, and on `/login/` that link has `aria-current="page"`. Remove the `test.fixme` from the milestone 2 tab-order test.
- [x] Add signed-in tests to `e2e/nav.spec.ts` (behind the fixture): avatar button `account menu` visible with initial `n` for `displayName: "Noel"`; click opens (`aria-expanded="true"`, panel shows the email and a sync sentence); Escape closes and focuses the button; reopen, ArrowDown focuses `account`, ArrowDown focuses `sign out`, Home returns to `account`; click outside closes; Tab past `sign out` closes; `account` navigates to `/account/` and the avatar has `data-current`; on `/lesson/home-01/`, open the menu by click, press Escape, assert the lesson progress counter is unchanged and the URL did not change; `sign out` leaves a focused `sign in` link. If the fixture fails within the time-box, follow the fallback in Risks and edit this task's text accordingly.
- [x] `npm run build` then `npx playwright test e2e/nav.spec.ts e2e/auth-screens.spec.ts` green.

### Milestone 5: Phones and tablets

Outcome: the two-row bar at 40rem and below, 44px targets, no horizontal scroll down to 320px.

- [ ] Add the `@media (max-width: 40rem)` and `@media (max-width: 22.5rem)` blocks to `Header.module.css` and the phone item height to `UserMenu.module.css`; delete any rule that hides the wordmark.
- [ ] Extend `e2e/nav.spec.ts` with a `390 x 844` block: on every route in the mapping table `document.documentElement.scrollWidth <= innerWidth`; the nav's top is below the brand's bottom (two rows); each of the five tab links and the `sign in` link has a bounding box at least 44 x 44; all five tab labels are inside the viewport; the indicator still matches the current label. Add the same no-scroll and single-row assertion (nav top within the bar's first row) at `768 x 1024`, and the no-scroll assertion at `320 x 640`.
- [ ] Add a `hasTouch: true, isMobile: true` test at 390: tap `stats`, then assert no `.label::before` has computed opacity above 0 (no sticky hover bar).
- [ ] `npm run build` then `npx playwright test e2e/nav.spec.ts` green.

### Milestone 6: Existing specs, accessibility, guard

Outcome: every existing spec passes, axe is clean signed out and signed in, the preserve guard holds.

- [ ] `e2e/motion-capture.spec.ts`: change `page.getByRole("link", { name: "lessons" })` to `page.getByRole("navigation", { name: "main" }).getByRole("link", { name: "lessons" })`.
- [ ] `e2e/a11y.spec.ts`: add `axe: signed-in header with the account menu open, <theme>` for dark and light (seed user, go to `/stats/`, open the menu, run `audit`). Skip with a comment if the fixture fallback was taken.
- [ ] `e2e/screenshots.spec.ts`: add `{ name: "768", width: 768, height: 1024 }` to `SIZES`; after the `forgot-password` capture, seed a signed-in user in a fresh context, open the menu on `/stats/`, and capture `account-menu` (viewport, not full page).
- [ ] Run `npm run check` and `npm run test:e2e`; fix anything red.
- [ ] Run `PRESERVE=1 npx playwright test e2e/preserve.spec.ts`. If any capture differs, open the diff image; re-record with `--update-snapshots` only if the difference is caused solely by header geometry (for example `main` height), and write the evidence in the Log. Any difference inside the list rows, the typing text, the keyboard or the info bar is a bug to fix, not to re-record.

### Milestone 7: Visual review and fixes

Outcome: the header is checked by eye against a written checklist on every page, size and theme, and every finding is fixed.

- [ ] Capture `SHOTS=1 THEMES=dark,light npx playwright test e2e/screenshots.spec.ts` (1440, 768, 390) and `SHOTS=1 THEMES=dusk,ember npx playwright test e2e/screenshots.spec.ts` (only no Playwright run may be active at the same time).
- [ ] Review the header in every capture against this checklist and write each finding in the Log: (1) brand mark, wordmark, tabs and account control share one vertical centre line; (2) the first label and the account control align with the content column's left and right edges, and the hairline spans exactly the column like the footer's rule; (3) the accent bar sits on the hairline, exactly under the current word, nowhere on pages without a tab; (4) no icons, fills or borders around tabs; (5) spacing between tabs is even and `settings` sits at the right end on desktop; (6) at 390 two rows, wordmark visible, tabs spread edge to edge, nothing clipped; (7) light theme: hairline visible but quiet, accent bar clear, sign in border visible; (8) dusk and ember: accent bar and sync dot read correctly; (9) the menu panel is clearly delimited over stats charts and settings panels; (10) lesson list, lesson and test screens look identical to the "before" images below the header; (11) zen typing capture shows no header.
- [ ] Fix every finding within the Design section's values. If a fix needs a value that differs from this plan, change the plan's Design section in place and log why.
- [ ] Re-capture and re-review until the checklist passes in all captures; delete stale screenshots of removed variants if any.

### Milestone 8: Documentation and close-out

Outcome: decisions and docs describe the current header; the plan and evidence are closed.

- [ ] Append `## D20 Header navigation: text tabs on a hairline` to `DECISIONS.md`: context (four rejected headers, boxed icon tabs were the wrong concept), decision (column-aligned bar, hairline mirroring the footer, five text tabs with settings at the right, gliding 2px accent caret indicator with the SSR `::after` hand-off, `sign in` secondary button or avatar disclosure with sync dot, two-row layout at 40rem and below, no icons), rejected directions (bottom bar, sidebar, command palette, header call to action, tinted band, sticky, practise dropdown), the sentence "Supersedes the Header bullet of D16." and the verification (e2e `nav.spec.ts`, axe, preserve, screenshots at 1440, 768, 390). Do not edit D16 (the file is append-only).
- [ ] `README.md` design system section: add one bullet: header is a column-wide bar of text tabs on a hairline with a gliding accent indicator; signed-out shows `sign in`, signed-in shows an avatar menu with sync status; two rows on phones; see D20. Update the screenshots bullet to mention 768.
- [ ] Grep the diff for em dashes and emoji (`git diff e919791 -- . | grep -nP "\x{2014}|[\x{1F300}-\x{1FAFF}]"` returns nothing).
- [ ] Write `.docs/evidence/2026-10-12-navbar-redo.md` (objective, outcome, revision, rules considered and applied, verification commands and results, learning disposition `pending`).
- [ ] Final `npm run check` and `npm run test:e2e` green; set `status: done`, update `updated:`, append the final Log entry.

## Log
- 2026-10-12 00:00 M0 done: npm run check green at base e919791; preserve guard 4/4 green at base (no re-record needed); before images copied to scratchpad/before.
- 2026-10-12 M1 done: headerModel, navIndicator and tests added; npm run test 326 passed.
- 2026-10-12 M2 done: text tab bar with static ::after accent bar; nav.spec 14 passed; viewed /stats/ at 1440. Deviation: 'sign in' tab-order step added in M4 instead of test.fixme (same effect).
- 2026-10-12 M3 done: useNavIndicator wired; nav.spec 19 passed incl. glide (running CSSTransition on transform at 100ms), zero animations on first load (rAF sampler) and under reduced motion; zen.spec green.
- 2026-10-12 M4 done: AccountControl, UserMenu and CSS built. Signed-in fixture WORKS (seed firebase:authUser localStorage key plus i-am-speed:auth hint, Google blocked): no fallback needed. Fixture hardcodes the public web key because eslint forbids importing src/config/firebase from e2e. Under blocked network the sync sentence is 'Sync failed. Trying again soon.'. Escape test types 3 chars first and asserts progress unchanged. nav.spec 25 + auth-screens green.
