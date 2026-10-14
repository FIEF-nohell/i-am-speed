---
task-id: 2026-10-14-stats-layout-coherence
objective: "Make the stats page read as one coherent layout after the user rejected 7ad6999 as cards without borders with incoherent alignment."
outcome: succeeded
code-revision: "7ad6999 plus uncommitted working-tree changes (user acceptance pending)"
retrieved-memory: [verification, plan-execution, docs-current-state-only, agent-docs-sync, D9, D12, D16, D20]
applied-memory: [verification, D16]
learning-disposition: proposed
---

# Task evidence: stats layout coherence

- Task ID: 2026-10-14-stats-layout-coherence
- Plan: none (a correction after commit 7ad6999)
- Objective: make the stats page read as one coherent layout after the user called 7ad6999 "an overwhelming mess... still all cards but without their border, non coherent layout and alignments".
- Outcome: fix implemented and verified in the working tree, not committed at the time of this record. Not yet accepted by the user.
- Revision: base 7ad6999 plus uncommitted changes to 12 tracked files and new `src/features/stats/chartLayout.ts`. `AGENTS.md` is also modified, but by an unrelated block (see learning `next-dev-rewrites-tracked-files`), not by this task.

## Observed facts

- User correction after 7ad6999 (quoted above).
- Root causes found: per-item hairlines on bare Panels and figure tiles; 8 equal-weight figures; side-by-side charts with different header heights (legend made pill controls wrap); line chart used practised days only while the bar chart used the full calendar span; 4 pill Segmented groups; mixed heading hierarchies and multi-line descriptions.
- Fix: stack of `.band` rows on a 12-column grid with nested equal-column grids on the same gap; Panel bare lost its border; shared `chartLayout.ts`; one range control, text-variant per-chart switch, no legend; figures cut from 8 to 4; recent attempts became a table sharing the lessons table columns; `e2e/zen.spec.ts` updated for moved labels.
- Wrong turn: the 12-column grid with 2rem gaps needs 352px and overflowed at 320px; `nav.spec` "320: no horizontal scroll" caught it; `.band` now collapses to one column at `max-width: 52rem`.
- Verification (reported by the implementing session): lint, typecheck, 330 unit tests, validate:content, build, check:brand green; Playwright 66 passed, 8 skipped, 1 failed (pre-existing smoke "reach results with charts"); visual check at 1440, 768, 390 with seeded data.

## Learner checks (this pass)

- `npx prettier --list-different .` lists 284 files; `npx prettier --end-of-line auto --list-different .` lists 0. Index is LF, working tree CRLF (`git ls-files --eol`). This corrects the brief: edited files fail too, only new LF files pass.
- `git diff AGENTS.md` shows only the `nextjs-agent-rules` block, whose text says `next dev` writes it. `node_modules/next/dist/server/lib/generate-agent-files.js` exists.
- `WpmChart.tsx:46` has `empty={series.length < 2}`. The smoke failure was not re-run.
- No seeding helper exists in `e2e/`; `src/features/storage/migrate.ts` skips ids failing `isContribId`.
- Not run by the learner: build, unit tests, Playwright.

## Memory

- Retrieval helper `.claude/hooks/retrieve.py` failed (`ModuleNotFoundError: yaml`), same as the 2026-10-12 record; selection was done by hand. Treat retrieval as incomplete.
- Considered: rules `verification`, `plan-execution`, `docs-current-state-only`, `agent-docs-sync`; decisions D9, D12, D16, D20; learnings: none existed before this pass.
- Selected and applied: `verification` (found to mismatch reality on this machine, see below) and D16 (panels on non-typing pages; the bare Panel is stats-only). D12 and D20 were not triggered.
- Rejected: `plan-execution` (no plan used for this correction), `agent-docs-sync` (no agent files changed), `docs-current-state-only` (AGENTS.md untouched).
- Created: learnings `stats-layout-shared-lattice`, `next-dev-rewrites-tracked-files`, `check-baseline-crlf-and-smoke-chart`, `seed-localstorage-for-data-pages`.

## Failure diagnosis

- The 7ad6999 defects were an execution and verification gap (inferred). Whether that commit was checked with realistic seeded data side by side is not recorded, so the cause stays a hypothesis; no knowledge or retrieval gap is evident because no related learning existed.
- The 320px overflow was caught by an existing e2e test, so verification worked.

## Open items for the user (nothing applied)

- `verification` rule says `npm run check` must be green, but it cannot be on this machine because of CRLF. Preferred fix is environmental (`.gitattributes` with `* text=auto eol=lf` or `"endOfLine": "auto"` in `.prettierrc.json`), not a rule change. No candidate rule written.
- The `AGENTS.md` nextjs block is a user decision (keep, commit, or drop).
- Once the user accepts the stats layout, a decision entry (D21) in `DECISIONS.md` would record the band lattice and the rejected alternatives. Not written, to avoid recording an unaccepted design as settled.
- Proposed stronger artifacts: an e2e geometry assertion for the two chart surfaces; a `seedStats` helper in `e2e/helpers.ts`; a smoke test that seeds two or more attempts.

## Learning disposition

proposed: 4 learnings written, 0 rules, 0 agent or AGENTS.md edits.
