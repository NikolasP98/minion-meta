---
id: 2026-11-19-hub-opinionated-erp-standards
title: Hub ERP house rules — eleven enforced standards for documents, server paths, the database and pages
status: in-spec
created: 2026-11-19
updated: 2026-11-20
spawned_spec: 138-hub-house-rules-s0-s2
repos: [minion_hub, minion-meta]
value: 8
effort: L
source: owner-request-2026-11-19
---

# Hub ERP house rules

## Request

Owner, 2026-11-19: "make this whole app/ERP more opinionated in some ways (not all), enough to
have some rules, structure and standards that the rest of the app design, business logic design
will help fit things together nicer."

This proposal names eleven rules, says what stays free, and says how each rule is enforced. It
does not ask for a rewrite. New code follows the rules from the day a rule lands; existing code is
counted once and the count may only go down.

## Evidence base

Six read-only audits on 2026-11-19 over hub `origin/master` `89397baa` (2026-11-18) and meta
`origin/dev` `a9ca234bbf`. One audit per area: business documents, server request path, module
anatomy, page patterns, schema, and existing rules plus backlog themes.

Counts below are regex counts over non-test source. Treat them as ±5% unless marked "checked",
which means the claim was re-run by hand after the audit. Nothing was run against a database or a
browser. One review round (scope and design critics) checked the draft against the same snapshot;
its findings are folded in. Claims marked "inferred" were not reproduced.

## What already works (do not re-legislate)

The hub already has rules that held. They share three properties: one entry point, a test that
walks the filesystem, and a count that may only decrease.

| Rule | Entry point | Gate |
|---|---|---|
| Design tokens | `packages/design-tokens/contract.json` | `lint:tokens:ci`, decrease-only baseline |
| Every route is declared | `src/lib/routes/route-design-manifest.ts` | `route-design-contracts.test.ts` |
| Page reads are permission-gated | `datasetCtx` | `dataset-read.ratchet.test.ts`, empty baseline |
| Row-level security | `withOrgCore`, `_org_guc` policy template | `rls-bypass-inventory.test.ts`, coverage test |
| Document numbers | `nextSerialId` in `naming-series.ts` | none, but one implementation |
| Stock ledger has one writer | `stock.service.ts` | database grants (insert and select only) |
| Optimistic toggles | `createOptimistic` | `lint:optimistic` (controlled inputs only) |
| Thin routes over services | — | de facto: 572 of 644 route files import services |

The efforts that decayed had none of the three: the module SDK (`defineModule()` is used by one
module, stock — checked), table registration (26 of 39 `<DataTable>` files pass no `tableId`), and
calendar consolidation (no gate; the top source of post-merge findings).

**Design consequence: a rule in this proposal exists only if it ships with its entry point and its
gate. Prose-only rules are not proposed.**

## AS-IS

The same problem is solved several ways. Each row is one area where the audits found no stated
rule.

### Business documents

| Area | Current state | Known cost |
|---|---|---|
| Status | No `pgEnum` anywhere (checked). Of 35 `status` columns, 9 have a database check. Bookings, shifts, sales orders and leave declare statuses in a comment. Transitions are guarded four ways: a table (HR), a workflow engine (2 document types), inline `if`, and a "live vs final" set. | The legacy alias `'voided'` survives as about 30 literals in 12 files. `cancelled`, `canceled`, `void`, `voided` and `anulado` all occur. |
| Corrections | Four models: reversal rows (stock ledger, wallet), void plus counter-rows (ticket), edit in place (open-shift payment, booking, purchase), hard delete (draft entry, booking, purchase, statement lines). | A deleted booking or purchase leaves no record of the document. |
| Deletes at the database | `pos_payments`, `pos_ticket_lines`, `fin_payments`, `fin_invoice_items` and `stk_entry_lines` all cascade-delete with their parent (checked in `supabase/qa/baseline/schema.sql`). | One parent delete removes financial history. Contradicts the owner rule "ERP data must be resilient". |
| Effects across documents | A sale moves stock and a booking releases accruals after the transaction commits, fail-soft. Each producer hand-rolls this. Route handlers call stock posting directly: 4 route files import `submitEntry*` or `realizeAccruals*` (checked); the audit counted 8 with a wider set of function names. | FACES stock double deduction (2026-11-13); the lost-effect window (`proposals/2026-09-12-hub-booking-stock-postcommit-recovery.md`); a void racing a rebuild (`proposals/2026-11-14-hub-till-corrections-followups.md` item 1). |
| Money | Exact minor-unit arithmetic in `src/lib/money/decimal.ts` has 17 importers, 16 of them POS (checked). Stock, finance and tax emission use floating point with five local rounding functions; `Math.round(x*100)/100` appears 11 times (checked; a few are not money). 64 money columns are unbounded `numeric`; 8 of 16 money tables carry a currency. | `specs/2026-10-03-readiness-money-precision-schedules-spec.md` records the precision mismatch. |
| Business day | Helpers exist (`zonedDateKey` in `src/server/scheduling/tz.ts`, `resolveOrgTimezone` in `inbox/daily-feed.service.ts`) but are not the rule. Three sources: finance settings timezone, the first active scheduling resource, and UTC through `toISOString().slice(0,10)` (31 occurrences in 20 server files — checked). | `pos-emission-mapping.ts:121` sets the SUNAT `issueDate` this way (checked). Lima is UTC−5, so a document emitted after 19:00 local carries the next day's date. Not confirmed against production documents. |
| Period locks | POS only. Purchases use their own SUNAT period status. Stock has none. | A closed month can still receive stock movements. |
| Audit | Three sinks: an audit helper, raw inserts into the audit table (4 files), and a bookings-only status log. Stock audits after commit, best effort. | Some transitions have no audit row when the follow-up write fails. |

### Server request path

| Area | Current state | Known cost |
|---|---|---|
| Error body | Three shapes: `{error, code}` (POS), `{message, code}` (stock), code inside the message (scheduling). Seven per-module mapper files. Clients read `.error` 33 times and `.message` 19 times. | `specs/017-faces-pos-void-failure`: a 403 shown as a generic failure because the client read the wrong field. |
| What services throw | Typed domain errors (615 throws), bare `Error` (435), SvelteKit HTTP errors (41 service files — checked), `{ok:false}` results (11 files). | A bare `Error` becomes a 500. A service that throws HTTP errors cannot be reused by a job or the assistant. |
| Module disabled | Returns 404 in 79 places and 403 in 41, on top of the central guard. | `specs/003-agent-bridge-rbac-parity` already chose 404. |
| Write permission | Declared in two places: a prefix table in `rbac.service.ts` and in-file helpers. 212 write handlers carry no helper of their own; whether the prefix table covers each one was not resolved. 45 files gate with bare `requireAdmin`, which hub `AGENTS.md` forbids for business writes. | Unknown coverage is the cost. |
| Input validation | 152 write handlers use `parseBody` (zod). 122 read `request.json()` with no schema, mostly platform areas (servers, users, builder, gateway). | Untyped input at a trust boundary. |
| Request context | Four idioms; `if (!ctx) throw error(401…)` is hand-written 288 times with 5 message variants. | Noise, and five wordings of the same failure. |
| Tenant scope in services | 100 files use row-level security plus manual filters, 26 security only, 29 filters only. The bypass inventory lists 136 sites, 108 still marked `todo`. | `specs/2026-08-18-hub-updateserver-tenant-scope-spec.md`: an update with no tenant in its WHERE clause. |
| Scheduled work | About 21 tick endpoints with inline secret checks; 2 use the shared runtime. `/api/pulse/tick` is missing from the automations manifest. Idempotency keys have three names. | A new scheduled job has no obvious home. |

### Modules and records

| Area | Current state |
|---|---|
| Module identity | One module has up to three ids: `finance` (permissions) and `finances` (manifest, route); `team`, `hr` and `scheduling.resources`; `workforce` and `projects`. |
| Record identity | One record type has up to three keys. A booking is `booking` (tags, attachments), `sched_booking` (audit) and `scheduling.bookings` (tables, custom fields). |
| Registries | A new feature touches about 14 hand-kept lists. 15 files each claim to be the "single source of truth". |
| Record capabilities | Uneven. Contacts have their own tag table; other records share one. The activity timeline is mounted on sales orders, support issues and projects, but not on contacts, invoices, tickets or bookings, although audit rows are written for all four. |
| Code location | Four patterns for server code: flat `services/x-*.ts`, `services/x/`, `src/server/x/`, `src/lib/server/`. |

### Pages

| Area | Current state |
|---|---|
| Where "New" lives | Four positions: header primary action (17 files), legacy header slot (22), table "+" icon (5), empty state only (at least 1). |
| Destructive confirmation | Native `confirm()` 20 calls, including the POS void (`pos/sell/PageBody.svelte:983` — checked); shared `ConfirmDialog` 19 uses; 12 of 30 files that issue a DELETE have neither (text inference). |
| Client writes | 164 files call raw `fetch`; 43 import `fetchJson`, which maps 403 to a role message. About 15 files branch on 403 themselves. |
| Feedback after a write | 98 files invalidate and wait; 15 are optimistic. |
| Overlays | Six dialog implementations. The deprecated `Modal` is still in 23 files; 12 dialogs are hand-rolled. Only `Dialog` has the unsaved-changes guard. No written rule for page versus sheet versus dialog. |
| Forms | No shared pattern. `FormField` in 23 files; local error strings in 75; unsaved-changes guard on 2 routes. |
| Lists | Of 43 collection pages, 14 use the shared table or data view; 27 are bespoke (many are platform pages). |
| Formatting | 96 local `fmt*` functions in components beside 147 imports of the shared formatter. 17 files map status to colour locally. |

## TO-BE

Eleven rules. Each is a default with a named exception, one entry point, and one gate.

Gates use the sturdiest cheap tool the hub already has, in this order: database grants and catalog
tests for database rules (as `rls-coverage.sql.integration.test.ts` does), a TypeScript import-graph
test for "who may call what" (as `pos-service-boundaries.test.ts` does), and a per-file source count
only where neither fits. A source count is easy to dodge by renaming, so it is the last choice.

### Business documents

1. **A document declares its states once.** Each document module exports one status tuple and one
   transition map; code writes only values from the tuple. The status column carries a database
   check. New cancellations are spelled `cancelled`; reversing a money document is spelled `void`.
   - Exception: documents driven by the per-organization workflow engine (sales orders, support
     issues). Their states are data, so they get no fixed tuple and no check.
   - Legacy values: the check lists the legacy aliases still stored (for example `voided`), is
     added `NOT VALID`, and is validated only after a read-only scan. Stored rows are not rewritten.
   - Gate: a catalog test compares each tuple with its check.
2. **A posted document is never deleted.** Each document names its own "posted" point (ticket:
   submitted; stock entry: submitted; booking: once it has a charge or a stock movement). Before
   that point it may be deleted; after it, it is cancelled or voided with a reason and corrected by
   a new document.
   - Exception: provider mirrors. Invoices synced from an outside system are replaced on each sync
     (`finance.service.ts:321,342`) and are exempt by name.
   - Open: purchases have no draft state today, and any purchase in an open period can be deleted
     (`purchases.service.ts:326`). See open question 2.
   - Gate: revoke DELETE on `pos_tickets` and `pos_payments` from the app role, as is already done
     for `stk_ledger` and the audit log. The review found no code path that deletes either. A
     migration check rejects a new `on delete cascade` onto a named list of ledger tables. Existing
     cascades stay until each one has its own scan.
3. **One document owns each effect.** A stock or accrual effect is posted in the same transaction
   as the transition that causes it, through the seam POS already has (a refused stock post commits
   a draft plus a warning, so stock never fails the sale). Where the same transaction is impossible
   (a booking that releases an accrual later), the transition records the effect through the
   existing `job-effects.service.ts`. One live movement per source document, enforced by a partial
   unique index over draft and submitted entries. One name for the idempotency key.
   - This supersedes `proposals/2026-09-12-hub-booking-stock-postcommit-recovery.md` and covers
     item 1 of `proposals/2026-11-14-hub-till-corrections-followups.md`.
   - Cost to accept: every sale then waits on the organization's stock lock. Expected to be fine at
     clinic volume; not measured.
   - Gate: an import-graph test that route handlers do not import the posting functions (at least 4 do
     today). A document's own service may.
4. **Money is exact.** Money crosses a service boundary as a decimal string or minor units from
   `$lib/money/decimal`. New money columns are bounded `numeric` with a NOT NULL currency. Column
   precision (unit costs and rates need more than two decimals) is decided in the money spec.
   - Gate: an import-graph test that stock, finance and emission services use the decimal module; a
     per-file count of local rounding functions.
5. **The business day comes from one function.** The existing `zonedDateKey` and
   `resolveOrgTimezone` become the one path; server code stops deriving a calendar day from UTC.
   Period locks use it and apply to every posting path, not only POS.
   - Gate: a per-file count of UTC date slicing in `src/server`.
   - The SUNAT issue date is not changed by this rule. It changes tax documents and is handled as
     its own decision (open question 4).
6. **Every transition leaves one audit row.** Written inside the transition's transaction through
   one helper, which also emits the typed event.
   - Gate: an import-graph test that only the helper writes the audit table.

### Server request path

7. **One error envelope.** Services throw one `DomainError(code)`; only routes choose the HTTP
   status. One mapper writes the body. Each module keeps its own code vocabulary. The client helper
   turns 403 into "your role can't do this".
   - Transition: the mapper emits `{ message, error, code }` — both fields — so the desktop app's
     bundled frontend and older tabs keep working. `error` is dropped only after no client reads it
     and a minimum desktop version is set.
   - Exception: gateway and internal routes (`/api/gateway`, `/api/internal`) keep their shape; the
     gateway is a separate program.
   - Gate: an import-graph test that services do not import `@sveltejs/kit` (41 do today,
     decreasing); a per-file count of hand-built error bodies in routes.
8. **A write handler states three things.** Its context (`requireCoreCtx` or `datasetCtx`), its one
   capability, and its input schema (`parseBody`). Module availability is decided by the central
   guard only, and answers 404. Organization data is touched inside `withOrgCore`.
   - Gate: an inventory test over every write handler, mirroring the existing read test. The `todo`
     count in the existing bypass inventory (108) becomes decrease-only.
9. **New tables follow one template.** `org_id text NOT NULL` leading every index, the standard
   security policy, `created_at` and `updated_at`, a check on every status column (workflow-driven
   documents excepted), and every foreign key declared in both the migration and the Drizzle model.
   Existing tables are grandfathered by name.
   - Gate: a test over Drizzle table metadata with a frozen allow-list of old tables.

10. **The database holds the invariants a document depends on.** Rule 9 covers new tables; this
    rule closes the gaps in the existing ones. Each item below is true in application code today
    and absent from the database (checked against the migrations and the Drizzle models unless
    marked):

    | Invariant | Today | Database form |
    |---|---|---|
    | A ticket number is unique in its organization | No unique index on `pos_tickets.human_id`; stock entries have one (`stk_entries_org_human_id_uniq`). Production: 154 tickets, no duplicate, no missing number field. | Unique index on `(org_id, human_id)`; safe to add today |
    | Stock on hand is not negative unless the organization allows it | Guard in `stock.service.ts` only | Check on `stk_bins`, or a trigger that reads the policy |
    | Payments on a ticket equal its total | Application code only. Production: all 154 tickets match (19 are zero-total with no payment row); no negative, zero or orphan payment. | A reconciliation test, not a constraint: split and wallet payments make a row-level check brittle |
    | Ledger child rows outlive their parent | Five cascade deletes (rule 2) | `RESTRICT`, one table at a time |
    | A ledger row says when it was written, apart from the date it is posted to | Tickets, payments and ledger rows carry `submitted_at`, `paid_at`, `posted_at`. The stock ledger's `posted_at` can be set to a past date (`stock.service.ts:1145`), so the write time is lost there. | Add `stk_ledger.created_at`: nullable column, fill existing rows from `posted_at` (owner decision 2026-11-19), then `NOT NULL DEFAULT now()`. For rows already backdated the filled value is the posting date, not the true write time; the migration says so. The app role cannot update the ledger, so the fill runs in the migration. |
    | Money columns are bounded and carry a currency | 64 unbounded `numeric` columns; 8 of 16 money tables have a currency | Per the money spec (rule 4) |
    | The Drizzle model states the constraints the database has | Foreign keys declared on 42 of 300 `*_id` columns; 45 tables have no model. Production holds 16 backup copies (see "Production check" below) | Declare them; backup copies follow the retirement steps below |

    - Each item is preceded by a read-only scan that proves no stored row violates it. A violating
      row is reported to the owner; it is never fixed silently.
    - Constraints are added `NOT VALID` and validated after the scan.
    - Tenancy column names are not renamed. Production has `org_id` on 162 tables, `tenant_id` on
      40 and `organization_id` on 10, in both `text` and `uuid`. A rename touches every query,
      every security policy and the gateway's writes for no change a user can see. The
      grandfather list in rule 9 names them.
    - Nullable tenancy is the part worth fixing: `ai_usage` has 3,607 rows with no organization
      (of about 3,700) and `app_notifications` has 61. The spec decides whether those are
      legitimately platform-wide or unscoped by mistake.
    - Gate: the rule 9 allow-list shrinks as tables conform; a catalog test compares Drizzle with
      the database (in the style of `rls-coverage.sql.integration.test.ts`).

### Production check, 2026-11-19

Read-only queries on the production database (session port, `default_transaction_read_only = on`
confirmed before each batch). One organization has POS data.

| Check | Result |
|---|---|
| Duplicate ticket numbers | None in 154 tickets. The counter stands at 165 and the highest issued number is 165. |
| Missing ticket numbers | 11: numbers 1–7, 22–23 and 33–34. Explained: owner-requested sweeps of test sales in October 2026 (see "Open questions", resolved 2026-11-20). No application code deletes tickets. |
| Ticket status values | All 154 are `submitted`. No `void` row exists. |
| Payments versus total | 154 of 154 match. 140 payments; none negative, zero, orphaned or beyond two decimals. |
| Who may delete tickets and payments | `anon`, `authenticated` and `app_ledger` all hold the DELETE grant on both tables; row-level security is the only barrier. Rule 2 removes the grant. |
| Backup copies | 16 tables, about 6,800 rows, under 2 MB in total. No foreign key in or out, no view or function reads them, and the only code reference is `scripts/repair-stock-valuation.ts`. Row-level security is on with no policy, so the public API cannot read them. They hold client identity numbers and payment rows. |
| Not backup copies | `server_backups` and `backup_configs` are live feature tables; an earlier count of "16 backup tables" in the snapshot wrongly included `server_backups`. |

**Retiring the backup copies** (not part of any slice; each step needs the owner's approval):
1. Record for each table what repair made it and when; several have no migration and were made
   by hand.
2. Export each to a dated file kept outside the database.
3. Confirm zero reads over two weeks from `pg_stat_user_tables` (9 of the 16 show zero scans
   since statistics began, 6 show one, and the stock bridge backup shows 16).
4. Drop one table per migration, oldest first.

### Pages

11. **A page of records has one recipe.** The page audit showed inconsistency more than recorded
    incidents, so this rule starts as three counters and becomes a recipe in its own slice.
    - Create sits in the header primary action. A table "+" may repeat it, never replace it.
      Today it sits in four places.
    - The list is a registered table (26 of 39 `<DataTable>` files pass no `tableId`).
    - Dates, money and status use the shared formatters and one status badge (96 local `fmt*`
      functions and 17 local status-to-colour maps today).
    - A write shows pending or optimistic state on the control that caused it, and goes through
      `fetchJson` or `mutate()`, so a 403 reads as "your role can't do this".
    - Destructive actions use `ConfirmDialog` or an undo toast.
    - Quick create or edit opens `Dialog`; a record peek opens `Sheet`; a full record gets a page.
    - A form uses `FormField`, an explicit Save, and the unsaved-changes guard `Dialog` already has.
      Autosave is for single toggles only.
    - Exceptions: the task-shaped screens and platform pages listed under "What stays free".
    - Gate: `archetype-composition.ts` extended for create position and table registration;
      `lint:optimistic` widened from toggles to button actions; the three counters below.

The three counters start in slice 1 and fall as pages are touched:

| Counter | Today | Replace with |
|---|---|---|
| Native `confirm(` | 20 calls | `ConfirmDialog` or an undo toast |
| Deprecated `Modal` imports | 23 files | `Dialog` (quick create or edit), `Sheet` (record peek), or a page |
| Raw `fetch(` for writes in components | 164 files | `fetchJson` or `mutate()` |

The one change made now is the POS void, which moves from `confirm()` to `ConfirmDialog`.

### What stays free

| Stays per business | Why |
|---|---|
| Approval steps and states on sales orders and support issues (`workflow_defs`) | Each business approves differently. |
| Booking status labels, negative-stock policy, stock at sale versus at appointment | Clinic and retail differ; spec 120 made this a choice. |
| Overlapping bookings on one resource | Owner decision 2026-11-19: the clinic decides how to handle overlaps. |
| Tax rate, currency, numbering prefixes | Settings. |
| Custom fields and `metadata` columns | They exist to absorb what the rules do not model. |

| Stays per screen | Why |
|---|---|
| POS sell, calendar, canvas, terminal | Task-shaped; a list recipe would hurt them. |
| Platform and assistant pages (marketplace, workshop, builder, reliability) | Not ERP records; rules 1–6 and 11 do not apply. |
| Explicit-decision controls (visibility, channel transport) | Deliberately not optimistic. |

| Stays as is | Why |
|---|---|
| Table prefixes (`fin_`, `stk_`, …) | Renaming costs migrations and gains nothing. |
| Public, gateway-token and cron endpoints | Narrow authority by design. |
| Per-module error code vocabularies | Rule 7 unifies the envelope, not the codes. |

### Invariants that must not change

- No rule changes what a user sees until its own slice ships; the first slice adds only gates.
- No stored production row is rewritten by this proposal. Any tightening of an existing column
  (status check, money precision, foreign-key action, revoked grant) needs its own read-only scan
  and its own spec.
- Existing gates keep their baselines.

## DELTA

**Slice 0 — the rules file and the gate harness (S).**
`src/lib/conventions/house-rules.ts` lists each rule: id, one sentence, entry point, and its
exceptions. One test file holds the per-file counts with a committed baseline that fails when a
count rises. Hub `AGENTS.md` links to the rules file and stops restating it.
Test: adding a `confirm(` call in a route fails the test and names the counter.

**Slice 1 — data safety, small and separable (S each).**
- Rule 3, index only: the partial unique index giving one live stock movement per sale.
- Rule 2, gates only: the migration check against new cascades on ledger tables; revoke DELETE on
  tickets and payments after a scan confirms no caller.
- Rule 9: the new-table test with every current table grandfathered.
- Rule 10, one item: `stk_ledger.created_at`, filled from `posted_at`.
- A test that every tick route has a row in the automations manifest (`/api/pulse/tick` is missing).
- The three page counters, and the POS void moved to `ConfirmDialog`.

**Slice 2 — write inventory, then one envelope (M).**
Rule 8 first, because the unknown is whether 212 write handlers are covered by a permission. Then
rule 7 with the dual-field body. The 288 hand-written 401 checks are codemodded last.

**Slice 3 — document states, audit, business day (M).**
Rules 1, 5 and 6 for the core documents: ticket, stock entry, booking, invoice. Each check is
preceded by a read-only scan of stored values.

**Slice 4 — effects and money (L).**
Rule 3 beyond the index: sale and void post stock in-transaction; bookings record effects through
the job-effects service. Then rule 4, with stock valuation last.

**Slice 5 — invariants in the existing database (M to L).**
Rule 10, one invariant per migration, cheapest first: the unique ticket number, then the Drizzle declarations and the catalog test, then cascades to `RESTRICT`,
then non-negative stock. Money bounds follow the money spec in slice 4. Every migration ships with
its scan result in the pull request.

**Slice 6 — the page recipe (L).**
Rule 11. First the gates (create position and table registration in `archetype-composition.ts`,
with today's pages allow-listed), then the business collection pages in order of use: stock,
finances, CRM, scheduling lists, sales, support. Its spec carries a FigCraft as-is and to-be for
the collection page, the form and the three overlay choices, as the design governance requires.
No page in "What stays free" is touched.

Each slice gets its own spec. Slices 1, 3, 4 and 5 touch money, stock or tax data and keep human
approval at spec and at merge.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Write the rules in `AGENTS.md` only | The audits show prose-only standards decayed here (module SDK, table registry). |
| Adopt ESLint or oxlint for the hub | A new toolchain for rules the existing vitest scans, import-graph test and catalog tests can express. Revisit if the counts prove easy to dodge. |
| A transactional outbox for every effect | Heavier than needed for POS, where a same-transaction seam and idempotent posting already exist. Kept only for effects that cannot share the transaction. |
| Change the error body to `{message, code}` in one step | Breaks the desktop app's bundled frontend and the gateway's callers until they update. |
| Merge module and record ids by migrating stored values | Old ids sit in check-constrained columns and in the insert-only audit log. An alias table in code is safer; see Out of scope. |
| Include module and record identity here | It needs a decision on stored ids first; see Out of scope. |
| Leave pages as counters only | The scope review preferred this. The owner asked for the recipe; it is kept as the last slice, after the data rules. |

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| A new constraint fails on a stored row | Scan first; add `NOT VALID`; report violating rows to the owner before any fix. |
| A backup copy is dropped while something still needs it | The retirement steps: export first, prove no reader, owner approval per table. |
| The page recipe flattens screens that need to differ | The exceptions list is part of the rule and of the gate's allow-list. |
| A status check rejects a stored legacy value | The check includes legacy aliases, is added `NOT VALID`, and is validated only after a scan. |
| Revoking DELETE breaks a path the review did not find | Scan first; the review covered Drizzle deletes, not raw SQL or other database roles. |
| In-transaction stock posting slows the till | Measure sale latency on the QA stack before and after; the refusal seam keeps the sale from failing. |
| Source counts are bypassed by renaming | Prefer grants, catalog tests and the import-graph test; counts are per file, so debt cannot move unnoticed. |
| The rules become a second place to restate facts | `AGENTS.md` links to the rules file; the file holds sentences and exceptions, not copies of code. |

## Out of scope

- The gateway, the site, and Paperclip.
- **Module and record identity** (one id per module, one per record type). It needs its own
  proposal. The review's recommended shape: a declaration that carries a canonical id plus the key
  each store already uses, with no stored value rewritten.
- **The SUNAT issue date.** A separate decision; see open question 4.
- Renaming tables, routes or message keys.
- A form library. Rule 11 sets the form skeleton with existing components.
- Renaming tenancy columns.
- Dropping any backup copy inside this proposal's slices. Slice 5 only lists and exports them.
- Splitting `BookingCalendar.svelte` and `scheduling-bookings.service.ts`. They are the top source
  of post-merge findings (23 and 14) and deserve their own proposal.

## Open questions for the owner

1. Is slices 0 to 2 the right first commitment, with slices 3 to 6 approved later?
2. Rule 2 for purchases and bookings: should a mistaken one disappear (cancelled and hidden) or
   stay visible as cancelled? Purchases would need a draft state for "delete before posting".
3. Rule 5: is the organization timezone in finance settings the one source, or does it move to the
   organization record? No organization timezone column exists today.
4. SUNAT issue date: check production documents emitted after 19:00 Lima now, ahead of this
   proposal?

Answered 2026-11-19: bookings may overlap on one resource; the clinic decides how to handle
overlaps. No overlap constraint is proposed.

Resolved 2026-11-20: the eleven missing ticket numbers are the owner-requested sweeps of the
owner's own test sales in the clinic organization. Numbers 22 and 23 were removed on 2026-10-14,
number 7 on 2026-10-15, and 33 and 34 later on 2026-10-15, each in one transaction with a
snapshot of every deleted row; the sweeps also removed the matching audit rows. Numbers 1 to 6
were already gone before 2026-10-13 and their removal is not recorded. Consequence for rule 2:
removing the app role's DELETE grant does not block such a sweep, which runs on the owner
connection. The rules file names it as the one exception: owner-requested, snapshot first, one
transaction, stock balances rebuilt.

## Definition of done

- The rules file and the gate harness are on hub `master`, and CI fails when a gate is broken or a
  count rises.
- Each of the eleven rules has an entry point and a gate, or is explicitly dropped in this file with
  the reason.
- The exceptions and the "What stays free" tables are in the rules file, so a reviewer can tell a
  deliberate exception from debt.
- Hub `AGENTS.md` and the `ui-design-governance` skill point to the rules file.
- `proposals/2026-09-12-hub-booking-stock-postcommit-recovery.md` is marked merged into this one.
