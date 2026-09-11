# 15-01 Dataset implementation gates and child slices (SEC-06)

Read `15-ANALYTICS-CONTRACT.md` first. Every slice below consumes the closed registry in
`minion_hub/src/server/services/assistant-datasets.contract.ts` and may not add a dataset id,
field, filter or sort outside it. Raw SQL stays disabled until every slice here passes; a type
or registry entry is never a success claim. SEC-06 stays open until S1–S5 (and G2) are
implemented with their negative tests green on an independently verified candidate.

Boundary note: 15-01 `files_modified` owns this file only, so the child slices are specified
here as complete PLAN bodies for root to lift into `15-01a…15-01f-PLAN.md`, allowlist and index.
No PLAN files were created (rule 4 of the executor brief). Creating them is root's admission
step, not a shortcut this executor took.

## Gates

| Gate | Condition | Evidence required | State 2026-09-11 |
|---|---|---|---|
| G0 | 09-01 containment (`ASSISTANT_SQL_DISABLED`, persisted gateway assignment, brain gateway deny) merged to `minion_hub` `master` | `sha256 src/server/services/assistant-query.service.ts` on master ≠ `d68082b6…`; `assistant-principal.pg.test.ts` present and green on master | **open** — master still runs caller SQL (contract §0) |
| G1 | Contract registry valid | `assistant-datasets.contract.test.ts` 45/45 | met in snapshot `15-01-3658a393` |
| G2 | Gateway `crm_query` advertisement retired or marked unavailable, with a consumer compatibility fixture (old gateway → new Hub returns 503 contract, no retry loop) | `minion` repo change + fixture; cross-repo, separately owned | open, not Hub-ownable |
| G3 | Decision requests DR-15-01-A/B/C/D/E answered | DECISIONS.md entries | open — datasets stay gated/deny |
| G4 | Real-engine policy fixture: PGlite seed with two orgs × (owner, manager, staff, viewer, owner-scoped crm, low field-level finance) personas driving the wired datasets | `assistant-datasets.pg.test.ts` | S1 deliverable |
| G5 | Deployed RLS/pooler behavior for `app_ledger` under the typed path | operator-run read-only check against a non-production environment with the tenant GUC; not a local fixture | open, needs environment access |

## Slice inventory (wave order)

| Slice | Datasets | Depends on | Files (exclusive) |
|---|---|---|---|
| S1 dataset runner + policy fixture | none (runtime) | G0, G1 | `src/server/services/assistant-datasets.service.ts` (+`.test.ts`, `.pg.test.ts`), `src/routes/api/gateway/datasets/+server.ts` (+`server.test.ts`) |
| S2 finance | `finance.summary`, `finance.revenue_series`, `finance.top_products`, `finance.top_clients` | S1 | `src/server/services/assistant-datasets/finance.ts` (+test) |
| S3 CRM cross-module | `crm.customer_rank`, `crm.customer_purchases`, `crm.contacts` | S1, DR-C, DR-D | `src/server/services/assistant-datasets/crm.ts` (+test); `src/routes/api/gateway/insight/+server.ts` (align F1/F2) |
| S4 operations | `scheduling.bookings`, `scheduling.service_demand`, `sales.orders`, `support.tickets`, `projects.tasks`, `pos.tickets`, `comms.email_ledger` | S1 | `src/server/services/assistant-datasets/operations.ts` (+test); `query/bookings`, `query/projects` routes (F3/F4 bounds) |
| S5 stock | `stock.levels`, `stock.movements` (`stock.valuation` stays gated) | S1, DR-A | `src/server/services/assistant-datasets/stock.ts` (+test); `query/stock` route (F5 bounds, rate removal) |
| S6 gateway retirement | — | G0 | `minion/src/agents/minion-tools.ts`, `minion/src/agents/tools/knowledge/crm-query-tool*.ts`, generated registry; gateway-owned |

Shared-file rule (D360-06): `assistant-datasets.contract.ts` has one writer per wave; S2–S5 may
not edit it. If a slice needs a registry change, it stops and files the change as a contract
amendment for root.

## S1 — Dataset runner, route and policy fixture

Objective: one server-owned execution path for every dataset: parse → authorize → bounded
parametrized query → bounded serialization. No dataset logic lives in routes.

Tasks:
1. `assistant-datasets.service.ts`: `runDataset(principal, raw)`; calls `parseDatasetRequest`,
   `authorizeDataset`, dispatches to a per-module `DatasetQuery` map `{ [id]: (ctx, decision,
   request) => Promise<Row[]> }` populated by S2–S5; executes inside `withOrgCore` with
   `set_config('statement_timeout', DATASET_BUDGET.statementTimeoutMs, true)`; every query
   receives `decision.limit + 1` as a bound parameter and must use drizzle `sql` template
   parameters only — a test greps the module for `sql.raw(` and fails on any hit; applies
   `boundResult`; strips `decision.masked` columns before serialization (defense in depth: the
   query must already not select them).
2. `GET|POST /api/gateway/datasets?agentId=…` route: `resolveAssistantPrincipal` → principal
   kind from the resolver (`brain-…` → `brain-agent`) → `runDataset`; denial codes map to 403
   (`DATASET_*_DENIED`, `TENANT_MISMATCH`, `OWNER_SCOPE_UNSUPPORTED`), 404 (`DATASET_UNKNOWN`),
   400 (`DATASET_BAD_REQUEST`), 409 (`DATASET_GATED` with the decision id). Response
   `{ dataset, orgId, fields, rows, rowCount, truncated }`; never echo backend error text.
3. Per-principal in-flight limiter (`maxInFlightPerPrincipal`) keyed by `principalId`; over the
   limit → 429 with `retryable: true`. Mark `ponytail:` in-process map; a shared limiter is a
   later concern once there is more than one serverless instance per principal in practice.
4. `assistant-datasets.pg.test.ts` (PGlite, mirrors 09-01's transport fixture): two orgs, the six
   personas, one synthetic table per wired module; asserts — cross-tenant rows never appear even
   when `orgId` of the other org is requested; brain agent denied; viewer sees masked summary;
   owner-scoped sales role sees only its rows; `limit = maxRows` returns `maxRows` rows and
   `truncated: true` when `maxRows + 1` exist; a 2 KiB-per-row table stops under `maxBytes`.

Negative cases named before implementation: unassigned gateway agent (no `personal_agents`
row) → 403 before any query; `?userId` on a gateway call → 403; `sql` key in body → 400;
`DATASET_GATED` for `stock.valuation` for an owner persona; statement timeout surfaced as 504
with no SQL text in the message.

Verify: `node node_modules/vitest/vitest.mjs run src/server/services/assistant-datasets.service.test.ts src/server/services/assistant-datasets.pg.test.ts src/routes/api/gateway/datasets/server.test.ts`; route-contract manifest and the 6 counts updated (`hub-route-contract-required-build-step`).

## S2 — Finance datasets

Reuse `financeSummary`, `revenueSeries`, `topProducts`, `topClients` from `finance.service.ts`
unchanged; adapters map their outputs to the registry field names and apply `decision.fields`.
`shareOfRevenue` = product revenue / summary `totalRevenue` computed in the adapter (Q3), never
a new SQL path. F6: reject `bucket=day` ranges longer than 200 days at parse time (adapter
returns `DATASET_BAD_REQUEST`), do not clamp silently.
Negative tests: viewer (`fieldLevel 0`) never receives `totalCogs`/`marginRate` keys; a
`fields: ['marginRate']` request from viewer → 403; org B principal requesting org A → 403.

## S3 — CRM cross-module datasets

`crm.customer_rank`: wrap `rankCustomers`; require both modules (contract); owner-scoped crm
→ 403 (DR-D default). `crm.customer_purchases`: new parametrized query over
`crm_contacts ⋈ fin_clients ⋈ fin_invoices ⋈ fin_invoice_items` bound by `contactId`, date
range, `owner_id` when `decision.ownerId` set, `LIMIT $n+1`. `crm.contacts`: reuse the CRM
contacts service list with PII columns dropped from the projection when masked (not nulled
after fetch). Align `insight/+server.ts` to the contract decision on DR-C (both) and add
`ownerScoped('crm')` handling (F1/F2) — or, if DR-C decides "either", amend the registry first.
Negative tests: finance-only persona → `requires crm:view`; crm-only → `requires finance:view`;
owner-scoped crm persona → `DATASET_OWNER_SCOPE_UNSUPPORTED` on rank, filtered rows on
purchases; `contactId` of the other org → zero rows and no error leakage.

## S4 — Operations datasets

Wrap `listBookings` (pass `limit`, fix F3), `listOrders`, `listIssues`, `listTasks` (add a
`limit` option, fix F4), `listTickets` (pos), `listEntries` (email ledger, `from/to` filter on
`processedAt`). `scheduling.service_demand`: new parametrized `GROUP BY product_id/event type`
count over `sched_bookings` in range with `LIMIT $n+1`. Owner scope for sales/support via
`decision.ownerId`. Negative tests: attendee PII absent for `fieldLevel 0`; status enum outside
the declared values → 400; unbounded date range on bookings returns `maxRows` + `truncated`.

## S5 — Stock datasets

`stock.levels`/`stock.movements` wrap `getBins`/`getLedger` with `limit` (fix F5) and drop
`valuationRate` from the projection. `stock.valuation` remains gated until DR-15-01-A; the slice
adds only the denial test (409 with `DR-15-01-A`). If DR-A resolves to "finance cost tier", the
registry amendment moves the field to `tier: 'sensitive'` under a `stock` entry in
`FIELD_LEVEL_MODULES` (root-owned change to `$lib/permissions`).

## S6 — Gateway advertisement retirement (cross-repo)

Owner: gateway repo (`minion`, base `DEV`). Retire `crm_query` from `minion-tools.ts`,
`crm-query-tool.ts`/`.meta.ts` and the generated registry; keep `crm_insight` until S3 offers
`crm.customer_rank` through `/api/gateway/datasets`, then point the hub tool pack at the
datasets route. Compatibility fixture: an old gateway calling `/api/gateway/query` must get the
stable 503 body and stop (no retry). Not executable from Hub; recorded for admission.

## What this plan did not do (honest scope)

- No route, service, migration or gateway file was changed; no dataset is reachable through
  the contract yet. `authorizeDataset` is exercised only by unit tests.
- Existing routes keep their current (weaker in places) behavior until S2–S5 land.
- No PostgreSQL was started; the PGlite policy fixture is S1's first deliverable.
