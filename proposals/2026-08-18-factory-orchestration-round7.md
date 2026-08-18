---
id: 2026-08-18-factory-orchestration-round7
title: Repo-slice fan-out, slice continuation, scenario profiles, merge resolver
status: draft
created: 2026-08-18
updated: 2026-08-18
repos: [minion-factory]
tags: [logic]
source: audit-2026-08-18
value: high
---

# From single linear PR runs to a typed execution graph

Audit 2026-08-18 round-7 scope. Today: multi-repo specs map to the FIRST
recognized repo only; nothing continues after Slice 1; every change takes the
same linear path; spec relationships are classified (recommend-only, shipped)
but nothing resolves them.

**Definition of done:** (1) repo-slice fan-out — a spec declaring N repos
produces per-repo slice runs with dependency ordering and an integration join;
(2) slice continuation — a merged Slice N PR level-triggers Slice N+1 (spec
frontmatter tracks completed slices); (3) versioned scenario profiles
(single-repo-low-risk, ui-flow, cross-repo-contract, database-migration,
security-auth, incident-fix) selected by the execution manifest; (4) a
deterministic relationship RESOLVER: applies merges-drafts/supersedes only
under the safe boundary (both drafts, no active runs, no acceptance criterion
lost, fresh review of the consolidated artifact) — everything else becomes a
lineage link + human decision.

**Depends on:** [[2026-08-18-factory-topic-capability-manifest]] and the
durable-state outbox.
