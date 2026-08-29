---
spec: 2026-08-17-hub-distinct-visit-dates-spec
pass: 6
verdict: pending
reviewer: factory-review
created: 2026-08-17
updated: 2026-08-29
---

# Review record — disposition: STILL IN REVIEW (pass 6 awaiting re-review)

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
