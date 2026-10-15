---
status: done
created: 2026-10-15
updated: 2026-10-15
base: 18af053
goal: Give every page outside the typing screens the same full header-to-header width, and redesign the lessons page as a wide lesson list plus a profile sidebar (identity, overall speed, recent attempts) without cards.
---

# Home sidebar and one page width

## Goal

Give every page outside the typing screens the same full header-to-header width, and redesign the lessons page as a wide lesson list plus a profile sidebar (identity, overall speed, recent attempts) without cards.

## Inputs

- Rules: `plan-execution`, `verification`, `docs-current-state-only`.
- User direction: stats is the reference width; only the typing screens (lessons, test, zen) stay narrow. The sidebar picture is a layout reference only, not a style to copy. No cards on the lessons page. Main plus sidebar together span the header width. Must work in every theme.
- Existing language to reuse: stats bands (full-width hairline over a grid), `Stat`, `Kbd`, nav caret accent, `--line`, `--accent`, mono figures.
- DECISIONS D16 (panels), D20 (header), stats band layout.

## Design

- One frame: `.page-full` (`--column-wide`, same as header and footer) for lessons, stats, settings, about, account, rain. Settings, about and account use a column grid inside that frame instead of a narrow strip. Auth forms stay narrow cards (they are forms).
- Lessons page: grid `minmax(0, 1fr) 19rem` from 64rem, a vertical hairline left of the sidebar, sidebar sticky. Below 64rem the sidebar follows the lessons.
- Main column: page title, a "next up" line (first lesson not yet passed, with its new keys and a start link), then phases as bands like stats: hairline, a left cell (number, title, description, thin progress line) and a right cell with the lessons as a two-column list of the existing text rows.
- Sidebar, ruled sections only: identity (initial, name or "guest", sync line), overall (average speed, best speed, accuracy, streak, lessons passed), recent (last five attempts with source, wpm, relative time, and a wpm sparkline), link to full stats. Empty state until the first attempt.
- Pure helpers in `src/features/lessons/overview.ts` (next lesson, overall figures), unit tested.

## Affected files

- `src/styles/globals.css`: page classes.
- `src/features/lessons/overview.ts` and test; `LessonList.tsx` and CSS; new `HomeView.tsx`, `ProfileSidebar.tsx` and CSS; `src/app/page.tsx`.
- `SettingsView.tsx` and CSS, `about/page.tsx` and CSS, `AccountView.tsx` and CSS, `RainGame.module.css`.
- `e2e/preserve.spec.ts` (selector of the lesson list), new `e2e/home.spec.ts`, DECISIONS.md D22.

## Risks / Unknowns

- Sidebar content before hydration: show a fixed-height placeholder so nothing jumps.
- Settings panels of unequal height in a two-column grid: accept, align to start.
- Themes: use only tested colour pairs (`--text`, `--muted`, `--accent`, `--line`).

## Done criteria

Typecheck, lint, unit tests, build, nav/a11y/home e2e green; screenshots of home, stats, settings at 1440, 768 and 390 in two themes look consistent.

## Milestones

### 1. Data helpers
Outcome: tested overview functions.

- [x] overview.ts and tests

### 2. Lessons page
Outcome: wide list plus sidebar.

- [x] LessonList band layout
- [x] ProfileSidebar
- [x] HomeView and page

### 3. One width
Outcome: all menu pages share the frame.

- [x] settings, about, account, rain

### 4. Verify and document

- [x] checks and e2e (preserve selector updated, home spec added)
- [x] screenshots reviewed
- [x] D22, plan closed

## Log

- 2026-10-15 Plan written after pushing 18af053.
- 2026-10-15 Implemented. Sidebar tile figures are sized down inside the sidebar (the global tile size is built for full-width bands). The next-up strip lost its bottom rule because the first phase band already draws one. Settings and account use auto-fit grids; about uses two columns. All e2e, lint, typecheck, unit tests and build green; screenshots checked in dark and light at 1440 and 390.
