---
id: 2026-08-17-factory-workitem-handoff-schema
title: Typed WorkItem + signed handoff bundle across factory stages
status: in-spec
spawned_spec: 2026-08-18-factory-workitem-handoff-schema-spec
created: 2026-08-17
updated: 2026-10-17
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

## AS-IS — reassessed 2026-10-17

Factory production `43a174b2e87c4d572ffd2ba030269db22a0b7bd2` has commit-pinned
spec handoffs, structured review artifacts and multi-repo dispatch refusal.
Those are regression boundaries, not requests for duplicate implementation.
WorkItem trust fields are still absent from the new approval/admission gates;
monitor intake still uses legacy issues. The closed meta PR #273 is not shipment
evidence for the complete goal.

## TO-BE

All intake paths retain the full WorkItem goal. Trusted low-risk automation may
follow automatic approval; human/external/legacy/unclassified work keeps its
required gate. Existing queue authority, ranking and ordering are preserved.

## DELTA and remaining work

Deploy the strict S5 consumer gate before S4 schema/producer backfill, prove the
runtime refusal cases, then apply a reviewed inventory of current proposals
excluding review sidecars. S6 typed monitor intake follows complete corpus
validation. The parent spec and Spec Kit feature
`specs/104-workitem-consumer-first/` retain exact tasks and acceptance evidence.
Security approval and merge require the owner. No implementation or completion
is inferred from a historical PR closure.
