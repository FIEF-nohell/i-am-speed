---
id: seed-localstorage-for-data-pages
status: active
scope: "e2e/**"
priority: advisory
owner: learner
confidence: supported
last-reviewed: "2026-10-14"
date: 2026-10-14
tags: [e2e, playwright, localstorage, seed-data, stats, visual-check]
severity: low
applies-to: ["src/features/stats/**", "src/features/results/**", "e2e/**", implementer, reviewer]
evidence-refs: [.docs/evidence/2026-10-14-stats-layout-coherence.md, src/features/storage/schema.ts, src/features/storage/record.ts, src/features/sync/ids.ts]
validates-with: ["load /stats/ with the seed and confirm charts, tables and figures render with data"]
invalidates-when: ["storage schema version or STORAGE_KEY changes", "a shared seeding helper is added to e2e/helpers.ts"]
---

Trigger: visually checking or testing a page whose layout depends on history (stats, results), where an empty profile hides most of the UI.

Observation: realistic stats data was produced by a one-off tsx script that calls `createEmptyData()` and `recordAttempt(data, input)` across many days, then injected with Playwright `page.addInitScript` into localStorage key `i-am-speed:v1`. No seeding helper exists in `e2e/` (checked 2026-10-14); `helpers.ts` only has `lessonText`, `typeText`, `completeLesson`.

Evidence: used for the 1440, 768, 390 checks of the stats redesign. The two gotchas below were hit in the session; the id pattern is confirmed in `src/features/sync/ids.ts` (`^[A-Za-z0-9_-]{8,64}$`) and `src/features/storage/migrate.ts` (lines 72, 78, 91) skips or replaces anything failing `isContribId`. The resulting empty or reset stats and the `page.clock.install` hydration hang were observed in the session, not re-run by the learner.

Mechanism: stored data goes through `migrate` on load; entries with invalid contributor ids are dropped without an error, so a bad seed looks like an empty profile. `page.clock.install` on the stats page stops hydration from completing (cause not investigated).

Action:
- Build the seed from the app's own `createEmptyData` and `recordAttempt` so the shape stays valid; give each attempt a contrib id matching `/^[A-Za-z0-9_-]{8,64}$/`.
- Inject before navigation with `addInitScript`; do not use `page.clock.install` on the stats page.
- If a second page needs this, turn the script into `seedStats(page, days)` in `e2e/helpers.ts` instead of rewriting it (proposed, not written).

Exceptions: tests that assert the empty state need no seed.

Validation: the page shows non-empty charts and tables after load.

Invalidation: see frontmatter.
