---
id: 2026-08-31-hub-performance-board-reconciliation-spec
title: Reconcile stale hub performance planning statuses
stage: spec
status: draft
pass: 1
created: 2026-08-31
updated: 2026-08-31
repos: [minion-meta]
type: infra
relationship: extends
related: [2026-08-22-hub-load-nav-performance-spec, 2026-07-17-hub-performance-optimization-plan, 2026-07-06-hub-tanstack-consolidated-execution]
verdict: pending
tags: [board, hygiene]
---

# Reconcile stale hub performance planning statuses

## 0. Product

The hub performance program depends on trustworthy planning state. Several older
TanStack and performance specs still publish `status: unknown`, even though later work
has produced implementation evidence. This meta-repository-only spec separates that
board reconciliation from the executable `minion_hub` performance spec so each Factory
run resolves to exactly one repository.

## 1. AS-IS

`specs/index.json` publishes `status: unknown` for
`2026-07-05-hub-tanstack-virtual`, the
`2026-07-06-hub-tanstack-{consolidated-execution,query,pacer,ai-assessment,db-store-assessment}`
family, and `2026-07-17-hub-performance-optimization-plan`. The parent load/navigation
spec previously carried their reconciliation as Slice 8 while declaring both
`minion_hub` and `minion-meta`; the Factory queue cannot dispatch a multi-repository spec
without explicit per-repository queueing.

## 2. TO-BE

Each named planning artifact has one evidence-backed lifecycle disposition. The source
Markdown remains canonical, `specs/index.json` is regenerated from it, and the hub
implementation spec remains scoped only to `minion_hub`.

## 3. DELTA

1. Inspect the current hub default branch for each spec's named T1–T10 or Phase 0–2
   landmarks and record exact file, symbol, PR, or commit evidence.
2. Set each source spec to `shipped`, `superseded`, or `parked` according to that evidence;
   preserve unique open work instead of treating partial shipment as completion.
3. Resolve the CRM pagination spec's “if T2 landed” uncertainty in its sidecar or body.
4. Regenerate `specs/index.json` and verify its projection matches every changed source.

### Slice 1 — Reconcile the stale performance artifacts

**Topics:** `board`, `hygiene`

Apply DELTA 1–4 in `minion-meta`. DoD: none of the named specs carries
`status: unknown`; every disposition cites exact implementation evidence; any retained
open end remains represented by an executable artifact; `node scripts/spec-index.mjs
--check` and the focused spec-index tests pass.

## 4. Out of scope

No `minion_hub` product code, runtime configuration, database change, deployment, or
performance optimization is implemented here. This spec does not approve or change the
security-gated slices in `2026-08-22-hub-load-nav-performance-spec`.

## 5. Verification

Run `node scripts/spec-index.mjs`, inspect the generated entries for every changed spec,
then run `node scripts/spec-index.mjs --check`, the focused spec-index tests, and
`git diff --check`.
