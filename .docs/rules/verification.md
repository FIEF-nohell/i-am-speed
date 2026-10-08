---
id: verification
status: active
scope: "**"
priority: required
owner: user
confidence: verified
last-reviewed: "2026-10-09"
---

# Rule: Verification commands

Run these before claiming work is done or pushing. Each command on its own line, one-phrase purpose.

- `npm run check`: lint, prettier, typecheck, unit tests, content validation, static build, brand check (must be green before any push)
- `npm run test`: Vitest unit tests only
- `npm run validate:content`: content typeable and every lesson stays inside its allowed character set
- `npm run test:e2e`: Playwright smoke tests against `out/` (build first)

The implementer runs these after every code-changing task; the reviewer runs them before approving. If a command here stops matching reality, propose a correction and apply it in the same change only when authorized by the rule-governance policy.
