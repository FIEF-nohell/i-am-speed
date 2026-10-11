# Task evidence: ui-redo-zen integration (M9 to M13)

- Plan: `.docs/plans/2026-10-11-ui-redo-zen.md`
- Outcome: legacy sound removed, Button default flipped, e2e hardened (strict server, zen, sound, a11y, motion variants, full screenshot matrix), visual critique fixes, docs D16 to D18.
- Code revision: main after the commits following `498557e` (see `git log 498557e..HEAD`).
- Memory: retrieval helper still broken (PyYAML missing); plan-execution, verification, docs-current-state-only read manually.
- Verification (all green, quiet machine):
  - `npm run check`: lint, prettier, tsc, 306 unit tests, content validation, build, brand check
  - `npm run test:e2e`: 35 passed, 7 skipped (opt-in specs), includes a11y (axe), zen, sound, motion latency (sound on, zen 3000 chars)
  - `PRESERVE=1 npx playwright test e2e/preserve.spec.ts`: 4 passed; list byte-identical to base `0f487e5`, lesson and test areas differ only by 1 px line offsets (re-recorded)
  - `SHOTS=1 THEMES=dark,light,dusk,ember npx playwright test e2e/screenshots.spec.ts`: 8 passed, no horizontal scroll
- Learning disposition: pending (fixed-port server reuse tests the wrong build; full-page screenshots restart chart animation; sub-pixel frame offsets move the pixel guard).
