# Rules

Hard rules too granular for `AGENTS.md`. One concept per file. Startup injects only an index of active universal rules; full bodies are retrieved before governed work.

## Frontmatter schema

```yaml
---
id: unique-kebab-case-id        # unique among active rules and learnings
status: active | candidate | superseded
scope: "**"                     # ** is universal; otherwise a relative glob
priority: required | preferred | advisory
owner: user | bootstrap | learner
confidence: verified | supported | tentative
last-reviewed: "YYYY-MM-DD"
---
```

Tags, when used, are a separate YAML list for topical retrieval.

## Scope grammar

A single relative, slash-separated glob using letters, digits, `_`, `.`, `/`, `*`, `?`, `@`, `-`. `**` means universal. Absolute paths, empty segments, `.` or `..` segments, and backslashes are rejected.

## Precedence

Equal-level conflicts resolve by priority, then specificity. If still in conflict, ask rather than treating recency as authority.

## Status

`candidate` and `superseded` entries are not active policy. Learners propose new binding rules as `candidate`. Promotion to `active`, or a substantive change to an active user-owned rule, needs explicit user authorization.
