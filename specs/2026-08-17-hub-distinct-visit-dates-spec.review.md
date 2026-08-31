---
spec: 2026-08-17-hub-distinct-visit-dates-spec
pass: 12
verdict: pending
reviewer: factory-review
created: 2026-08-17
updated: 2026-08-31
---

# Review record — disposition: STILL IN REVIEW (pass 12 awaiting re-review)

## Pass 12 — external review blocker fixed, awaiting re-review

Pass 12 resolves the sole pass-11 re-review finding by choosing the policy the prescribed SQL,
its explanation, and the DANGLING acceptance test already shared. Party fallback applies only
when `crm_contact_id IS NULL`. A non-null direct ID that no longer resolves to a live same-org
contact is excluded rather than silently reassigned through the booking's independently
reconciled `party_id`. Invariant 5 and D3 now state that exact rule, including the zero-owner
outcome; no SQL or test behavior changed. Hub `master` advanced from the pinned `1b47e8ce` to
`f0ba8a36`, but its intervening relevant changes do not alter the nullable/no-FK scheduling
bridges or CRM soft-delete path that make this identity shape reachable.

## Pass 11 — external review blocker fixed, awaiting re-review

Pass 11 makes the visit-truth census closed under one consistent rule. Invariant 7 now quantifies
only over in-domain mutations that can change visit ownership, eligibility, day bucketing, or
procedure classification, while requiring every out-of-domain production search hit to remain
classified with exact changed fields and an exemption rationale. A fresh run of both prescribed
search forms at pinned hub commit `1b47e8ce` added the omitted `finClients` non-party upsert and
also retained the raw invoice source-overlay and CRM display-name enrichment hits. None changes a
field the visit definition reads; D18 already covers the invoice transaction containing the first
two hits.

## Pass 10 — external review blockers fixed, superseded by pass 11

Pass 10 closes the latest machine-truth and census-gate findings. The spec and this sidecar now
record pass 10. The writer census classifies every search hit and requires post-commit invalidation
only for mutations that can change visit truth. Two raw `crm_contacts` relationship-inference
writes are retained as reviewed out-of-domain hits because they change only
`custom_fields._relationshipClaim`, which the visit definition does not read. This makes the
mandatory rerun executable without adding unrelated cache churn.

The earlier pass-10 corrections remain intact: `updated_at` is explicitly mutable, an operator
policy decision is mandatory even when the early-completion diagnostic returns zero, and
`fin_invoice_items` is included in both census search forms.

## Pass 9 — external review blocker fixed, superseded by pass 10

The pass-8 count-then-bulk-update repair was not bounded by the operator-reviewed row set. Pass 9
replaces it with a checksummed exact-ID/pre-image artifact, forbids all repair when gate 2 is
positive, and otherwise requires a maintenance boundary plus a transactional exact-set update
whose returned IDs must equal the approved artifact before commit. The artifact is retained for
rollback, and the slice must prove a newly matching row created after capture is untouched. This
closes the latest review's concurrency/data-integrity trigger without reopening prior findings.

## Pass 3 — approved (rewritten against verified hub reality)

Passes 1–2 were written without a `minion_hub` checkout and reasoned from meta-repo migrations plus
older CRM specs. This pass verified the code directly: hub `master` @ `1b47e8ce` (2026-08-28,
fetched 2026-08-29). Every claim below is an anchor in that commit, not a carried lead.

## What the verification changed

| Pass-2 claim | Verified reality | Consequence |
|---|---|---|
| "Loyal auto-detection never fires for any org" (the proposal's problem statement) | **False.** `FIN_LOYAL = count(distinct case when has_proc then issued_at::date end) >= 2` (`crm-finance.service.ts:76`) → `ContactFinance.loyal` → `financeFloorStage()` (`crm-funnel.ts:130`) and the SQL `FIN_FUNNEL_IDX`/`FUNNEL_STAGE_EXPR` (`crm-contacts.service.ts:355,359`). Loyal auto-advances read-time for every CRM+Finances org | The spec's S1/S2 would have built a **second** Loyal definition — the exact hazard pass-2's own ⚠️A4 warned about. Withdrawn |
| "S0 must discover whether the Loyal decision is the model's" (⚠️A7, called decisive) | Already deterministic: `.../funnel/analyze/+server.ts:45-53` does `if (visits >= 2) setFunnelStage(..., 'loyal', {by:'auto'})`, and the prompt + `coerced !== 'loyal'` guard forbid the model from choosing Loyal | Work item removed |
| "S2 must add forward-only, manual-wins, write-only-on-change guards" | All three already exist in `setFunnelStage` (`crm-contacts.service.ts:1727+`): `.for('update')` row lock, advance-only for `auto`/`agent`, skip when `prev.auto === false`, no write when the stage would not move | Work item removed |
| ⚠️A5 "amplifies the unfixed read-modify-write" | `2026-08-18-hub-funnel-atomic-write-spec` is `shipped` (hub PR #125) | Risk retired |
| ⚠️A1 deposit handling is an open question | `crm-deposit-rule.ts` ships; `has_proc`/`has_deposit` split is the org-configurable rule (`crm-finance.service.ts:58-68`) | Answered |
| ⚠️A4 roster parity may be blocked on pagination S2 | `crm-funnel-parity.sql.integration.test.ts` exists — S2 landed | Unblocked; the spec extends the truth table |
| "No org timezone column exists anywhere" (§1 of pass 2) | `fin_settings.timezone` `not null default 'America/Lima'` (`pg-finance-schema.ts:249-255`), already threaded into `financeDataSpan(ctx, tz)` and `/finances` (`finance.service.ts:806-815`, `routes/(app)/finances/+page.server.ts:26`) | The tz is a resolvable parameter, not a hardcoded constant + TODO |
| "CRM/finance/scheduling DDL lives in minion-meta" | Hub owns the live `supabase/migrations/` (e.g. `20260823000500_fin_invoices_shadowed.sql`); meta's copy is an older partial | §1 re-anchored to hub |

## The pass-2 blocker is resolved by evidence, not by a guess

Pass 2 blocked on: *"If scheduling has no authoritative completed/attended status, a human must
decide whether a past `accepted` booking counts as a visit."* Hub defines the domain explicitly:
`SETTABLE = {accepted, pending, cancelled, rejected, completed, no_show}` and
`RELEASING = {cancelled, rejected, no_show}` (`scheduling-bookings.service.ts:370-371`), and
`scheduling-analytics.service.ts:76,147-150,194` counts `no_show` separately from realized
bookings. `completed` is therefore the authoritative attended state, and the spec uses
`VISIT_BOOKING_STATUSES = ['completed']`. Widening to past-dated `accepted` is explicitly deferred
(§5) with a ledger entry, because it needs the real status distribution and an operator call — but
it no longer blocks: an under-count never falsely promotes anyone.

## What remains, and is what the spec now delivers

1. **A real, live defect** — `issued_at::date` buckets in the DB session zone (UTC on Supabase; hub's
   pool sets no `TimeZone`), so two invoices on one Lima evening straddle UTC midnight and promote a
   single-visit contact to Loyal. Fixed in S1 with the org's own `fin_settings.timezone`.
2. **The proposal's DoD is half-met** — scheduling is not a visit source at all. Added in S2 inside
   the same expression, deduped across sources and across both booking link paths.
3. **The dead stub and its divergent write path** — deleted in S3, with an anti-recurrence guard, so
   the "just fill in the stub" fix that would re-persist Loyal cannot be made silently.

## Why `approved` and not `changes_requested`

The spec is now anchored to code that was read, it has no open human decision on its critical path,
its DELTA entries each map to a proving test, and it ships zero DDL and zero `.svelte` edits
(`logic`/`test` gates only — no UI governance). Residual risk is coordination, not correctness:
`crm-finance.service.ts` and `crm-contacts.service.ts` are contended by
`2026-08-17-hub-reserva-keyword-config-spec` S3 (open hub PR #160) and
`2026-08-13-crm-customers-server-pagination-spec` (`implementing`); §6 requires branching off
current `origin/master`, rebasing before the PR, and narrow commits.

Behavior change to state at merge: the Loyal set shrinks (tz fix) and then grows (completed
appointments). It stays read-time, so it self-corrects when evidence changes.

## Open items carried to the ledger (AGENTS.md)

- Scheduling-only orgs (finances module off) still get no visit dates — the count rides the finance
  map's `crm × finances` gate. `TODO(handoff):` at the gate + append to
  `proposals/2026-08-17-hub-distinct-visit-dates.md` (S2).
- Widening the attended set to past-dated `accepted` bookings — deferred, same proposal.

## Pass 4 — external review: FAIL (superseded the pass-3 approval)

Four High, two Medium, one Low against the pass-3 S2 SQL and its consumers. All were fixed in
pass 4 of the spec and confirmed closed by the pass-5 reviewer: booking-only contacts could never
produce an aggregate row (H1); the booking join started from the party-filtered CTE and so missed
the partyless shape `createBooking` normally writes (H2); scheduling mutations busted no cache,
leaving three cached surfaces stale (H3); `void` invoices stayed visit evidence (H4);
`completed` was assumed terminal and past-dated when `setBookingStatus` validates neither (M1);
the literal count the source DoD asks for had nowhere to land (M2); three verification gates used
`grep … && exit 1`, which fails precisely when the diff is clean (L1).

## Pass 5 — external review: FAIL, then fixed in place

Three findings, each re-verified this pass against a real `minion_hub` sparse checkout at
`1b47e8ce` (blobless clone + `sparse-checkout '/src/*'` — no database, no credentials needed):

| Finding | Verified | Fix |
|---|---|---|
| R2-H1 (High) — `contactFinanceSummary` is a third Loyal definition and it is what the contact detail page renders | Confirmed: own session-zone `issued_at::date` (`:230`), own `party_id is not null` gate (`:197`), `return null` before the aggregate when there are no invoices (`:208`); loaded at `[contactId]/+page.server.ts:57` and spent at `+page.svelte:748` | S1 now deletes its `purchased`/`reservedOnly`/`loyal` and moves the page's floor onto the ranked row it **already loads** — the same decoration `/crm/customers` uses. Its null contract is left alone so no card appears or disappears (D10) |
| R2-M1 (Medium) — `fi.status <> 'void'` drops NULL-status invoices | Confirmed: `status: text('status')` with no `.notNull()` (`pg-finance-schema.ts:44`), `string \| null` in the connector contract, and `crm-journey.service.ts:83` already uses the null-safe form | Predicate is now `status is distinct from 'void'`, stated as an invariant (§2.3) with its own test case |
| R2-M2 (Medium) — the OR join fans one party-linked booking across sibling contacts | Confirmed: `crm_contacts_party_idx` is non-unique and `CONTACT_PARTY`'s `distinct on (party_id)` exists to collapse exactly that | A `booking_owner` CTE gives every booking exactly one owner: direct `crm_contact_id` wins, `party_id` is a fallback resolved through the canonical `CONTACT_PARTY` pick (§2.5, D3) |

### One defect found while verifying, not raised by either review

**P5-F1.** Pass 4's own H1 fix said to re-anchor the roster and dashboard `fin` CTE on all live
contacts. `fin`'s *membership* means "has ≥1 invoice" and is read by `booked`
(`count(*) filter (where fin_invoices is not null)`), `finance_buyers` (`select count(*) from
fin`), `is_buyer`, the `revenue` sort key, and the `RankedContact.finance` null sentinel — so that
change would have silently broken five shipped numbers to fix one. Both queries already anchor on
`crm_contacts c` and `left join fin`, so the visit aggregate is a second left join in `base` and
`fin` is not touched at all. Recorded as invariant §2.11 and D11, with a golden regression test.

**Disposition.** `status: review`, `verdict: pending` — the spec is corrected and internally
consistent, but three external FAILs mean the approval is the reviewer's to give, not the author's
to re-assert. No hub product code has been written; the branch stays planning-only.

## Pass 6 — external review: FAIL, then fixed in place

One High, three Medium, one Low. All re-verified this pass against the same `1b47e8ce` sparse
checkout (`git ls-remote` confirms hub `master` has not moved since pass 5):

| Finding | Verified | Fix |
|---|---|---|
| H1 — invoice mutations bust only the `finances` tag; `rankContactsPageCached` carries only `crm`, so a normal sync/void can leave the roster stale while the dashboard (which already carries `finances` conditionally) and the uncached contact-detail read update | Confirmed: `crm-contacts.service.ts:439-443` (roster, `crm` only) vs `:552-555` (dashboard, `crm` + conditional `finances`); `finance-sync.service.ts:123-140` calls `bustFinanceCache` only | S1 copies the dashboard's exact conditional `finances` tag onto the roster (D13) |
| M1 — `updateFinSettings` performs no cache invalidation; a `timezone` change can serve a stale Loyal set from any of the three caches for their TTL+SWR window | Confirmed: full body read, `finance.service.ts:546-588`, no `invalidateTags`/`bustFinanceCache` call | S1 adds one `bustFinanceCache(ctx)` post-commit; sufficient for all three once H1's tag fix lands, because `crm-fin-map` already carries `finances` unconditionally (D4) |
| M2 — the pass-5 `booking_owner` CTE fixed sibling fan-out but still let a booking linked directly to a non-canonical sibling stay on that sibling forever, so an invoice on the canonical contact and a booking on its sibling never combine | Confirmed by re-reading the pass-5 CTE against `CONTACT_PARTY`'s canonical-pick semantics and `party.service.ts:218-221` (booking's own `party_id` is independently reconciled from `attendee_phone`, not copied from the linked contact) | S2's `booking_owner` canonicalizes a direct link through the **linked contact's own** `party_id` via `contact_target` + `CONTACT_PARTY`, so it always resolves to the same canonical contact invoice attribution already uses; partyless direct links and the no-direct-link fallback are unchanged (D3) |
| M3 — `contactFinanceMap` is not consumer-free as §1 claimed; `crmRevenueSummary` counts `buyers += 1` per map row with no invoice guard, so S2's booking-only rows would inflate the buyers rollup | Confirmed: `crm-finance.service.ts:152-177`, `buyers += 1` unconditional at `:170` | §1's false claim corrected; S2 guards the increment on `f.invoices > 0` (D14) |
| L1 — the §7 gate's `grep -Eq '\.svelte$' && exit 1` fails on exactly the one `.svelte` file S1 requires | Confirmed by reading §7 against S1's own (correct) exact-path assertion | §7 replaced with the same exact-path assertion S1 already uses |

**Disposition.** `status: review`, `verdict: pending` — unchanged posture from pass 5: corrected and
internally consistent, approval still belongs to an external reviewer. No hub product code has
been written; the branch stays planning-only.


## Pass 7 — external review: FAIL, then fixed in place

One High, one Medium, one Low, all re-verified this pass against a fresh `1b47e8ce` sparse checkout
(blobless clone + `sparse-checkout '/src/*'`; `git ls-remote` confirms hub `master` has still not
moved). All three turned out to be **wider than reported**, which is recorded below because the
width is the point.

### The meta-finding: four rounds of one-call-site-at-a-time

Passes 4, 5, 6 and 7 each found *one more writer or consumer* of the visit-date evidence that the
previous round's targeted fix had not swept: H3/D8 (booking mutations) → pass-6 H1 (invoice
mutations) → pass-6 M1 (settings) and M3 (a map consumer) → pass-7 H1 (identity mutations). Each
fix was correct and each left the next one findable. Pass 7 therefore stops patching named call
sites and adds a **complete writer census** to §1 — every relation the visit SQL reads, every
writer of it at `1b47e8ce`, whether that writer invalidates, and whether it does so *after* its
mutation commits — built by grepping both write forms (Drizzle `.insert/.update/.delete(T)` and
raw `insert into`/`update`/`delete from <table>`) rather than from recall. Invariant 7 is restated
as a closed property over that census, and re-running the census is now part of the S1 ship gate.
This is the structural answer to a failure class that four targeted fixes did not close.

| Finding | Verified — and what was wider than reported | Fix |
|---|---|---|
| H1 (High) — identity reconciliation mutates the visit join after cache invalidation | Confirmed and wider. `reconcileParties` (`party.service.ts:140-267`) rewrites `crm_contacts.party_id`, `fin_clients.party_id` **and** `sched_bookings.party_id` and mints canonical CRM contacts, with **no invalidation at all**, and it has **four** production call sites, not one: `finance-sync.service.ts:159` and `crm-contacts.service.ts:185` both bust *before* it runs (the harvest one also only when `created > 0`), while `routes/api/crm/parties/reconcile/+server.ts:12` and `routes/api/finances/sync/daily/+server.ts:132` never bust. The convention is already in the same file at three smaller writers (`:393`, `:468`, `:557`). The review's claim that `linkContactParty` is a live "no race required" path is the one thing that is *narrower*: `rg` over the whole tree finds **no production caller**, so that half is trap-closing, not an outage — stated that way in §1 rather than oversold | D15 — post-commit `bustCrmList` + `bustFinanceCache` inside `reconcileParties` and `linkContactParty`, i.e. **in the writer**, which fixes all four call sites and every future one at once. Three tests: post-commit coherence, the refill-during-transaction race, and the same coherence driven through the call site that has no bust of its own (S1) |
| M1 (Medium) — `start_time <= now()` changes cached truth with no invalidation event | Confirmed, and the census shows why it cannot be patched on the cache side: `sched_bookings.start_time` is written **once**, at insert (`:289`), and never updated anywhere (`rg` over both write forms; rescheduling is cancel-then-create). A row crossing its own start time is not a mutation, so no invalidation can be attached to it | D16 — enforce attendance at the **write**: `setBookingStatus` refuses `completed` while `start_time > now()`, atomically in the UPDATE, surfaced as 409 at all three entry points; the read then drops `now()` entirely and eligibility becomes purely mutation-driven. Closed by construction because `createBooking` inserts only `pending`/`accepted` (`:280`) and `setBookingStatus` is the only `status` writer. Two evidence queries gate the flip (legacy future-`completed` rows; whether any org completes bookings early) — the second is a **stop**, not a guess |
| L1 (Low) — `visitDates` is not internal | Confirmed. `routes/api/crm/contacts/+server.ts:104` returns `{ contacts: withAutoTags, … }` — ranked rows verbatim — so `finance.visitDates` **and** D12's null-sentinel change are both wire-visible, and pass 6's §6 "no response-shape change" was false | D17 + invariant 12 — the API delta is declared additive, §6 gains a real row for the contacts route (and one for the new 409), and the existing strict `toEqual` assertion at `contacts.test.ts:177` is extended to invoice-only / booking-only / neither. Consumer sweep recorded: `export.csv`'s `valueOf` switch is closed, so it gains no column |

**Disposition.** `status: review`, `verdict: pending` — unchanged posture from passes 5 and 6:
corrected and internally consistent, approval belongs to an external reviewer. No hub product code
has been written; the branch stays planning-only.

## Pass 8 — external review: FAIL, then fixed in place

One High, one Medium, one Low, all re-verified this pass against the same pinned hub commit
(`git ls-remote` re-confirms `master` is still `1b47e8ce`):

| Finding | Verified | Fix |
|---|---|---|
| H1 (High) — a budget-limited finance sync page can commit invoice evidence and return without invalidating any Loyal cache | Confirmed: `advanceJob` commits `upsertInvoicesBatch` (`finance-sync.service.ts:123`) and returns at its per-run deadline (`:136`) *before* either of its own `bustFinanceCache` calls (`:133,140`) — the intended multi-tick path for a long sync, not an exception. The exported `upsertInvoice` wrapper delegates to the same writer and shares the gap, so the census's structural closure claim was false even outside `advanceJob` | Moved the bust into the writer itself: `upsertInvoicesBatch` now does `await bustFinanceCache(ctx)` immediately after its own commit (D18), the same writer-level pattern D15 used for `reconcileParties`. Covers every caller and every early-return path structurally instead of chasing the next one |
| M1 (Medium) — the D16 legacy-repair evidence gates were not independent, so following them in order could rewrite booking status before the STOP condition could ever be observed | Confirmed: `setBookingStatus` stamps `updated_at` at completion, so every row gate 1 targets (`status='completed' and start_time > now()`) necessarily satisfies the pass-7 wording of gate 2 (`status='completed' and updated_at < start_time`) — the two were never disjoint | Gate 2 is rescoped to `start_time <= now()`, making the two gates disjoint by construction; gate 2 now answers the real workflow question independent of gate 1's residue, and gate 1's normalization is never automatic — it requires recorded operator sign-off and its own `where` clause structurally cannot touch a row gate 2 flagged |
| L1 (Low) — the PR's actual GitHub merge ref fails the binding `spec-index.mjs --check` gate | Confirmed: the branch tip was self-consistent, but `origin/dev` had drifted (a stale `updated` date for an unrelated spec's index entry, `2026-08-17-hub-igv-rate-from-org-config-spec`), and the merge tree inherits that drift | Merged current `origin/dev`, regenerated `specs/index.json` from the resulting tree, and reran `--check` against it before this round's commit |

**Disposition.** `status: review`, `verdict: pending` — corrected and internally consistent, approval
belongs to an external reviewer. No hub product code has been written; the branch stays
planning-only.
