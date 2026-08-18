---
id: 2026-08-18-pipeline-stats-provenance
title: Pipeline phase failure rates, duration summaries, and detailed stats page
stage: done
status: shipped
pass: 1
created: 2026-08-18
updated: 2026-08-18
verdict: approved
repos: [minion-base, minion-factory]
tags: [ui, logic, test]
type: feature
relationship: already-satisfied
merge_sha: 397a60d3f7417182c15269b0bdaaaeec6d774f1a
merged_pr: https://github.com/NikolasP98/minion-base/pull/18
merged_at: 2026-08-18T14:46:28-05:00
evidence: minion-base@397a60d3f7417182c15269b0bdaaaeec6d774f1a; minion-factory@6e2722399c2ce2269416fc2d7f283eca39e082a7
---

# Pipeline phase failure rates, duration summaries, and detailed stats page

Retrospective provenance for the shipped cross-repository stats work. The landing-page stats expose
per-phase failure rate plus average and median duration, and link to `/stats` for the deeper visual
pipeline view. Factory computes the aggregate fields; Base renders them.

## Acceptance and verification

- Factory stats math tests cover rates, empty populations, averages, and odd/even medians.
- Base renders the compact overview and the designated `/stats` route.
- Both recorded commits are on their repositories' target branches.
