---
id: 2026-08-20-discovery-synthesis-suspension
title: Post-merge discovery synthesis explicitly suspended (cost audit item 6)
status: closed
created: 2026-08-20
updated: 2026-08-20
repos: [minion-factory]
tags: [infra, board]
source: cost-audit-2026-08-20
closed_reason: "Decision record, not work to queue: synthesis stays suspended until the resume criteria are met."
source_trust: human
risk_class: high
priority: medium
owner: human
---

# Post-merge discovery synthesis: explicitly suspended

Decision record for the 2026-08-20 cost/ops audit, item 6 ("complete or
explicitly suspend discovery synthesis"). **Decision: suspend.**

## What is live vs suspended

- **Live (deterministic, cheap):** the post-merge scan. Every merged PR is
  fetched, scanned for `TODO(handoff)` markers and impact-zone signals, and its
  findings are recorded durably in the runner's `findings` table
  (`runner/src/discovery.ts`, slices 0-2).
- **Suspended:** synthesis — the LLM agent container that would turn findings
  into proposals. Slice 3 (its entrypoint `agent/discovery.sh`, the Dockerfile
  copy, and `queue.start()`'s `kind='discovery'` spawn branch) was never built.

## Why suspend instead of complete

Completing slice 3 adds a new class of LLM spend at the exact moment the audit
program exists to control spend ($531 spent on 2026-08-20 with no daily
ceiling; 28 no-op runs). The scan's findings lose nothing by waiting: they are
durable rows keyed by problem fingerprint, and the sweep's pending pass keys on
findings — not on run rows — so the entire deferred backlog is picked up by the
first sweep after resume.

As of factory commit `3f8dd611`, while suspended **no discovery run rows are
minted at all** (previously every merge event grew a sticky refusal row in the
runs table). `DISCOVERY_SPAWN_SUPPORTED` is an invocation-only test seam so the
dormant run-lifecycle contract keeps its test coverage.

## Resume criteria

Reopen (or supersede) this record when queue capacity and budget allow, in one
change that:

1. builds `agent/discovery.sh` (the synthesis container entrypoint) and its
   Dockerfile copy;
2. adds `queue.start()`'s spawn branch for `kind='discovery'`;
3. flips the `DISCOVERY_SPAWN_SUPPORTED` default to true in the same commit;
4. verifies the first sweep picks up the deferred findings backlog (the
   covering test is `discovery.test.ts` "re-queued once spawn is supported").
