---
id: 2026-08-17-hub-distinct-visit-dates-spec
title: "CRM funnel — one timezone-correct visit-date definition (invoices + completed bookings) behind the shipped Loyal floor"
stage: spec
status: review
pass: 11
next_slice: 1
created: 2026-08-17
updated: 2026-08-30
proposal: 2026-08-17-hub-distinct-visit-dates
verdict: pending
repos: [minion_hub, minion-meta]
tags: [logic, test, crm]
type: fix
---

# CRM funnel — one timezone-correct visit-date definition

**Owner surface:** `minion_hub` (branch `master`) — `src/server/services/crm-finance.service.ts`
(the party-spine invoice CTE and the `FIN_LOYAL` predicate), `src/server/services/crm-contacts.service.ts`
(the SQL `funnel_stage` CASE and the dead `distinctVisitDates` stub),
`src/routes/api/crm/contacts/[id]/funnel/analyze/+server.ts` (the dead `visits >= 2` branch),
`src/routes/(app)/crm/[contactId]/+page.server.ts` + `+page.svelte` (the contact page's divergent
finance floor), `src/server/services/scheduling-bookings.service.ts` (cache invalidation),
and the CRM finance/funnel test suites.

**Pass-3 rewrite (2026-08-29).** Passes 1–2 were written from the meta-repo without a hub
checkout and are now factually superseded: the feature they proposed to build **shipped in a
different shape** while they were in review. §1 records what was verified against hub `master`
`1b47e8ce` (fetched 2026-08-29) and what is actually still broken. The pass-2 blocker ("no
authoritative attended booking status exists, a human must decide") is **resolved by evidence**:
hub's scheduling service defines a closed status domain that includes `completed` and `no_show`.

**Pass-4 fix (2026-08-29).** An external review of pass 3 against the same pinned hub commit
(`1b47e8ce`) returned **FAIL** with four High findings, all against the S2 SQL and its consumers:
(H1) the query still only emits a row per contact that has *some* invoice, so a booking-only
repeat visitor (zero invoices, two `completed` bookings) can never reach Loyal; (H2) the booking
join started from `contact_party`, which the shared invoice CTE itself filters to
`party_id is not null` — excluding exactly the `crm_contact_id`-only, partyless shape
`createBooking` produces; (H3) the spec added scheduling as a read dependency for three cached
outputs (`contactFinanceMap`, the roster page, the dashboard) without adding a matching
invalidation path, so `setBookingStatus` (no cache bust today) leaves all three stale after a
completion or no-show; (H4) the invoice branch had no status filter, so a `void` invoice remains
visit evidence, contradicting the spec's own "evidence disappearing self-corrects" invariant. Two
Medium findings followed: (M1) the "`completed` is terminal, no time guard needed" claim has no
code behind it — `setBookingStatus` validates neither transitions nor timestamps, so a future
booking can be marked `completed`; (M2) the DELTA never gives the proposal's literal "assert the
count" DoD anywhere to land. One Low finding: (L1) three verification-block gates used
`grep ... && exit 1`, which is *inverted* — it fails the block precisely when the diff is clean.
§1, §2, §3, and Slices 1–3 below are corrected in place; the fixes are additive to what pass 3
got right (the withdrawal of the pass-2 plan, the tz defect, the dead-stub deletion) and do not
reopen any of that reasoning.

**Pass-5 fix (2026-08-29).** A second external review of pass 4, against the same pinned commit,
returned **FAIL** with one High and two Medium findings. All three were re-verified this pass
against a real `minion_hub` sparse checkout at `1b47e8ce` — so §1 is now *read*, not carried:
(R2-H1) pass 4 converged `contactFinanceMap` and the roster/dashboard SQL but left
`contactFinanceSummary` — the query the **contact detail page** actually loads — as a third,
divergent Loyal definition, with its own session-zone `issued_at::date`, its own
`party_id is not null` reachability rule, and a `return null` *before* any aggregate whenever the
contact has no invoices; (R2-M1) `fi.status <> 'void'` is not the non-void predicate, because
`fin_invoices.status` is nullable and `NULL <> 'void'` is unknown — the shipped precedent is
`is distinct from 'void'`; (R2-M2) joining bookings to *every* live contact on
`crm_contact_id = … or party_id = …` fans one party-linked booking out to every sibling contact
sharing that party, a shape hub deliberately allows.

Verifying those three surfaced a fourth defect no review had reached, introduced by pass 4's own
H1 fix: (P5-F1) re-anchoring the roster and dashboard `fin` CTE on all live contacts would have
broken every aggregate that reads `fin` **membership** as "has ≥1 invoice" — `finance_buyers`,
`booked`, `is_buyer`, the `revenue` sort key, and the `RankedContact.finance` null sentinel. The
correct combination point is one CTE lower: both queries already anchor on `crm_contacts c` and
`left join fin`, so the visit aggregate is a second left join in `base`, and `fin` is not touched
at all. §1, §2, §3 and Slices 1–2 are corrected in place.

**Pass-6 fix (2026-08-29).** A third external review of pass 5, against the same pinned hub commit,
returned **FAIL** with one High and three Medium findings, plus a Low on the §7 ship gate. All were
re-verified this pass against the same `1b47e8ce` sparse checkout — `git ls-remote` confirms hub
`master` has not moved: (H1) the review's own H1, distinct from pass 4's — invoice creation and
voiding invalidate only the `finances` tag (`bustFinanceCache`, `finance-sync.service.ts:123-140`),
but `rankContactsPageCached` (the actual `/crm/customers` cache) carries only the `crm` tag
(`crm-contacts.service.ts:443`), while `getCrmDashboardStats` right next to it already adds the
`finances` tag conditionally (`:552-555`) — a normal invoice sync or void can leave the roster
stale while the dashboard and the uncached contact-detail read update; (M1) `updateFinSettings`
(`finance.service.ts:546-588`) performs no cache invalidation at all, so a timezone change can
leave the roster/dashboard serving results bucketed in the old zone for their TTL+SWR window; (M2)
the pass-5 `booking_owner` CTE fixed the sibling-fan-out defect but still lets a directly-linked
sibling contact diverge from the canonical contact invoices attribute that party to — a booking
linked to `crm_contact_id = B` stays credited to B even when B and the canonical contact A share a
party, so an invoice on A and a booking on B never combine; (M3) `contactFinanceMap` is **not**
consumer-free as §1 claimed — `crmRevenueSummary` (`crm-finance.service.ts:152-177`) calls it and
does `buyers += 1` for every map entry unconditionally, so S2's booking-only rows (added because
H1 required a row per visitor, not per invoice) would inflate the finance-buyers rollup; (L1) the
§7 end-to-end gate's `if git diff … grep -Eq '\.svelte$'; then exit 1; fi` fails on exactly the one
`.svelte` file S1 requires. §1 gains the five rows these five findings turn on; §2 invariants 5, 7,
and 11 are sharpened; DELTA gains D13–D15 and D3/D8 are corrected in place; Slice 1 gains the
cache-tag-parity and settings-invalidation work; Slice 2's `booking_owner` CTE and `crmRevenueSummary`
are corrected; §7's gate is fixed to match S1's own exact-path assertion.

**Pass-7 fix (2026-08-29).** A fourth external review of pass 6, against the same pinned hub
commit (`git ls-remote` re-confirms `master` is still `1b47e8ce`), returned **FAIL** with one
High, one Medium and one Low. Before fixing them: **the pattern across passes 4–7 is itself the
finding.** Every round has surfaced *one more writer, or one more consumer,* that the previous
round's targeted fix did not sweep — H3/D8 (booking mutations), pass-6 H1 (invoice mutations),
pass-6 M1 (settings), pass-6 M3 (a map consumer), and now pass-7 H1 (identity mutations). Fixing
the named call site each round is what guarantees a fifth round. So this pass stops enumerating
from memory and enumerates from the tree: §1 gains a **complete writer census** of every relation
the visit SQL reads, produced at `1b47e8ce` by grepping both write forms for each relation — the
Drizzle form (`.insert(T)` / `.update(T)` / `.delete(T)` for `crmContacts`, `finClients`,
`finInvoices`, `finInvoiceItems`, `schedBookings`, `finSettings`) and the raw-SQL form (`insert into` / `update` /
`delete from` on each table name) — and invariant 7 is restated as a property of that census
rather than as a list of remembered mutations.

The three findings, each confirmed in that checkout and each **wider than reported**:
(H1) `reconcileParties` (`party.service.ts:140-267`) rewrites `crm_contacts.party_id`,
`fin_clients.party_id` **and** `sched_bookings.party_id`, and mints canonical CRM contacts, with
**no invalidation at all** — and it has *four* production call sites, not one. Two of them
(`syncSource`, `harvestContacts`) bust *before* reconciliation runs, and two
(`POST /api/crm/parties/reconcile`, the daily finance cron) never bust. The convention it is
missing already exists in its own file: `party.service.ts` post-commit-invalidates at three
*smaller* writers (`:393`, `:468`, `:557`). Fixing it at the four call sites would be the same
mistake again — so the fix goes in the writer.
(M1) `b.start_time <= now()` makes eligibility a function of the wall clock, and crossing that
boundary writes nothing, so no invalidation fires and a cached "not a visit" survives its full
TTL+SWR window. Pass 7 does not shrink a TTL to hide this: it removes the clock from the read
path by enforcing at the **write** what §2.3 already claimed — `completed` means attended.
(L1) `visitDates` is not internal. `GET /api/crm/contacts` returns ranked rows verbatim
(`routes/api/crm/contacts/+server.ts:104`), so both `finance.visitDates` and D12's sentinel change
are wire-visible. The spec now *declares* that API delta, with contract coverage, instead of
denying it.
§1, §2, §3 and Slices 1–2 are corrected in place; §6 and §7 gain the rows the API declaration and
the new invalidation paths require.

**Pass-8 fix (2026-08-29).** A fifth external review, against the same pinned hub commit (`master`
still `1b47e8ce`), returned **FAIL** with one High, one Medium, and one Low.
(H1) the writer census (§1) marked `fin_invoices` "covered" because `bustFinanceCache` runs after
`advanceJob`'s page loop and again on completion (`finance-sync.service.ts:133,140`), but
`advanceJob` commits `upsertInvoicesBatch` (`:123`) and can return immediately when its per-run
deadline is exceeded (`:136`) — a path *before* either bust, and the intended shape for any sync
long enough to need multiple ticks, not an exception. The exported `upsertInvoice` convenience
wrapper delegates to the same writer, so the gap is not specific to `advanceJob`'s call site
either. The fix follows the exact pass-7 precedent: put the bust in the writer
(`upsertInvoicesBatch`) rather than at its callers, so every committed page is covered regardless
of which caller invokes it or which path returns early (D18).
(M1) D16's two legacy-repair evidence gates were not independent: any row satisfying the first
(`status = 'completed' and start_time > now()`) necessarily satisfies the second
(`status = 'completed' and updated_at < start_time`), because the sole writer of `status`
(`setBookingStatus`) stamps `updated_at` at the moment of completion — a still-future booking can
only reach `completed` before it starts, so its `updated_at` is always earlier than its
`start_time`. Following the two gates in order as originally written could therefore rewrite that
ordinary legacy row via gate 1's automatic normalization before gate 2's STOP could ever fire on a
genuine early-completion workflow, because gate 1's own repair target always satisfies gate 2. The
fix scopes gate 2 to bookings that have already started (`start_time <= now()`), which makes the
two gates disjoint by construction — gate 2 then answers only the real workflow question (does
this business ever complete an already-elapsed appointment ahead of its own start time) —  and
replaces the automatic normalization with an operator-approved repair that is structurally
incapable of touching a row gate 2 flags.
(L1) `specs/index.json` must be regenerated against the current `origin/dev` merge tree, not just
checked in isolation on the branch tip — the binding CI gate runs `--check` on the synthesized
merge ref, and a spec this branch does not touch (`2026-08-17-hub-igv-rate-from-org-config-spec`)
had drifted upstream.
§1's census row and §2 invariant 7 gain the D18 correction; §3 gains D18 and D16 is corrected in
place; §4 Slice 1 gains the writer-level bust and Slice 2's evidence-gate instructions are
rewritten; §7 gains a budget-limited-sync test and the ship gate's D16 language is corrected.

**Pass-9 fix (2026-08-30).** The next external review found one still-current Medium defect in
pass 8's legacy repair: the operator approved only a count, while the later broad `UPDATE`
re-evaluated a moving `now()` predicate and could therefore downgrade a newly completed booking
that was never in the reviewed census. D16 now makes the evidence an immutable, checksummed set
of IDs plus pre-images; forbids every status repair when gate 2 proves early completion is a real
workflow; and permits an operator-approved repair only inside a maintenance boundary, joined to
that exact set with pre-image guards and an exact returning-row assertion. The retained artifact
is also the rollback input. A concurrency test must insert a newly matching row after capture and
prove it is untouched. No other pass-8 decision is reopened.

**Pass-10 fix (2026-08-30).** The next review found that pass 8's revised gate 2 still used
`sched_bookings.updated_at` as though it were an immutable completion timestamp, but
`reconcileParties` normally rewrites that column while changing only `party_id`
(`party.service.ts:219-223`). A zero diagnostic count therefore cannot prove early completion is
unused. D16 now requires an explicit operator policy decision **even when the diagnostic returns
zero**; without an immutable status-transition/audit timestamp, database inference cannot
authorize the new 409. The focused evidence test completes early, advances past `start_time`, runs
party reconciliation, demonstrates that the old predicate loses the evidence, and proves the
ship gate remains closed until that explicit decision is recorded. The same review found the
writer census omitted `fin_invoice_items`, whose `description` controls `has_proc`; §1 now lists
its delete-replace writer and post-commit D18 invalidation and requires both Drizzle and raw-SQL
searches for that relation in every census rerun.

The pass-10 re-review also found that the census gate treated every write to a read relation as a
visit-truth mutation. That made the gate impossible to satisfy without needless invalidation:
`crm-relationship-inference.service.ts` updates only the `_relationshipClaim` bookkeeping key in
`crm_contacts.custom_fields`, which the visit query does not read. The census and ship gate now
classify every search hit, require post-commit invalidation only for mutations that can change
visit ownership, eligibility, day bucketing, or procedure classification, and retain the two
relationship-claim lease writes as reviewed out-of-domain evidence.

**Pass-11 fix (2026-08-30).** Re-running both mandatory census search forms against the pinned
hub commit showed that pass 10 had made the acceptance rule scoped but had not applied that scope
to invariant 7's normative quantifier. It also exposed three production hits absent from the
pinned baseline: `upsertInvoicesBatch`'s `finClients` upsert, its metadata-only
`fin_invoices` source-overlay update, and DNI enrichment's display-name-only `crm_contacts`
update. The census now retains and classifies all three with their exact changed fields. Invariant
7 now requires post-commit invalidation only from in-domain mutations that can change visit
ownership, eligibility, day bucketing, or procedure classification; every out-of-domain hit must
still remain visible and justified in the census.

**Design ancestors:**
[`2026-08-13-crm-customers-server-pagination-spec`](2026-08-13-crm-customers-server-pagination-spec.md)
(`implementing` — its S2 landed: the SQL `funnel_stage` CASE and `crm-funnel-parity.sql.integration.test.ts`
exist, and this spec extends both),
[`2026-08-17-hub-reserva-keyword-config-spec`](2026-08-17-hub-reserva-keyword-config-spec.md)
(`implementing` — its S1/S2 landed as `crm-deposit-rule.ts`; the deposit-vs-procedure split this
spec builds on is already the shipped rule, so the pass-2 "which lines are deposits" question is
answered),
[`2026-08-18-hub-funnel-atomic-write-spec`](2026-08-18-hub-funnel-atomic-write-spec.md)
(`shipped` — `setFunnelStage` now locks the row `for update`; the pass-2 ⚠️A5 "this spec amplifies
an unfixed concurrency defect" no longer applies),
[`2026-07-22-personal-org-differentiation-spec`](2026-07-22-personal-org-differentiation-spec.md)
(the funnel axis and the personal-org 404 guard the analyze route already implements).

**Gate conventions:** [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md) §4b —
mandatory red-state TDD on every slice. S2 and S3 are `logic`/`test` only and edit no `.svelte`
file. **S1 does**: exactly one prop expression and one import on the contact page move the funnel
floor onto the shared definition (R2-H1). No markup, no styles, no token is added or changed, but
the slice is still tagged `ui` and still runs `lint:design` + `lint:tokens` — the design-token
contract decides that, not the size of the edit (see §5).

---

## 0. Product

From the source proposal `2026-08-17-hub-distinct-visit-dates`:

> **Problem.** crm-contacts.service.ts:952 returns 0 (STUB) while the live analyze endpoint calls
> it — Loyal auto-detection never fires for any org; only manual override reaches it.
>
> **Definition of done.** Count distinct visit dates from fin_invoices/scheduling via the party
> spine; test seeds 2+ dates and asserts count + resulting stage.
>
> **Out of scope.** Other funnel stages; UI.

**Half of that problem statement is no longer true, and the half that is true is a different
defect than the proposal thought.** Verified on hub `master` (§1):

- Loyal **does** auto-advance today, for any org with CRM + Finances enabled, through a *read-time
  finance floor*: `FIN_LOYAL` (`crm-finance.service.ts:76`) counts distinct procedure-invoice dates
  on the party spine and `>= 2` promotes the contact, via `financeFloorStage()` on the contact page
  and via the SQL `funnel_stage` CASE on the roster. Nobody types anything.
- The stub is still there (`crm-contacts.service.ts:1715`, `return 0`) and its only caller
  (`.../funnel/analyze/+server.ts:45`) still guards a **dead branch** that, if the stub were
  naively filled in, would *persist* `loyal` into `custom_fields._funnel` — the opposite of the
  shipped design, which keeps the floor read-time "so it reverts cleanly if the module is turned
  off" (`crm-funnel.ts:120-125`).

So the remaining, real user-visible defects are three, and they are what this spec fixes:

1. **The shipped count buckets dates in the wrong timezone.** `issued_at::date` casts a
   `timestamptz` in the database session zone (no session `TimeZone` is set by hub's pool — see
   §1), i.e. UTC on Supabase. A Lima clinic billing one client twice on the same evening (18:00 and
   20:00 → 23:00 and 01:00 UTC) reads as **two** distinct dates, and a single-visit client is
   promoted to Loyal. The org's own business timezone already exists and is already used for
   exactly this reason elsewhere in finance (`fin_settings.timezone`, `financeDataSpan`).
2. **Appointments are not a visit source at all.** The proposal's DoD says
   "fin_invoices/scheduling"; only invoices are counted. A clinic whose repeat visits are recorded
   as completed appointments (consultations, follow-ups, warranty touch-ups — anything not
   separately invoiced) never reaches Loyal.
3. **A dead stub with a divergent write path.** Every analyze call pays for a function that returns
   a constant, guarding a branch that would write a *permanent* stage. It is an invitation for the
   next agent to "just fill in the stub" and end up with two disagreeing Loyal definitions.

**Why the DoD is still satisfied.** After S1–S3 the number the proposal asked for exists, is
counted from `fin_invoices` **and** scheduling via the party spine, and a test seeds 2+ dates and
asserts both the count and the resulting stage — it simply lives in the shipped read-time floor
instead of a second per-contact function.

## 1. AS-IS — verified against hub `master` `1b47e8ce` (2026-08-29)

Every row below was read from the checkout, not carried from an older spec. Line numbers are from
that commit; re-anchor at implementation time (`rg`, not `sed -n`).

**Pass-5 verification.** Pass 4 could not check its own citations (the working checkout is
minion-meta only). Pass 5 can: hub `1b47e8ce` was read directly from a blobless sparse checkout
(`git clone --filter=blob:none --no-checkout … && git sparse-checkout set --no-cone '/src/*'`),
which needs no database and no credentials. Every row in both tables below was opened in that
checkout this pass. Re-anchor line numbers with `rg` at implementation time — they drift; the
facts do not. Still **unproved**, because it needs a running database and none was reachable:
that the target session's `TimeZone` is UTC (§1's last row) — the D1 defect is real either way,
but `show timezone;` is what tells you whether it is currently *firing*.

| Fact | Evidence |
|---|---|
| `loadContactFinanceMap` (and the dashboard/roster `fin` CTEs) select and `group by` **from `contact_invoice_class`** — a contact with zero classified invoice rows produces no `ContactFinance`/`fin` row at all, regardless of any other evidence | `crm-finance.service.ts:117-121`; `crm-contacts.service.ts:560-571,925-938` (pass-4 review, H1) |
| The shared invoice CTE filters `c.party_id is not null`; `ensureCrmContact` inserts a contact **without** `party_id`, and `createBooking` stores `crmContactId` but not `partyId` — a `crm_contact_id`-only booker is a normal, currently-occurring shape, not an edge case | `crm-finance.service.ts:39-44`; `scheduling-bookings.service.ts:159-184,266-300` (pass-4 review, H2) |
| `contactFinanceMap` is cached 2m + 30s SWR (CRM/finances tags); `rankContactsPageCached` (the actual customer-page path) is cached 2m + 1h SWR (CRM tag); the dashboard has a third 2m + 30s cached path. `setBookingStatus` updates the row and performs **no cache invalidation** | `crm-finance.service.ts:90-108`; `crm-contacts.service.ts:417-445,531-556`; `scheduling-bookings.service.ts:370-389` (pass-4 review, H3) — consistent with this repo's own observed pattern of tag-scoped Valkey caches with TTL+SWR on CRM roster/finance reads ([[hub-perf-investigation-2026-08-22]]) |
| `void` is a real canonical invoice status; an existing CRM journey query already excludes it deliberately. The shared invoice CTE carries no `status` column today and filters only `shadowed = false` | `finance/connector.ts:33-49`; `crm-journey.service.ts:80-86`; `crm-finance.service.ts:58-67` (pass-4 review, H4) |
| `setBookingStatus` accepts any status in the closed domain and updates it with **no transition or timestamp validation**; the public PATCH route exposes the same enum — a future booking can be marked `completed` (and later reverted) | `scheduling-bookings.service.ts:370-380`; `routes/api/scheduling/bookings/[id]/+server.ts:11-24` (pass-4 review, M1) |

| Fact | Evidence |
|---|---|
| `distinctVisitDates(_ctx, _contactId)` returns `0`, documented as a STUB | `crm-contacts.service.ts:1715` |
| Its **only** caller is the analyze route; the Loyal decision there is already **deterministic** (`const visits = await distinctVisitDates(...); if (visits >= 2) setFunnelStage(ctx, id, 'loyal', { by: 'auto' })`), and the LLM prompt explicitly forbids the model from returning `loyal` | `.../funnel/analyze/+server.ts:10,45-53,~80` (repo-wide `rg distinctVisitDates` finds nothing else) |
| A finance-derived Loyal **already ships**: `FIN_LOYAL = (count(distinct case when has_proc then issued_at::date end) >= 2)` | `crm-finance.service.ts:76` |
| The party spine it counts on: `contact_party` (`crm_contacts.party_id`, `distinct on` so duplicate contacts can't double-count) → `fin_clients.party_id` → `fin_invoices.client_id`, with `fi.shadowed = false` and the deposit/procedure split from `crm-deposit-rule.ts` | `crm-finance.service.ts:39-68` |
| `ContactFinance.loyal` feeds `financeFloorStage()` (contact page, customers page) **and** the SQL `FIN_FUNNEL_IDX` / `FUNNEL_STAGE_EXPR` used by the roster | `crm-funnel.ts:130`, `crm-contacts.service.ts:355,359` |
| SQL↔TS parity is pinned by a Postgres-backed truth table | `crm-funnel-parity.sql.integration.test.ts` |
| `setFunnelStage` is atomic (`.for('update')` inside `withOrgCore`), **advance-only** for `auto`/`agent`, and never overwrites a human pin (`prev.auto === false`); equal-or-lower stage returns `{applied:false}` with **no write** | `crm-contacts.service.ts:1727-1800` |
| Booking status domain is closed and authoritative: `SETTABLE = {accepted, pending, cancelled, rejected, completed, no_show}`; `RELEASING = {cancelled, rejected, no_show}` | `scheduling-bookings.service.ts:370-371` |
| Scheduling analytics treats `('accepted','completed')` as realized bookings and counts `no_show` / `cancelled` separately — i.e. `completed` is the only status that asserts the visit *happened* | `scheduling-analytics.service.ts:76,147-150,194` |
| `sched_bookings` carries **both** `crm_contact_id` and `party_id` (both nullable, both indexed); the shipped precedent for joining a contact to its bookings is `crm_contact_id = $id OR party_id = (select party_id …)` | `pg-scheduling-schema.ts:190,197,199,219-221`; `crm-journey.service.ts:121-129` |
| A per-org business timezone **exists**: `fin_settings.timezone`, `not null default 'America/Lima'`, commented "A calendar 'day' is local" | `pg-finance-schema.ts:249-255`; `FinSettings.timezone` at `finance.service.ts:490-504` |
| The precedent for using it: `financeDataSpan(ctx, tz)` renders `issued_at at time zone ${tz}`, and `/finances` passes `settings.timezone` | `finance.service.ts:806-815`; `routes/(app)/finances/+page.server.ts:26` |
| Hub's pool sets no session `TimeZone` ⇒ `::date` on a `timestamptz` uses the server default (UTC on Supabase). **Confirm with `show timezone;` on the target database before writing the S1 test** — it is the difference between "bug" and "accident that currently works" | `src/server/db/pg-pool.ts`, `pg-client.ts` (no timezone option) |
| The live DDL for these tables lives in **`minion_hub/supabase/migrations/`** (e.g. `20260823000500_fin_invoices_shadowed.sql`), not in minion-meta's older partial copy — passes 1–2 said the opposite | both trees compared 2026-08-29 |
| The analyze route already 404s for personal orgs | `.../analyze/+server.ts:38-40` |

**Added in pass 5** — the four rows the R2 findings and P5-F1 turn on:

| Fact | Evidence |
|---|---|
| `contactFinanceSummary` is a **third** Loyal definition, and it is the one the contact detail page renders. It has its own `count(distinct case when has_proc then issued_at::date end)` (session zone — the D1 defect, a second copy), its `cparty` CTE requires `party_id is not null`, and it `return null`s *before* the aggregate whenever the contact has no invoices | `crm-finance.service.ts:190-251`, esp. `:197` (`party_id is not null`), `:208` (`if (invoices.length === 0) return null`), `:230` (`issued_at::date`), `:247` (`loyal: proc_dates >= 2`) |
| The contact page loads it and derives the funnel floor from it — this is the R2-H1 path | `routes/(app)/crm/[contactId]/+page.server.ts:13,56-61,75`; `+page.svelte:748` = `financeFloor={financeFloorStage(data.finance)}` |
| `/crm/customers` already derives the same floor from the **shared** definition — the ranked row's `finance` decoration, built from the roster `fin` CTE — and the contact page **already loads that same ranked row** (`rankContacts(ctx, { contactId: id, limit: 1, … })` → `score`). Converging the contact page costs one prop, not a new query | `routes/(app)/crm/customers/+page.svelte:97-104`; decoration at `crm-contacts.service.ts:1090-1103`; `[contactId]/+page.server.ts:38-49,70` |
| ~~`contactFinanceMap` has no production consumer~~ — **corrected in pass 6 (M3): it does.** `crmRevenueSummary` (`crm-finance.service.ts:152-177`) calls it to power the CRM dashboard's Revenue summary widget and sums `buyers += 1` per row with no invoice guard. It is also the TS twin the parity test compares the SQL against, which is a second, independent reason it must gain the visit axis | `crm-finance.service.ts:152,164,170`; `rg -n contactFinanceMap src/` at `1b47e8ce` — pass-6 review M3 |
| `fin`'s **membership** is load-bearing and means "has ≥1 invoice": `booked = count(*) filter (where fin_invoices is not null)`, `finance_buyers = (select count(*) from fin)`, `is_buyer = (fn.first_purchase_at is not null)`, the `revenue` sort key, and the row decoration's `r.fin_invoices == null → finance: null` all read it. Both queries already anchor on `crm_contacts c` and `left join fin fn` — so the visit axis belongs in `base`, not inside `fin` (P5-F1) | `crm-contacts.service.ts:630-632,680,709-714,1005-1010,1090-1103` |
| `fin_invoices.status` is **nullable** — `status: text('status')`, no `.notNull()` — and the canonical connector contract types it `string \| null`. So `<> 'void'` is "known and not void" and silently drops every unstatused invoice; the shipped void-exclusion precedent is `is distinct from 'void'` | `pg-finance-schema.ts:44`; `finance/connector.ts:33-49`; `crm-journey.service.ts:83` |
| Several live contacts may share one `party_id`: `crm_contacts_party_idx` is a plain (non-unique) index, and `CONTACT_PARTY`'s `distinct on (c.party_id) … order by c.party_id, c.created_at asc` exists precisely to pick ONE canonical contact per party so invoices can't double-count | `pg-crm-schema.ts:60,75`; `crm-finance.service.ts:29-45` |
| A shared, **exported** cache-bust helper already exists for sibling services: `bustCrmList(tenantId)` → `invalidateTags(tags.tenantDomain(tenantId, 'crm'))`. Every visit-dependent cache carries that CRM tag (`crm-fin-map` = crm ∪ finances, `crm-page`, the dashboard entry), so one call busts all three. `setBookingStatus` already has the post-commit fail-soft pattern to copy (`releaseAccruals`) | `crm-contacts.service.ts:1253-1262,443,553`; `crm-finance.service.ts:99-106`; `scheduling-bookings.service.ts:381-388` |
| `sched_bookings` has **no** soft-delete column; `status` is `not null default 'accepted'`; `(org_id,status)`, `(crm_contact_id)` and `(party_id)` are all indexed | `pg-scheduling-schema.ts:179,187,190,197,199,209-221` |

**Added in pass 6** — the five rows the round-3 review's findings turn on:

| Fact | Evidence |
|---|---|
| `rankContactsPageCached` (the actual `/crm/customers` cache) is tagged with `crmListTags(ctx.tenantId)` only — the `crm` domain, unconditionally. `getCrmDashboardStats`, three functions below it in the same file, already does `[...crmListTags(...), ...(finance.withFinance ? tags.tenantDomain(tenantId,'finances') : [])]` — the roster is the one cache that never got the same conditional `finances` tag | `crm-contacts.service.ts:439-443` (roster) vs `:552-555` (dashboard) — pass-6 review H1 |
| Canonical invoice sync busts only the `finances` domain, never `crm`: `finance-sync.service.ts` calls `bustFinanceCache(ctx)` (→ `invalidateTags(financeCacheTags)`, tag = `finances` only) after every invoice write and after voiding; it never calls `bustCrmList` | `finance-sync.service.ts:123-140`; `finance.service.ts:24-29` — pass-6 review H1 |
| `updateFinSettings` (accepts and persists `timezone`, `currency`, `taxRate`, `fxMode`, `fxManualRate`) upserts `fin_settings` and returns — no `invalidateTags`/`bustFinanceCache`/`bustCrmList` call anywhere in the function | `finance.service.ts:546-588` (full body read) — pass-6 review M1 |
| `contactFinanceMap` is **not** consumer-free: `crmRevenueSummary` calls it and loops `for (const f of Object.values(map)) { … buyers += 1; … }` — `buyers` increments once per map row with no `f.invoices > 0` guard, so a booking-only row (S2's `{revenue:0, invoices:0, loyal:true, visitDates:2}` shape) would count as a buyer | `crm-finance.service.ts:152-177`, esp. `:164` (`contactFinanceMap` call) and `:170` (`buyers += 1`) — pass-6 review M3, corrects the pass-5 §1 claim at (old) line 191 |
| `sched_bookings.party_id` is populated by a **separate** reconciliation pass keyed on `attendee_phone` → `parties.phone9` (`party.service.ts:218-221`), independent of the linked `crm_contact_id` contact's own `party_id`. A directly-linked booking's `party_id` column can therefore differ from (or lag) the party its `crm_contact_id` contact belongs to — the M2 canonicalization must key off the **contact's** `party_id` (via `contact_target`), not the booking row's own `party_id`, when a direct link exists | `party.service.ts:218-221`; `pg-scheduling-schema.ts:199` — read while designing the pass-6 `booking_owner` fix |

**Added in pass 7 — the complete visit-truth writer census.** Passes 4–6 each patched the one mutation the
round's review named. This table is the enumeration that ends that loop: every relation the visit
SQL reads, every writer of visit-relevant fields at `1b47e8ce`, the reviewed out-of-domain hits
returned by the same searches, and whether each in-domain writer invalidates today. It was
built by grepping both write forms for each relation (`.insert(T)`/`.update(T)`/`.delete(T)` and
raw `insert into`/`update`/`delete from <table>`), not from recall. **A row is "covered" only if
an in-domain mutation's invalidation happens *after* the mutation commits** — a bust that runs
before the write is worse than none, because it re-warms the cache from the pre-mutation state.
Out-of-domain hits must be listed with the fields they change and the reason those fields cannot
change visit truth; they do not require cache invalidation.

| Relation the visit SQL reads | Every writer at `1b47e8ce` | Invalidates today? | Disposition |
|---|---|---|---|
| `fin_clients` non-visit fields | `upsertInvoicesBatch` (`finance.service.ts:199-227`) inserts `org_id`, `provider`, `provider_ref`, `name`, `doc_type`, `doc_number`, `email`, `phone`, and `metadata`; on conflict it updates only `name`, `doc_type`, `doc_number`, `email`, `phone`, and `metadata`. It neither inserts nor updates `party_id` | No independently; D18's post-commit bust covers the containing invoice-page transaction anyway | **Reviewed out of domain.** With `party_id` omitted, this upsert cannot change visit ownership or eligibility. Retain this row because the mandatory Drizzle search returns it; do not require a visit-cache bust for this mutation by itself |
| `fin_invoices` visit fields (insert/upsert, `status` incl. `void`, `shadowed`) | `upsertInvoicesBatch` (`finance.service.ts:233,358`) — callers are `finance-sync.advanceJob`'s per-page loop (`finance-sync.service.ts:123`) and the exported `upsertInvoice` convenience wrapper; `rg 'upsertInvoicesBatch\|upsertInvoice('` finds no other production caller (POS only *mentions* it in a comment, `pos.service.ts:1367`) | **No, on the path that matters most.** `advanceJob` busts after its page loop and again on finish (`:133,140`), `finances` tag only — but it commits each page's `upsertInvoicesBatch` (`:123`) and can return at its per-run deadline (`:136`) *before* either bust runs. That is the ordinary multi-tick path for a sync too large for one run, not an edge case, and `upsertInvoice` shares the same gap | **D13** gives the roster that tag; **D18** (pass-8 H1) moves the bust into the writer itself so every committed page and every caller is covered; then covered |
| `fin_invoices.metadata`, `synced_at` only | `upsertInvoicesBatch` raw source-overlay update (`finance.service.ts:149`) | No independently; D18 covers the containing invoice-page transaction | **Reviewed out of domain.** The statement changes only `metadata` and `synced_at`; the visit SQL reads neither. Retain the raw-SQL hit, but do not require invalidation for this mutation by itself |
| `fin_invoice_items.description` (decides `has_proc`) | `upsertInvoicesBatch` delete-replaces each invoice's item rows (`finance.service.ts:314-334`) | **No independently.** It commits in the same writer/transaction as the invoice page, so the caller-level bust has the same budget-deadline hole as `fin_invoices` | **D18** moves the post-commit bust into `upsertInvoicesBatch`, covering both the invoice row and its item replacement on every committed page; then covered |
| `crm_contacts.party_id`, `fin_clients.party_id`, `sched_bookings.party_id`, minted canonical `crm_contacts` | `reconcileParties` (`party.service.ts:140-267`, statements at `:196,202,207,213,220,243,255`) | **No — none at all.** Four production call sites: `finance-sync.service.ts:159` (`syncSource`, whose only bust is `advanceJob`'s, *before* it), `crm-contacts.service.ts:185` (`harvestContacts`, whose `bustCrmList` at `:173` is also *before* it **and** conditional on `created > 0`), `routes/api/crm/parties/reconcile/+server.ts:12` (manual/backfill, no bust), `routes/api/finances/sync/daily/+server.ts:132` (cron, no bust) | **D15** — pass-7 H1 |
| `crm_contacts.party_id` | `linkContactParty` / `ensurePartyForContact` (`party.service.ts:329-351`) | **No.** `rg` over the whole tree finds **no production caller** — it is an exported trap, not a live path; stating this precisely matters, because the fix is trap-closing, not an outage fix | **D15** — same writer-level fix |
| `crm_contacts` (create, patch, soft-delete, bulk soft-delete, hard delete, merge, harvest) | `crm-contacts.service.ts:124,138,149,1241,1488,1559,1623,1651,1682`; `crm-cleanup.service.ts:131,463,496,502` | **Yes** — every one is followed by `bustCrmList` (`:173,1511,1615,1642,1674,1684,1790,1839,1847,1862,1871,1959,2261`) or cleanup's local `invalidateTags(tenantDomain(…,'crm'))` (`crm-cleanup.service.ts:16`) | No change |
| `crm_contacts.custom_fields._relationshipClaim` (relationship-inference lease bookkeeping; not read by visit SQL) | Two raw `update crm_contacts` statements in `crm-relationship-inference.service.ts:420,440` | No | **Reviewed out of domain.** These writes change only `_relationshipClaim`; they cannot change contact membership, `party_id`, `deleted_at`, invoice/booking ownership, procedure classification, or timezone. Do not add visit-cache invalidation |
| `crm_contacts.display_name`, `updated_at` only | DNI enrichment raw update in `party.service.ts:516` | No | **Reviewed out of domain.** The statement changes only presentation/bookkeeping fields; the visit SQL reads neither. Retain the raw-SQL hit, but do not add visit-cache invalidation |
| `crm_contacts` insert on the booking path (`ensureCrmContact`) | `scheduling-bookings.service.ts:173`, inside `createBooking` | **No** | **D8** (already specified) |
| `sched_bookings` insert; `status` | `createBooking` (`:283`), `setBookingStatus` (`:377`) | **No** | **D8** (already specified) |
| `sched_bookings.start_time` | **Nothing.** Written once at insert (`:289`); no `.update(schedBookings)` or raw `update sched_bookings` touches it anywhere (the only raw one is `party.service.ts:220`, `party_id`). Rescheduling is cancel-then-create (`routes/api/gateway/actions/booking-reschedule/+server.ts:64`) | n/a — immutable | The fact **D16** turns on: a row crossing its own `start_time` is not a mutation, so no invalidation can be attached to it |
| `sched_bookings.status` → `completed` | `setBookingStatus` (`:373-388`) — `SETTABLE` membership is the only validation; no transition check, no timestamp check. `createBooking` can only insert `pending`/`accepted` (`:280`), so a future-`completed` row is reachable **only** through `setBookingStatus` (PATCH `bookings/[id]/+server.ts:23`, `bookings/[id]/complete/+server.ts:43`, gateway `booking-complete/+server.ts:56`) | **No** | **D8** + **D16** (write-side attended guard) |
| `fin_settings.timezone` (the day-bucket parameter) | `updateFinSettings` (`finance.service.ts:546-592`) | **No** | **D4/M1** (already specified) |
| `fin_settings.fx*` | `refreshExchangeRate` (`finance.service.ts:598-640`) | No | **Out of scope, deliberately** — fx fields are not read by the visit query; D4's bust rides on `updateFinSettings` only. Recorded here so the next reader does not mistake the omission for an oversight |
| deposit/procedure rule | `crm-settings.service` (owned by `2026-08-17-hub-reserva-keyword-config-spec`) | n/a — the rule's fingerprint is already part of the `crm-fin-map` cache key (§1, S1) | No change |

**How to re-run this census** (it is the gate against a fifth round, and it belongs in the S1 PR
body): for each of `crm_contacts`, `fin_clients`, `fin_invoices`, **`fin_invoice_items`**,
`sched_bookings`, `fin_settings`,
run `rg -n '\.(insert|update|delete)\(<drizzleTable>\)' src/` and
`rg -n '(insert into|update|delete from) <table_name>' src/`. Classify every production hit by
the fields it changes; test-fixture writes returned under `src/` are evidence setup, not production
writers, and must be separated explicitly rather than silently mixed into the production census.
Confirm every mutation that can change visit truth — row membership, `party_id`,
`deleted_at`, invoice status/shadow/item description, booking ownership/status/start time, or the
timezone parameter — is followed by a **post-commit** `bustCrmList` / `bustFinanceCache` /
`invalidateTags(tenantDomain(…,'crm'))`. List out-of-domain hits separately with their changed
fields and rationale; the pinned baseline includes the `finClients` non-party upsert, invoice
source-overlay update, two `_relationshipClaim` lease writes, CRM display-name enrichment, and
`fin_settings.fx*` refresh above.

**Consequences for the pass-2 plan, stated plainly:** its S1 ("build a new `crm-visits.ts` and a
second batched count") and S2 ("make the decision deterministic, add forward-only / manual-wins /
write-only-on-change guards") would have re-implemented four things that already exist and would
have introduced the second Loyal definition its own ⚠️A4 warned about. That plan is withdrawn; the
slices below are the residue that is genuinely missing.

## 2. TO-BE — invariants

1. **One visit-date definition, and every Loyal consumer reads it.** Exactly one SQL expression
   produces the set of a contact's distinct visit dates, spliced into the `contactFinanceMap`
   aggregate, the roster `funnel_stage` CASE, and the dashboard. No second copy, no per-contact TS
   re-derivation — and, decisively, **no consumer derives Loyal from any other query**:
   `contactFinanceSummary` loses `purchased`/`reservedOnly`/`loyal` outright, and the contact
   detail page takes its finance floor from the same ranked-row decoration `/crm/customers`
   already uses. After this spec, `rg 'loyal'` over hub's server code finds the shared builder and
   nothing else that decides it.
2. **Bucketed in the org's business timezone** (`fin_settings.timezone`, default `America/Lima`),
   never in the session zone. The zone is a bound parameter, never interpolated into SQL text.
3. **A visit is evidence, not intent — and the evidence is a stored fact, never the clock.** A
   **non-void** procedure (non-deposit) invoice with a non-null `issued_at`, or a booking whose
   status is `completed`. `pending`/`accepted`/`cancelled`/`rejected`/`no_show` bookings,
   deposit-only invoices, and `void` invoices are not visits.
   **"Non-void" is `status is distinct from 'void'`, never `status <> 'void'`** — the column is
   nullable, so the inequality form is really "status is known and not void" and would silently
   stop counting every invoice a connector ingested without a status (R2-M1).
   **`completed` means attended, and that is enforced where the status is written, not where it is
   read (M1).** `setBookingStatus` refuses — atomically, in the statement that writes it — to move
   a booking into `completed` while its `start_time` is still in the future, so the visit query
   carries **no** `now()` predicate at all. This is not a stylistic preference: `start_time` is
   written exactly once, at insert, and never updated (§1 census), so a row crossing its own start
   time is *not a mutation* and no invalidation can be hung on it. A `start_time <= now()` filter
   in the read would therefore have converted the pass-4 defect ("a future booking promotes
   prematurely") into a strictly worse one ("a booking becomes eligible and every cached
   projection that says otherwise stays valid"). Read-time truth must be a pure function of stored
   rows; that is what makes invariant 7 provable rather than probable.
4. **A contact needs no invoice to be a visitor.** Visit-date evidence from invoices and from
   bookings is aggregated independently, one row per contact each, then combined — never by
   filtering bookings through an invoice-anchored relation. A contact with zero invoices and two
   `completed` bookings is exactly as eligible as one with zero bookings and two invoices.
5. **Every live contact identity shape is reachable, and every booking has exactly one owner, and
   that owner agrees with the invoice attribution for the same party (M2).** Reachability: a
   contact with no `party_id` at all is still reachable through `crm_contact_id` (the shape
   `createBooking` normally produces). Ownership resolves in this order: (a) `crm_contact_id`
   names a live contact in the org **and** that contact has a `party_id` → canonicalize through
   `CONTACT_PARTY` (`distinct on (party_id)`) on **that contact's own `party_id`** — the same
   canonical pick the invoice bridge already attributes that party's invoices to, so a booking
   directly linked to a non-canonical sibling still lands on the contact holding that party's
   invoice history; (b) `crm_contact_id` names a live, **partyless** contact → that contact
   directly, unchanged; (c) no live `crm_contact_id` → fall back to the booking's own `party_id`
   (independently reconciled from `attendee_phone`, per §1), resolved through the same
   `CONTACT_PARTY` pick. Two contacts sharing one party therefore never inherit each other's
   *distinct* appointments, but every appointment on that party — however it was linked — reaches
   the one canonical contact, and a doubly-linked booking still counts once.
6. **Loyal stays read-time.** `visitDates >= 2` remains a *floor* derived at read time; nothing new
   is persisted into `custom_fields._funnel`. Evidence disappearing (a voided invoice, a booking
   flipped to `no_show`) self-corrects.
7. **Cache coherence is a closed property over the writer census, not a list of remembered
   mutations.** Stated so it can actually be checked: *every in-domain mutation returned by the
   census — one that can change visit ownership, eligibility, day bucketing, or procedure
   classification — invalidates every visit-dependent cache **after** its own mutation commits.*
   Every out-of-domain production hit remains classified in the census with its exact changed
   fields and exemption rationale, but does not require invalidation. The census in §1 is the
   domain of that quantifier, and re-running it (the
   `rg` recipe printed there) is how a reviewer or a future agent falsifies this invariant instead
   of trusting it. Three properties follow, and each is where a previous pass failed:
   - **Coverage.** Booking creation and every booking status mutation bust the same tags a
     comparable invoice mutation does (H3/D8); every `fin_settings` write that changes the day
     bucket busts them too (M1/D4); every **identity** write — `reconcileParties`,
     `linkContactParty` — busts them as well (pass-7 H1/D15), because the party spine is the join
     that decides *whose* visit a row is; and a budget-limited finance sync busts them after
     **every committed page**, not only at completion, because a per-run deadline return is a
     normal exit from the writer, not an exceptional one (pass-8 H1/D18).
   - **Reachability.** A cache is only invalidated by a tag it actually carries. The roster
     (`rankContactsPageCached`) carries the `finances` tag under the exact same condition the
     dashboard (`getCrmDashboardStats`) already does (pass-6 H1/D13), so an invoice sync or void
     reaches all three visit-dependent caches rather than two of three.
   - **Ordering.** The bust happens *after* the mutation commits. A bust that precedes the write
     is worse than no bust: a concurrent read can refill the entry from the pre-mutation state and
     the write then commits behind it. That is exactly the shape `syncSource` and
     `harvestContacts` have today around `reconcileParties` (§1), and fixing it inside the writer
     — rather than at each of its four call sites — is what makes the property hold for callers
     that do not exist yet.
8. **SQL and TS keep agreeing** — the parity truth table covers the new axis; the roster and the
   contact page can never show different Loyal sets.
9. **Batched, never N+1.** The count is computed for a whole page in one query, as today.
10. **No behavior change for orgs whose invoices are already ≥2 distinct *local* days** — the tz fix
    only removes contacts promoted by a UTC-midnight straddle.
11. **The visit axis is additive: nothing that means "has invoices" changes meaning.** `booked`,
    `finance_buyers`, `is_buyer`, the `revenue` sort key, `crmRevenueSummary`'s `buyers` rollup
    (M3), and the `fin` CTE's membership stay invoice-derived and byte-identical on any fixture
    without bookings. The visit aggregate is a *separate* relation left-joined alongside `fin`,
    never a re-anchoring of `fin` itself (P5-F1). Exactly one sentinel changes, deliberately: the
    `RankedContact.finance` decoration becomes `null` only when the contact has **neither** an
    invoice **nor** a visit date. Leaving it at "no invoices" would hand `financeFloorStage` a
    `null` for a booking-only contact and put both pages back in disagreement with the SQL
    `funnel_stage` that says `loyal`.
12. **The public API delta is declared, not discovered (L1).** `GET /api/crm/contacts` serializes
    ranked rows verbatim (`routes/api/crm/contacts/+server.ts:104`), so the row decoration **is**
    the wire contract. Two things change on it, and both are stated here, specified in D17, and
    covered by a contract test: `contacts[].finance` gains an additive numeric `visitDates`, and
    `contacts[].finance` becomes non-null for a contact that has visit evidence but no invoice.
    Nothing is removed and no field changes type, so the change is additive for tolerant readers —
    but "additive" is a claim about *consumers*, so the slice that makes it enumerates them (hub's
    own `/crm/customers` page and `export.csv`, plus the gateway CRM tools §6 flags) instead of
    asserting it.

## 3. DELTA — transitions and the tests that prove them

| # | Transition | Slice | Proof |
|---|---|---|---|
| D1 | `issued_at::date` → `(issued_at at time zone $tz)::date`, `$tz` from `fin_settings` | S1 | Postgres test: two invoices at 18:00 and 20:00 Lima on one day ⇒ `loyal=false`; 18:00 Lima on two different days ⇒ `loyal=true` |
| D2 | The loyal predicate stops being invoice-only: distinct dates over (procedure invoices that are non-void **by `status is distinct from 'void'`** ∪ `completed` bookings, with attendance enforced at the write per D16 rather than by a `now()` filter in the read), deduped across sources, aggregated as an **independent** per-contact relation that is left-joined onto the contact spine — never by filtering bookings through `contact_invoice_class`, and never by re-anchoring `fin` | S2 | Tests: invoice day A + completed booking day B ⇒ loyal; invoice and booking on the same local day ⇒ 1 date, not loyal; `no_show`/`cancelled`/`accepted` bookings ⇒ not counted (a *future-dated* `completed` booking is unreachable by construction — D16); **zero invoices + two completed bookings ⇒ loyal, and revenue fields stay `0`/unset, not thrown**; a procedure invoice with `status IS NULL` still counts (R2-M1) |
| D3 | Each booking gets **exactly one** owner, and that owner agrees with invoice attribution for the same party (M2): `crm_contact_id` **canonicalized through `CONTACT_PARTY` on that contact's own `party_id`** when it names a live, party-linked contact in the org; the live contact itself, unchanged, when it is partyless; otherwise the booking's own `party_id` resolved through the same canonical `CONTACT_PARTY` pick. Partyless contacts stay reachable; a booking directly linked to a non-canonical sibling still lands on the party's canonical contact — the same one the invoice bridge attributes that party's invoices to | S2 | Tests over all three link shapes, **including a `party_id IS NULL` contact whose only link is `crm_contact_id`**; a doubly-linked booking ⇒ counted once, for the canonical contact only; **two live contacts A (canonical) and B share one party ⇒ a direct-link booking on B and a party-only booking both credit A, the same contact an invoice on that party is attributed to — one invoice-day on A plus one booking-day directly linked to B combine into 2 dates on A and reach loyal (M2, extends R2-M2)** |
| D4 | The finance-map cache key gains the timezone (and the visit-source shape) (S1); `updateFinSettings` invalidates every visit-dependent cache — `crm-fin-map`, the roster, and the dashboard — after any settings write, so a timezone change cannot serve a stale Loyal set past that one write (M1, extends D4) | S1 | Unit test on the key builder; integration test warming all three caches, calling `updateFinSettings({timezone: …})`, and asserting the very next read of each reflects the new zone without a TTL wait |
| D5 | Roster SQL and TS derivations still agree, now including the visit axis | S1, S2 | `crm-funnel-parity.sql.integration.test.ts` extended with 0/1/2 visit dates × source mix |
| D6 | `distinctVisitDates` and the analyze route's `visits >= 2` write branch are deleted; the route documents the floor as the Loyal source | S3 | `rg distinctVisitDates src/` is empty; route test: a model answering `loyal` still cannot set it, and no `_funnel` write happens on the Loyal path |
| D7 | Re-stubbing a visit/loyal signal to a constant fails a test | S3 | Anti-recurrence guard test |
| D8 | `createBooking` and every `setBookingStatus` transition bust the same cache tags a comparable invoice mutation busts (`contactFinanceMap`, `rankContactsPageCached`, the dashboard cache) — scheduling evidence is never staler than invoice evidence | S2 | Test: warm all three caches, transition `accepted → completed → no_show`, assert the very next read reflects each transition (no TTL wait) |
| D9 | `ContactFinance` (the service type behind `contactFinanceMap`) exposes a numeric `visitDates` alongside `loyal`, so tests can assert the literal count the source DoD asked for. **This type is internal; the same field on `RankedContact.finance` (D12) is not — see D17** | S2 | Tests assert exact `visitDates` of 0, 1, and 2 across the source-mix cases in D2, separately from the `>= 2` threshold check |
| D10 | The contact detail page stops carrying its own Loyal: `contactFinanceSummary` loses `purchased`/`reservedOnly`/`loyal` and the `proc_dates`/`has_deposit` aggregate that computed them; `+page.server.ts` derives `financeFloor` from the ranked row it **already loads** (`score.finance`), keeping the personal-org `null`; `+page.svelte` passes `data.financeFloor`. The financials card's visibility keeps keying on `data.finance`, so no card appears or disappears (R2-H1) | S1 | Contact-detail tests: the Lima-midnight pair ⇒ not loyal on the contact page *and* the roster; a zero-invoice/two-completed-bookings contact ⇒ loyal on both (after S2); `rg -n 'loyal' ` inside `contactFinanceSummary` is empty; a snapshot/DOM assertion that the financials card still renders exactly when the contact has ≥1 invoice |
| D11 | `fin`'s membership stays invoice-derived — the visit aggregate is a second CTE left-joined in `base` next to `fin`, and `fin_loyal` moves out of the `fin` aggregate into `base` (P5-F1) | S2 | Golden test: `booked`, `finance_buyers`, `finance_customers`, `is_buyer` and an `order by revenue` page are unchanged on a fixture that adds only bookings; `fin_loyal` still `false` for every contact when the finance bridge is off |
| D12 | The `RankedContact.finance` decoration is `null` only when the contact has neither an invoice nor a visit date | S2 | Unit test on the mapping over all four (has-invoice × has-visit) combinations; the booking-only row yields `{revenue: 0, invoices: 0, loyal: true, visitDates: 2}` |
| D13 | `rankContactsPageCached` gains the same conditional `finances` tag `getCrmDashboardStats` already carries (`...(finance.withFinance ? tags.tenantDomain(tenantId,'finances') : [])`), so a canonical invoice mutation (`bustFinanceCache` — invoice creation, sync, void) invalidates the roster exactly the way it already invalidates the dashboard (H1) | S1 | Test: warm the roster page for a contact, create a second procedure invoice through the production `finance-sync` invalidation path (not a test-only bust call), assert the very next roster read shows the changed Loyal set with no TTL wait; repeat for voiding an invoice |
| D14 | `crmRevenueSummary`'s `buyers` rollup increments only when a `contactFinanceMap` row has `invoices > 0`, so a booking-only contact (S2's zero-invoice, two-completed-booking shape) is not counted as a finance buyer (M3) | S2 | Regression test: a fixture with one booking-only loyal contact and zero invoice-having contacts asserts `crmRevenueSummary().buyers === 0` |
| D15 | The **identity** writers join the invalidation contract, at the writer rather than at their call sites: `reconcileParties` and `linkContactParty` each `await bustCrmList(ctx.tenantId)` **and** `await bustFinanceCache(ctx)` immediately after their `withOrgCore` transaction returns. This closes all four `reconcileParties` call sites at once — including the two whose existing bust runs *before* it (`syncSource`, `harvestContacts`) and the two that never bust (`POST /api/crm/parties/reconcile`, the daily finance cron) — and any caller added later (pass-7 H1) | S1 | Integration test: warm `crm-fin-map`, the roster page and the dashboard against the *pre*-reconciliation spine, run `reconcileParties`, and assert the very next read of each uses the new owner/visit set with no TTL wait. A second test drives the race explicitly: refill the three caches from inside the reconcile transaction (before it commits) and assert the post-commit bust still removes those entries. A third asserts the call-site fix is *not* what makes it pass — call `POST /api/crm/parties/reconcile` (which has no bust of its own) and assert the same coherence |
| D16 | After an **explicit operator policy decision that early completion must be rejected** (required regardless of diagnostic counts), `setBookingStatus` refuses to move a booking into `completed` while `start_time > now()`, enforced in the same UPDATE (`… where id = $id and org_id = $org and start_time <= now()` for that status, zero rows affected ⇒ throw `BookingNotStartedError`), surfaced as HTTP 409 by the PATCH route, `/complete`, and the gateway `booking-complete` action. With that guard, the visit predicate is `b.status = 'completed'` with **no** `now()` term, so eligibility changes only through a mutation that busts caches (M1). `createBooking` cannot produce the state (it inserts only `pending`/`accepted`, `:280`) and `start_time` is never updated (§1), so the guarded set is closed | S2 | Record the operator decision and its scope. Postgres tests on both sides of the boundary **with warmed caches**: (a) a booking starting in 1 h cannot be completed — 409, status unchanged, and the three caches are untouched; (b) a booking that started 1 h ago completes, and the very next read of all three shows the new visit date with no TTL wait; (c) an already-`completed` past booking is idempotent. Regression evidence also completes early, reconciles parties after `start_time`, proves `updated_at` no longer reveals the early transition, and proves a zero diagnostic cannot open the policy gate |
| D17 | The `/api/crm/contacts` response contract is declared additive and covered: `contacts[].finance.visitDates` is a documented public numeric field, and `contacts[].finance` is documented as non-null whenever the contact has an invoice **or** a visit date (L1). `export.csv` gains no column (its `valueOf` switch is closed — §6) | S2 | Contract test in `routes/api/crm/contacts/contacts.test.ts` asserting the exact serialized `finance` object for an invoice-only, a booking-only and a neither row — the existing strict `expect(body.contacts[0].finance).toEqual(…)` assertion at `:177` is extended, not relaxed; plus `rg` over hub for every reader of `RankedContact['finance']` recorded in the PR body |
| D18 | `upsertInvoicesBatch` (`finance.service.ts:233,358`) — the writer, not its callers — does `await bustFinanceCache(ctx)` itself, immediately after its own batch commits. Every committed page is covered whether the run continues, hits its per-run deadline and returns (`finance-sync.service.ts:136`), or the exported `upsertInvoice` convenience wrapper is the caller instead of `advanceJob`. `advanceJob`'s existing pre-loop/post-loop busts become redundant-but-harmless (idempotent) on a normal full pass and stay for the shadow/void paths outside the page loop (pass-8 H1) | S1 | Test: warm `crm-fin-map`, the roster and the dashboard for a contact, run a sync configured with a per-run deadline that expires immediately after exactly one page commits, and assert the very next read of all three reflects that page's invoice(s) without waiting for job completion or a TTL |

---

## 4. Slices

### Slice 1 — Bucket visit dates in the org's business timezone, and collapse the third definition

**Topics:** `crm`, `logic`, `test`, `ui` · **Tags:** `logic`, `test`, `ui` · **Estimate:** 6–8 h

**Goal:** the already-shipped Loyal count stops depending on the database session zone — **in the
one place it is computed**. Today it is computed in three (`FIN_LOYAL` for the map, `FIN_LOYAL`
again for the roster/dashboard, and `contactFinanceSummary`'s own `proc_dates` for the contact
page), and fixing two of three leaves the contact page still promoting a single Lima evening to
Loyal while the roster no longer does — a visible disagreement between two screens showing the
same contact. So this slice does the timezone fix *and* deletes the third definition. No new visit
source yet; that is S2.

**Do:**
- In `crm-finance.service.ts`, add `visitDateSql(col: SQL, tz: string)` rendering
  `(${col} at time zone ${tz})::date`, with `tz` **bound as a parameter** (the `financeDataSpan`
  precedent), and convert `FIN_LOYAL` from a module-level constant into a call-time builder
  `finLoyalSql(tz)` — the same shape `contactInvoiceClassSql(rule)` already uses, and for the same
  reason: a per-org input cannot be frozen at module load.
- Resolve the zone once per public call with `getFinSettings(ctx).timezone` at **all three**
  `FIN_LOYAL` splice sites: `loadContactFinanceMap`, the roster `fin` CTE
  (`crm-contacts.service.ts:936`) and the dashboard `fin` CTE (`:569`). Resolve it beside
  `resolveDepositRule` in `resolveFinanceBridge`, outside the ranking transaction — the RLS pool
  defaults to one connection, and reading settings from inside the transaction self-deadlocks
  (the comment at `crm-contacts.service.ts:449-461` documents that trap). One resolution per
  request, never per row.
- Add the resolved zone to the `crm-fin-map` cache key next to the deposit-rule fingerprint (D4).
  A settings change must not serve a stale Loyal set from the 2m/30s cache.
- **Give the roster cache the same finances tag the dashboard already has (D13, H1).**
  `rankContactsPageCached` (`crm-contacts.service.ts:439-443`) tags its cache entry with
  `crmListTags(ctx.tenantId)` only. `getCrmDashboardStats`, in the same file, already does
  `tags: [...crmListTags(ctx.tenantId), ...(finance.withFinance ? tags.tenantDomain(ctx.tenantId,
  'finances') : [])]`. Copy that exact conditional onto the roster's `tags` array. Without it, a
  canonical invoice mutation — `bustFinanceCache` from `finance-sync.service.ts`, called on every
  invoice create/sync and every void — busts `finances` but never `crm`, so the roster can keep
  serving a pre-sync Loyal set for its full 2m+1h TTL+SWR window while the dashboard and the
  (uncached) contact-detail read already show the new one.
- **Invalidate every visit-dependent cache from `updateFinSettings` (D4/M1).** Today it upserts
  `fin_settings` and returns with no invalidation call at all
  (`finance.service.ts:546-588`) — a `timezone` change can be served stale by any of the three
  caches for its TTL+SWR window. Add one `await bustFinanceCache(ctx)` after the upsert commits.
  This is sufficient for all three, not just `crm-fin-map`: `crm-fin-map` already carries the
  `finances` tag unconditionally (§1), and the previous bullet gives the roster and the dashboard
  that same tag whenever `finance.withFinance` is true — which it is whenever `fin_settings`
  exists to be updated. Bust unconditionally on any settings patch (not only when `timezone`
  changes) — the same "cheap over-invalidation beats fragile change-detection" reasoning S2 uses
  for booking status transitions (D8).
- **Invalidate from the identity writers, in the writers (D15, pass-7 H1).** `reconcileParties`
  (`party.service.ts:140-267`) rewrites `crm_contacts.party_id`, `fin_clients.party_id` and
  `sched_bookings.party_id` and mints canonical CRM contacts — the exact joins the Loyal count
  attributes visits through — and invalidates nothing. Add, immediately **after** its `withOrgCore`
  transaction returns (not inside it — the entries must be removed after the new spine is
  committed, or a concurrent read refills them from the old one):
  ```ts
  await bustCrmList(ctx.tenantId);
  await bustFinanceCache(ctx);
  ```
  and the same two lines after `linkContactParty`'s transaction. Notes the implementer needs:
  - **Put it in the writer, not at the call sites.** There are four production callers
    (`finance-sync.service.ts:159`, `crm-contacts.service.ts:185`,
    `routes/api/crm/parties/reconcile/+server.ts:12`, `routes/api/finances/sync/daily/+server.ts:132`);
    two of them already bust *before* reconciliation, which is worse than not busting. One fix in
    the writer corrects all four and every caller added later. Do **not** reorder `syncSource`'s
    existing `bustFinanceCache` — leave it; the writer's own post-commit bust is what makes the
    ordering correct, and a second bust is idempotent.
  - `bustCrmList` alone would technically cover the three visit projections (all three carry the
    `crm` tag). `bustFinanceCache` is added because reconciliation also re-points
    `fin_clients.party_id`, which finance-tagged rollups read; this is deliberate
    over-invalidation on a path that already runs a whole-org set-based pass, not a hot request.
  - `party.service.ts` already uses exactly this post-commit shape at three smaller writers
    (`:393`, `:468`, `:557`) — match it; import `bustCrmList` from `crm-contacts.service` and
    `bustFinanceCache` from `finance.service`, and check for an import cycle at implementation
    time (if one exists, call `invalidateTags([...tags.tenantDomain(ctx.tenantId,'crm')])` and the
    finance equivalent directly, which is what those three sibling writers already do).
  - `linkContactParty`/`ensurePartyForContact` have **no production caller** today (`rg` over the
    whole tree). Fixing them is trap-closing for the next caller, not an outage fix — say so in
    the PR body rather than overselling it.
- **Invalidate from inside the invoice writer, not from its callers (D18, pass-8 H1).**
  `upsertInvoicesBatch` (`finance.service.ts:233,358`) commits a page of `fin_invoices` rows and
  returns; today only its callers bust caches, and `advanceJob`'s per-page loop
  (`finance-sync.service.ts:123-140`) can hit its per-run deadline and return right after a page
  commits, *before* either of its own bust calls runs. Add `await bustFinanceCache(ctx)` at the
  end of `upsertInvoicesBatch` itself, after its transaction/batch commits, mirroring D15's
  writer-level fix for `reconcileParties`:
  - This covers `advanceJob`'s deadline-return path structurally — the bust fires per page,
    inside the function that commits the page, so no caller can return around it.
  - It also covers the exported `upsertInvoice` singular wrapper, which delegates to the same
    writer and shares the same gap today.
  - `advanceJob`'s existing pre-loop and post-loop `bustFinanceCache` calls stay; they become a
    harmless extra invalidation on a normal full run (idempotent), and the post-loop one still
    covers the non-page-loop paths (shadowing, voiding) that call `bustFinanceCache` directly.
- Update the `FIN_LOYAL` / `ContactFinance.loyal` doc comments to say which zone the day boundary
  is in.
- **Collapse the contact page onto the shared definition (D10, R2-H1).** `contactFinanceSummary`
  is a third Loyal definition — same defect, separate copy, and the one the contact page renders:
  - Delete `purchased`, `reservedOnly` and `loyal` from its return value, and delete the
    `bool_or(has_deposit)` / `count(distinct … issued_at::date) as proc_dates` columns that
    computed them. What remains is what the financials card actually reads: `revenue`,
    `invoices`, `lastPurchaseAt`, `recentInvoices`. Leave its `if (invoices.length === 0) return
    null` **exactly as-is** — it gates whether the financials and "similar wins" cards render at
    all (`+page.svelte:442-443,799,839`), and changing it would add cards to contacts that never
    had them. Card visibility stays an invoice question; the funnel floor stops being one.
  - In `+page.server.ts`, derive `financeFloor` from the ranked row the load **already fetches**
    (`ranked[0]`, i.e. `score`) — `isPersonal ? null : financeFloorStage(score?.finance ?? null)`
    — and return it in the page data. Keeping the ternary server-side preserves today's rule that
    personal orgs get no finance floor; `score.finance` is decorated from the roster `fin` CTE, so
    this is the same object `/crm/customers` already passes to `financeFloorStage`. No new query,
    no new round trip.
  - In `+page.svelte`, `financeFloor={data.financeFloor}`, and drop the now-unused
    `financeFloorStage` import. That is the whole `.svelte` diff: one attribute expression and one
    import line — no markup, no styles, no tokens.
  - `rg -n 'financeFloorStage' src/` afterwards must show `crm-funnel.ts`, its test, the parity
    test, and `crm/customers/+page.svelte` — and no longer `crm/[contactId]/+page.svelte`.

**Files:** `crm-finance.service.ts` (incl. `updateFinSettings`'s `bustFinanceCache` call),
`party.service.ts` (post-commit busts in `reconcileParties` + `linkContactParty`),
`party.service.test.ts` (or the equivalent suite, for the D15 assertions),
`crm-contacts.service.ts` (call site and `rankContactsPageCached`'s `tags` array),
`src/routes/(app)/crm/[contactId]/+page.server.ts`, `src/routes/(app)/crm/[contactId]/+page.svelte`,
`crm-finance.service.test.ts`, `crm-funnel-parity.sql.integration.test.ts`, and the contact-detail
load test (`+page.server.test.ts` or the equivalent route suite).

**Verification criteria (automated):**
```bash
bun run vitest run src/server/services/crm-finance src/server/services/crm-funnel
#   red-state first
#   - TZ: 2 procedure invoices at 18:00 and 20:00 America/Lima on ONE local day (23:00Z and
#     01:00Z the next day) → loyal = false   ← the whole point; fails before the change
#   - 2 procedure invoices on two different local days → loyal = true (unchanged)
#   - an org whose fin_settings.timezone is 'UTC' behaves exactly as today (no silent shift)
#   - CACHE KEY: two different timezones produce different keys
#   - CONTACT PAGE: the same Lima-evening pair yields financeFloor = 'customer' (NOT 'loyal') on
#     /crm/[contactId], matching /crm/customers for that contact; and the loaded ranked row is the
#     SOURCE (stub contactFinanceSummary to return a loyal-looking shape and assert the page floor
#     does NOT move — that is what proves the divergent path is gone, not the value itself)
#   - PERSONAL ORG: activeOrgKind 'personal' still yields financeFloor = null
#   - CARDS: the financials / similar-wins cards still render exactly when the contact has >=1
#     invoice (contactFinanceSummary's null contract is unchanged)
#   - CACHE PARITY (D13/H1): warm the roster (rankContactsPageCached) for an org with a Loyal-
#     bordering contact; call the PRODUCTION invoice-mutation path (finance-sync's own
#     bustFinanceCache after invoice create, then again after voiding it) — not a test-only
#     invalidateTags call; assert the very next roster read reflects each change with no TTL wait
#   - SETTINGS INVALIDATION (D4/M1): warm crm-fin-map, the roster, and the dashboard for a Lima-
#     seeded org; call updateFinSettings({ timezone: 'UTC' }); assert the very next read of all
#     three reflects the new zone's day bucketing with no TTL wait
#   - IDENTITY INVALIDATION (D15/pass-7 H1): warm all three caches against the PRE-reconciliation
#     spine (a fin_client and a crm_contact that are not yet on the same party); call
#     reconcileParties; assert the very next read of each uses the new owner set, no TTL wait
#   - IDENTITY RACE (D15): refill the three caches from INSIDE the reconcile transaction (before
#     commit), then let it commit; assert the post-commit bust removed those entries. This is the
#     case the current syncSource/harvestContacts bust-before-reconcile ordering cannot pass
#   - IDENTITY, NO CALL-SITE HELP (D15): drive POST /api/crm/parties/reconcile — a caller with no
#     bust of its own — and assert the same coherence. This is what proves the fix lives in the
#     writer; a call-site patch would leave this red
bun run vitest run && bun run check
bun run lint:design && bun run lint:tokens   # S1 touches one .svelte prop expression (§5)
if git diff --name-only origin/master...HEAD | grep -Eq 'supabase/migrations|db/schema'; then exit 1; fi
# the ONLY .svelte in the S1 diff is the contact page (explicit compare, so a clean grep
# cannot fail the block the way a bare `grep`/`&& exit 1` would — L1):
svelte_changed=$(git diff --name-only origin/master...HEAD | grep -E '\.svelte$' || true)
[ "$svelte_changed" = 'src/routes/(app)/crm/[contactId]/+page.svelte' ] || exit 1
```

### Slice 2 — Completed appointments become the second visit source

**Topics:** `crm`, `logic`, `test`, `edge-case` · **Tags:** `logic`, `test` · **Estimate:** 6–8 h

**Goal:** the proposal's "fin_invoices/scheduling" becomes true, inside the single definition S1
just made timezone-correct — including for contacts that have **no invoice at all**, and without
leaving any cached surface holding stale scheduling evidence.

**Do:**
- Carry `fi.status` through `contactInvoiceClassSql` — add it to the select list and to the
  `group by`. This is group-safe: `fi.id` is already a grouping key, so `fi.status` is functionally
  dependent on it and the row count cannot change. It is the cheapest way to reach the status
  without a second join, and it is the reviewer's own prescription for H4.
- Add a `contact_target` CTE — every live contact, independent of party linkage, **not** filtered
  to `party_id is not null` the way the invoice CTE is (fixes H2):
  ```
  contact_target as (
    select c.id as contact_id, c.party_id
      from crm_contacts c
     where c.org_id = current_setting('app.current_org_id', true)
       and c.deleted_at is null
  )
  ```
- Add a `booking_owner` CTE that assigns each qualifying booking **exactly one** contact, and that
  contact is the same one invoice attribution would pick for that party (fixes R2-M2 **and**
  pass-6 M2). The OR-join pass 4 proposed matched every live contact independently, so a booking
  carrying a `party_id` was inherited by *every* sibling contact on that party — a shape hub
  deliberately allows (`crm_contacts_party_idx` is not unique, and `CONTACT_PARTY`'s
  `distinct on (party_id)` exists exactly to collapse it). Pass 5's direct-link-always-wins fix
  closed the fan-out but reopened a narrower version of the same identity problem: a booking
  linked directly to a **non-canonical** sibling stayed credited to that sibling forever, so an
  invoice on the canonical contact and a booking on its sibling could never combine into one
  Loyal count — contradicting TO-BE #5's promise that a party's invoices and appointments "can
  never land on two different contacts." The fix canonicalizes a direct link through the
  *linked contact's own* `party_id` (via `contact_target`, not the booking row's independently
  reconciled `party_id` — see §1 on `party.service.ts:218-221`), and only falls back to a
  partyless contact's own identity or to the booking's own `party_id` when there is no live
  direct link:
  ```
  booking_owner as (
    select
      case
        when b.crm_contact_id is not null and ct.party_id is not null then cp_direct.contact_id
        when b.crm_contact_id is not null then ct.contact_id
        else cp_fallback.contact_id
      end as contact_id,
      b.start_time
      from sched_bookings b
      left join contact_target ct
        on b.crm_contact_id is not null and ct.contact_id = b.crm_contact_id
      left join contact_party cp_direct
        on b.crm_contact_id is not null and ct.party_id is not null and cp_direct.party_id = ct.party_id
      left join contact_party cp_fallback
        on b.crm_contact_id is null and b.party_id is not null and cp_fallback.party_id = b.party_id
     where b.org_id = current_setting('app.current_org_id', true)
       and b.status = any(${VISIT_BOOKING_STATUSES})
  )
  ```
  There is deliberately **no** `b.start_time <= now()` term here — see the attended-status guard
  bullet below (D16). Attendance is enforced at the write, so the read stays a pure function of
  stored rows.
  Consequences to state in the PR rather than discover later: a booking whose `crm_contact_id`
  points at a soft-deleted contact (or one in another org) yields `contact_id is null` and counts
  for **nobody** — `ct` and therefore `cp_direct` join to nothing, and it does *not* silently fall
  back to the booking's own `party_id`, because a direct link that no longer resolves is missing
  data, not a party signal (the `b.crm_contact_id is null` guard on `cp_fallback` excludes this
  row on purpose). A direct link to a **partyless** contact (`ct.party_id is null`) keeps that
  contact as its own owner, unchanged from pass 5. A direct link to a **party-linked** contact
  always resolves through `cp_direct` to the party's canonical pick — the same one the invoice
  bridge already credits that party's invoices to — so a party's invoices and its appointments,
  however the booking was linked, converge on exactly one contact.
- Add a `contact_visit_date` CTE next to `contactInvoiceClassSql` — exported from
  `crm-finance.service.ts` so every consumer splices the *same* SQL. It unions **non-void**
  procedure-invoice days with **`completed`** booking days (which D16 has already made
  synonymous with "attended", so no time term appears here):
  ```
  contact_visit_date as (
    select contact_id, d from (
      select cic.contact_id, ${visitDateSql(sql`cic.issued_at`, tz)} d
        from contact_invoice_class cic
       where cic.has_proc and cic.issued_at is not null
         and cic.status is distinct from 'void'
      union all
      select bo.contact_id, ${visitDateSql(sql`bo.start_time`, tz)} d
        from booking_owner bo
       where bo.contact_id is not null
    ) u
    group by contact_id, d
  ),
  contact_visit_agg as (
    select contact_id, count(*)::int as visit_dates
      from contact_visit_date
     group by contact_id
  )
  ```
  `union all` + `group by contact_id, d` dedupes across sources, so the outer `count(*)` is already
  a distinct-date count (D2, D3).
  **CTE ordering is a hard requirement**: `contact_party` → `contact_invoice_class` →
  `contact_target` → `booking_owner` → `contact_visit_date` → `contact_visit_agg`. Export the block
  as one builder that emits all four new CTEs in that order, so no consumer can splice half of it;
  `contact_party` and `contact_invoice_class` are already first in every call site's `with` list.
  `status is distinct from 'void'` — **not** `<> 'void'` — is the R2-M1 fix: `fin_invoices.status`
  is nullable and the connector contract types it `string | null`, so the inequality form evaluates
  to unknown for an unstatused invoice and would silently stop counting it. This mirrors
  `crm-journey.service.ts:83`, which already uses the null-safe form for the same column.
  Note what is **absent**: no `now()`, no `current_date`, no clock term of any kind. Pass 5 added
  `b.start_time <= now()` because `setBookingStatus` validates neither transitions nor timestamps;
  pass 7 removes it and fixes the write instead (the attended-status guard bullet below). The reason is invariant 3: with a
  clock term, a booking becomes a visit at an instant when *nothing is written*, so no
  invalidation can fire and the three caches keep serving the pre-boundary answer for their full
  TTL+SWR window — trading premature promotion for silent staleness.
- **Combine at the contact spine, and do not touch `fin` (fixes H1; avoids P5-F1).** Pass 4 said to
  re-anchor the `fin` aggregate itself on `contact_target`. That is wrong: `fin`'s *membership*
  means "has ≥1 invoice" and is read by `booked`, `finance_buyers`, `is_buyer`, the `revenue` sort
  key and the row decoration's null sentinel (§1). The combination point is one CTE lower, where
  both queries already anchor on every live contact:
  - **Roster (`runRankQuery`) and dashboard (`getCrmDashboardStats`)** — leave the `fin` CTE alone
    except to *remove* `${FIN_LOYAL} as fin_loyal` from it. In `base`, which already does
    `from crm_contacts c … left join fin fn on fn.contact_id = c.id`, add
    `left join contact_visit_agg cva on cva.contact_id = c.id`, and select
    `(coalesce(cva.visit_dates, 0) >= 2) as fin_loyal` and
    `coalesce(cva.visit_dates, 0) as fin_visit_dates`. When the finance bridge is off the visit
    CTEs are not spliced at all, so both expressions collapse to the existing
    `false` / `0` literals — same shape as today's `withFinance ? … : …` fallback `fin` CTE.
    `FIN_FUNNEL_IDX` / `FUNNEL_STAGE_EXPR` keep reading the `fin_loyal` **column** and do not
    change. Carry `fin_visit_dates` through `scored` and `filtered` (both enumerate their columns
    explicitly) to the row mapping.
  - **Row decoration (D12)** — `rest.finance` becomes `null` only when
    `r.fin_invoices == null && (r.fin_visit_dates ?? 0) === 0`; otherwise it is built as today with
    `revenue: Number(r.revenue) || 0`, `invoices: Number(r.fin_invoices) || 0`, and the new
    `visitDates`. `delete rest.fin_visit_dates` alongside the other stripped columns. Update the
    `RankedContact.finance` doc comment: "null when the bridge is enabled but this contact has
    neither an invoice nor a visit date."
  - **Declare the API delta (D17, L1)** — this decoration is *not* internal. `GET
    /api/crm/contacts` returns ranked rows verbatim (`routes/api/crm/contacts/+server.ts:104`,
    `{ contacts: withAutoTags, … }`), so both changes above are wire-visible: `finance` gains
    `visitDates`, and `finance` stops being `null` for a booking-only contact. Neither removes nor
    retypes a field, so it is additive — but the slice proves that rather than asserting it:
    - Extend the existing strict contract assertion in
      `routes/api/crm/contacts/contacts.test.ts` (`expect(body.contacts[0].finance).toEqual(…)`,
      currently at `:177`) into three cases — invoice-only, booking-only, neither — asserting the
      exact serialized `finance` object each time. Keep it `toEqual`, not `toMatchObject`: a
      strict assertion is the only kind that catches the *next* silent field.
    - Record the consumer sweep in the PR body: `rg -n '\.finance\b' src/` over hub. At
      `1b47e8ce` the readers are `/crm/customers/+page.svelte` (covered by the D12 test),
      `routes/api/crm/contacts/export.csv/+server.ts` (a **closed** `valueOf` switch — `revenue`,
      `invoices`, `lastPurchase` only, so it gains no column and needs no change), and the contact
      page after D10. Anything else the sweep finds becomes a named test case.
    - §6's cross-repo row for the gateway CRM tools already says "alert, not a dependency"; the
      declared field is exactly what that alert is about.
  - **`loadContactFinanceMap`** — this one *is* invoice-anchored today (`from contact_invoice_class
    group by contact_id`), and it is the TS twin the parity test compares SQL against, so it must
    gain booking-only contacts or parity fails the moment a booking-only contact goes Loyal in SQL.
    Anchor it on `contact_target`, left join the existing invoice aggregate **and**
    `contact_visit_agg`, and emit a row when *either* side is present (not one row per contact —
    the map stays proportional to evidence). Revenue/count/last keep reading the invoice aggregate
    only (`coalesce(ic.revenue, 0)`, `coalesce(ic.invoices, 0)`, `ic.last`), so the visit axis can
    never fan out or change a money number. `loyal` becomes `coalesce(cva.visit_dates, 0) >= 2` and
    `visitDates` is `coalesce(cva.visit_dates, 0)` (D9).
  - Retire S1's `finLoyalSql(tz)` and the exported `FIN_LOYAL` constant it replaced — both are
    aggregate-context expressions that no longer have a home once the count moves into its own
    CTE. One exported `visitLoyalSql(alias)` serves all three call sites, so the `>= 2` threshold
    also has exactly one definition. This is the only churn S1→S2 creates, and it is deliberate:
    S1 must be shippable and provable on its own before a second source exists.
- **Make `completed` mean attended, at the write (D16, M1).** `setBookingStatus`
  (`scheduling-bookings.service.ts:373-388`) today validates only `SETTABLE` membership. Add the
  timestamp precondition to the UPDATE itself, so it is checked and applied atomically rather than
  read-then-write:
  ```ts
  const changed = await withOrgCore(ctx, (tx) =>
    tx.update(schedBookings)
      .set({ status, updatedAt: new Date() })
      .where(and(
        eq(schedBookings.id, id),
        eq(schedBookings.orgId, ctx.tenantId),
        // a visit that has not started cannot have been attended
        status === 'completed' ? lte(schedBookings.startTime, sql`now()`) : undefined,
      ))
      .returning({ id: schedBookings.id }),
  );
  ```
  Zero rows for `status === 'completed'` means either "no such booking" or "not started yet";
  disambiguate with one `getBooking` read on the failure path only and throw a typed
  `BookingNotStartedError`. Surface it as **409** at the three entry points that can reach it —
  `routes/api/scheduling/bookings/[id]/+server.ts:23` (PATCH),
  `routes/api/scheduling/bookings/[id]/complete/+server.ts:43`, and gateway
  `routes/api/gateway/actions/booking-complete/+server.ts:56` — with a message naming the start
  time, because a front-desk user completing an appointment early needs to see *why*. The
  `RELEASING` accrual hook is untouched.
  Three things make this guard's blast radius closed rather than hopeful, all from the §1 census:
  `createBooking` inserts only `pending`/`accepted` (`:280`), `start_time` is never updated after
  insert, and `setBookingStatus` is the only writer of `status`. So after this change the state
  "`completed` with a future `start_time`" is unreachable — which is what lets the read drop its
  `now()` term.
  **One residue census plus one mandatory policy gate before flipping the read — perform them
  before any write and put both in the PR body.** `updated_at` is mutable bookkeeping, not an
  immutable status-transition timestamp: `reconcileParties` changes `party_id` and overwrites
  `updated_at = now()` (`party.service.ts:219-223`) without changing `status`. Therefore the
  second query below is useful only as a positive signal; zero is inconclusive and must never
  authorize the guard:
  1. `select count(*) from sched_bookings where status = 'completed' and start_time > now();` —
     the legacy rows the old, unguarded writer allowed to sit with a still-future `start_time`.
     This is pure defect residue: nothing legitimate produces this state once the guard ships.
  2. **Diagnostic only:** `select count(*) from sched_bookings where status = 'completed' and start_time <= now() and
     updated_at < start_time;` — among bookings that have already happened, does this business
     *ever* complete one before its own scheduled start (a walk-in booked into the next slot and
     closed out immediately)? A positive result proves the workflow exists. A zero result proves
     nothing because later reconciliation can erase the timestamp evidence.
  3. **Mandatory operator policy decision, regardless of query 2's result:** record whether this
     deployment permits completing an appointment before `start_time`. If the operator permits it
     or does not decide, stop D16's guard/read change and every legacy status repair. Only an
     explicit decision that early completion is forbidden authorizes the new 409 and the remainder
     of D16. The record names the decision-maker, timestamp, deployment/org scope, and diagnostic
     output; it does not describe a zero count as evidence of absence.

  Decide from both results and the mandatory policy decision together. The evidence step must capture the exact gate-1 rows, not
  merely their count: export `id`, `org_id`, `status`, `start_time`, and `updated_at` under a
  transaction-level `evidence_captured_at`, sort by `id`, and record the artifact's SHA-256 and
  row count in the PR/proposal ledger. Treat that immutable artifact as sensitive operational
  evidence: store it in the approved operator location, never commit it, and retain it as the
  rollback input.

  - **If diagnostic 2 is `> 0`, stop the guard/read change entirely** — the same workflow it found in
    the past will recur for future bookings once the guard ships, and it would 409 a real
    front-desk action. File a proposal describing the observed pattern (an operator must approve
    the guard's exact shape — e.g. a grace window — before this slice proceeds) and leave
    `VISIT_BOOKING_STATUSES` and the read on the old `start_time <= now()` filter for that org,
    the same rule §5 applies to widening the attended set. **Perform no gate-1 status repair on
    this path.** A positive diagnostic 2 proves the unguarded writer may represent an accepted business
    workflow; predicate disjointness is not enough authority to rewrite adjacent attendance data.
  - **Gate 1's residue, if any, is never normalized automatically**, independent of diagnostic 2's
    result. Only after the operator explicitly decides that early completion is forbidden may the
    operator approve a gate-1 repair, and that approval
    names the captured artifact checksum and exact IDs — never only a count. Run it under an
    announced maintenance boundary that pauses the booking-status writer. In one transaction,
    join `sched_bookings` to the captured approved set by `id`, require every captured pre-image
    (`org_id`, `status = 'completed'`, `start_time`, `updated_at`) still to match, update only those
    joined rows to `accepted`, and use `RETURNING id` to prove the sorted returned IDs and count
    equal the approved artifact before commit; otherwise roll back. Do not re-evaluate `now()` in
    the mutation. Retain the pre-images until post-deploy verification so the same exact-ID join
    can restore them. A booking that becomes future-completed after evidence capture is outside
    the approved set and must remain untouched.
- `const VISIT_BOOKING_STATUSES = ['completed'] as const`, with the reasoning in a comment:
  hub's own status domain (`scheduling-bookings.service.ts:370`) has a distinct `no_show`, so
  `accepted` is a *pre-visit* state, not attendance. **This is the resolution of the pass-2 human
  blocker: `completed` is the authoritative attended status.** It under-counts for orgs that never
  close out appointments — an under-count never falsely promotes anyone, and widening it to
  past-dated `accepted` bookings is deferred (§5) with a ledger entry rather than guessed at.
- **Cache invalidation (D8, H3).** The shared helper the pass-4 text told the implementer to go
  looking for exists and is already exported for exactly this: `bustCrmList(tenantId)`
  (`crm-contacts.service.ts:1253-1262`) invalidates `tags.tenantDomain(tenantId, 'crm')`, and all
  three visit-dependent caches carry that tag — `crm-fin-map` (crm ∪ finances), `crm-page`
  (`rankContactsPageCached`), and the dashboard entry. So `createBooking` and every
  `setBookingStatus` transition call `bustCrmList(ctx.tenantId)` **after** the transaction commits,
  in the same post-commit fail-soft position `setBookingStatus` already uses for `releaseAccruals`
  (`scheduling-bookings.service.ts:381-388`). Do not invent a second invalidation path and do not
  add a scheduling-specific tag. Bust unconditionally on every settable status, not only on
  transitions into/out of `completed`: the cheap over-invalidation is one recomputation, while
  reasoning about which transitions can change evidence is exactly the kind of guard that rots.
- **Fix `crmRevenueSummary`'s buyer count (D14, M3).** `contactFinanceMap` is not consumer-free
  (§1 corrects the pass-5 claim that it was): `crmRevenueSummary` (`crm-finance.service.ts:152-177`)
  loops the map and does `buyers += 1` for every row, no guard. Once this slice makes the map emit
  a row for booking-only contacts (previous bullet), that loop would count them as buyers too.
  Change the increment to `if (f.invoices > 0) buyers += 1;` — buyers stays "has ≥1 invoice",
  matching `booked`/`finance_buyers`/`is_buyer` (invariant #11) — while `loyal`/`customers`/
  `reserved` keep summing the map's own booleans unchanged (those are meant to include the visit
  axis).
- Keep the existing module gate (`bothEnabled(ctx, 'crm', 'finances')`) exactly as-is. Consequence,
  which must be recorded and not silently absorbed: an org with scheduling but **not** finances
  still gets no Loyal. Leave `TODO(handoff): scheduling-only orgs get no visit dates while the
  count rides the finance map — see proposals/2026-08-17-hub-distinct-visit-dates.md` at the gate,
  and append the same to that proposal.
- Update `ContactFinance.loyal`'s doc comment: "repeat visitor — ≥2 distinct local days with a
  non-void procedure invoice or a completed appointment (which cannot be set before the
  appointment starts — D16)".
- Extend the parity truth table with the visit axis (D5), including the zero-invoice/booking-only
  case and the void-invoice case.

**Files:** `crm-finance.service.ts` (incl. `booking_owner`'s canonicalization and
`crmRevenueSummary`'s buyer guard), `crm-contacts.service.ts` (both `base` CTEs, the two `fin`
CTEs' `fin_loyal` removal, the `scored`/`filtered` column lists and the row decoration),
`scheduling-bookings.service.ts` (`bustCrmList` on `createBooking` and `setBookingStatus`, plus
the D16 attended-status guard and `BookingNotStartedError`),
`routes/api/scheduling/bookings/[id]/+server.ts`,
`routes/api/scheduling/bookings/[id]/complete/+server.ts`,
`routes/api/gateway/actions/booking-complete/+server.ts` (409 mapping),
`routes/api/crm/contacts/contacts.test.ts` (the D17 response contract),
`crm-finance.service.test.ts`, `crm-contacts.sql.integration.test.ts`,
`crm-funnel-parity.sql.integration.test.ts`,
`scheduling-bookings.service.test.ts` (or equivalent, for the invalidation assertions),
`proposals/2026-08-17-hub-distinct-visit-dates.md` (ledger append, meta-repo).
No `.svelte` file is edited in this slice — S1 already moved the contact page onto the shared
definition, so S2's new source reaches both screens with zero UI diff.

**Verification criteria (automated except the EXPLAIN review):**
```bash
bun run vitest run src/server/services/crm-
#   - CROSS-SOURCE: procedure invoice on local day A + completed booking on local day B → loyal
#   - BOOKING-ONLY: zero invoices, two completed bookings on different local days → loyal=true,
#     visitDates=2, revenue/invoice-count fields unchanged (0/unset) — H1
#   - VOID: a procedure invoice + a VOID procedure invoice on a different day → 1 date, not loyal;
#     a valid second invoice later voided → drops back below 2 — H4
#   - FUTURE-COMPLETED (D16/M1): setBookingStatus on a booking starting in 1h → BookingNotStartedError
#     (409 at all three routes), status UNCHANGED, and the three caches untouched; the same booking
#     once its start_time is in the past → completes, and the very next read of all three shows the
#     new visit date with NO TTL wait. Assert BOTH sides of the boundary with WARMED caches — the
#     point is that no eligibility change can happen without a mutation. Also assert the generated
#     read SQL contains no `now()`/`current_date` term, so a later pass cannot reintroduce the
#     clock without failing a test
#   - LEGACY/POLICY GATE (D16): the residue query and mutable-timestamp diagnostic in the S2 "Do"
#     bullet are run and their output pasted in the PR. Complete a booking early, advance beyond
#     start_time, run reconcileParties, and prove updated_at no longer detects that transition;
#     a zero diagnostic must leave the ship gate CLOSED. Record an explicit operator decision on
#     whether early completion is forbidden regardless of the count. If it is permitted or no
#     decision exists, the slice STOPS, files a proposal, and performs NO repair. If it is
#     explicitly forbidden and gate 1 is non-zero, an operator approves that exact artifact; the
#     repair updates only matching
#     approved pre-images, asserts the returned ID set before commit, and retains rollback data.
#     A concurrency case creates another future-completed row after capture and proves the repair
#     does not change it
#   - DEDUPE: invoice and completed booking on the SAME local day → 1 date → NOT loyal
#   - EXCLUDED: no_show / cancelled / rejected / pending / accepted bookings → not counted
#   - NULL STATUS: a procedure invoice with status IS NULL still counts as a visit date — R2-M1
#   - LINKS: booking linked only by crm_contact_id on a PARTYLESS contact counts, credited to that
#     contact directly; booking linked only by party_id counts, credited to the CONTACT_PARTY
#     canonical pick; a booking with both links → once, per the same rule — H2/R2-M2
#   - SIBLINGS: two live contacts A (canonical, created first) and B share one party_id. A booking
#     linked directly to A does NOT give B a visit date; a party-only booking credits exactly ONE
#     of them (the CONTACT_PARTY canonical pick, i.e. A — the same contact the party's invoices
#     land on) — R2-M2
#   - CROSS-SOURCE IDENTITY (pass-6 M2): same A/B siblings. A procedure invoice lands on A (day 1,
#     via CONTACT_PARTY, as it already does). A booking linked DIRECTLY to B — the non-canonical
#     sibling — on day 2. Assert both dates land on A (not one date each on A and B), A.visitDates
#     == 2, A reaches loyal, and B.visitDates == 0 / B is not present in the map with any visit
#     evidence. This is the exact shape the pass-5 booking_owner CTE still got wrong: direct-link-
#     always-wins let B keep its own booking day forever
#   - DANGLING: a completed booking whose crm_contact_id names a soft-deleted contact counts for
#     nobody, and does not fall back to its party_id (verify this still holds now that direct links
#     resolve through contact_target: a dangling crm_contact_id makes BOTH ct.contact_id and
#     ct.party_id null, so cp_direct never matches either)
#   - MEMBERSHIP (regression, P5-F1): on a fixture where the ONLY change is added bookings,
#     `booked`, `finance_buyers`, `finance_customers`, `is_buyer` and an `order by revenue` page are
#     byte-identical to before; with the finance bridge off, fin_loyal is false for every contact
#   - DECORATION: the four (has-invoice x has-visit) combinations — finance is null ONLY for
#     (no, no); the booking-only row is {revenue: 0, invoices: 0, loyal: true, visitDates: 2} — D12
#   - EMPTY: contact with party_id null and no bookings → 0, no throw
#   - MODULES: org with no sched_* rows → unchanged; org with finances off → {} as today
#   - COUNT: visitDates asserts the literal 0/1/2, not just the >=2 threshold — M2/D9
#   - PARITY: SQL funnel_stage == maxFunnelStage(effectiveFunnelStage, financeFloorStage) for
#     every (_funnel × inbound × deposit/procedure × visit-dates 0/1/2 × source mix). No skips.
#   - BUYER SEMANTICS (D14, M3): a fixture with one booking-only loyal contact (0 invoices, 2
#     completed bookings) and zero invoice-having contacts asserts crmRevenueSummary().buyers === 0
#     and .loyal === 1 — the booking-only contact counts toward loyal but not toward buyers
#   - API CONTRACT (D17, L1): GET /api/crm/contacts for invoice-only / booking-only / neither rows
#     asserts the EXACT serialized finance object each time (strict toEqual, extending the existing
#     assertion) — visitDates present, and finance non-null exactly when invoice OR visit exists
#   - CSV: export.csv gains no column and its three finance columns are unchanged
bun run vitest run src/routes/api/crm/contacts src/routes/api/scheduling
bun run vitest run src/server/services/scheduling-bookings
#   - INVALIDATION: warm contactFinanceMap + roster page + dashboard cache for a contact, transition
#     a booking accepted → completed, assert the very next read (no TTL wait) shows loyal where
#     applicable; transition completed → no_show, assert the very next read drops back — D8/H3
bun run vitest run && bun run check
# EXPLAIN ANALYZE the batched roster query for a 100-contact page on the largest dev org and paste
# the plan in the PR. sched_bookings has (org_id,status), (crm_contact_id) and (party_id) indexes,
# so this is measurement, not optimization. If it seq-scans, STOP and file a measured index
# proposal — this spec ships zero DDL (§5).
```

### Slice 3 — Delete the dead stub and the divergent write path

**Topics:** `crm`, `logic`, `test`, `unwired` · **Tags:** `logic`, `test` · **Estimate:** 3–4 h

**Goal:** one Loyal source in the codebase, and a test that keeps it that way.

**Do:**
- Delete `distinctVisitDates` from `crm-contacts.service.ts` and the `visits >= 2 →
  setFunnelStage('loyal', { by: 'auto' })` branch plus the import in the analyze route. Replace the
  route's header comment with the truth: Loyal is a read-time finance/visit floor
  (`financeFloorStage`), never agent-decided and never persisted by this endpoint. The prompt's
  "Do NOT output loyal" rule and the `coerced !== 'loyal'` guard **stay** — they are what keeps the
  model out of the Loyal decision.
- Confirm before deleting: `rg -n 'distinctVisitDates' src/ scripts/` must show only these two
  files. If a new caller has appeared, it becomes a named test case, not a surprise.
- Anti-recurrence guard (D7) in `crm-finance.service.test.ts`: assert that the loyal predicate is
  produced by the shared builder (e.g. the generated SQL for the roster CASE and for
  `contactFinanceMap` contain the same `count(distinct` visit-date fragment), and that
  `crm-contacts.service.ts` exports no visit/loyal function whose body is a constant return. Keep
  the matcher narrow and comment why each pattern is listed, so nobody has to disable it.
- Any remaining deferral gets a `TODO(handoff):` plus the matching proposal append (§5).

**Files:** `crm-contacts.service.ts`, `.../funnel/analyze/+server.ts`,
`src/routes/api/crm/contacts/[id]/funnel/funnel.server.test.ts`, `crm-finance.service.test.ts`.

**Verification criteria (automated):**
```bash
! rg -n 'distinctVisitDates' src/ scripts/        # → no hits
bun run vitest run src/routes/api/crm/contacts src/server/services/crm-
#   - the analyze route never writes 'loyal': a stubbed model returning "loyal" (and one throwing)
#     leaves _funnel untouched; the stage still comes from the floor
#   - GUARD: re-adding a `return 0` visit-count stub, or forking the loyal predicate, fails the
#     suite (verify once locally, revert, and say so in the PR)
bun run vitest run && bun run check
```

---

## 5. Out of scope (explicit)

- **Other funnel stages** — the proposal's own exclusion. `lead`/`opportunity`/`customer` derive
  exactly as today.
- **UI** — the proposal's own exclusion, with one bounded exception. S1 edits exactly two lines of
  `crm/[contactId]/+page.svelte`: the `financeFloor` attribute expression and the now-unused
  `financeFloorStage` import (D10). No component, markup, style, class, token or icon changes, and
  no other `.svelte` file is touched in any slice. The `ui` governance gates still run on S1
  (`lint:design`, `lint:tokens`) because the design-token contract keys on the file, not on the
  size of the edit. Everything else remains excluded: no new component, no layout change, no
  copy. The visible effect is that the Loyal set on existing screens gets smaller (tz fix) and
  then larger (appointments), and that the contact page and the roster stop disagreeing.
- **Widening the attended set to past-dated `accepted` bookings.** Deferred deliberately (S2): it
  needs the real `select status, count(*) from sched_bookings group by 1` distribution and an
  operator decision about whether this business closes appointments out. Ledger entry required.
- **Scheduling-only orgs.** The count rides the finance map's `crm × finances` gate; widening that
  gate touches revenue reads too. Recorded as a handoff, not fixed here.
- **Persisting Loyal.** The floor stays read-time (TO-BE #6). No backfill, no cron, no
  re-analysis pass over existing contacts. A positive diagnostic, a policy that permits early
  completion, or a missing policy decision forbids D16's optional legacy status repair. Only
  after an explicit decision that early completion is forbidden may an approved exact-set repair
  correct
  `sched_bookings.status` rows that the unguarded writer should never have allowed; it writes
  nothing into `custom_fields._funnel` and is not a funnel backfill.
- **Every other consequence of a booking's start time passing.** D16 removes the clock from the
  *visit* read only. Reminders, slot computation and scheduling analytics keep their own
  time-dependent reads; they are not cached behind the CRM tags and are not this spec's problem.
- **`refreshExchangeRate`'s missing invalidation.** It writes `fin_settings` but only the `fx*`
  columns, which the visit query does not read (§1 census). Left alone deliberately, and recorded
  in the census so the omission is not mistaken for an oversight.
- **An org-configurable threshold or a lookback window.** `>= 2`, all-time, one constant — matching
  what ships today. A window is an unmade product decision.
- **POS-only and purchase-side visits.** Only `fin_invoices` (already the POS bridge target) and
  `sched_bookings`. If POS tickets do not reach `fin_invoices`, note the gap in the PR; do not
  widen the query.
- **A real `visits` / attendance data model.** The correct long-run answer is an explicit
  attendance record rather than inference from billing and calendar rows. That is DDL + ingest +
  backfill — a different, larger spec. This one infers, and says so.
- **Schema changes.** Zero DDL in either repo; every column read here exists today (§1).
- **`crm-deposit-rule.ts` semantics** — owned by `2026-08-17-hub-reserva-keyword-config-spec`.

## 6. Cross-repo impact

| Surface | Impact | Evidence / mitigation |
|---|---|---|
| `minion_site` (shares the database) | **None** — read-only use of existing columns, zero DDL | `git diff --name-only origin/master...HEAD \| grep -E 'supabase/migrations\|db/schema'` must be empty |
| `/crm/customers` (same repo, same shared decoration) | **Watch, not a change** — S1 leaves the customers page's `financeFloorStage(finOf(c))` untouched, but S2 changes what `finOf(c)` returns for a booking-only contact (was `null`, becomes a real object). Its `reservedOnly` filter and `revenue`/`invoices` columns read the same object and must be re-checked against a booking-only row | `routes/(app)/crm/customers/+page.svelte:97-104,466-472`; covered by the D12 decoration test |
| `@minion-stack/db`, `@minion-stack/shared`, gateway WS frames | **None** — server-side services only; no frame, no shared-package type, no DDL. `RankedContact` is declared in `crm-contacts.service.ts` and is not exported from any `@minion-stack/*` package | `rg -n 'RankedContact' src/` finds only hub-internal readers at `1b47e8ce` |
| `GET /api/crm/contacts` (public REST) | **Declared additive change (D17/L1), not "none"** — `contacts[].finance` gains a numeric `visitDates`, and `contacts[].finance` becomes non-null for a contact with visit evidence but no invoice. Nothing removed, nothing retyped. Pass 6 asserted "no response-shape change" here; that was **false**, because the route serializes ranked rows verbatim (`routes/api/crm/contacts/+server.ts:104`) | Strict `toEqual` contract test over invoice-only / booking-only / neither (D17); consumer sweep `rg -n '\.finance\b' src/` recorded in the PR |
| `POST /api/crm/contacts/[id]/funnel/analyze` | **None** — JSON keys unchanged; only the dead `loyal` early-return disappears | re-check `rg 'funnel/analyze' ~/work/minion/src` at PR time |
| `PATCH /api/scheduling/bookings/[id]`, `…/complete`, gateway `booking-complete` | **New failure mode (D16)** — completing a booking before its `start_time` now returns **409** instead of silently succeeding. No success-path shape change | An explicit operator decision that early completion is forbidden gates this regardless of the mutable-timestamp diagnostic; a positive diagnostic, permission, or no decision stops the guard |
| `minion/` gateway CRM tools | **Alert, not a dependency** — if `crm_search`/`crm_insight` surface a funnel stage, they will see a slightly different Loyal set. A hit means an append to `proposals/2026-08-17-gw-defaces-crm-tools.md`, not a fix here | grep at PR time |
| In-flight hub specs on the same files | **Coordination required** — `2026-08-17-hub-reserva-keyword-config-spec` S3 is open in hub PR #160 touching `crm-finance.service.ts`/`crm-settings.service.ts`, and `2026-08-13-crm-customers-server-pagination-spec` is `implementing` on `crm-contacts.service.ts`. Branch off current `origin/master`, rebase before opening the PR, scope commits narrowly, never `git add -A` | check open hub PRs on those paths before S1 |
| `paperclip-minion`, `pixel-agents`, `minion_plugins` | **None** | — |

## 7. End-to-end verification

Run with all three slices merged, on hub `master`, against a dev org that has both invoices and
completed bookings.

```bash
cd minion_hub
psql "$SUPABASE_DB_URL" -c 'show timezone;'      # records the session zone the old cast used
bun run check                                    # 0 errors / 0 warnings
bun run vitest run                               # full suite green; no new skips
SUPABASE_DB_URL=... REQUIRE_CRM_FUNNEL_PARITY_POSTGRES=1 \
  bun run vitest run src/server/services/crm-funnel-parity.sql.integration.test.ts
# the ONLY .svelte in the whole-spec diff is the contact page S1 changes (L1 — the earlier
# `grep -Eq '\.svelte$' && exit 1` form failed the block precisely when S1's required file was
# present; this is the same exact-path assertion S1's own verification block uses):
svelte_changed=$(git diff --name-only origin/master...HEAD | grep -E '\.svelte$' || true)
[ "$svelte_changed" = 'src/routes/(app)/crm/[contactId]/+page.svelte' ] || exit 1
if git diff --name-only origin/master...HEAD | grep -Eq 'supabase/migrations|db/schema'; then exit 1; fi
! rg -n 'distinctVisitDates' src/ scripts/       # → empty

# The proposal's DoD, literally: a contact seeded with 2 visit dates on the party spine reports
# 2 dates and lands on 'loyal' — one from fin_invoices, one from a completed booking.
bun run vitest run src/server/services/crm-finance src/server/services/crm-funnel

# Live behavior on a dev org:
#  a. a contact with ONE local visit day (two same-evening invoices) → NOT loyal on /crm/customers
#     AND on the contact page (this is the row the old UTC cast promoted; before S1 the contact
#     page had its OWN cast, so this is the check that proves the third definition is gone)
#  b. add a completed booking on a different local day → both surfaces show loyal
#  c. flip that booking to no_show → both surfaces drop back (read-time floor, self-correcting)
#  d. a contact with ZERO invoices and two completed bookings on different local days → loyal on
#     BOTH surfaces (H1) — including a contact with party_id NULL, linked only by crm_contact_id (H2)
#  e. a second procedure invoice that is void does NOT promote; voiding a previously-counted
#     invoice drops the contact back below 2 (H4)
#  f. complete a booking, THEN immediately (no TTL wait) hit /crm/customers and the contact page —
#     both reflect it; flip to no_show and immediately re-hit both — both drop back (D8/H3, the
#     specific staleness the review caught: caches must not need their TTL to expire)
#  g. POST /api/crm/contacts/$C/funnel/analyze → _funnel is NOT written with 'loyal',
#     and crm_contacts.updated_at is unchanged when the model returns nothing actionable
curl -s "$HUB/api/crm/contacts?funnelStage=loyal&limit=5" -H "$AUTH" | jq '.total, [.contacts[].id]'
#  h. that roster set matches the per-contact derivation for the same org (parity, live)
#  i. a contact with an invoice whose `status` is NULL still counts that day as a visit (R2-M1)
#  j. two contacts sharing one party_id: a booking linked directly to the CANONICAL one does not
#     promote the other; a party-only booking promotes exactly the canonical one; a booking linked
#     directly to the NON-canonical sibling still combines with an invoice on the canonical
#     contact to reach loyal on the canonical contact (R2-M2, pass-6 M2)
#  k. the CRM dashboard's "booked"/buyers/customers counters and the revenue-sorted first page are
#     unchanged from before the branch on an org whose only new evidence is bookings (P5-F1)
#  l. sync a second invoice for a contact with a warm /crm/customers page (no manual cache clear) —
#     the very next load of that page shows the new Loyal set immediately; repeat after voiding an
#     invoice (pass-6 H1)
#  m. change fin_settings.timezone from a warm state (map + roster + dashboard all previously hit)
#     — the very next load of all three reflects the new zone's day bucketing immediately (pass-6 M1)
#  n. an org with a booking-only Loyal contact and no invoice-having contacts: the dashboard's
#     Revenue widget (crmRevenueSummary) reports buyers = 0 while still counting that contact
#     toward loyal (pass-6 M3)
#  o. IDENTITY (pass-7 H1): with /crm/customers, the CRM dashboard and a contact page all warm,
#     POST /api/crm/parties/reconcile (the caller with no bust of its own) after seeding a
#     fin_client + crm_contact that reconcile onto the same party — all three surfaces reflect the
#     new attribution on the very next load, no manual cache clear, no TTL wait. Repeat via a
#     normal finance sync (syncSource), whose own bust runs BEFORE reconciliation
#  p. ATTENDED GUARD (pass-7 M1/D16): try to complete a booking that starts in an hour, from all
#     three entry points (PATCH, /complete, gateway booking-complete) — each returns 409 and the
#     row's status is unchanged. Wait past its start (or seed one that already started), complete
#     it, and both surfaces show the new Loyal set immediately
#  q. API CONTRACT (pass-7 L1/D17): GET /api/crm/contacts | jq '.contacts[0].finance' shows
#     visitDates, and a booking-only contact's `finance` is a real object rather than null;
#     export.csv for the same page is byte-identical to before the branch
#  r. BUDGET-LIMITED SYNC (pass-8 H1/D18): with /crm/customers, the CRM dashboard and crm-fin-map
#     all warm for a contact, run a finance sync configured with a per-run deadline that expires
#     immediately after committing exactly one page of invoices — without waiting for job
#     completion or a TTL, all three already reflect that page's invoices on the very next read
```

**Ship gate:** §7 green; the §1 **visit-truth writer census re-run**, including both search forms for
`fin_invoice_items`, pasted in the S1 PR body (the `rg` recipe
in §1 — this is the gate that stops a fifth "one more writer" round; it must classify every hit,
show every in-domain mutation followed by a post-commit bust, and retain reviewed out-of-domain
hits without requiring needless invalidation); both D16 queries and their output pasted in the S2 PR,
plus the immutable gate-1 artifact's row count and checksum and the reconciliation regression
proving query 2 can return zero after early completion. The guard/read change remains stopped
unless an operator explicitly records that early completion is forbidden, even when query 2 is
zero; a positive query 2, permission for early completion, or no decision requires a proposal
link and STOP on both the guard/read change and every status repair. For a non-zero gate 1 after
that explicit policy decision, operator sign-off naming the exact artifact,
exact-set/pre-image/returned-ID assertions,
rollback evidence, and the concurrent-row exclusion test; the D17 consumer sweep pasted in the
S2 PR;
the EXPLAIN plan from S2 pasted in the PR; the `show timezone;` output
recorded (it is the evidence that D1 was a real defect, and the one §1 fact this spec could not
prove without a database); the S2 handoff appends made to
`proposals/2026-08-17-hub-distinct-visit-dates.md`; `bun run lint:design && bun run lint:tokens`
green on S1 with the two-line `.svelte` diff; and any line-number drift from §1 corrected in
this spec in the same PR.
