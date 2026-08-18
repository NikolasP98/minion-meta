---
id: 2026-08-17-factory-workitem-handoff-schema
title: Typed WorkItem + signed handoff bundle across factory stages
status: in-spec
spawned_spec: 2026-08-18-factory-workitem-handoff-schema-spec
created: 2026-08-17
updated: 2026-08-18
repos: [minion-factory]
tags: [logic]
source: audit-2026-08-17
value: medium
---

# Handoffs are mutable IDs, not contracts

Audit 2026-08-17 P1. Specs are fetched by mutable id+branch (not commit SHA);
reviewer output is grep-parsed markdown; multi-repo specs map to the FIRST
recognized repo only (`queue.ts` repo resolution); intake normalizes into two
different shapes (issues vs proposals).

**Definition of done:** one typed WorkItem record (source trust, risk class,
priority, owner, lifecycle state) for all intake paths; dev runs pin the spec
by commit SHA and record it; review emits a structured JSON verdict artifact
(findings, severity, head SHA) alongside the markdown; multi-repo specs either
fan out per repo or fail loudly.

**Out of scope:** priority scheduling policy (separate decision).
