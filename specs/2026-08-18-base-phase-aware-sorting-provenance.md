---
id: 2026-08-18-base-phase-aware-sorting-provenance
title: Board and Factory phase-aware status-first sorting
stage: done
status: shipped
pass: 1
created: 2026-08-18
updated: 2026-08-18
verdict: approved
repos: [minion-base]
tags: [ui, logic, test]
type: fix
relationship: already-satisfied
merge_sha: efa8710a93b240577d27945e982a4b9c89bd1608
merged_pr: https://github.com/NikolasP98/minion-base/pull/27
merged_at: 2026-08-18T16:11:32-05:00
evidence: https://github.com/NikolasP98/minion-base/commit/efa8710a93b240577d27945e982a4b9c89bd1608
---

# Board and Factory phase-aware status-first sorting

Retrospective provenance for already-shipped maintenance. Board columns sort active work first,
then use phase-specific lifecycle order, recency, and a stable identity tie-breaker. Factory runs
sort running, queued, failed/error, passed, then canceled before applying recency.

## Acceptance and verification

- `src/lib/board/sort.ts` is the single ordering policy.
- `bun test src/lib/board/sort.test.ts` passes on the recorded merge.
- The merged commit is on `minion-base/main` and deployed with the board.
