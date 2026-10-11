# Task evidence: ui-redo-zen WS0 (M0 and M1)

- Plan: `.docs/plans/2026-10-11-ui-redo-zen.md`
- Outcome: pixel guard recorded at base, tokens, settings schema, source helpers, focus mode, sound contracts and primitives landed.
- Code revision: see the commits following `ff1d773` on main (M0 `df24824`, M1 commits listed in the plan Log).
- Memory: retrieval helper broken (PyYAML missing); active universal rules read manually: plan-execution, verification, docs-current-state-only, agent-docs-sync (not triggered).
- Verification:
  - `npm run check`: green (lint, prettier, tsc, 255 vitest tests, content validation, build, brand check).
  - `npm run test:e2e`: green after updating two `status` roles to `alert` in `e2e/auth-screens.spec.ts`.
  - `PRESERVE=1 npx playwright test e2e/preserve.spec.ts`: 4 passed against the baseline recorded at base.
- Learning disposition: pending (invoke learner after the whole plan; notable: Next `.next/types` goes stale after removing a temp route, delete `.next`).
