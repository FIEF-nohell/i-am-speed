# Project Instructions for AI Agents

> Bootstrapped by nohell v13

This file (`AGENTS.md`) is the routing index for any AI agent working in this repo, and the single source of truth for project instructions. `CLAUDE.md` is a thin pointer that imports this file so Claude Code loads it automatically; this file owns routing and stable project facts, while individual rule files own their full rule content.

## Instruction hierarchy and memory governance

Repository-level precedence (within the host's system and organization policies):

1. Explicit current user request.
2. Active scoped project rules.
3. Active global project rules.
4. Approved in-progress plans, unless superseded by the current user request.
5. Active learnings.
6. AGENTS.md routing and stable project overview.
7. Research notes.

This file is the authoritative entry point for instruction topology, routing, and stable facts. `.docs/rules/` files hold their own authoritative rule bodies; link to them rather than duplicating long rules. `candidate` and `superseded` entries are not active policy. Scope, priority, owner, confidence, and review date guide retrieval and review; they do not grant authority to promote a rule. Resolve same-level conflicts by priority then specificity; surface unresolved conflicts. Preserve legacy user policy and flag missing metadata instead of silently discarding it. Task evidence lives in `.docs/evidence/`; it records observable execution facts and learning dispositions, not private reasoning.

Rules constrain work. Style guides express preferred reusable conventions. Learnings capture evidence-backed contextual lessons. Decisions capture settled choices and rationale. Research supports investigation and can go stale. Style guides and decisions inform choices within active constraints; they cannot override a current user request or a rule. Existing project-local guidance takes precedence over newly inferred style guidance.

New rules and learnings require `id`, `status`, `scope`, `priority`, `owner`, `confidence`, `last-reviewed`; IDs are unique among active rules and learnings together. Scope is `**` for universal policy or a relative path glob using `/`, `*`, and `?` without traversal. Learner-authored binding rules begin as candidates. Promotion or substantive changes to active user-owned policy require explicit user authorization or a user-requested governance-maintenance pass. Tool permissions do not waive this requirement. See the folder indexes for formats.

<!-- bootstrap:BEGIN bootstrap-session -->
## Session start protocol

A SessionStart hook (`.claude/hooks/session-start.ps1`) injects a compact context block into every fresh session within 16,000 characters: an index of active universal rules, read-only Git health and upstream freshness, and a summary of each `status: in-progress` plan with recent commit evidence. Full rule bodies, scoped rules, learnings, decisions, research, style guidance, and optional modules are retrieved only when relevant. Trust the index; do not preload the knowledge base at session start.

At the start of a fresh session:

1. Confirm the hook context block (`## Project context (auto-injected...)`) is present. If it is missing, the hook is broken: say so, then fall back to indexing active universal rules, checking Git status/upstream state without pulling, checking legacy metadata warnings, and finding in-progress plans yourself. If the hook reports overflow or unreadable policy, retrieve the affected files before governed work; never assume omitted content imposes no constraints.
2. If this is a Git repository, report material repository state succinctly: clean/dirty and up-to-date/ahead/behind/diverged when an upstream exists. The startup helper may run `git fetch` with a short timeout to refresh remote-tracking refs, but it must never pull, merge, rebase, checkout, reset, stash, commit, or otherwise mutate the worktree.
3. If the hook surfaced an in-progress plan, inspect that plan plus up to the latest three commits and files changed since its recorded base before calling it unfinished. If recent commits plausibly completed the remaining plan work, say the plan metadata appears stale and verify implementation state before offering resume. Do not treat an unchecked box as stronger evidence than the repository.
4. If the user opened with just a greeting, reply `Ready to work.` plus only material Git or plan-state notes. If a valid cached passive bootstrap notice is present at fresh startup, append its installed/available version and details URL, optionally `Say "update bootstrap" to review it.` Do not fetch or wait for an update, and never offer automatic installation. No other ceremony.

<!-- bootstrap:END bootstrap-session -->

## Targeted re-reads (during work)

The hook covers session start. During work, re-read selectively:

- Before relevant work, retrieve active scoped rules and learnings and relevant decisions using affected paths and tags. Read only the relevant `.docs/styleguide/` section, following its concrete examples and existing project guidance. Research remains evidence to check, not policy.
- Review relevant high-severity learnings when used; after 90 days without review, reconfirm, downgrade, or supersede with evidence. Do not indefinitely inject them at startup.
- Before an action a specific rule governs, re-open that one rule file, not the whole directory.
- Do not re-read this file or all of `.docs/rules/` per task. The startup index is not the rule body: retrieve only the applicable rule files before governed work.

### Retrieval contract

Use the local retrieval helper before governed work with the task description, affected paths, intended actions, packages, symbols, error signatures, and agent role. Select active policy deterministically; rank advisory learnings, decisions, examples, and style guidance by applicability, evidence, and freshness. Return the selected IDs and the reason each was selected. Record considered, selected, applied, and rejected IDs in the matching `.docs/evidence/` record. If required policy is missing, conflicting, stale, or retrieval is incomplete, surface that condition instead of guessing.

## Resume protocol (check before starting any new work)

Sessions get interrupted. The session-start hook surfaces any plan with `status: in-progress`. When one exists:

1. Read the plan and compare its recorded `base:` with HEAD. Inspect up to the latest three relevant commits and the files changed since base.
2. If repository evidence plausibly satisfies the remaining unchecked tasks, treat the plan metadata as potentially stale. Verify the implementation and, if complete, reconcile the plan status/log instead of asking the user to resume already-finished work.
3. If work is genuinely still open, surface: filename, goal, next unchecked `- [ ]` task, most recent Log entry, and the relevant recent commit evidence.
4. Ask the user to resume, switch, or abandon only when the correct continuation is not already clear from their request and repository evidence.
5. Do not silently start unrelated fresh work while genuinely unfinished plan work is active.

If the current request explicitly chooses resume, switch, or abandon, honor that choice without asking again; the confirmation applies when the choice is unclear. If the user's request is itself the continuation of an existing plan, jump straight to the implementer with that plan path.

See `.docs/rules/plan-execution.md` for the full plan format and execution protocol.

## Repository layout for AI machinery

```
.claude/
├── settings.json        permissions and hook wiring
├── bootstrap-manifest.json  current ownership and update source
├── agents/              subagent definitions (YAML frontmatter)
├── commands/            core slash commands and tiny lazy-module launchers
├── modules/             lazily fetched capability packs; inert until invoked
└── hooks/               context hook, passive updater, governance verifier

.docs/
├── evidence/            task evidence and learning dispositions, keyed by stable task ID
├── evaluations/         optional baseline/candidate task fixtures and results
├── plans/               implementation plans, one per task
├── learnings/           contextual lessons, updated or superseded without deletion
├── rules/               hard rules, more granular than this file
├── decisions/           settled choices and rationale
├── styleguide/          preferred conventions, routed by task
└── research/            researcher agent's findings
```

Anything markdown that is not user-facing documentation goes in `.docs/`. User-facing docs (README, CONTRIBUTING) stay at the root or in a `docs/` (no leading dot) folder.

Always start Claude Code from this repo's root, not from a parent folder. Sessions started from a parent directory may register agents and instructions from OTHER projects; agents in the harness list that are not in this repo's `.claude/agents/` are foreign and must not be used for this project's work.

## Available agents

Project agents in `.claude/agents/` register natively: dispatch them by name via the Agent tool.

| Agent | When to call | Output |
|-------|--------------|--------|
| `planner` | Use before any non-trivial change. Produces a written plan in .docs/plans/ before code is touched. Invoke when the task involves more than a single small edit, when architecture decisions are needed, or when the user asks for a plan. | `.docs/plans/YYYY-MM-DD-<slug>.md` |
| `implementer` | Use after a plan exists in .docs/plans/. Writes code per the plan. Reads .docs/rules/ first. Stops and asks if the plan is missing critical information. | Code changes, completion note on the plan |
| `reviewer` | Use after the implementer finishes a plan. Audits the diff against the plan and against .docs/rules/. Returns a structured review with severity-tagged findings. | Structured review with severity findings |
| `researcher` | Use when you need codebase context (where is X defined? what calls Y?) or external context (library docs, API behavior, recent changes) before making a decision. Writes findings to .docs/research/. | `.docs/research/YYYY-MM-DD-<slug>.md` |
| `debugger` | Use when something is broken and the root cause is not immediately obvious. Reproduces the bug, isolates the failure, identifies the root cause, and proposes a fix. Does not apply the fix - returns it to the main agent. | Root cause analysis + proposed fix |
| `learner` | Use after a meaningful task ends, after a bug fix, after a user correction, or via /learn. Reads recent context, distills lessons, appends to .docs/learnings/, and edits agent files or AGENTS.md if the lesson reveals a flaw. Repairs bootstrap-managed agent documentation within ownership boundaries; proposes binding rules as candidates. | New entries in `.docs/learnings/`, edits to agents or AGENTS.md |

<!-- Project-tailored agents (added by Phase 2 for existing repos) are appended to this table. -->

### Routing heuristics

- "Build me X" / "let's add feature X" of any non-trivial size: `planner` -> `implementer` -> `reviewer` -> `learner`. The planner writes a milestone+checkbox plan to `.docs/plans/`; the implementer ticks boxes live as it goes.
- "Continue / resume / pick up where we left off": find the `status: in-progress` plan in `.docs/plans/`, hand it to `implementer`.
- "Fix this bug": `debugger` -> repair plan -> `implementer` -> `reviewer` when risk warrants -> `learner`.
- "Where is X / how does Y work": `researcher`.
- "I just corrected you / that detour was painful / we discovered a constraint": invoke `learner` immediately, or run `/learn`.

If the user says any of "learn from that", "remember this", "don't make that mistake again", "save this lesson" - invoke the `learner` immediately. The slash command `/learn` does the same thing.

## Self-improvement loop (this is core, do not skip it)

After completing, abandoning, or being blocked on any eligible task, create or update its task-evidence record and give it a learning disposition. Invoke the `learner` subagent when the disposition is `pending` or when the user explicitly requests learning. Non-trivial means at least one of:
- Involved a bug fix
- Made an architecture or design decision
- Surfaced a constraint that was not previously documented
- Cost time on a wrong turn
- Was corrected by the user

The learner can write, update, and supersede learnings and repair bootstrap-managed documentation within ownership boundaries. It may propose candidate rules and style-guide changes. File-write permissions do not authorize policy promotion or substantive changes to active user-owned rules; those require explicit user authorization or a user-requested governance-maintenance pass. Established conventions require repeated evidence or user confirmation to change. Any agent instruction, routing, or retrieval change requires a baseline-versus-candidate check before activation. Prefer regression tests, lint rules, scripts, and skills over prose when a lesson can be made executable. The learner never refreshes bootstrap manifest digests.

If you finish a task and decide it does not warrant invoking the learner, that is fine, but the default is to invoke it.

## Hard conventions

- Plans live in `.docs/plans/`. Filename format: `YYYY-MM-DD-<short-slug>.md`. Format and execution protocol defined in `.docs/rules/plan-execution.md`. Plans carry `status:` and `base:` frontmatter, milestone+checkbox bodies, and an append-only Log.
- Learnings live in `.docs/learnings/`. Filename format: `YYYY-MM-DD-<short-slug>.md`. New files require governance metadata plus `date`, `tags`, `severity`, `applies-to`; preserve legacy files and report missing metadata.
- Rules live in `.docs/rules/`. One concept per file. Short, imperative. Startup injects only an index of active universal rules; full bodies and scoped rules are retrieved before governed work. New binding proposals remain candidates until authorized.
- Research notes live in `.docs/research/`. Filename format: `YYYY-MM-DD-<short-slug>.md`.
- Never modify `.docs/rules/` casually. The learner proposes candidates; only authorized promotions create active binding policy.
- Never delete from `.docs/learnings/`. The learner can supersede an old learning by writing a newer one and editing the old one to set `status: superseded` and add a `superseded-by:` link, preserving evidence and history. Do not force metadata migrations on legacy files.
- This file documents current state only, never version history. See `.docs/rules/docs-current-state-only.md`: no changelog sections, and the Key paths table stays lean.

### Agent docs must stay in sync (non-negotiable)

If you add, remove, rename, or change the behavior of any file in `.claude/agents/`, you MUST update in the same commit/turn:

1. The **Available agents** table above (add/remove/edit the row).
2. The **Routing heuristics** subsection above (add/remove/edit the line that mentions the agent).

This file (`AGENTS.md`) is the single source of truth; `CLAUDE.md` is only a pointer and needs no update. A change to an agent file without a corresponding doc update is an incomplete change. Reviewer agent: flag this as a **blocker** finding if you ever see it. Learner agent: if you find them out of sync from a past session, repair managed documentation first; propose user-owned changes for authorization.

This rule applies to any agent that edits `.claude/agents/` (including the learner editing itself).

### Commit and PR hygiene (non-negotiable)

- **Never co-author commits as an AI model.** Do not add `Co-Authored-By: Claude`, `Co-Authored-By: AI`, `Co-Authored-By: GPT`, or any similar trailer to commit messages. Do not add equivalent attributions in PR descriptions or release notes. The user is the sole author. This default is permanent unless the user explicitly says "credit Claude as co-author on this commit" or similar for a specific instance.
- **Never include "Generated with Claude Code" or equivalent footers** in commits, PR bodies, issue comments, or any other written artifact unless the user explicitly asks for it.
- **No emojis in commit messages.** Stick to plain text.
- **No em dashes in commit messages, PR bodies, or any prose this project produces.** Use periods, commas, parentheses, or colons instead.

## Project-specific section

### Stack
- unknown: greenfield. The project is a stub (`project.md` reads "coming soon"); no stack has been chosen.
- Do not assume a framework until the user picks one.

### How to run
unknown: no dev or build command exists yet.

### Verification
TBD: no verification commands exist yet. Fill in `.docs/rules/verification.md` when the stack lands.

### Key paths
| Path | Purpose |
|------|---------|
| `project.md` | Project stub (placeholder content) |
| `.claude/` | Agents, commands, hooks, settings, bootstrap manifest |
| `.docs/` | Knowledge base: plans, rules, learnings, decisions, research |

### Image generation
For any image generation or editing task, use the `cc-nano-banana` skill. Default output location for this project's generated images is `assets/images/` (or the closest equivalent in this project). Source originals are saved per the user's global config; do not hardcode a path for them here.
