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

## Dedicated checksum audit addendum review

Pass1 (root): exact public fixture digests recompute from declaration content; the baseline delta contains only their two fingerprints. The setup repair removes one tracked machine-specific symlink. The existing security proposal calls for temporary dedicated-update authorization; merge and owner security approval remain separate.

Pass2 (dynamic_catalog): design approved with exact same-repository PR334/branch/DEV identity, immutable full-baseline before/after objects, fail-closed context/object checks, historical mutation rejection and continued scanning. Implementation must prove wrong-context, tampering/revert and new-secret cases before commit.
