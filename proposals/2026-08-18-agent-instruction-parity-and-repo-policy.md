---
id: 2026-08-18-agent-instruction-parity-and-repo-policy
title: Provider-neutral agent instructions + machine-readable repo policy registry
status: in-spec
created: 2026-08-18
updated: 2026-08-18
spawned_spec: 2026-08-18-agent-instruction-parity-and-repo-policy-spec
repos: [minion-meta]
tags: [docs, logic]
source: audit-2026-08-18
value: medium
source_trust: trusted-automation
risk_class: low
priority: medium
owner: factory
---

# One agent contract per repo, one registry for branch/command truth

Agent-file audit 2026-08-18 (alignment 62/100): Claude and Codex receive
materially different instructions — minion/ has AGENTS.md but no CLAUDE.md,
minion_site/ and pixel-agents/ only CLAUDE.md, minion_hub/AGENTS.md is a stale
memory snapshot. Branch policy contradicts across files (hub CLAUDE says dev —
DELETED branch; minion PR_WORKFLOW hardcodes main while feature work targets
DEV; package install and changelog rules self-contradict).

**AS-IS:** per-provider instruction files with drifted content; branch/command
truth duplicated in prose across 6+ files. **TO-BE:** AGENTS.md canonical and
provider-neutral in every repo, CLAUDE.md a one-line include; a
`repo-policy.yaml` (or the factory repos registry exposed read-only) as the
single machine-readable source for branches/commands/checks. **DELTA:** per
repo — create/align the pair, fix the four documented contradictions (hub dev
branch, PR_WORKFLOW main + rebase-before-review ordering, minion package
install, changelog exemptions), and point prose at the registry.

**Out of scope:** rewriting instruction CONTENT beyond the contradictions;
the factory topic manifest (own proposal).
