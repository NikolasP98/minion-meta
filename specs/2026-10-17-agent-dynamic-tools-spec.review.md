---
spec: 2026-10-17-agent-dynamic-tools-spec
pass: 1
verdict: approved
reviewer: dynamic_catalog-and-execution_guard
created: 2026-10-17
---

# Dynamic tool contract review

- Pass1: dynamic_catalog reviewed behavior and requires SDK1.1.0 activation proof. Verdict: pass.
- Pass2: execution_guard reviewed authority and requires bounded declarations, strict path/schema parsing, immutable principal/org binding, version precondition and repeated endpoint authorization. Verdict: pass.
- Scope: local implementation approved by user. Merge and production release remain unapproved.

## Implementation review

Independent cross-slice review covered live manifest authority, version and retirement checks, SDK activation/recovery, and answer-first prompts. It found two integration blockers: static scope membership excluded live tools, and configured scope overrides were dropped by resolved-agent projection. Both have dedicated pipeline-level regression coverage. Root reviewed the resulting scope/config changes independently. Root also identified and reviewed connection-bound custom-tool caching and execution invalidation. Custom script failures preserve an unknown side-effect outcome.

Repository gates and production qualification are recorded separately; this review does not approve merge or deployment.
