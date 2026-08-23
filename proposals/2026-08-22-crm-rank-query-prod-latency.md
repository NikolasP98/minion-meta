---
id: 2026-08-22-crm-rank-query-prod-latency
title: "CRM rank query costs 43-57s raw in prod — cache hides it, query needs profiling"
status: draft
created: 2026-08-22
updated: 2026-08-22
repos: [minion_hub]
tags: [crm, data]
source: hub-perf-session-2026-08-22
---

# CRM rank query: 43–57s raw in production

## Problem

`runRankQuery` (`src/server/services/crm-contacts.service.ts`) — the single
SQL behind `/crm/customers`, `GET /api/crm/contacts`, and `listContactsCached`
— takes **43–57 seconds raw** against the production dataset (FACES: ~17k
contacts, ~590k messages), measured live 2026-08-22 via the new
`Server-Timing` header. The query ranks the entire org (message rollups, RFM
scoring, funnel derivation, finance bridge) before applying LIMIT, so a
100-row page costs the same as the full roster.

## AS-IS (evidenced)

- `GET /api/crm/contacts?limit=1` → `Server-Timing: app;dur=43058` (43s for
  ONE row). `limit=100` → 49s. Search variant → 38s. Reproduced 3× warm,
  2026-08-22, prod, FACES org.
- The cost was invisible for months because `listContactsCached` (ttl 2m /
  swr 1h) served the roster stale-while-revalidating; only cache-cold visits
  paid it (observed as the intermittent "65s" loads).
- Mitigation shipped 2026-08-22: `rankContactsPageCached` wraps the paged
  query in the same Valkey cache + org-tag invalidation, so repeated views and
  interactions are fast — but every NOVEL (filters, page) combination and
  every post-mutation refresh still pays the raw 43–57s once.
- The 2026-08-02 pre-aggregate rewrite measured ~5s for this query under RLS
  in dev; since then the query gained the finance bridge, funnel derivation,
  ICP expression, and attribution join — where the regression lives is
  unmeasured.

## TO-BE

- Raw (uncached) `rankContactsPage` for a 100-row page ≤ 5s p95 in prod;
  ideally ≤ 1s for the default view.
- Invariants: result rows bit-identical to today's query (the 2026-08-02
  rewrite set the precedent: `except` diff = 0 rows both ways); RLS
  enforcement unchanged; cache layer stays (it is correct regardless).

## DELTA

1. `EXPLAIN (ANALYZE, BUFFERS)` the query in prod under the `app_ledger` role
   (single-statement psql per the prod-health recipe) — attribute the time
   across agg CTE / finance bridge / funnel CASE / ICP expr / attribution
   join. → evidence in the spec this proposal spawns.
2. Fix the dominant term (candidates: precomputed per-contact rollup table
   maintained by trigger or cron; partial indexes; splitting the finance
   bridge out of the ranked CTE and joining only the page's 100 rows).
3. Parity + timing proof: `except` diff = 0 both ways, p95 timings recorded
   before/after in the PR.

## Out of scope

- The page/UI (shipped in hub #163) and the cache layer (hub PR
  "perf(crm): cache the paged rank query") — both stand regardless.
- Search infrastructure (Meilisearch etc.) — rejected at this scale in
  `2026-08-13-crm-customers-server-pagination-spec` §6.

## Definition of done

`GET /api/crm/contacts?limit=100` with `CACHE_BACKEND=noop` (or a
cache-busting key) returns in ≤ 5s p95 on prod data; row parity proven; the
`TODO(handoff)` at `rankContactsPageCached` removed.

## 2026-08-23 — regression + durable fix (autovacuum)

The covering-index fix (hub #168, `messages_crm_agg_covering_idx`, 49.5s →
0.66s) **regressed within one day**: constant message inserts decayed the
visibility map (~38k unvacuumed rows), the index-only scan fell back to heap
fetches (`Heap Fetches: 37,980`), and the agg ran 26–110s again — surfacing
as dead sort/filter/scroll on `/crm/customers` (the page silently swallows
non-OK API responses; fixed in hub #170) and skeleton-stuck dashboards.

Durable fix, applied to prod 2026-08-23 and recorded in hub migration
`20260823030000_messages_autovacuum_tuning.sql`:

```sql
alter table messages set (
  autovacuum_vacuum_insert_threshold = 5000,
  autovacuum_vacuum_insert_scale_factor = 0.0,
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.02
);
```

Post-VACUUM verification: `Heap Fetches: 0`, 3.4s cold / sub-second warm.
Browser-verified sort/filter/infinite-scroll on prod. Lesson: an index-only
scan on a hot-insert table is only as good as its visibility map — per-table
autovacuum tuning is part of the fix, not an optimization.
