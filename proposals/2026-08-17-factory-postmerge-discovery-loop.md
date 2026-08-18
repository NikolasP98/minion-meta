---
id: 2026-08-17-factory-postmerge-discovery-loop
title: Post-merge discovery loop — merged-PR intake, scan, verified proposals
status: draft
created: 2026-08-17
updated: 2026-08-17
repos: [minion-factory]
tags: [logic, infra]
source: audit-2026-08-17
value: high
---

# The pipeline ends at merge; the SDLC does not

Audit 2026-08-17 addendum: the central missing subsystem is
merge SHA → post-merge scan → structured finding → verified proposal →
fix PR → deployment → verification rescan → closure.

**Definition of done (vertical slice):** signed GitHub webhook for merge
events; durable merge-event row (outbox pattern); deterministic scanner over
the merged diff (TODO(handoff) markers + changed-path blast radius); stable
finding fingerprints; LLM impact synthesis; proposal creation with lineage to
the merge SHA; delayed verification rescan that closes or re-files.

**Out of scope:** API/schema/config dependency graphs (expand after the slice
proves the loop).
