---
id: 2026-08-28-factory-merge-time-change-ledger
title: Merge-time change ledger — deterministic repo-change memory for agent context
status: draft
created: 2026-08-28
updated: 2026-08-28
repos: [minion-factory]
tags: [infra]
---

# Merge-time change ledger — deterministic repo-change memory for agent context

## Problem

Agents re-discover repo state every run. Evidence (2026-08-28): the
containment-base spec's pass-1 needed GitHub-API archaeology to learn PRs
#101/#102 had shipped spec-less; a dev run burned its entire turn budget
reading before its first edit; the board audit found six specs stale against
merged reality. "What shipped recently, and why" is not captured anywhere an
agent can query. Evaluation conclusion: no NEW vector DB — the semantic tier
(claude-mem MCP, mounted in containers) already exists; the gaps are coverage
(merged changes never ingested) and delivery (memory-governance S2 transport,
tracked separately as the board's top item).

## Proposed implementation

- On each `merge_events` intake (webhook already fires), append a
  machine-written entry to a per-repo append-only ledger: sha, files touched,
  PR title/body summary, linked spec/proposal id, date. Runner-owned write;
  agent-readable only.
- At dispatch, inject the last N ledger entries whose paths intersect the
  run's likely surface (spec `files to touch`, or repo-wide tail) into the
  run prompt — commit-pinned, deterministic, no model call.
- Ingest ledger entries into the EXISTING claude-mem semantic corpus so the
  agents' semantic tier covers change history; no new vector store.
- Emit the decision metrics: turns-before-first-edit per run, and a counter
  for runs refused/reworked because their spec was stale against the ledger.

Depends-on: 2026-08-18-factory-memory-governance-spec (S2 read transport
delivers this to V2 runs).
