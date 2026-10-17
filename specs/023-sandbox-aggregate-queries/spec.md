# Feature Specification: Sandbox totals queries (aggregate without groupBy) — production hotfix

**Feature Branch**: `docs/spec-023-sandbox-aggregate-queries` | **Repos & PR bases**: minion_hub → `master` (`fix/sandbox-aggregate-queries`) · minion-meta → `dev`

**Created**: 2026-10-17 | **Status**: Draft | **Tags**: logic, data-read (query compiler; RBAC/PII guards unchanged) | **Human gates**: none (hub master needs the owner's review-merge)

**Input**: Owner, 2026-10-17 (screenshot): after spec 022 the assistant built three sandbox elements; "KEY METRICS" shows `query failed (500)`.

## AS-IS (prod Vercel runtime logs, 07:07 UTC, `POST /api/sandbox/query`)
Four 500s, all `PostgresError: column "…" must appear in the GROUP BY clause`:
- `select t.total, sum(t.total) … from pos_tickets … order by t.submitted_at desc` (select + aggregate, no groupBy)
- `select bins.valuation, sum(bins.valuation) … from stk_items … order by t.name asc`
- `select t.start_time, count(t.start_time)::int … from sched_bookings … order by t.start_time desc`
`query-compiler.ts` only switched to the aggregate projection when `groupBy` was set; with aggregates alone it kept the `select` (or the dataset's default columns) and appended the dataset's default `order by`. The unit test "aggregates without groupBy produce one row and no order clause" pinned exactly that invalid SQL.

## TO-BE
- `aggregated = groupBy || aggregate`. Aggregates without groupBy = one totals row: only the aggregate aliases are projected (a `select` is ignored, the rule grouped queries already follow), no default order.
- `orderBy` on a plain column of any aggregated query → named 400 ("must be grouped or aggregated"), never a 500.

## DELTA
| # | Change | Proof |
|---|---|---|
| S1 | `query-compiler.ts` | `query-compiler.test.ts`: corrected pinned SQL; prod shape (`select total` + `sum(total)` + where) compiles to `select sum(t.total) as "revenue" … limit`; plain-column order on a totals query throws the named 400. Sandbox suites 95/95, svelte-check |

## Open ends
- Existing prod elements built against the old behaviour render once the fix deploys; no data change needed.
