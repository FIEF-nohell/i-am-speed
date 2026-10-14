---
id: stats-layout-shared-lattice
status: active
scope: "src/features/stats/**"
priority: advisory
owner: learner
confidence: supported
last-reviewed: "2026-10-14"
date: 2026-10-14
tags: [ui, layout, stats, charts, css-grid, alignment, user-correction]
severity: medium
applies-to: ["src/features/stats/**", "src/components/ui/Panel.tsx", "src/components/ui/Panel.module.css"]
evidence-refs: [.docs/evidence/2026-10-14-stats-layout-coherence.md, "git show 7ad6999", src/features/stats/StatsView.module.css, src/features/stats/chartLayout.ts]
validates-with: ["npx playwright test e2e/nav.spec.ts", "seeded-data screenshots at 1440, 768, 390 (see seed-localstorage-for-data-pages)"]
invalidates-when: ["StatsView.module.css .band structure is replaced", "Recharts is replaced", "a decision (D21+) records a different stats layout"]
---

Trigger: adding or changing a panel, figure, chart or table on the stats page, or using `Panel bare`.

Observation: removing card borders (7ad6999) was not enough. The user called the result "an overwhelming mess... still all cards but without their border, non coherent layout and alignments".

Evidence: causes found in 7ad6999: each bare Panel and each figure tile drew its own top hairline (broken by grid gaps, so they read as borderless cards); 8 equal-weight figures; side-by-side charts with different header heights (one legend made its pill controls wrap) so plot tops and x axes differed; line chart used practised days only while the bar chart used the full calendar span; 4 pill Segmented groups; mixed heading hierarchies and multi-line descriptions of different lengths. The working-tree fix was checked by eye at 1440, 768, 390 with seeded data.

Mechanism: a card is any item that owns its own rule, heading, spacing and grid. Coherence comes from structure shared across items, not from removing borders. An equal-column grid with gap g lands on the same edges as 12-column spans with the same gap (4 columns = `.third`, 2 columns = `.half`); this is why nested grids must reuse the band gap. Unverified: whether the user accepts the new look (uncommitted when written); "coherent" was judged by eye, not by an automated check.

Action:
- Put content in `.band` (one full-width rule per band, 12-column grid) with `.half` or `.third` spans; nested grids (`.figures`, `.charts`) use the same column gap.
- Side-by-side charts take `CHART_HEIGHT`, margins, axis width and tick gap from `chartLayout.ts`, plot the same calendar dates, and use `scale="band"` so line points sit on bar centres. No legends or wrapping controls in chart headers.
- Section header: title left, at most one short muted aside right, no descriptions. One shared range control; per-chart control as text-variant Segmented.
- Keep headline figures to about 4; demote the rest into ledes, asides or records.
- Do not remove the `max-width: 52rem` collapse of `.band` to one column: 12 columns with 2rem gaps need 352px and overflowed at 320px (`nav.spec` "320: no horizontal scroll" caught it).

Exceptions: bordered Panels on settings, account and results follow D16 and are not covered. Only stats uses `bare`.

Validation: nav.spec 320 test; compare plot tops, x-axis baselines and column edges at 1440 and 768 with realistic data. Proposed stronger artifact (not written): an e2e test asserting both charts' `.recharts-surface` boxes share top and height.

Invalidation: see frontmatter.
