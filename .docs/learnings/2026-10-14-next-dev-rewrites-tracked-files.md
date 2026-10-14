---
id: next-dev-rewrites-tracked-files
status: active
scope: "**"
priority: advisory
owner: learner
confidence: supported
last-reviewed: "2026-10-14"
date: 2026-10-14
tags: [environment, next-dev, git, workflow, package-lock]
severity: medium
applies-to: ["package.json", "package-lock.json", "AGENTS.md", implementer, reviewer]
evidence-refs: [.docs/evidence/2026-10-14-stats-layout-coherence.md, "git diff AGENTS.md", node_modules/next/dist/server/lib/generate-agent-files.js]
validates-with: ["git status --short after any `next dev` run"]
invalidates-when: ["next is upgraded or the generator file changes", "package.json or AGENTS.md is made stable against next dev"]
---

Trigger: running `npm run dev` / `next dev` (for example for a visual check).

Observation: in this session `next dev` rewrote `package.json` and `package-lock.json` (pinned `@types/node`, `@types/react` and `typescript` to exact versions; reverted with `git checkout -- package.json package-lock.json`). A "This is NOT the Next.js you know" block also sits uncommitted in `AGENTS.md` (`git diff AGENTS.md`); its own text says it is "written and re-added by `next dev`" and points at `generate-agent-files.js`, which exists in `node_modules`.

Evidence: the package.json rewrite was reported by the implementing session and reverted, so the diff is gone; the learner read the AGENTS.md diff and confirmed the generator file exists (its contents were not read). Not reproduced by the learner (no dev server was started).

Mechanism: Next's dev server writes these files on start. The AGENTS.md attribution rests on the block's self-description plus the existing generator file, so treat it as likely, not proven.

Action:
- Prefer `npm run build` then `npm start` (serves `out/`) for visual checks; use `next dev` only when HMR is needed.
- After any `next dev` run, check `git status --short` and revert unrelated `package.json` and `package-lock.json` changes before committing feature work.
- Do not stage the `AGENTS.md` block with feature work. It is user-owned project instruction text that tells agents to read `node_modules/next/dist/docs/`; keeping, committing or deleting it is the user's decision.

Exceptions: an intentional dependency change.

Validation: `git status --short` is free of `package*.json` and `AGENTS.md` changes you did not intend.

Invalidation: see frontmatter.
