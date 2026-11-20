---
status: draft
verdict: pending
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
source_proposal: 2026-11-19-hub-opinionated-erp-standards
source_item: slices 0-2
---

# Hub house rules, slices 0 to 2: the gate harness, data-safety items, write inventory and one error envelope

**Feature branches**: hub, one branch per pull request listed under "Delivery". Hub PR base: `master`.

**Status**: Draft. Owner go-ahead for slices 0 to 2 on 2026-11-20 ("Proceed with these slices.
use EGM for this."). This spec is an EGM design document; it replaces the Spec Kit package for
this work at the owner's direction. Review reports live under `egm/` beside this file.

**Evidence**: hub `origin/master` `3677e35a` (2026-11-20), and read-only production queries on
2026-11-19 and 2026-11-20. File references are to the hub repository unless they start with
`proposals/` or `specs/`.

## Terms

| Term | Meaning here |
|---|---|
| App role | The Postgres role `app_ledger`. Every request runs its transaction as this role (`src/server/db/with-org-core.ts:96-99`). |
| Owner role | The Postgres role that owns the tables: `postgres` in production and in local QA; the bootstrap user `minion_qc` in the CI native-Postgres lane. Migrations, seed scripts, repair scripts and integration-test setup connect as it. |
| Stock ledger | The table `stk_ledger`: one append-only row per stock movement line. |
| Document tables | `pos_tickets`, `pos_ticket_lines`, `pos_payments`. |
| Sourced entry | A row in `stk_entries` whose `metadata` has `source` (for example `pos`, `booking`) and `sourceId` (the sale or booking id). |
| Live entry | A stock entry whose status is `draft` or `submitted`, that is, not `cancelled`. |
| Stock gate | The per-organization advisory lock every stock write takes first (`lockStockWrite`, `src/server/services/stock.service.ts:716-720`). |
| Prefix table | `API_WRITE_PREFIXES` in `src/server/services/rbac.service.ts:860`: path prefix → module. `apiWriteCapability(path, method)` (`:1003`) reads it. |
| QA stack | The CI job `qa-stack`: restores `supabase/qa/baseline`, replays migrations, runs the Postgres test lanes. |
| Seed pairing | CI job `migration-seed-pairing`: a migration must come with a change under `scripts/qa/seed/**` or `supabase/qa/baseline/**`, or the PR carries the label `seed-unaffected`. |
| Open-items ledger | The proposal file where follow-up work is recorded, per the meta-repo `AGENTS.md`. |

## Problem statement

The hub solves the same problem several ways. Rules written as prose have decayed; rules with a
mechanical gate have held (proposal, "What already works"). Three gaps cost the most today:

1. **Nothing counts convention debt.** A new native `confirm()`, a new hand-built error body or a
   new unguarded write endpoint lands without any test noticing.
2. **The database does not hold invariants the application relies on.**
   - One live stock movement per sale or booking is enforced by application code under the stock
     gate. A script or repair that writes without the gate is not stopped by anything.
   - The app role, `anon`, `authenticated` and `service_role` all hold the DELETE grant on the
     document tables. Row-level security is the only barrier.
   - The stock ledger records the date a row is posted to, not when it was written.
3. **Nobody can say which write endpoints are permission-gated.** A write whose path has no entry
   in the prefix table is passed straight to the handler (`src/hooks.server.ts:615-626`).
   180 of 371 write endpoint files have neither an in-file capability check nor a prefix entry.
   Many are legitimately protected another way; nothing records which. Error bodies have three
   shapes, so a role refusal is sometimes shown as a generic failure
   (`specs/017-faces-pos-void-failure`).

## Goals

- G1. A counted convention violation cannot increase without CI failing and naming the rule.
- G2. One live stock entry per `(organization, source, sourceId)` is a database fact, whoever writes.
- G3. Only the owner role can delete a row in the document tables, and only the owner role can
  update or delete a stock ledger row.
- G4. Every stock ledger row written after this change records its write time. Older rows carry
  the earliest time they can have been written.
- G5. Every write endpoint is either provably permission-gated or listed with the guard found in
  it, a class, and a reason.
- G6. Every error body produced by a shared mapper has the same fields, and a disabled module
  answers the same status on every API route.

## Non-goals

- Fixing the counted debt. Counts fall as files are touched.
- Classifying the write endpoints that start as `todo`. This spec produces the list.
- Closing the void-versus-rebuild race recorded at `src/server/services/pos.service.ts:2848-2853`.
  It is a different invariant (no live movement on a void sale) and belongs to proposal slice 4.
- A shared base class for error types. Nothing in these slices consumes one.
- Replacing the hand-written "not signed in" checks. They are counted, not rewritten.
- The POS void `confirm()` → `ConfirmDialog` change. It is a UI change and needs its FigCraft
  as-is and to-be; it becomes its own small spec.
- Proposal slices 3 to 6, module and record identity, and the SUNAT issue date.

## AS-IS

| Area | Observable today | Anchor |
|---|---|---|
| Counting gates | Seven gates exist, each with its own script and baseline. None covers `confirm(`, `Modal`, raw write `fetch`, error bodies or write permissions. | `scripts/dataset-read-baseline.mjs`, `scripts/qc/content-contract.test.ts` |
| Runnable scripts | "Only scripts declared in `package.json` are runnable entrypoints." Any `package.json` edit changes a checksum pinned in `src/server/pulse/dependency-snapshot.json`. | hub `AGENTS.md:52` |
| Tick routes | 17 routes end in `/tick`; 16 are in the manifest (one of them twice, with a query string). `/api/pulse/tick` has no row in the automations manifest. No test compares routes with the manifest. | `src/lib/automations/system-automations.ts` |
| Schema | 158 `pgTable` definitions in 50 files; no test inspects a new table. Recent tables legitimately lack `updated_at` (`org_api_keys`), both timestamps (`pos_period_locks`) or a status check (`stk_corrections`). | `src/server/db/pg-*-schema.ts`, `src/server/db/pg-schema/*.ts` |
| Sourced entry guard | A select for a non-cancelled entry with the same source and sourceId, run under the stock gate, so two requests cannot both pass it. Two insert sites: `insertSourcedIssueEntry` and the sale-variant replacement through `createEntryInTx`. A unique index exists only for invoice-sourced issues. | `stock.service.ts:1901-1914`, `:837`; `pos.service.ts:1770`; `src/server/db/pg-schema/stock.ts:138` |
| Production, entries | 0 duplicate live `(org, source, sourceId)` groups. Live sourced entries: 196 booking, 46 POS. | query 2026-11-20 |
| Deletes | No application code deletes from the document tables. `app_ledger`, `anon`, `authenticated` and `service_role` hold DELETE on them. `anon`, `authenticated` and `service_role` hold UPDATE and DELETE on `stk_ledger`; `app_ledger` holds SELECT and INSERT only. | `supabase/migrations/20260707120000_pos.sql:128,139,150`; `supabase/qa/baseline/schema.sql:11664-11667`; query 2026-11-19 |
| Cascades | Foreign-key cascades run with the privileges of the referencing table's owner, so they are not affected by revoking DELETE from other roles. | Postgres rule; `20260707120000_pos.sql:71,91` |
| Stock ledger write time | `stk_ledger` has `posted_at` only. 1,647 of 2,076 production rows have `posted_at` more than a day before their entry's `created_at` (backdated imports and repairs). Two test files hold a full copy of the table definition that Drizzle inserts into; a third, reduced copy (`finance-summary.correctness.test.ts:73`) is written by raw SQL and is unaffected. | `pg-schema/stock.ts:180-198`; `job-stock-concurrency.sql.integration.test.ts:85`; `stock.sourced-issue.test.ts:100` |
| Write permission | 371 write endpoint files, 428 handlers. 84 files call `requireOrgCapability`. 180 files are covered by neither that nor a prefix entry: 39 `requireAuth`, 36 `requireAdmin`, 32 context only, 29 no named helper, 23 assistant principal, 14 feature only, 7 other. | static scan 2026-11-20 |
| Input schema | 152 write files use `parseBody`; 142 read `request.json()` directly. | same scan |
| Error bodies | Seven mappers, three conventions: `{error, code}` (POS, attachments, purchases), `{message, code}` (stock), the code alone in `message` (scheduling: `throw error(status, e.code)`), `{error: <code>}` (doors, public), `{error, field}` (sandbox). The hook answers `{error}` for 401 and 403. | `src/routes/api/{pos,attachments,stock,scheduling,sandbox}/_errors.ts`, `api/finances/purchases/_errors.ts`, `src/server/doors/http.ts:5`, `hooks.server.ts:549-560,615-626` |
| Error client | `fetchJson` reads `message`, then `error`; it does not expose `code`. `App.Error` already declares `code`. The desktop app loads the hosted site, so it gets a server change with the same deploy. | `src/lib/api/fetch-json.ts:25-41`, `src/app.d.ts:21`, `src-tauri/src/lib.rs:14,127` |
| Module disabled | The central guard covers app pages only. API routes check inline with `isModuleEnabled`: 78 call sites answer 404; 43 call sites in about 31 files answer 403 with text such as `'scheduling module disabled'`. Two of the 43 are shared helpers (`src/server/auth/scheduling-read.ts:11`, `src/routes/api/scheduling/hr/_shared.ts:11`) used by about 21 further route files, read handlers included. No client or test branches on that text. One helper already answers `error(404, 'module_disabled')` (`custom-properties-access.ts:53`). | `hooks.server.ts:440-475`, `src/server/services/modules.service.ts:29` |
| Not signed in | `if (!ctx) throw error(401…)` appears 347 times in 241 files. | `src/server/auth/core-ctx.ts:31-35` |
| Deploy | Migrations run inside the Vercel production build. Merging a hub PR that contains a migration changes the production database, and a migration that raises fails the build and blocks every deploy. | `package.json:173`, `scripts/db-migrate.ts:39` |

## TO-BE

### S0 — the rules file and the counter (H1, H1b)

- `scripts/house-rules/rules.mjs` lists the house rules that have a gate, and only those: `id`,
  one sentence, entry point, exceptions, and for counted rules a matcher. A rule without a gate
  does not go in the file. Hub `AGENTS.md` links to it.
- `scripts/house-rules/scan.mjs` exports pure functions: `scan(rules, root)` and
  `diff(current, baseline)`.
- `scripts/house-rules/baseline.json` holds counts per rule and per file.
- `scripts/house-rules/house-rules.test.ts` fails with the rule id and the file when a file's count
  rises (`raised`), when a file absent from the baseline has a count (`new`), or when a baseline
  entry is higher than the file's count (`stale`: lower the baseline in the same change).
- The baseline is refreshed through the test itself:
  `HOUSE_RULES_UPDATE=1 bunx vitest run scripts/house-rules/house-rules.test.ts`. In that mode the
  test rewrites the baseline and still fails if any number would rise or a new file would be
  added. This follows `scripts/qc/content-contract.test.ts:16` and adds no `package.json` script.
- The harness lives under `scripts/` because the existing content scans walk `src` and would read
  rule patterns as violations.

Counters in H1:

| Rule id | Counts | Matcher | Today |
|---|---|---|---|
| `native-confirm` | calls to the browser `confirm` | after stripping comments: `(^\|[^.\w$])confirm\(` or `(window\|globalThis)\.confirm\(`, not `function confirm(`; `.svelte` and `.ts` under `src` | 21 in 20 files |
| `deprecated-modal` | files importing the deprecated `Modal` | import declarations, read with the TypeScript parser, naming `Modal.svelte` or `Modal` from `$lib/components/ui` | 22 files |
| `raw-write-fetch` | `.svelte` files that send a write with raw `fetch` | `method: 'POST'\|'PUT'\|'PATCH'\|'DELETE'` within 300 characters after `fetch(` | set by the first run; about 130 |

One structural test ships in H1:

- **Tick routes are listed.** Every directory `src/routes/api/**/tick/` with a `+server.ts` has a
  row in `SYSTEM_AUTOMATIONS` whose path, ignoring any query string, equals the route path.
  `/api/pulse/tick` gets its row: `{ path: '/api/pulse/tick', key: 'pulse', cadence: 'hourly',
  wiring: 'unscheduled' }` (wiring per open question 2). The autonomous-agents page renders a
  title for every row from a hand-written map (`src/routes/(app)/agents/autonomous/+page.svelte:81-125,199`),
  so the same change adds a `pulse` entry to that map and the message keys
  `automation_pulse_title` and `automation_pulse_desc` in `messages/en.json` and `messages/es.json`.
  The page then lists one more automation. Scheduled routes that do not end in `/tick` are
  already listed by hand and are not checked.

H1b is one more structural test, separate so that it can be dropped without touching the harness:

- **New tables carry the organization.** The test imports every schema module and reads each
  table with `getTableConfig`. A table whose name is not on the frozen list of today's 158 names
  must have `org_id` as non-null text and an index or primary key whose first column is `org_id`.
  A platform-wide table is declared in an exceptions list with a reason. A frozen name that no
  longer exists fails the test. Timestamps and status checks are not part of this test: recent,
  reasonable tables differ on both.

### S1 — data safety (H2, H3, H4)

Each item is its own migration and pull request, so each can be merged or held alone.

**H2. One live entry per source.**
- A partial unique index on `stk_entries (org_id, metadata->>'source', metadata->>'sourceId')`
  for live entries where both keys are non-empty strings.
- Purpose: writers that skip the stock gate. Application requests already cannot create a
  duplicate, so application code is not changed and no error mapping is added. A violation can
  only come from a script or repair, and it surfaces as a database error there.
- The migration locks the table, raises listing any duplicate group, then creates the index
  (pattern: `20260909090200_stock_invoice_issue_identity.sql`, without its `BEGIN`/`COMMIT`: the
  runner already wraps each file in a transaction, `scripts/db-migrate-core.ts:17-23`).
- It does not overlap the invoice index: invoice issues carry `invoiceId` and no `sourceId`
  (`stock.service.ts:2173-2177`). The generic entries route strips unknown metadata keys
  (`src/routes/api/stock/entries/+server.ts:41-44`), so a user cannot set a source key by hand.
- The `TODO(handoff)` at `pos.service.ts:2848` stays. Item 1 of
  `proposals/2026-11-14-hub-till-corrections-followups.md` stays open with a note that the index
  exists and the void race remains.

**H3. Document rows are not deleted; stock ledger rows are final.**
- `REVOKE DELETE` on the three document tables from `PUBLIC`, `anon`, `authenticated`,
  `service_role` and `app_ledger`. UPDATE stays: void and in-place payment correction need it.
- `REVOKE UPDATE, DELETE` on `stk_ledger` from `PUBLIC`, `anon`, `authenticated` and
  `service_role`.
- The grants are asserted by one new `it` in
  `src/server/services/stock-corrections.sql.integration.test.ts` (model: `:284-300`). Its child
  database replays every migration after the baseline. Lane `qa-native`, config
  `vitest.qa-native-postgres.config.ts`. The file's entry in
  `scripts/qc/native-postgres-manifest.ts:1177-1194` pins the assertion count, so the same change
  sets `minimumAssertions: 14` and appends the new test's full name to `requiredBehaviors`.
- A separate test file, `scripts/house-rules/no-new-cascade.test.ts`, rejects any migration newer
  than this one that adds `on delete cascade` onto `pos_tickets`, `fin_invoices`, `stk_entries`,
  `fin_purchases` or `stk_ledger`. Existing cascades are untouched. Because it is its own file,
  H3 does not depend on H1.
- Exception, written in the migration comment and in `rules.mjs` once H1 is merged: an
  owner-requested sweep of test data runs as the owner role, snapshot first, in one transaction,
  with stock balances rebuilt. The revoke does not block it.

**H4. `stk_ledger.created_at`.**
- Add the column nullable, fill existing rows, then set `NOT NULL DEFAULT now()`, with an
  assertion in the migration that no row is null. The Drizzle model gains `createdAt`.
- Fill value: see open question 1. Either choice is a lower bound for old rows, not the true
  write time: a ledger row is written when its entry is submitted or cancelled, which is at or
  after the entry's creation.
- `job-stock-concurrency.sql.integration.test.ts:85` gains the column in its copied definition.
  `stock.sourced-issue.test.ts:100` keeps the old definition and runs the H4 migration on top of
  it, which is also how D10 is proven.

### S2 — write inventory and one error envelope (H5, H6, H7)

**H5. Write inventory.**
- `scripts/house-rules/write-inventory.ts` (TypeScript, loaded only by the test, so the `$server`
  alias resolves) walks `src/routes/api/**/+server.ts`, finds exported write methods, builds the
  URL from the directory with `[param]` replaced by `x`, and calls the real `apiWriteCapability`.
- A **method** is covered when `apiWriteCapability` returns a capability for it, or when the text
  of its exported handler contains `requireOrgCapability`. When the handler body cannot be
  isolated, the file-level text is used and the entry is marked `fileLevel: true`. All 428
  handlers are `export const`; 422 are inline functions and 6, in three files, name a function
  declared in the same file, which the scan resolves. The fallback should therefore be unused.
- `scripts/house-rules/write-inventory.json` has the shape
  `{ "todoCeiling": n, "entries": [{ "file", "methods", "guard", "class", "reason", "fileLevel"? }] }`.
  `guard` is the strongest helper found in the file, recorded as a fact: `requireAdmin`,
  `requireAuth`, `ctx-only`, `assistant-principal`, `requireFeature`, `server-token`, `none`.
- Classes:

  | Class | Decision rule |
  |---|---|
  | `public` | No session by design: login, password reset, public booking, public doors form |
  | `gateway-token` | Reads `locals.serverId` or an internal bearer token |
  | `cron-secret` | Compares a header with `CRON_SECRET` or a release secret |
  | `self` | Acts only on rows keyed by `locals.user.id` |
  | `assistant-principal` | Calls `requireAssistantCapability` or `resolveAssistantPrincipal` |
  | `disabled` | Always answers 503 or is dev-only |
  | `todo` | Everything else, including every `requireAdmin`, `requireAuth`, context-only and feature-only file |

- Initial classes for the 29 files with no named helper:

  | Class | Files (under `src/routes/api/`) |
  |---|---|
  | `gateway-token` | `gateway/email-ledger`, `gateway/pulse/proposals`, `gateway/whatsapp/member`, `internal/channels/backfill`, `internal/channels/pairing`, `internal/channels/pairing/approve`, `internal/events/handle` |
  | `cron-secret` | `releases` |
  | `public` | `auth/password-login`, `auth/forgot-password`, `auth/reset-password`, `scheduling/public/[slug]/book`, `doors/public/[slug]/click`, `doors/public/[slug]/submit`, `doors/public/[slug]/upload` |
  | `disabled` | `dev/qa-login`, `gateway/query` |
  | `self` | `email-opens`, `workspaces/select`, `users/[id]/identities/telegram/start`, `users/[id]/identities/verify-confirm`, `users/[id]/identities/verify-request` |
  | `todo` | `bugs`, `bugs/[id]`, `tenants/me`, `agent-memories/delete`, `messages/ingest`, `notifications/rules`, `notifications/rules/[id]` |

  The 23 assistant-principal files are classed `assistant-principal`. The implementer confirms
  each class by reading the file and corrects the table in the pull request if a file differs.
- The test fails when an uncovered method's file is missing from the list (`new`), when a listed
  file is now fully covered or gone (`stale`), and when the number of `todo` entries exceeds
  `todoCeiling`.
- Two counters join the baseline:

  | Rule id | Matcher | Today |
  |---|---|---|
  | `raw-request-json` | a `+server.ts` under `src/routes/api` exporting a write method, containing `request.json()` and not `parseBody(` | 142 files |
  | `hand-401` | `if \(!\w+\) throw error\(401` | 347 |

**H6. One error envelope.**
- `src/server/http/error-body.ts`: `errorBody(message, code, extra?)` returns
  `{ message, error: message, code, ...extra }`. Both `message` and `error` are present so every
  current reader keeps finding a string.
- The seven mappers build their bodies with `errorBody`. Each keeps its own status table, its own
  code vocabulary and its own way of returning (`json(...)` or `throw error(status, body)`).
  - POS, attachments, purchases, stock: `message` and `error` are the sentence, `code` the code.
  - Scheduling: today the body is `{ message: <code> }`. After: `message` and `error` are the
    error's sentence (`e.message`) and `code` is the old value. No client compares the old
    `message` to a code.
  - Sandbox: gains `message` and `code` (`'sandbox_invalid'`); `field` stays.
  - Doors (`src/server/doors/http.ts`, serving the public endpoints read by external sites and
    the authenticated `/api/crm/doors` routes): `error` stays equal to the **code**, by passing
    `{ error: code }` as `extra`; `issues` stays, also in `extra`; `message` and `code` are added.
    `DoorError` passes its code as the message, so `message` equals the code there for now.
- The hook's 401 and 403 responses use `errorBody` with codes `unauthenticated`, `no_organization`
  and `forbidden`. Their text does not change.
- Routes under `/api/gateway/` and `/api/internal/` are not changed.
- `fetchJson` exposes `code` on `ApiError` as a fifth, optional constructor parameter
  (`src/lib/api/fetch-json.ts:13-19`).
- A thrown `error(status, body)` reaches the client as that object: SvelteKit returns
  `{ message: 'Unknown Error', ...body }` for a JSON request and does not call `handleError`.
  Mapper tests assert on the thrown body.
- One other error shape exists and is left alone: `crm/contacts/tags/bulk/+server.ts:39` returns
  `error` as an object.
- Counters:

  | Rule id | Matcher | Today |
  |---|---|---|
  | `handbuilt-error-body` | under `src/routes`: `json\(\s*\{\s*error\b` in a file that does not import `errorBody` | set by the first run |
  | `kit-in-services` | files under `src/server/services` with an import declaration from `@sveltejs/kit` | 41 files |

**H7. Module disabled answers 404.**
- `requireModuleEnabled(ctx, moduleId)` in a new file `src/server/http/require-module.ts`. It
  imports `isModuleEnabled` from `modules.service` and throws
  `error(404, errorBody('Not found', 'module_disabled'))` when the module is off
  (`specs/003-agent-bridge-rbac-parity` chose 404). It is not placed in `modules.service.ts`:
  that would add a `@sveltejs/kit` import to a service (tripping `kit-in-services`), and about
  20 route tests mock that module with `isModuleEnabled` only.
- The 43 call sites that answer 403 call it. The 78 that already answer 404 are not touched.

  | Shape | Call sites | Replacement |
  |---|---|---|
  | Single check | 28 | One call |
  | Two consecutive checks (`pos/appointments/*`, 5 files) | 12 | Two calls |
  | `pos/tickets/[id]/schedule:55-56` (a 404 line, then a 403 line) | 1 | One call for the 403 line |
  | `scheduling/bookings/[id]/accrual:21` (`a \|\| b`) | 1 | Two calls |
  | Shared helpers `scheduling/hr/_shared.ts:11`, `src/server/auth/scheduling-read.ts:11` | 2 | One call each |

- Visible effect: on the affected routes `fetchJson` reports kind `unexpected` where it reported
  `forbidden`. The page guard already keeps users out of a disabled module's pages.
- Counter `inline-module-403`, baseline zero, scanning `src/routes` and `src/server`:
  `error\(403,\s*['"][^'"]*module disabled`.

### Invariants that must not change

- No stored row is rewritten, except `stk_ledger.created_at` being filled once.
- Every status code stays the same, except module-disabled 403 becoming 404 at the 43 call
  sites, which through two shared helpers covers about 50 route files, read handlers included.
- Every existing reader of `error` or `message` on an error body still finds a string there, and
  the public doors endpoints still return the code in `error`.
- What a user sees changes in two places only: scheduling errors that reached the user as a bare
  code now show the sentence, and the autonomous-agents page lists the pulse automation.
- Application stock posting behaves exactly as today.
- Integration tests and seed scripts that delete document rows as the owner role keep working.

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | A file gains a counted violation → the diff reports `raised` or `new` | Unit test: `scan` over a temporary directory with one `confirm(` file, diffed against an empty baseline |
| D2 | A count falls and the baseline is not lowered → `stale` | Unit test on `diff` |
| D3 | Committed tree equals committed baseline | Test over the real `src` |
| D4 | A `/tick` route without a manifest row → fails | Test over the route tree; `/api/pulse/tick` listed |
| D5 | A new table without `org_id` → fails | Unit test with a synthetic table; frozen list equals today's names |
| D6 | Second live entry for one source, written without the stock gate → database refuses | In `src/server/services/stock.sourced-issue.test.ts` (in-memory Postgres, ordinary unit lane): the test runs the new migration after the existing one, then a direct duplicate insert fails with a unique violation and a cancelled twin is allowed |
| D7 | App role, `anon`, `authenticated`, `service_role` delete a document row → no privilege | `has_table_privilege` assertions in `stock-corrections.sql.integration.test.ts`, lane `qa-native` |
| D8 | `anon`, `authenticated`, `service_role` update or delete a stock ledger row → no privilege | Same test |
| D9 | A later migration adds a cascade onto a listed table → fails | Unit test with a synthetic migration text |
| D10 | New stock ledger row → `created_at` set by default; no existing row null | In `stock.sourced-issue.test.ts`: seed a ledger row, run the H4 migration, assert the fill and the default; plus the assertion in the migration |
| D11 | A new uncovered write endpoint → `new` | Unit test: inventory over a temporary route tree |
| D12 | `todo` count above the ceiling → fails | Unit test |
| D13 | Each of the seven mappers and the hook → body has `message`, `error`, `code`; doors has `error === code` | Unit test per mapper; hook test |
| D14 | Disabled module on an affected route → 404 `module_disabled` | Route test for one endpoint per module; counter at zero |

## Proposed architecture

```
scripts/house-rules/
  rules.mjs                 gated rules only: id, sentence, entry point, exceptions, matcher
  scan.mjs                  pure scan + diff
  baseline.json             { ruleId: { file: n } }
  house-rules.test.ts       counters (H1), tick routes (H1)
  new-tables.test.ts        H1b, with tables-frozen.json and tables-exceptions.json
  no-new-cascade.test.ts    H3
  write-inventory.ts        H5: walk write endpoints, classify with apiWriteCapability
  write-inventory.json      H5
  write-inventory.test.ts   H5
src/server/http/error-body.ts                       H6
src/server/http/require-module.ts                   H7
supabase/migrations/        three migrations: H2, H3, H4
```

- **Matchers.** Text counters strip comments first. `walk`, `strip` and the diff logic are
  copied from `scripts/dataset-read-baseline.mjs:53-67,136-152`, which does not export them; the
  copy does not delete import statements. Import rules use the TypeScript parser, as
  `src/server/services/pos-service-boundaries.test.ts:54` does, because six `Modal` imports span
  lines. For a `.svelte` file the script block is extracted first.
- **Fixtures.** Tests that need a violating file build it in a temporary directory and pass that
  directory as `root`. Nothing is written into `src`, because other gates walk `src` in parallel.
- **Write inventory.** It imports the real `apiWriteCapability`, which already loads under vitest
  (`rbac.service.test.ts`), so the test and the hook cannot disagree. Known blind spots, each
  noted in the inventory file: handlers that re-export another route's handler, local wrappers
  such as `hrCtx`, and catch-all routes scored as one URL.
- **Why the database for S1.** A grant or an index holds whichever code path, script or future
  agent reaches the table.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Rules file under `src/lib/conventions` | The content scans that walk `src` read rule patterns as violations; nothing imports the file at runtime. |
| A `--update` command-line flag or a new `package.json` script | Hub `AGENTS.md` allows only declared scripts as entrypoints, and a `package.json` edit changes the pinned dependency checksum. An environment flag on the test needs neither. |
| ESLint or oxlint | A new toolchain for rules the existing parsers can express. |
| Listing all eleven proposal rules in `rules.mjs` | Eight of them would have no gate in these slices, which recreates the prose-only rules that decayed. |
| Template test that also requires timestamps and status checks | It would have rejected `org_api_keys`, `pos_period_locks` and `stk_corrections`, all recent and reasonable. |
| Sale-only index (`source = 'pos'`) | The application guard is source-generic and production has no duplicate for any source. |
| Mapping the unique violation to `duplicate_source` in application code | Application requests cannot reach the violation because of the stock gate. A mapping would also need a savepoint, since a failed statement aborts the transaction and two callers keep using it (`stock-accruals.service.ts:421-426`, `pos.service.ts:1285-1290`). |
| Closing the void race in H2 | It needs a different invariant and a change to posting; it is proposal slice 4. |
| A row-level security policy without delete, instead of a revoke | Policies are per role and easy to widen by accident; the client ledger already uses a revoke (`20261003130000_pos_wallet_currency.sql:422`). |
| A trigger that blocks deletes | Also blocks the owner sweep, which is a deliberate practice. |
| Leaving old stock ledger rows with no `created_at` | Possible, but every reader would then handle null forever. A stated lower bound is more useful. |
| Error bodies as `{message, code}` only | Breaks about 55 client reads of `.error` and about 115 test assertions in one step. |
| A shared `DomainError` base class | Nothing here consumes it, and re-parenting disturbs the frozen POS export inventory. |
| Extending the central module guard to API paths | The guard fails open on unmapped paths (`src/lib/modules/deguarded-routes.test.ts` pins 33 pairs); a helper is smaller and keeps the check beside the handler. |
| Rewriting the 348 hand-written 401 checks | About 290 edits in 201 files for no behaviour gain, colliding with H6 and H7 on the same lines. The counter is enough for now. |
| Classifying all 180 uncovered endpoints here | Each `requireAdmin` and context-only endpoint needs a read of its service; guessing would hide the gap the inventory exists to show. |

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| A migration reaches production on merge | One migration per pull request; each PR body opens with that statement; all stay drafts until the owner merges. |
| The H2 migration raises on a duplicate created after the scan, failing the production build and blocking deploys | The PR body carries the scan query; it is rerun immediately before merge. If it finds a row, the PR is not merged. |
| A script creates sourced entries that the new index rejects | That is the intent. `scripts/seed-stock-faces.ts` and `scripts/repair-stock-valuation.ts` are read in H2 to confirm neither writes a duplicate source key. |
| An entry type other than `issue` reuses a sale's `sourceId` | H2 checks every writer of `metadata.source`; production has none today (all sourced live entries are issues). If one is found, the index gains `type` as a key. |
| Revoking DELETE breaks a seed or repair script | The QA seed connects as `postgres` (`scripts/qa/seed/index.ts:92-101`). `scripts/sweep-hub-transactions.ts:370-372` uses the configured database URL with no role switch, which in production is the owner role (the October sweeps ran that way); the QA stack run proves the seed. |
| Revoking from `service_role` breaks a server-side Supabase client call | No Supabase-client call targets the document tables or the stock ledger (checked 2026-11-20). |
| A Drizzle insert into a copied `stk_ledger` definition fails on the new column | Both copies gain the column in H4. |
| Seed pairing blocks the migration PRs | Each carries the label `seed-unaffected` with the reason, unless it touches the baseline. |
| Source counts are dodged by renaming | Import rules use the parser; the write inventory uses the real function; text counts are per file. |
| A test asserts the old scheduling body or a 403 for a disabled module | H6 and H7 run the full unit suite; affected assertions are updated in the same change and listed in the PR body. |
| The schema modules cannot all be imported in a unit test | H1b is separate; if a module needs the environment, H1b moves to the QA-stack lane or is dropped, and H1 is unaffected. |
| `baseline.json` conflicts between pull requests | H5, H6 and H7 are serial, each rebased on the previous. |

## Delivery

Eight hub pull requests, each a draft until the owner merges.

| PR | Content | Depends on | Changes production data on merge |
|---|---|---|---|
| H1 | Harness, three counters, tick-route test and manifest row | — | No |
| H1b | New-table test | — | No |
| H2 | Live-entry unique index | — | Yes: one index |
| H3 | Revokes, grants test, no-new-cascade test | — | Yes: grants |
| H4 | `stk_ledger.created_at` | — | Yes: one column, one fill |
| H5 | Write inventory, counters `raw-request-json` and `hand-401` | H1 | No |
| H6 | Error envelope, counters `handbuilt-error-body` and `kit-in-services` | H5 | No |
| H7 | Module disabled → 404, counter `inline-module-403` | H6 | No |

Human approval at spec and at merge applies to H2, H3 and H4 (stock and sales data).

## Out of scope

- Spec Kit artifacts (plan, tasks, checklists). EGM is the review method at the owner's direction.
- Everything listed under "Non-goals".
- The stale script `scripts/repair-service-sale-stock.ts`, which references a deleted function.
  It is recorded in the open-items ledger.
- Gateway and internal route error bodies.

## Open questions for the owner

1. **Fill value for `stk_ledger.created_at`.** You asked for `posted_at`. In production 1,647 of
   2,076 rows have a posting date more than a day before their entry was created, so `posted_at`
   is known to be too early for most rows. Recommended: the later of `posted_at` and the entry's
   `created_at`. Neither is the true write time; the recommendation is the closer lower bound.
   The spec is written for the recommendation; say if you prefer plain `posted_at`.
2. **`/api/pulse/tick` wiring.** The manifest must say who calls it (netcup, Vercel, or
   unscheduled). The repository does not say; it is entered as `unscheduled` unless you know.

## Definition of done

- H1 to H7 and H1b are open as drafts with green CI, and each PR body names this spec and the
  proposal.
- D1 to D14 each have a passing test.
- Every open end has a `TODO(handoff)` in code and an item in the open-items ledger.

## Detailed implementation plan

### H1 — harness

1. `rules.mjs`: export `RULES`, each `{ id, sentence, entryPoint, exceptions, kind, match? }`.
   `kind` is `count` or `structural`. `exceptions` is an array of `{ path, reason }`. Rules in H1:
   the three counters and `tick-routes-listed`. `src/routes/book/[slug]/+page.svelte` is an
   exception to `native-confirm` (it defines a local function named `confirm`).
2. `scan.mjs`: `walk(root, exts)`, `strip(src)`, `scan(rules, root)` → `{ ruleId: { file: n } }`,
   `diff(current, baseline)` → `[{ rule, file, kind: 'raised' | 'new' | 'stale', was, now }]`.
   Skip `.test.`, `.spec.`, `src/lib/stories`, `_test` and fixture directories.
3. `house-rules.test.ts`: D1 and D2 on temporary directories; D3 on the real tree; update mode
   under `HOUSE_RULES_UPDATE=1` that writes the baseline and fails on any `raised` or `new`.
4. Tick test (D4) in the same file; add the `pulse/tick` row to `SYSTEM_AUTOMATIONS`.
5. Hub `AGENTS.md`: one paragraph linking to `scripts/house-rules/rules.mjs` and the update line.

### H1b — new-table test

1. Glob `src/server/db/pg-*-schema.ts` and `src/server/db/pg-schema/*.ts`, dynamic-import each,
   collect values that are `PgTable`.
2. `tables-frozen.json`: today's table names. `tables-exceptions.json`: `[{ name, reason }]`,
   empty at first.
3. D5 with a synthetic `pgTable` lacking `org_id`.

### H2 — live-entry index

1. Migration `<ts>_stk_entries_one_live_per_source.sql`: `lock table public.stk_entries in share
   row exclusive mode`; a `do $$` block that raises with the duplicate keys; `create unique index
   stk_entries_org_live_source_uniq on public.stk_entries (org_id, (metadata->>'source'),
   (metadata->>'sourceId')) where status in ('draft','submitted') and
   coalesce(metadata->>'source','') <> '' and coalesce(metadata->>'sourceId','') <> ''`.
2. Declare the index in `pg-schema/stock.ts` the way the invoice index is declared (`:138-143`,
   `sql` expressions plus `.where`); extend the `getTableConfig` assertion at
   `stock.sourced-issue.test.ts:361-374`.
3. D6 in the same file: read and `exec` the new migration after the existing one
   (`:64-70,123`), then insert through `addEntry` (`:80`). No manifest change is needed.
4. Read every writer of `metadata.source` (application, scripts) and record in the PR body that
   none writes a second live entry for a key.
5. PR body: the duplicate scan query and its result.

### H3 — revokes

1. Migration `<ts>_pos_documents_no_delete.sql` with the two `REVOKE` statements and a comment
   naming the owner-sweep exception.
2. D7 and D8 as one `it` in `stock-corrections.sql.integration.test.ts`, with the manifest entry
   updated as described under H3.
3. `no-new-cascade.test.ts` (D9), copying the "no later migration contains X" pattern of
   `brain-ann-storage-migration.test.ts:31-45`: for migration files with a version greater than this
   migration's, no statement both references one of the five tables and contains
   `on delete cascade`.

### H4 — stock ledger `created_at`

1. Migration `<ts>_stk_ledger_created_at.sql`: `add column created_at timestamptz`; fill rows that
   have an entry with `greatest(l.posted_at, e.created_at)`; fill rows with no entry with
   `posted_at`; assert no null; `alter column created_at set default now()`, `set not null`.
2. Drizzle model: `createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()`.
3. Copied definitions as described under H4. Model and migration ship together: the schema
   drift check (`ci.yml:713`) fails on a model column the database lacks.
4. D10.

### H5 — write inventory

1. `write-inventory.ts`: enumerate, detect methods with a copy of the export pattern at
   `scripts/dataset-read-baseline.mjs:99-100` parameterised per method (it is not exported), isolate each exported handler's text with the TypeScript parser,
   compute coverage per method, detect `guard`.
2. Generate `write-inventory.json`; apply the classes above; set `todoCeiling` to the count.
3. `write-inventory.test.ts`: D11, D12, and the real tree against the committed file.
4. Add `raw-request-json` and `hand-401` to `rules.mjs` and the baseline.

### H6 — envelope

1. `error-body.ts` with a unit test.
2. Convert the seven mappers and the hook responses as described; D13.
3. `fetchJson`: add `code` to `ApiError`.
4. Add `handbuilt-error-body` and `kit-in-services` to `rules.mjs` and the baseline.
5. Run the full unit suite; update assertions on the changed bodies and list them in the PR body.

### H7 — module 404

1. `src/server/http/require-module.ts` with a unit test.
2. Replace the 43 call sites per the shape table; update route tests that asserted 403; D14.
3. Add `inline-module-403` at zero.
