# Feature Specification: QA seed — 90 days of realistic business activity

**Feature Branch**: `docs/spec-015-qa-seed-business-activity` | **Repos & PR bases**: minion_hub → `master` (`feat/qa-seed-business-activity`) · minion-meta → `dev` (this spec)

**Created**: 2026-10-16 | **Status**: Draft | **Tags**: data (local QA stack only — the seed refuses non-loopback hosts, `scripts/qa/seed/db.ts:20-37`) | **Human gates**: none beyond PR review (no prod path, no schema change)

**Input**: Owner, 2026-10-16: on the local sandbox page the assistant-built element "Bookings heatmap — weekday × hour" renders all zeros. "Is it the data? If so, populate the DB."

## Diagnosis (read-only, local QA Postgres `127.0.0.1:54422`, org `76bbbc27-…3405b`)

Both causes are real; neither alone explains a usable heatmap.

1. **The element never queries the real dataset.** Its JS loops over `['sched_bookings','bookings','scheduling_bookings']` (`sandbox_elements.js`, stored row) and swallows every error; the registry id is `scheduling.bookings` (`src/server/sandbox/datasets.ts:184`). Every candidate 400s ⇒ `rows = []` ⇒ a 7×24 grid of zeros plus the banner "No bookings dataset available". A dataset/RBAC issue is excluded: the same owner session renders other elements on `finance.invoices`/`pos.tickets`. Fixing the element is the assistant's job on the next turn (canvas map + `sandbox.datasets`, spec 013); this spec does not touch element rows.
2. **The data is too thin to show anything even when queried correctly.** `sched_bookings` for the business org holds **13 rows**, all between 2026-10-12 and 2026-10-26 (seeded as "now + k days", `scripts/qa/seed/scheduling.ts:257-261`, and three series slots pinned at 15/17/20 UTC, `:326-330`). Weekday×hour aggregation gives **9 non-zero cells**, 11 of 13 rows at 20:00 UTC. POS: 9 tickets, all `submitted_at = now` of the seed run (`pos.ts:46-66`); finances: 6 invoices, all `issued_at = now`, one client name (`finances.ts:72-78`). Nothing has a time dimension.

## AS-IS → TO-BE → DELTA *(constitution Principle II)*

**AS-IS** (hub `master` @ `606b363c`).
- The seed is a permutation matrix: one row per edge case, registered by id (`matrix.ts`, `index.ts:120-150`), idempotent via `ON CONFLICT` on deterministic UUIDv5 ids (`ids.ts:37-39`). It proves states, not volume: 13 bookings, 9 tickets, 6 invoices, 0 `fin_clients`, 2 shifts.
- Every timestamp is `ctx.now` or `now + k days`; no row is in the past, so any "last N days" chart, heatmap, weekday or trend view on the QA stack is empty or a single spike.
- `dev:local` runs the seed once on start (`scripts/qa/dev.ts:122` → `backend.ts:170-195`: `bun scripts/qa/seed/index.ts` with `.env.qa` values), and `--only <domain>` re-runs one module against the live stack (`index.ts:108-116`).

**TO-BE.**
- A new seed module `scripts/qa/seed/activity.ts` (domain `activity`, runs after `pos`) generates, for the QA Business Org, the **last 90 days** of plausible activity from a seeded PRNG (mulberry32 keyed per calendar day, so a given past day always produces the same rows on every run and on every later day):
  - bookings on Mon–Sat, 09:00–20:00 America/Lima (`-05:00`, no DST), hourly weights peaking late morning and early evening; 1–4 per weekday, 1–3 Saturday ⇒ ~150–250 rows; statuses ~70% `completed`, ~12% `accepted`, ~12% `cancelled`, ~6% `no_show`; linked to existing event types, resources, contacts and the plain service product;
  - one closed `pos_shifts` row per day that sold anything, 0–3 `pos_tickets` per day (~120), each with 1–3 `pos_ticket_lines` drawn from 7 active catalog products and one `pos_payments` row (`cash` with rounded-up tender / `card` / `yape`), ~5% voided;
  - 8 `fin_clients` and ~40 `fin_invoices` (+ items) spread over the window, ~75% `paid`, ~15% `pending`, ~10% `void`, 18% IGV.
- Idempotent by **delete-then-insert of the tagged set** (uid/human_id/provider_ref prefix `ACT-`), the alternative the README allows when a set's cardinality depends on the run date. A second run in the same process changes zero rows (contract test §idempotency).
- Three matrix ids (`activity.bookings.90d`, `activity.tickets.90d`, `activity.invoices.90d`) keep the generic existence check honest; one dedicated contract assertion checks counts and the 90-day/working-hours envelope.
- Removing: nothing. Every existing fixture and matrix id is untouched.

**DELTA.**
| # | Transition | Proof |
|---|---|---|
| S1 generator | `activity.ts` + `MODULES` entry + 3 matrix ids + README row | `seed.contract.test.ts` generic `it.each` + new `activity.*` assertion (counts, window, hours, statuses); idempotency test unchanged and green |
| S2 live stack | `bun scripts/qa/seed/index.ts --only activity` against the running `dev:local` DB (no restart, no docker) | SQL weekday×hour matrix non-zero across Mon–Sat 09–20 Lima; Playwright screenshot of `/en/sandbox` |

## Requirements
- FR-001 Generated rows MUST be a pure function of (calendar day, fixed seed): no `Math.random`, no `crypto.randomUUID`.
- FR-002 The module MUST only write rows it tags (`ACT-` prefix) and MUST delete only those before re-inserting; no existing fixture row is modified.
- FR-003 Bookings MUST fall on Mon–Sat 09:00–19:59 America/Lima within the last 90 days; tickets and invoices within the same window.
- FR-004 The module MUST run standalone via `--only activity` against an already-seeded stack (depends only on ids exported by `tenancy`, `catalog`, `crm`, `scheduling`).
- FR-005 Totals MUST be internally consistent: ticket `total` = Σ line totals, payment `amount` = ticket total, invoice `total` = subtotal + tax.

## Out of scope / open ends (ledger)
- **Out of scope:** fixing the heatmap element's dataset ids (assistant/user action on the POC page); stock movements for sold products (`stk_ledger` is materialized — rebuilding it is its own spec); card surcharges and `fin_payments`; package grants/redemptions on generated bookings; the personal org.
- Booking times are generated in Lima local time; the stored element aggregates with `getUTCHours`, so the UTC heatmap will show 14:00–00:59. That is the element's choice, not the seed's.
