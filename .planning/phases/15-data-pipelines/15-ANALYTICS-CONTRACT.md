# 15-01 Analytics dataset contract (SEC-06)

Status: contract and evidence executable; no dataset is enabled or wired by this plan.
Executed 2026-09-11 against `minion_hub` `origin/master` `1df0a9216ad3f7f85d989eb59cfccb779d9f7285`
in private snapshot `/home/nikolas/.cache/claude-tmp/15-01-3658a393/minion_hub`.
Machine contract: `minion_hub/src/server/services/assistant-datasets.contract.ts` (registry,
manifest validator, request schema, authorizer, result bound) with
`assistant-datasets.contract.test.ts` (45 cases). This document is the human inventory the
registry cites; the registry is the truth when they disagree.

## 0. Source identity (D360-05) — the containment prerequisite is NOT on master

| File | `origin/master` (this plan's base) | Local `feat/level-2026-07-30` checkout |
|---|---|---|
| `src/server/services/assistant-query.service.ts` | `d68082b6…` — **live raw SQL**: `runReadOnlyOrgQuery` runs `sql.raw(q)` after `set transaction read only`, `set local role app_assistant_ro`, `set_config('app.current_org_id', tenant, true)`, 5 s statement timeout, 200-row slice | `a3b69a03…` — 09-01 containment: always throws `QueryRejected` (`ASSISTANT_SQL_DISABLED`, 503, non-retryable) |
| `src/routes/api/gateway/query/+server.ts` | POST parses caller `sql`, gates on `capabilities.canRunAnalytics()`, executes | returns the 503 disabled contract without identity/DB |
| `src/server/auth/assistant-principal.ts` | `04f3770a…` — resolves `personal_agents` by `ILIKE`, **self-heals** `profiles.personal_agent_id`, honors `?orgId` by membership only; no gateway assignment binding | `4de53242…` — persisted gateway/agent/org assignment required, brain gateway calls denied |
| `src/server/services/rbac.service.ts` | `1720b821…` | `54189e0f…` (only `apiWriteCapability` path list differs) |
| `src/routes/api/gateway/query/server.test.ts`, `assistant-principal.pg.test.ts` | absent | present (09-01 evidence) |

Consequence: every implementation slice in `15-DATASET-IMPLEMENTATION-GATES.md` depends on
09-01 landing on `master` first (gate G0). This plan did not touch those files (not owned).

## 1. Question inventory (from code and specs, no customer transcripts)

Sources: gateway tool descriptions `minion/src/agents/tools/knowledge/crm-profile.ts`,
`crm-query-tool.ts`, `crm-insight-tool.ts`, `minion/src/agents/tools/hub/*-query-tool.ts`;
Hub routes `minion_hub/src/routes/api/gateway/**`. `Qn` ids are cited by `DATASETS[].answers`.

| Q | Question family (as advertised to the model today) | Served today by | Dataset id | Status |
|---|---|---|---|---|
| Q1 | revenue, invoice count, discount/COGS/margin for a period | `GET /api/gateway/query/finance` → `financeSummary` (+`maskFinanceSummary`) | `finance.summary` | existing |
| Q2 | revenue over time (day/week/month) | same route → `revenueSeries` | `finance.revenue_series` | existing |
| Q3 | "top-grossing product and its % of this year's revenue" (`crm_query` example) | `topProducts(limit 15)`; share derivable from summary total | `finance.top_products` | existing (share = renderer arithmetic, no new SQL) |
| Q4 | "highest payers between Jan–Feb 2026" (`crm_query` example) | `topClients(limit 10)` (finance clients) | `finance.top_clients` | existing |
| Q5 | top customers / recent buyers (`crm_insight`) | `GET /api/gateway/insight` → `rankCustomers` | `crm.customer_rank` | existing — see F1, F2 |
| Q6 | "…and what they bought" (`crm_query` example) | nothing typed; was raw SQL only | `crm.customer_purchases` | candidate |
| Q7 | find a named contact (`crm_search`) with phone/email tier | `/api/crm/*` (browser); gateway `crm_search` uses the CRM SDK, not `/api/gateway` | `crm.contacts` | existing surface, gateway path outside this repo |
| Q8 | upcoming/past appointments by date/status/contact | `GET /api/gateway/query/bookings` | `scheduling.bookings` | existing — see F3 |
| Q9 | "most-requested products/services" (`crm_query` example) | nothing typed | `scheduling.service_demand` | candidate |
| Q10 | orders by status/contact | `GET /api/gateway/query/orders` | `sales.orders` | existing |
| Q11 | open tickets, SLA due | `GET /api/gateway/query/tickets` | `support.tickets` | existing |
| Q12 | project tasks by project/status/assignee | `GET /api/gateway/query/projects` | `projects.tasks` | existing — see F4 |
| Q13 | stock on hand | `GET /api/gateway/query/stock?mode=levels` | `stock.levels` | existing — see F5 |
| Q14 | movements of one item | `?mode=movements` | `stock.movements` | existing — see F5 |
| Q15 | inventory value | `?mode=valuation` | `stock.valuation` | **gated DR-15-01-A** |
| Q16 | recent POS tickets / open shift / sellables | `GET /api/gateway/query/pos` | `pos.tickets` | existing (sellables/shift: catalog reads, not analytics) |
| Q17 | recent processed email, never the body | `GET /api/gateway/query/email-ledger` | `comms.email_ledger` | existing |
| Q18 | "what did customers say about X" / themes | `POST /api/gateway/search-crm-conversations`, `crm-conversation-themes` | `crm.conversation_search` | **gated DR-15-01-B** |

Out of the dataset contract on purpose: `query/notes` (principal-owned, no business module),
`brains*` (separate `brain_access` model), `custom-tools`, `tool-permissions`, `sdk-catalog`
(platform metadata), and all `/actions/*` writes.

## 2. Existing authorization surfaces (as read on master)

Shared plumbing: `resolveAssistantPrincipal` (identity + org + `Capabilities`) →
`requireAssistantCapability(module, 'view')` in `_shared/action-auth.ts` → service call inside
`withOrgCore` (`SET LOCAL role app_ledger`, `app.current_org_id`, `app.current_profile_id`,
`idle_in_transaction_session_timeout 20s`) → RLS policies `org_id = current_setting('app.current_org_id', true)`
(109 policy sites in `supabase/migrations`, 33 files grant `app_ledger`).

| Route | Module gate | Owner scope | Field tier | Row bound | Gap |
|---|---|---|---|---|---|
| `query/finance` | `finance:view` | n/a | `fieldLevel('finance') < 1` → `maskFinanceSummary` | products 15, clients 10, series = period buckets | daily bucket over a long period is unbounded (F6) |
| `query/bookings` | `scheduling:view` | none | `maskAttendeePii` | **none** (`listBookings` accepts `limit`, route never passes it) | F3 |
| `query/orders` | `sales:view` | `ownerScoped('sales')` → `ownerId` | none needed | 200 | — |
| `query/tickets` | `support:view` | `ownerScoped('support')` → `ownerId` | none needed | 200 | — |
| `query/projects` | `projects:view` | n/a | n/a | projects 200, **tasks unbounded** | F4 |
| `query/stock` | `stock:view` | n/a | **none** (valuation rate = cost) | **none** on bins/ledger | F5, DR-A |
| `query/pos` | `pos:view` | n/a | n/a | tickets 50, sellables unbounded | catalog read |
| `query/email-ledger` | `comms:view` | n/a | body excluded by contract | 200 | — |
| `insight` | `crm:view` **OR** `finance:view` | **ignored** (crm is owner-scopable) | none | 20 | F1, F2 |
| `search-crm-conversations` / `crm-conversation-themes` | `crm:view` | ignored | none on chunk text/handles | k ≤ 25 | DR-B |
| `query` (raw SQL, master) | `canRunAnalytics()` (any business view) | none | none | 200 after full materialization | §3 |

Gateway delegation deny defaults present on master: brain agents get `brainAgentCapabilities()`
(`canRunAnalytics()=false`, only `brains:view/edit`); unknown agent ids → 400; `?orgId` outside
membership → fallback to primary org (not deny — the 09-01 candidate changes this to deny).

## 3. RLS / GUC review (D360-02, "caller-mutable GUC attack")

- Tenant isolation is a transaction-local GUC set by the server (`set_config(…, true)`) and read
  by RLS. Any SQL text authored by the caller can call `set_config('app.current_org_id', …, true)`
  or `set_config('role', …, true)` itself (the same primitive `withOrgCore` uses), inside a CTE of
  a single `SELECT`. The "single statement / starts with SELECT" regex on master is not a sandbox.
  This is why the contract admits **no** caller SQL and why `parseDatasetRequest` is `strict()`
  (an `sql` key is rejected, test "rejects caller SQL").
- `app_assistant_ro` (the role master's raw path `SET LOCAL ROLE`s into) is referenced in exactly
  two source files and **no migration in this repo**. Its existence, grants and RLS behavior are
  unverifiable from source; the tool description's "SELECT on business tables only" claim has no
  repo evidence.
- `app_ledger` (what `withOrgCore` uses) holds `select, insert, update, delete` grants on the
  business tables. Read-only-ness of typed datasets therefore comes from server-owned query text,
  not from the role. Slices must keep queries as `SELECT` built from bound parameters only.
- `rankCustomers` uses `sql.raw(String(lim))` for a clamped integer. Acceptable today; slices
  should bind `LIMIT` as a parameter (`${limit}`) to keep the "no raw" invariant grep-checkable.
- Deployed PostgREST/JWT/pooler/RLS behavior is not evidenced here (same limit 09-01 recorded);
  the PGlite fixture in the 09-01 candidate exercises Drizzle joins + RBAC rows only.

## 4. Policy layers encoded in the contract

1. **Tenant** — `request.orgId` must equal `principal.orgId` (`DATASET_TENANT_MISMATCH`); the
   principal's org comes from the resolver, never from the request.
2. **Principal kind** — only `member` (browser self/admin, or gateway personal agent with a
   persisted assignment once 09-01 lands) with `canRunAnalytics()`; `brain-agent` and empty
   capability sets are denied (`DATASET_PRINCIPAL_DENIED`).
3. **Module** — every `requires` entry must be viewable; cross-module joins list both sides
   (`crm.customer_rank` needs `crm:view` **and** `finance:view`).
4. **Owner** — `OWNER_SCOPABLE_MODULES` (crm/sales/support): row datasets declare the owner
   column and get `ownerId`; aggregates without an owner column declare `deny` and refuse
   owner-scoped principals (`DATASET_OWNER_SCOPE_UNSUPPORTED`). The manifest validator rejects
   an owner-scopable module that declares `none`.
5. **Field** — `sensitive` fields only on modules in `FIELD_LEVEL_MODULES` (crm/finance/
   scheduling). Below `SENSITIVE_FIELD_LEVEL` they are masked from the default projection and
   **denied** when explicitly requested (`DATASET_FIELD_DENIED`), so a model cannot probe.
6. **Bounds** — `DATASET_BUDGET` (§5); per-dataset `maxRows ≤ 200`; `limit` above cap is a
   request error, not a clamp; `boundResult` serializes row-by-row and stops at `maxBytes`.

## 5. Budgets (grounded, marked where they are proposals)

| Budget | Value | Ground |
|---|---|---|
| `maxRows` | 200 | largest existing cap (notes/orders/tickets/email-ledger routes; raw-SQL `MAX_ROWS`) |
| `statementTimeoutMs` | 5000 | raw-SQL `STATEMENT_TIMEOUT_MS`; `withOrgCore` idle timeout 20 s |
| `maxBytes` | 256 KiB | 200 rows × ~1 KiB serialized row (previews truncate at 120 chars) — **proposal** |
| `maxInFlightPerPrincipal` | 2 | no Hub precedent (gateway has `tools/rate-limiter.ts`) — **proposal** |

Materialization rule for slices: query with `LIMIT :limit + 1` bound as a parameter; the extra
row sets `truncated`; nothing beyond it is fetched.

## 6. Decision requests (recorded, not guessed; nothing enabled)

| Id | Question | Deny default in force until decided |
|---|---|---|
| DR-15-01-A | Is `stk_bins.valuation_rate` / inventory value a cost-tier field? `stock` has no entry in `FIELD_LEVEL_MODULES`; `finance` cost tier is "discount rate & margin". Options: add a `stock` field tier; or treat valuation as `finance` cost tier (requires `finance` level). | `stock.valuation` gated; `stock.levels`/`movements` exclude the rate. |
| DR-15-01-B | Conversation chunk text and sender handles are PII-bearing; `crm` tier covers "phone numbers & email addresses" on contacts only. Which tier governs message text for the assistant, and may owner-scoped CRM roles read org-wide conversations? | `crm.conversation_search` gated; existing routes untouched. |
| DR-15-01-C | `/api/gateway/insight` grants on `crm:view` **or** `finance:view`; the contract requires **both**. Confirm "both" (contract) or keep "either" (current route). | contract = both. |
| DR-15-01-D | May an owner-scoped CRM role see org-wide ranked aggregates (`crm.customer_rank`)? | denied (`ownerScope: deny`). |
| DR-15-01-E | Byte/concurrency budgets in §5 marked proposal. | values in `DATASET_BUDGET` used only by tests until adopted. |

## 7. Findings on existing typed surfaces (feed the gates file; not fixed here — files not owned)

- **F1** `insight` OR-gate is weaker than the module policy (see DR-C).
- **F2** `insight` ignores `ownerScoped('crm')` although `crm` is owner-scopable.
- **F3** `query/bookings` passes no `limit` to `listBookings` → unbounded rows/bytes.
- **F4** `query/projects` `listTasks` has no limit → unbounded.
- **F5** `query/stock` bins/ledger unbounded; valuation rate returned to any `stock:view` role.
- **F6** `query/finance` daily series over a long range can exceed 200 buckets.
- **F7** master `crm_query`/raw route still live; tool description advertises a DB role with no
  migration evidence (§3).
- **F8** Gateway `crm_query` remains advertised (`minion/src/agents/minion-tools.ts:109`,
  `tools/knowledge/crm-query-tool*.ts`); Hub cannot retire it (cross-repo, separately owned).

## 8. Evidence

- `node node_modules/vitest/vitest.mjs run src/server/services/assistant-datasets.contract.test.ts`
  → 1 file, **45 passed / 0 failed**, exit 0 (log `checks/vitest-contract.log` in the snapshot).
  Red→green recorded: the first run failed "rejects missing required filter" (zod `.default({})`
  skipped the inner schema); fixed with `.prefault({})`.
- Prettier scoped check exit 0; `git diff --check` exit 0; full `bun run check` result in the
  SUMMARY.
