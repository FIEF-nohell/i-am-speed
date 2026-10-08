---
status: in-progress
created: 2026-10-09
updated: 2026-10-09
base: 3fa0395
goal: Ship "i am speed", a static-export touch-typing trainer for the Austrian QWERTZ layout, per PROJECT.md.
---

# PLAN: i am speed

Source of truth for requirements: `PROJECT.md`. Decisions: `DECISIONS.md`. The `.docs/plans/` entry points here.

## Inputs
Rules consulted: plan-execution, verification (filled in M1), docs-current-state-only, agent-docs-sync (no agent edits planned).

## Done criteria
Everything in PROJECT.md section 19, including the motion pass (section 17b), green and pushed to `main`.

## Milestones

### M1 Scaffold, brand run, design system
- [ ] Static export Next.js in `src/`, strict TS, ESLint, Prettier, Vitest, Playwright, scripts, CI, LICENSE, `.gitignore`
- [ ] Run design-studio brand-signature workflow by hand (headless), save `brand/` output
- [ ] CSS tokens, 4 themes, fonts via next/font, UI primitives
### M2 Layout data and engine
- [ ] `atQwertz.ts` single table, derived lookups, finger map, tests
- [ ] Pure engine (4 error modes, backspace modes, metrics), tests
### M3 Content pipeline
- [ ] `scripts/fetch-content.ts`, licence check, normalisation, curated fallback
- [ ] `validate:content`, SOURCES.md
### M4 Curriculum, lesson runner, guide
- [ ] Curriculum data (11 phases), generator never leaves allowed set, tests
- [ ] Runner UI, caret, keyboard guide (SVG/CSS grid), free test mode
### M5 Results and stats
- [ ] Results page, charts, heatmap; stats page
### M6 Settings and storage
- [ ] Versioned storage + migration, `useSyncExternalStore`, settings page, export/import/reset
### M7 Branding assets and metadata
- [ ] SVG sources, `npm run brand`, favicon set, manifest, OG, robots, sitemap, metadata, attribution page
### M8 Polish, e2e, deploy check
- [ ] Playwright e2e, brand check, screenshots at 1440/390 and critique, README, `npm run check` green, push
### M9 Motion design final pass (only after M1-M8 green and pushed)
- [ ] Motion system, interactions, reduced-motion, videos/frames review, perf check, README Motion section, green, push

## Log
- 2026-10-09 PLAN.md written. Brand repo cloned to OS temp dir; design-studio v5 has no palette CLI, workflow executed by hand.
