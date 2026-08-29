---
id: 2026-08-17-hub-distinct-visit-dates-spec
title: "CRM funnel — one timezone-correct visit-date definition (invoices + completed bookings) behind the shipped Loyal floor"
stage: spec
status: review
pass: 4
next_slice: 1
created: 2026-08-17
updated: 2026-08-29
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
every slice is tagged `logic`/`test`: mandatory red-state TDD, **no** UI-governance gates (no
`.svelte` file is edited in any slice — see §5).

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

**Pass-4 addendum.** This working checkout (minion-meta only) has no `minion_hub` clone and no
database runtime, so the rows below the divider are **carried from the pass-4 external review's
own file:line citations against the same pinned commit** (`1b47e8ce`), not independently
re-verified this pass. They must be re-confirmed with `rg` against a real hub checkout before S1
starts — treat them as evidence to design against, not as re-proven facts.

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

**Consequences for the pass-2 plan, stated plainly:** its S1 ("build a new `crm-visits.ts` and a
second batched count") and S2 ("make the decision deterministic, add forward-only / manual-wins /
write-only-on-change guards") would have re-implemented four things that already exist and would
have introduced the second Loyal definition its own ⚠️A4 warned about. That plan is withdrawn; the
slices below are the residue that is genuinely missing.

## 2. TO-BE — invariants

1. **One visit-date definition.** Exactly one SQL expression produces the set of a contact's
   distinct visit dates, spliced into both the `contactFinanceMap` aggregate and the roster
   `funnel_stage` CASE. No second copy, no per-contact TS re-derivation.
2. **Bucketed in the org's business timezone** (`fin_settings.timezone`, default `America/Lima`),
   never in the session zone. The zone is a bound parameter, never interpolated into SQL text.
3. **A visit is evidence, not intent.** A **non-void** procedure (non-deposit) invoice with a
   non-null `issued_at`, or a booking whose status is `completed` **and** whose `start_time` is not
   in the future. `pending`/`accepted`/`cancelled`/`rejected`/`no_show` bookings, future-dated
   `completed` bookings, deposit-only invoices, and `void` invoices are not visits.
4. **A contact needs no invoice to be a visitor.** Visit-date evidence from invoices and from
   bookings is aggregated independently, one row per contact each, then combined — never by
   filtering bookings through an invoice-anchored relation. A contact with zero invoices and two
   `completed` bookings is exactly as eligible as one with zero bookings and two invoices.
5. **Every live contact identity shape is reachable**, independent of party linkage: a booking
   counts toward its contact if `crm_contact_id` matches directly, or if both sides carry the same
   non-null `party_id`. A contact with no `party_id` at all must still be reachable through
   `crm_contact_id`.
6. **Loyal stays read-time.** `visitDates >= 2` remains a *floor* derived at read time; nothing new
   is persisted into `custom_fields._funnel`. Evidence disappearing (a voided invoice, a booking
   flipped to `no_show`) self-corrects.
7. **Every cached surface that reads visit-date evidence stays consistent with the evidence.**
   Booking creation and every booking status mutation that can add or remove visit evidence busts
   the same cache tags a comparable invoice mutation would — there is no cached read path that can
   see stale scheduling evidence longer than an equivalent stale invoice would be tolerated.
8. **SQL and TS keep agreeing** — the parity truth table covers the new axis; the roster and the
   contact page can never show different Loyal sets.
9. **Batched, never N+1.** The count is computed for a whole page in one query, as today.
10. **No behavior change for orgs whose invoices are already ≥2 distinct *local* days** — the tz fix
    only removes contacts promoted by a UTC-midnight straddle.

## 3. DELTA — transitions and the tests that prove them

| # | Transition | Slice | Proof |
|---|---|---|---|
| D1 | `issued_at::date` → `(issued_at at time zone $tz)::date`, `$tz` from `fin_settings` | S1 | Postgres test: two invoices at 18:00 and 20:00 Lima on one day ⇒ `loyal=false`; 18:00 Lima on two different days ⇒ `loyal=true` |
| D2 | The loyal predicate stops being invoice-only: distinct dates over (**non-void** procedure invoices ∪ `completed`-and-past bookings), deduped across sources, aggregated as an **independent** per-contact relation and combined with the invoice aggregate by a base-contact left join — not by filtering bookings through `contact_invoice_class` | S2 | Tests: invoice day A + completed booking day B ⇒ loyal; invoice and booking on the same local day ⇒ 1 date, not loyal; `no_show`/`cancelled`/`accepted`/future-dated-`completed` bookings ⇒ not counted; **zero invoices + two completed bookings ⇒ loyal, and revenue fields stay `0`/unset, not thrown** |
| D3 | Booking↔contact resolution starts from **every live contact** (`crm_contact_id`, nullable `party_id`) — not from the party-filtered invoice CTE — and matches on `crm_contact_id = contact_id OR (party_id is not null AND party_id = contact.party_id)`, counting a doubly-linked booking once | S2 | Tests over all three link shapes, **including a `party_id IS NULL` contact whose only link is `crm_contact_id`** |
| D4 | The finance-map cache key gains the timezone (and the visit-source shape), so a settings change cannot serve a stale Loyal set | S1 | Unit test on the key builder |
| D5 | Roster SQL and TS derivations still agree, now including the visit axis | S1, S2 | `crm-funnel-parity.sql.integration.test.ts` extended with 0/1/2 visit dates × source mix |
| D6 | `distinctVisitDates` and the analyze route's `visits >= 2` write branch are deleted; the route documents the floor as the Loyal source | S3 | `rg distinctVisitDates src/` is empty; route test: a model answering `loyal` still cannot set it, and no `_funnel` write happens on the Loyal path |
| D7 | Re-stubbing a visit/loyal signal to a constant fails a test | S3 | Anti-recurrence guard test |
| D8 | `createBooking` and every `setBookingStatus` transition bust the same cache tags a comparable invoice mutation busts (`contactFinanceMap`, `rankContactsPageCached`, the dashboard cache) — scheduling evidence is never staler than invoice evidence | S2 | Test: warm all three caches, transition `accepted → completed → no_show`, assert the very next read reflects each transition (no TTL wait) |
| D9 | `ContactFinance` (internal, not the wire response) exposes a numeric `visitDates` alongside `loyal`, so tests can assert the literal count the source DoD asked for | S2 | Tests assert exact `visitDates` of 0, 1, and 2 across the source-mix cases in D2, separately from the `>= 2` threshold check |

---

## 4. Slices

### Slice 1 — Bucket visit dates in the org's business timezone

**Topics:** `crm`, `logic`, `test` · **Tags:** `logic`, `test` · **Estimate:** 4–6 h

**Goal:** the already-shipped Loyal count stops depending on the database session zone. No new
source, no new consumer — one behavior change, isolated and provable.

**Do:**
- In `crm-finance.service.ts`, add `visitDateSql(col: SQL, tz: string)` rendering
  `(${col} at time zone ${tz})::date`, with `tz` **bound as a parameter** (the `financeDataSpan`
  precedent), and convert `FIN_LOYAL` from a module-level constant into a call-time builder
  `finLoyalSql(tz)` — the same shape `contactInvoiceClassSql(rule)` already uses, and for the same
  reason: a per-org input cannot be frozen at module load.
- Resolve the zone once per public call with `getFinSettings(ctx).timezone` in
  `loadContactFinanceMap` and at the roster call site in `crm-contacts.service.ts` (the CASE that
  splices `FIN_LOYAL`). One resolution per request, never per row.
- Add the resolved zone to the `crm-fin-map` cache key next to the deposit-rule fingerprint (D4).
  A settings change must not serve a stale Loyal set from the 2m/30s cache.
- Update the `FIN_LOYAL` / `ContactFinance.loyal` doc comments to say which zone the day boundary
  is in.

**Files:** `crm-finance.service.ts`, `crm-contacts.service.ts` (call site only),
`crm-finance.service.test.ts`, `crm-funnel-parity.sql.integration.test.ts`.

**Verification criteria (automated):**
```bash
bun run vitest run src/server/services/crm-finance src/server/services/crm-funnel
#   red-state first
#   - TZ: 2 procedure invoices at 18:00 and 20:00 America/Lima on ONE local day (23:00Z and
#     01:00Z the next day) → loyal = false   ← the whole point; fails before the change
#   - 2 procedure invoices on two different local days → loyal = true (unchanged)
#   - an org whose fin_settings.timezone is 'UTC' behaves exactly as today (no silent shift)
#   - CACHE KEY: two different timezones produce different keys
bun run vitest run && bun run check
if git diff --name-only origin/master...HEAD | grep -Eq '\.svelte$|supabase/migrations|db/schema'; then exit 1; fi
```

### Slice 2 — Completed appointments become the second visit source

**Topics:** `crm`, `logic`, `test`, `edge-case` · **Tags:** `logic`, `test` · **Estimate:** 6–8 h

**Goal:** the proposal's "fin_invoices/scheduling" becomes true, inside the single definition S1
just made timezone-correct — including for contacts that have **no invoice at all**, and without
leaving any cached surface holding stale scheduling evidence.

**Do:**
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
- Add a `contact_visit_date` CTE next to `contactInvoiceClassSql` — exported from
  `crm-finance.service.ts` so both consumers splice the *same* SQL. It unions **non-void**
  procedure-invoice days with **past, `completed`** booking days, joining bookings off
  `contact_target` (not `contact_party`) so a `crm_contact_id`-only, partyless booker is reachable:
  ```
  contact_visit_date as (
    select contact_id, d from (
      select cic.contact_id, ${visitDateSql(sql`cic.issued_at`, tz)} d
        from contact_invoice_class cic
        join fin_invoices fi on fi.id = cic.invoice_id
       where cic.has_proc and cic.issued_at is not null and fi.status <> 'void'
      union all
      select ct.contact_id, ${visitDateSql(sql`b.start_time`, tz)} d
        from contact_target ct
        join sched_bookings b
          on b.org_id = current_setting('app.current_org_id', true)
         and (b.crm_contact_id = ct.contact_id
              or (ct.party_id is not null and b.party_id = ct.party_id))
       where b.status = any(${VISIT_BOOKING_STATUSES})
         and b.start_time <= now()
    ) u
    group by contact_id, d
  ),
  contact_visit_agg as (
    select contact_id, count(distinct d) as visit_dates
      from contact_visit_date
     group by contact_id
  )
  ```
  `union all` + `group by` dedupes across sources and across the two booking link paths (D2, D3).
  `fi.status <> 'void'` mirrors `crm-journey.service.ts`'s existing void exclusion (D2/H4).
  `b.start_time <= now()` is the M1 fix: `setBookingStatus` validates neither transitions nor
  timestamps, so a future booking can be marked `completed` — the predicate, not an unenforced
  service invariant, is what keeps a future booking from counting as attendance.
- **`contact_visit_agg` is aggregated independently and combined by a base-contact left join, not
  by selecting from `contact_invoice_class` (fixes H1).** In both consumers
  (`loadContactFinanceMap` in `crm-finance.service.ts:117-121` and the roster/dashboard `fin` CTEs
  in `crm-contacts.service.ts:560-571,925-938`), change the base relation from
  `from contact_invoice_class cic ... group by cic.contact_id` to a base-contact-anchored form:
  `from contact_target ct left join (existing invoice aggregate) ic on ic.contact_id = ct.contact_id
  left join contact_visit_agg cva on cva.contact_id = ct.contact_id`. Revenue/count fields keep
  reading from the invoice aggregate only (`coalesce(ic.total, 0)`, etc.) — the visit axis must
  never fan out or change those numbers. `fin_loyal` becomes
  `coalesce(cva.visit_dates, 0) >= 2`, and `ContactFinance.visitDates` (D9) is
  `coalesce(cva.visit_dates, 0)`.
- `const VISIT_BOOKING_STATUSES = ['completed'] as const`, with the reasoning in a comment:
  hub's own status domain (`scheduling-bookings.service.ts:370`) has a distinct `no_show`, so
  `accepted` is a *pre-visit* state, not attendance. **This is the resolution of the pass-2 human
  blocker: `completed` is the authoritative attended status.** It under-counts for orgs that never
  close out appointments — an under-count never falsely promotes anyone, and widening it to
  past-dated `accepted` bookings is deferred (§5) with a ledger entry rather than guessed at.
- **Cache invalidation (D8, H3).** `createBooking` and every `setBookingStatus` transition in
  `scheduling-bookings.service.ts` must, after commit, bust the same cache tags an invoice mutation
  busts for the affected contact: the `contactFinanceMap` tag, the roster/`rankContactsPageCached`
  CRM tag, and the dashboard tag. Locate the existing invoice-mutation invalidation call (used by
  `fin-invoices` writes) and call the same helper from the booking service — do not invent a
  second invalidation path. If no shared helper exists, name that as a blocking discovery in the
  PR before writing scheduling-side invalidation ad hoc.
- Keep the existing module gate (`bothEnabled(ctx, 'crm', 'finances')`) exactly as-is. Consequence,
  which must be recorded and not silently absorbed: an org with scheduling but **not** finances
  still gets no Loyal. Leave `TODO(handoff): scheduling-only orgs get no visit dates while the
  count rides the finance map — see proposals/2026-08-17-hub-distinct-visit-dates.md` at the gate,
  and append the same to that proposal.
- Update `ContactFinance.loyal`'s doc comment: "repeat visitor — ≥2 distinct local days with a
  non-void procedure invoice or a past, completed appointment".
- Extend the parity truth table with the visit axis (D5), including the zero-invoice/booking-only
  case and the void-invoice case.

**Files:** `crm-finance.service.ts`, `crm-contacts.service.ts` (the CASE's CTE list and both `fin`
call sites), `scheduling-bookings.service.ts` (cache invalidation on `createBooking` and
`setBookingStatus`), `crm-finance.service.test.ts`, `crm-funnel-parity.sql.integration.test.ts`,
`scheduling-bookings.service.test.ts` (or equivalent, for the invalidation assertions),
`proposals/2026-08-17-hub-distinct-visit-dates.md` (ledger append, meta-repo).

**Verification criteria (automated except the EXPLAIN review):**
```bash
bun run vitest run src/server/services/crm-
#   - CROSS-SOURCE: procedure invoice on local day A + completed booking on local day B → loyal
#   - BOOKING-ONLY: zero invoices, two completed bookings on different local days → loyal=true,
#     visitDates=2, revenue/invoice-count fields unchanged (0/unset) — H1
#   - VOID: a procedure invoice + a VOID procedure invoice on a different day → 1 date, not loyal;
#     a valid second invoice later voided → drops back below 2 — H4
#   - FUTURE-COMPLETED: a booking dated in the future marked completed → not counted — M1
#   - DEDUPE: invoice and completed booking on the SAME local day → 1 date → NOT loyal
#   - EXCLUDED: no_show / cancelled / rejected / pending / accepted bookings → not counted
#   - LINKS: booking linked only by crm_contact_id on a contact with party_id NULL counts; only by
#     party_id counts; both → once — H2
#   - EMPTY: contact with party_id null and no bookings → 0, no throw
#   - MODULES: org with no sched_* rows → unchanged; org with finances off → {} as today
#   - COUNT: visitDates asserts the literal 0/1/2, not just the >=2 threshold — M2/D9
#   - PARITY: SQL funnel_stage == maxFunnelStage(effectiveFunnelStage, financeFloorStage) for
#     every (_funnel × inbound × deposit/procedure × visit-dates 0/1/2 × source mix). No skips.
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
- **UI** — the proposal's own exclusion. No `.svelte` file is edited in any slice, so the `ui`
  governance gates do not apply. The visible effect is that the Loyal set on existing screens gets
  smaller (tz fix) and then larger (appointments) — no component changes.
- **Widening the attended set to past-dated `accepted` bookings.** Deferred deliberately (S2): it
  needs the real `select status, count(*) from sched_bookings group by 1` distribution and an
  operator decision about whether this business closes appointments out. Ledger entry required.
- **Scheduling-only orgs.** The count rides the finance map's `crm × finances` gate; widening that
  gate touches revenue reads too. Recorded as a handoff, not fixed here.
- **Persisting Loyal.** The floor stays read-time (TO-BE #6). No backfill, no cron, no
  re-analysis pass over existing contacts.
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
| `@minion-stack/db`, `@minion-stack/shared`, gateway WS frames | **None** — server-side services and one existing REST route; no frame, no response-shape change (the analyze route's JSON keys are unchanged; only the dead `loyal` early-return disappears) | re-check `rg 'funnel/analyze' ~/work/minion/src` at PR time |
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
if git diff --name-only origin/master...HEAD | grep -Eq '\.svelte$'; then exit 1; fi
if git diff --name-only origin/master...HEAD | grep -Eq 'supabase/migrations|db/schema'; then exit 1; fi
! rg -n 'distinctVisitDates' src/ scripts/       # → empty

# The proposal's DoD, literally: a contact seeded with 2 visit dates on the party spine reports
# 2 dates and lands on 'loyal' — one from fin_invoices, one from a completed booking.
bun run vitest run src/server/services/crm-finance src/server/services/crm-funnel

# Live behavior on a dev org:
#  a. a contact with ONE local visit day (two same-evening invoices) → NOT loyal on /crm/customers
#     AND on the contact page (this is the row the old UTC cast promoted)
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
```

**Ship gate:** §7 green; the EXPLAIN plan from S2 pasted in the PR; the `show timezone;` output
recorded (it is the evidence that D1 was a real defect); the S2 handoff appends made to
`proposals/2026-08-17-hub-distinct-visit-dates.md`; and any line-number drift from §1 corrected in
this spec in the same PR.
