---
id: check-baseline-crlf-and-smoke-chart
status: active
scope: "**"
priority: advisory
owner: learner
confidence: supported
last-reviewed: "2026-10-14"
date: 2026-10-14
tags: [verification, prettier, crlf, windows, e2e, smoke, baseline]
severity: medium
applies-to: ["package.json", ".prettierrc.json", "e2e/smoke.spec.ts", "src/features/results/WpmChart.tsx", implementer, reviewer]
evidence-refs: [.docs/evidence/2026-10-14-stats-layout-coherence.md, "npx prettier --list-different .", "npx prettier --end-of-line auto --list-different .", "git ls-files --eol"]
validates-with: ["npx prettier --end-of-line auto --list-different .", "npx playwright test e2e/smoke.spec.ts"]
invalidates-when: ["a .gitattributes or prettier endOfLine setting is added", "core.autocrlf changes", "smoke.spec or WpmChart empty-state logic changes"]
---

Trigger: running `npm run check`, `npm run format:check`, or the full Playwright run on this Windows machine, and deciding whether a red result is yours.

Observation 1 (format): `core.autocrlf=true`, no `.gitattributes`. Index is LF, working tree is CRLF (`git ls-files --eol` shows `i/lf w/crlf`). `npx prettier --list-different .` printed 284 files on 2026-10-14, including 13 files edited in the stats change (so the brief's "changed files pass" holds only for new LF files such as `chartLayout.ts`). `npx prettier --end-of-line auto --list-different .` printed 0, so line endings are the only difference. `npm run check` therefore stops at `format:check` here, although `verification` says it must be green.

Observation 2 (e2e): `e2e/smoke.spec.ts` "reach results with charts" fails on clean HEAD (reported, not re-run by the learner). Likely cause: Playwright types the home-01 lesson in under 2 s, `WpmChart` passes `empty={series.length < 2}` (line 46), so `.recharts-surface` never renders. The code line is confirmed; the typing-speed link is a supported inference.

Mechanism: the CRLF failure is environmental, not a code problem; the smoke failure is a test timing assumption, not a regression from UI work.

Action:
- Run the check steps individually: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run validate:content`, `npm run build`, `npm run check:brand`; for format use `npx prettier --end-of-line auto --check <changed files>`.
- Do not run `npm run format` to clear this (it rewrites every file's line endings).
- Expect exactly one e2e failure (smoke "reach results with charts") until it is fixed; treat any other failure as real.
- Proposed durable fixes for the user (not applied, config changes): `.gitattributes` with `* text=auto eol=lf`, or `"endOfLine": "auto"` in `.prettierrc.json`; and a smoke test that seeds two or more attempts or slows typing.

Exceptions: CI on Linux checks out LF, so `format:check` is expected to pass there.

Validation: the two commands in `validates-with`.

Invalidation: see frontmatter.
