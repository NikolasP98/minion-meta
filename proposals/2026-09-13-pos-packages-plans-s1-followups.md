---
id: 2026-09-13-pos-packages-plans-s1-followups
title: POS packages + payment plans — open ends left by slice S1 (data layer)
status: draft
created: 2026-09-13
updated: 2026-09-15 (§33 closes §29.1, §31.1, §31.3, §32.1, §32.2, §32.3)
repos: [minion_hub]
---

# POS packages + payment plans — S1 follow-ups

Open ends left by slice S1 of spec `2026-09-13-pos-scheduling-packages-payment-plans-spec`
(migration `20260914000000_pos_packages_plans.sql`, `pos-accounts.service.ts`,
`pos-packages.service.ts`, `pos-accounts.logic.ts`). Each has a matching `TODO(handoff)` in
code where noted. None of these block S2.

## 1. Cancelling a partially-used package grant (policy, not code)

`cancelGrant` (`src/server/services/pos-packages.service.ts`, `TODO(handoff)`) refuses with 409
`package_in_use` while ANY non-reversed redemption exists. That is exactly the rule spec §3.6
states for `voidTicket`, and it is the safe default — a client must never silently lose a paid
session.

But §4.2 puts a "cancel a grant" action on `/pos/accounts`, and the realistic case there is a
package the client part-used and abandoned (paid for 6, took 2, never came back). Under the
current rule staff cannot close it out at all.

Unanswered: may an admin cancel keep the consumed sessions and void the remainder? Does the
unused value (`sessions_remaining × unit_value`) return to the client as a `pos_client_ledger`
`adjustment` row, or is it forfeited? Both are business decisions, not implementation gaps.

Definition of done: one decided rule, implemented as an explicit second entry point (not a
boolean flag on the existing one), with the ledger row written in the same transaction when the
answer is "return the value".

## 2. Cancelling a payment plan leaves its paid instalments alone

`cancelPlan` (`src/server/services/pos-accounts.service.ts`, `TODO(handoff)`) flips status to
`cancelled` and writes nothing back. Already-paid instalment tickets stay valid and fully
traceable (their lines carry `plan_id`), so no money is lost or double-counted — but there is no
refund path either. Same open question as §1: credit to the ledger, void the tickets, or leave it
to the operator.

## 3. `unit_value` is a flat split, with sub-cent dust

`allocateGrants` (`pos-accounts.logic.ts`) divides the line total evenly over every session the
line bought and rounds to cents, so a total that does not divide evenly loses up to a cent
(S/ 100 over 3 sessions → 3 × 33.33 = 99.99). `unit_value` drives revenue *recognition* and the
value displayed on a redeemed 0-priced line; no money moves on it. Upgrade path when a report
needs the cent back: weight by the child sellable's list price, and give the remainder to the
first grant (largest-remainder).

## 4. Spec §3.1's `unit_value` formula drops `line.qty` — implemented differently

Spec §3.1 writes `unit_value = line.total / Σ(edge.qty)`. For `line.qty > 1` that values each
session at `qty ×` its real share, so the grants would claim more revenue than the line took.
S1 implements `line.total / (line.qty × Σ edge.qty)` — identical for `qty = 1`, and the only
reading where `Σ(unit_value × sessions_total) === line.total`. Covered by a unit test. The spec
text should be corrected on its next pass rather than the code following it.

## 5. Derived grant status is never materialised

`pos_package_grants.status` only ever stores `active` or `cancelled`; `exhausted` / `expired` are
computed on read by `grantStatus` so they can never be stale. The column's check constraint still
admits all four values, per spec §2.3's note that a nightly tick may materialise them later. If
that tick is ever built, it must not become the authority — the read model stays derived, and the
stored value is a cache for list filtering only.

## 6. The migration has not been applied anywhere

Slice S1's definition of done includes "migration applies on a disposable Postgres". It has not
been run: no local Postgres was available in the implementation environment and Docker required
privileges the agent does not hold. The file is syntax-reviewed against its neighbours
(`20260707120000_pos.sql`, `20260725030000_fin_product_components.sql`) only. Whoever picks up S2
should apply it to a throwaway database first.

## 5. A `scope: 'following'` cancel is N transactions, not one (S3)

`cancelBooking` (`minion_hub/src/server/services/scheduling-bookings.service.ts`, `TODO(handoff)`)
resolves the target occurrences in one read and then calls `setBookingStatus` once per booking, so
each cancellation (status row + log row + redemption reversal + accrual release) is its own
transaction. A failure partway through leaves the earlier occurrences cancelled — with their
sessions already handed back, which is the safe direction — and the later ones live.

Re-issuing the identical request is idempotent and finishes the job (an already-cancelled
occurrence is a no-op and reverses nothing twice), so this is a UX gap, not data loss. It stays N
transactions deliberately: one transaction spanning the whole series would hold row locks on every
occurrence while the per-booking accrual release runs, and that release is explicitly post-commit
and fail-soft.

Definition of done: either the UI reports which occurrences were cancelled (the endpoint already
returns the id list) and offers a one-click retry, or `cancelBooking` grows a single-transaction
variant for the status+log+reversal half with the accrual releases still fired afterwards.

## 6. A series discovers an exhausted package on the LAST occurrence (S3)

`createBookingSeries` redeems one session per occurrence as it goes, so booking 6 sessions against
a grant with 4 left fails on the 5th and rolls the whole series back — correct, but the operator
only learns after filling in six slots. The grant's `sessionsRemaining` is already readable
(`getGrant`), so the booking UI (S4) should refuse to submit more slots than the grant can cover;
the server-side check stays where it is, because it is the only one that is race-free.

## 7. Detail payload lives on `getBookingDetail`, not `getBooking` (S3, deviation)

The S3 brief asked for `getBooking` itself to return the detail payload. It stayed the cheap
single-row read (three callers — the accrual route, the complete route and the PATCH completion
path — need only `productId` / `partyId` / `title` / `status`), and the drawer's payload is the new
`getBookingDetail`, which additionally fails soft on the POS and stock facets so an org with those
modules off still gets the appointment. No call site changed. If a later pass wants one entry
point, `getBooking` is the one to delete, not `getBookingDetail`.

## 8. Rescheduling drops the package link (S3)

The only reschedule path in the hub (`src/routes/api/gateway/actions/booking-reschedule/+server.ts`)
books a new booking and cancels the old one — there is no `updateBookingTime` in
`scheduling-bookings.service.ts` (the route says so itself). With S3 in place the cancel now
reverses the old booking's redemption, so the session correctly returns to the client, but the
replacement booking is created without `packageGrantId` and redeems nothing: the client is never
short a session, the new appointment simply does not show as package-funded, and
`sched_bookings.package_grant_id` is empty where the drawer expects it.

Marked with a `TODO(handoff)` on `reverseBookingRedemptionsInTx`. Definition of done: a real
`rescheduleBooking(ctx, id, newStart)` that moves the row (keeping `package_grant_id`,
`payment_plan_id`, `series_id`/`series_index` and the redemption) instead of the
create-new-then-cancel pair, with `rescheduled_from_id` still stamped.

## 9. `credit` is a magic payment-method id (S2)

`CREDIT_METHOD_ID = 'credit'` in `src/server/services/pos.service.ts` (`TODO(handoff)`) is the only
signal that a tender draws on `pos_client_ledger` instead of a real one. Spec §3.5 defines it that
way, but "crédito" is also how a Peruvian till labels a credit CARD: an org that registers a card
method with the id `credit` would silently drain stored value on every card sale (and 409 with
`insufficient_credit` for clients who have none).

Definition of done: a `drawsOnCredit: boolean` field on `PaymentMethod`, set by the settings UI,
with `validateMethods` refusing more than one such method; the id stops being load-bearing.

## 10. A ticket of only redeemed sessions cannot be rung up through the API (S2)

`submitTicket` now accepts a 0-priced line carrying `redemptionId` (the money moved when the package
was sold), but `/api/pos/tickets` POST still requires `payments` to hold at least one entry
(`TODO(handoff)` in that route), so a ticket whose total is 0 is rejected at the wire. Harmless
today — no UI rings one up until S4 — but the service and the route disagree.

Definition of done: `payments: z.array(paymentSchema)` with no `.min(1)`, once the S4 sell screen
exists to exercise it; the service's `sum(payments) === total` invariant already covers the 0 case.

## 11. `pos_ticket_lines.redemption_id` is not unique (S2)

`assertRedemptionsUsable` (`TODO(handoff)`, `pos.service.ts`) checks that a claimed redemption is
this org's and not reversed, but nothing stops the same redemption id appearing on two ticket
lines. The session itself is still drawn exactly once (the redemption row is the authority), so no
capacity is lost — only the line↔session reporting link becomes ambiguous.

Definition of done: a partial unique index on `(org_id, redemption_id) where redemption_id is not
null`, in the migration that next touches `pos_ticket_lines`.

## 12. Voiding an instalment ticket does not un-settle a settled plan (S2)

`voidTicket` (`TODO(handoff)`) reverses redemptions, cancels grants and writes opposing ledger rows,
but `settlePlanIfPaid` only ever settles. Voiding the instalment that closed a plan leaves
`status = 'settled'` while the derived `paidToDate` (which excludes void tickets) correctly drops
below the total. Every read recomputes progress, so nothing double-counts — the stored status is
simply stale.

Definition of done: `settlePlanIfPaid` becomes `reconcilePlanStatus` (settles when paid, reopens a
settled plan when no longer paid), called from `voidTicket` for every plan the voided ticket's lines
touched.

## 13. Client accounts are grouped by `coalesce(contact, party)` (S2)

`listClientAccounts` and `clientKeyOf` (`TODO(handoff)`, `pos-accounts.service.ts`) key an account
on the CRM facet when present and the party spine otherwise. A client whose older rows carry only
the party facet and whose newer rows carry both therefore appears as TWO accounts. Every write path
in S2 stamps both facets whenever the ticket carries both, so new data does not split; historical
rows can.

Definition of done: resolve every row to one canonical client through the party spine before
grouping (or backfill `crm_contact_id` on the ledger/grant/plan rows), once a real org's data shows
the split.

## 14. `voidTicket`'s `package_in_use` check is read-then-write (S2)

The check runs in its own read transaction BEFORE the stock cancel, deliberately: a refusal must
never leave a cancelled stock entry behind on a ticket that stays live. It is not repeated inside
the write transaction, so a booking that redeems one of the ticket's grants in the millisecond
between the two would be cancelled along with the grant.

Definition of done: either re-run `packageReversalPlan` inside the write transaction (and move the
stock cancel after it), or take a `select … for update` on the grant rows in the pre-check so the
booking path blocks. Neither is worth doing before a real conflict is observed.

## 15. `getBookingDetail` is short of what the drawer's spec asks for (S4, scheduling)

`BookingDetailDrawer.svelte` renders everything `getBookingDetail` returns, and three items
listed in spec §4.1 are simply absent from the payload:

- **Linked POS ticket(s).** There is no ticket link in `BookingDetail` at all — not on the
  booking row, not on the grant (`sourceTicketId` is the ticket that SOLD the package, not one
  that charged this appointment), not as a list. The drawer omits the section.
- **Who changed the status.** `statusHistory[].changedBy` is a bare `uuid` with no profile join,
  so the history reads "Confirmed → Completed" with no actor. Rendering a raw uuid would be worse
  than omitting it.
- **Next due instalment.** `PlanDetail` gives `paidToDate` / `remaining` but never resolves
  `plan.dueSchedule` (untyped jsonb) into the next unpaid date, which §4.1 calls for.

Definition of done: `getBookingDetail` returns `tickets: Array<{ id; number; total; status }>`
(a `pos_ticket_lines.booking_id` link or an equivalent join must exist first), joins
`changedBy` to a display name, and `getPlan` computes `nextDue: { dueOn; amount } | null`.
All three are additive to the payload — the drawer sections are already shaped for them.

## 16. Four of the drawer's §4.1 actions are not wired (S4, scheduling)

Spec §4.1 lists reschedule, "charge in POS", "pay in instalments" and "book the next session
from the remaining grant" alongside the three this slice shipped (complete, no-show, cancel with
`scope`). The four omitted ones all need POS surfaces that the scheduling half of S4 was
explicitly scoped out of (`/pos/**`, `src/lib/components/pos/**`), and reschedule has no
scheduling-service entry point at all today (see §the reschedule TODO in
`scheduling-bookings.service.ts`, which also loses the package link).

Definition of done: the POS half of S4 adds the three money actions to the drawer's footer, and
reschedule lands with a service function that carries `package_grant_id` onto the replacement
booking.

## 17. Series booking UI is one-grant, one-day-at-a-time (S4, scheduling)

`BookingsView`'s package-series flow:

- picks the **first** usable grant `listGrants` returns (ordered `createdAt desc`). A client
  holding two active grants for the same service books against the newest with no picker.
- loads slots one **day** at a time, so a 6-session weekly course is picked by changing the date
  between clicks. The selection survives the reload and the count is shown, but there is no
  multi-day slot view and no "every N days from this date" generator.

Neither is a correctness problem — the client-side pre-check (`slots.length <=
sessionsRemaining`) stops the all-or-nothing rollback the backend would otherwise do on the last
occurrence, and the server re-validates every slot.

Definition of done: a grant picker when more than one is usable, and a multi-week slot picker
(or a recurrence generator that proposes N slots and lets the user adjust each).

## 18. `git checkout messages/` destroyed uncommitted i18n keys (S4, process)

While adding the `sched_detail_*` / `sched_series_*` keys, a `git checkout messages/` in this
shared dirty checkout reverted `messages/en.json` + `es.json` to the index, wiping 36 keys that
existed only in the working tree. 32 were recovered verbatim from `origin/master` (`picker_*`,
`party_picker_*`, `stock_add_items`, `stock_search_items`, `stock_adjustment_hint`); four —
`nav_allSections`, `nav_collapseSidebar`, `nav_expandSidebar`, `nav_platform` — exist in **no**
commit anywhere in the repo and were reconstructed from their call sites in
`ModuleSwitcher.svelte`, `Sidebar.svelte` and `nav/modules.ts`.

Definition of done: whoever owns the module-switcher work re-reads those four English/Spanish
strings and corrects them if the reconstruction differs from what they wrote. The standing rule
(`messages/*.json` is APPEND-ONLY in a shared checkout; never `git checkout` it) holds.

## 19. No till-side redemption: a package session can only be billed after it is booked (S4, POS)

`/pos/sell` bills a package session by attaching an EXISTING `pos_package_redemptions` row to a
0-priced line (`redemptionId`). That row only ever comes from the booking path
(`scheduling-bookings.service.ts` → `redeemSessionInTx`); there is no
`POST /api/pos/packages/grants/[id]/redeem`. So a walk-in who holds sessions but has no booking
cannot have one drawn at the counter — the front desk must create the booking first.

That is faithful to spec §3.2 ("redemption happens at booking time"), but it is a real
counter-workflow gap for clinics that book retroactively.

Definition of done: either a till-side redeem endpoint that mints the redemption inside
`submitTicket`'s money transaction (never before — an abandoned cart must not eat a session), or
an explicit product decision that a session always requires a booking.

## 20. A drawn session can be billed twice (S4, POS + backend)

`submitTicket` never stamps `pos_package_redemptions.ticket_id` / `ticket_line_id`, and nothing
exposes "which ticket line carries this redemption". The sell screen therefore cannot tell an
already-billed redemption from an unbilled one; it only de-duplicates within the CURRENT cart
(`lines.some(l => l.redemptionId === r.id)`). Ringing the same visit up twice produces two
0-priced lines against one session.

No money moves (both lines cost 0) and no capacity is lost (the session was drawn once, at
booking), so this is a reporting-integrity bug, not a financial one. It compounds the existing
backend TODO on `assertRedemptionsUsable` (no unique index on `pos_ticket_lines.redemption_id`).

Definition of done: `submitTicket` back-links the redemption to its ticket line, a partial unique
index enforces one live line per redemption, and the sell screen filters billed redemptions out.

## 21. An instalment line carries no product and does not survive a reload (S4, POS)

Paying a plan instalment adds a cart line with a SYNTHETIC sellable (`plan:<uuid>`) because a plan
may have no `product_id`, and the line posts `finProductId: null` — an instalment is money against
the plan, not a sale of the treatment. Two consequences:

- the ticket line has no catalog product, so per-product revenue reports do not see instalment
  money (the plan and its `plan_id` lines are still the full audit trail);
- the persisted cart drops the line on reload (`loadCart` resolves entries against
  `data.sellables`), so a half-built instalment ticket is lost by a refresh. `redemptionId` lines
  do survive — their sellable is a real catalog row.

Definition of done: decide whether an instalment should post the plan's `product_id` when it has
one (and what that does to revenue-by-product), and persist plan lines by plan id rather than by
sellable.

## 22. `credit` tender has no registration UI (S4, POS)

Paying with stored value requires an org to add a payment method whose id is literally `credit`
(with `takesTendered: false`) in `/pos/settings`. The sell screen renders whatever
`pos_settings.methods` contains, so the tender simply does not appear until someone types that id
by hand — and `/pos/settings` gives no hint that the id is load-bearing (it is also the subject of
the existing `CREDIT_METHOD_ID` TODO: an org naming a credit-CARD method `credit` would draw down
stored value on every card sale).

Definition of done: `/pos/settings` offers "client credit" as a first-class method backed by a
`drawsOnCredit` flag, and the sell screen reads the flag rather than the magic id.

## 23. ui-audit baseline not re-pinned for `/pos/accounts` (S4 → S5)

`/pos/accounts` is a new route under `src/routes`, so `tests/ui-audit/current-baseline.json` is
stale until it is re-pinned (`bun run audit:ui:*`). Route-contract counts WERE updated
(`ROUTE_CONTRACT_EXPECTATIONS.endpoints` 152→153, `screens` 142→143, wave B 70→71) and the
manifest/sub-resource entries added; only the visual baseline is outstanding — it belongs to S5
with the rest of the governance pass.

---

# Slice S5 (closeout) — what changed, and what is still open

S5 closed the two functional holes (§19 till-side redemption, §20 double-billing), the
payload gaps of §15 and §10's wire/service disagreement. The sections below are the open
ends S5 itself leaves. A status ledger for every earlier section is at the bottom.

## 24. The till-side draw happens on CLICK, not on submit (S5, POS)

`POST /api/pos/packages/grants/[id]/redeem` (`pos:edit`) mints a redemption with no
booking, and `/pos/sell`'s "bill session" calls it when the client holds sessions but has
no unbilled redemption. That is what makes a walk-in servable at the counter.

But the session is drawn when the cashier clicks, not when the money commits — the shape
§19 warned about. An ABANDONED cart therefore leaves a drawn, unbilled redemption and the
client is one session short. Two things bound the damage:

- `billSession` reuses an existing live+unbilled redemption before minting a new one
  (`!r.reversedAt && !r.ticketId`), so abandon → re-ring costs nothing; only a client who
  never returns leaves the session stranded.
- the stranded row is now *visible*: `ticket_id is null` on a live redemption is exactly
  "drawn but never billed", queryable per grant.

There is still no way to hand it back from the UI — `reverseRedemption` exists in
`pos-packages.service.ts` but has no route.

Definition of done: either `DELETE /api/pos/packages/grants/[id]/redemptions/[rid]`
(reverse, `pos:manage`) plus a "return session" action on the `/pos/accounts` drawer, or
move the draw into `submitTicket` by letting a cart line carry `grantId` instead of
`redemptionId` and minting inside the money transaction — the shape §19 originally
preferred, which costs the sell screen its optimistic line.

## 25. The ui-audit baseline re-pin is a post-commit step (S5, process)

`/pos/accounts` is a NEW, still-UNCOMMITTED route, and `scripts/ui-audit-inventory.mjs
--clean-baseline` builds its ledger from a Git object (`git ls-tree <commit> src/routes`),
never from the working tree — that immutability is the point of the file. So
`tests/ui-audit/current-baseline.json` cannot be re-pinned to 153 endpoints / 143 screens
until the route files are committed.

What S5 did instead: moved the WORKING-TREE assertion in `scripts/ui-audit-inventory.test.ts`
to 153/143/10 (it was failing), and left the two pinned-commit assertions at 152/142 with
a comment. Both halves are green today.

Definition of done, for whoever commits this initiative:

```bash
git commit …                      # route files first — the pin reads the clean HEAD tree
node scripts/ui-audit-inventory.mjs --clean-baseline --out=tests/ui-audit/current-baseline.json
bunx prettier --write tests/ui-audit/current-baseline.json
# then move the two `cleanBaseline` assertions in scripts/ui-audit-inventory.test.ts
# from 152/142 to 153/143 and commit as `test(ui-audit): pin revised source tree`
```

## 26. The double-bill index went on the redemption side, not on `pos_ticket_lines` (S5, deviation from §11)

New migration `supabase/migrations/20260914010000_pos_redemption_ticket_link.sql`:

```sql
create unique index if not exists pos_package_redemptions_ticket_line_uniq
  on public.pos_package_redemptions (org_id, ticket_line_id)
  where ticket_line_id is not null;
```

§11 asked for `pos_ticket_lines (org_id, redemption_id) where redemption_id is not null`.
That index cannot coexist with the void behaviour S5 also had to ship: `voidTicket` clears
`ticket_id`/`ticket_line_id` so a corrected ticket can re-bill the session, but the VOIDED
ticket's line keeps its `redemption_id` as history — the re-ring would then collide.

The live link is the stamp on the redemption (a scalar column, claimed atomically with
`where ticket_id is null` inside the money transaction); the line column is the audit
trail. The index above enforces the other direction (one redemption per line) and leaves
the re-ring path open.

If a later pass wants the line-side index too, it has to decide first whether a voided
ticket's lines keep their `redemption_id`.

## 27. `/api/scheduling/bookings` and `…/[id]` GET carry no explicit view capability (pre-existing)

`getBookingDetail` now returns package-grant money, plan money and an actor display name.
Its route gates on `getCoreCtx` + `isModuleEnabled('scheduling')` + `shouldMaskSensitive`,
not on `requireOrgCapability(locals, 'scheduling', 'view')` — the older scheduling
convention, unchanged by this spec. The POS client-account reads (`/api/pos/accounts|packages|plans`)
DO carry the explicit gate, and `src/lib/nav/modules-rbac.test.ts` now asserts that for
every one of them.

Definition of done: decide whether the scheduling read convention should move to an
explicit `scheduling:view` check (it would be a behaviour change for roles holding the
module but not the capability), and apply it to all scheduling reads at once rather than
to the two routes this spec happened to touch.

## 28. Neither migration has been applied anywhere (S1 §6 restated, still true)

`20260914000000_pos_packages_plans.sql` and `20260914010000_pos_redemption_ticket_link.sql`
are both unapplied. S5 ran no database. Apply them to a throwaway Postgres before any
remote target, in that order.

## Status ledger for the earlier sections

| § | State after S5 |
|---|---|
| 1 | open — partial-grant cancel policy still undecided |
| 2 | open — plan cancellation writes nothing back |
| 3 | open — `unit_value` sub-cent dust |
| 4 | open — spec text still carries the `line.qty`-less formula |
| 5 (grant status) | open by design — status stays derived |
| 5 (series cancel) | open — `scope: 'following'` is still N transactions |
| 6 (migration) | open — see §28 |
| 6 (series exhaustion) | closed in S4 — the UI pre-checks `sessionsRemaining` |
| 7 | accepted deviation — `getBookingDetail` stays the drawer's read |
| 8 | open — reschedule still drops the package link |
| 9 | open — `credit` is still a magic method id |
| 10 | **CLOSED** — `payments` no longer `.min(1)`; a 0-total session ticket rings up |
| 11 | **superseded** by §26 |
| 12 | open — voiding an instalment does not reopen a settled plan |
| 13 | open — accounts still grouped by `coalesce(contact, party)` |
| 14 | open — `package_in_use` is still read-then-write |
| 15 | **3 of 4 CLOSED** — actor name, `nextDue`, `packageName` all in the payload and rendered; linked POS tickets still absent (no ticket→booking join) |
| 16 | open — 4 drawer actions unwired |
| 17 | open — one-grant, one-day series picker |
| 18 | open — 4 reconstructed nav strings need an owner's eyes |
| 19 | **CLOSED** — see §24 for the residual |
| 20 | **CLOSED** — stamp + `redemption_already_billed` 409 + §26's index; the sell screen filters billed redemptions out |
| 21 | open — instalment lines carry no product and do not survive a reload |
| 22 | open — no `credit` registration UI |
| 23 | **superseded** by §25 |

## §29 — Two-step /pos/sell checkout (S2, 2026-09-14)

The sell screen was split into a cart step and a `?step=pay` payment step
(`src/lib/components/pos/PaymentStep.svelte`; the page stays the state owner).
Open ends left behind:

1. **Tenders are not re-prorated when the cart changes.** Payments live in page
   state and survive a Back to the cart step, so editing the cart after
   prefilling a tender can leave Σ tenders above the new total. `payBlocker`
   reports it (`pos_pay_over_tendered`) and Finish sale stays disabled, but the
   cashier has to remove the row by hand. A prorate-or-drop on re-entering the
   pay step would be kinder. Site: `+page.svelte`, `payBlocker`.
2. **Discount affordance is one-way.** `SellCart`'s per-line discount field
   appears on demand and never goes away again for that line (typing `0` leaves
   the input on screen). No "clear discount" verb. Site:
   `SellCart.svelte`, `discountOpen`.
3. **`tests/ui-audit/current-baseline.json` was NOT re-pinned.** The sell route's
   markup changed substantially; re-pinning needs `bun run audit:ui:seed` +
   `audit:ui:certify` against a seeded local stack, which was out of scope for a
   session whose dev server points at the production database.
4. **No browser QA.** Same reason: the only running dev server on :5173 is bound
   to production, and exercising the pay step would ring real tickets. The flow
   is verified by `bun run check` (0/0), the design/token gates and
   `src/lib/components/pos/checkout-money.test.ts` only.
5. **`messages/{en,es}.json` key order churned.** 135 keys that were already in
   the working tree (uncommitted `pos_acct_*`, `pos_pkg_*`, `sched_detail_*`,
   `picker_*`, …) moved to the end of the file while the 16 new `pos_pay_*` keys
   were appended. No key and no value was lost or changed (verified key-by-key
   against `HEAD`), but a co-agent rebasing those files will see the move.

---

## S6 — Unified booking calendar (`BookingCalendar`) + new-appointment page (2026-09-14)

Merged the `/pos/appointments` fork (732 lines, flagged by the module-boundary
audit) and the hand-rolled `/scheduling/calendar` day grid into one component,
`src/lib/components/scheduling/BookingCalendar.svelte`: grid, time axis, event
boxes, interactive hover card, day/workweek/week switching and date navigation
now exist exactly once. `/pos/appointments`'s new-appointment modal became the
page `/pos/appointments/new`, backed by the reusable
`src/lib/components/scheduling/AppointmentForm.svelte`.

### Open ends

1. **`/scheduling/calendar` has no empty-slot affordance.** The new-appointment
   page lives at `/pos/appointments/new` and resolves to
   `permission:pos.appointments:view` through the longest-prefix rule, so a
   scheduling-only role would 403 on it. The scheduling calendar therefore
   passes no `onslot` and its grid background is inert. `AppointmentForm` is
   already route-agnostic — a sibling scheduling-side page (its own
   `+page.server.ts` + the component) closes this without a third form copy.
   Site: `src/routes/(app)/scheduling/calendar/+page.svelte`, `TODO(handoff)`
   next to the `BookingCalendar` call.
2. **Event boxes are laid out in the BROWSER's timezone.** The data window is
   resolved in the ORG's timezone (`calendarInstantWindow` →
   `zonedDayWindow`), but `dayOf`/`minutesOf` in `BookingCalendar` use local
   `getHours()`. A front desk viewing a Lima org from another timezone sees
   every box shifted and week columns bucketed one day off. Pre-existing on both
   surfaces; thread the org tz into the component and format through it. Site:
   `BookingCalendar.svelte`, `dayOf()` `TODO(handoff)`.
3. **`BookingsView.svelte` still carries its own booking modal.** It is now the
   last copy of the form. Adopting `AppointmentForm` needs two extra props
   (`email`, `crmContactId`) that the scheduling list collects and POS does not.
   Site: `BookingsView.svelte`, `TODO(handoff)` above its `<Modal>`.
4. **Hover card has ONE default action, not two.** The brief asked for
   "open / edit"; the hub has no separate booking-edit surface —
   `BookingDetailDrawer` *is* where status, notes and cancellation are edited.
   The card therefore renders `Open` plus whatever the route contributes through
   its `actions` snippet (POS: charge / complete / no-show / cancel). If a
   distinct "edit" (reschedule, change service) is wanted, it is a new surface,
   not a second button.
5. **Lane packing counts lanes per COLUMN, not per overlap cluster.** Two
   bookings that overlap each other in an otherwise empty day still halve the
   width of every other box in that column. Marked `ponytail:` at the site;
   upgrade to cluster-local lane counts only if columns routinely hold 4+
   overlaps.
6. **`tests/ui-audit/current-baseline.json` was NOT re-pinned.** `/pos/appointments/new`
   is a new route, so the clean-baseline ledger (152/142) and the working-tree
   ledger (now 154/144) diverge by two screens until the route files are
   committed and the baseline is regenerated — the existing `TODO(handoff)` in
   `scripts/ui-audit-inventory.test.ts` already owns that step.
7. **No browser QA.** Same constraint as S1–S5: the only dev server on :5173 is
   bound to the production database, and exercising the booking flow would
   create real appointments. Verified by `bun run check` (0 errors / 0
   warnings), `lint:design` (no changed file in the ▲ list), `lint:tokens`
   (0 violations), the route/nav/ui-audit suites (111 passing) and
   `src/lib/components/scheduling/calendar-window.test.ts` (6 passing). The
   three new/changed components were additionally confirmed to transform
   cleanly through the running Vite server.
8. **`pos_appt_today` / `pos_appt_week` are now unused.** The Today/7-days
   toggle they labelled was replaced by the day/workweek/week
   `SegmentedControl`. Left in `messages/{en,es}.json` deliberately — those
   files are append-only in this shared checkout.

## §30 — Calendar i18n · DNI-first quick-add · sell→schedule step (2026-09-15)

Three connected changes on the POS/calendar surfaces. Open ends, each with a
matching `TODO(handoff)` at its site:

1. **The quick-add no longer captures a PHONE.** Owner directive: *"Quick-add
   should only take a DNI"*. `AppointmentForm` reuses `CustomerPicker` and feeds
   `phone` straight to `attendeePhone`, so an appointment booked for a
   brand-new client now carries no phone unless the registry/party row already
   had one — reminders have nothing to send to. Fix: source the phone from the
   CRM contact at booking time, or give the BOOKING form (not the till) its own
   optional phone field.
   Site: `minion_hub/src/lib/components/pos/CustomerPicker.svelte`, above
   `applyQuick`.
2. **`requirements.identityDocument: 'optional'` is inert.** The level is
   stored, validated and selectable in `/pos/settings`, but `submitTicket` and
   the charge button treat it exactly like `'off'` — it exists so the level is
   already modelled when the non-blocking nudge is built.
   Site: `minion_hub/src/server/services/pos.service.ts`, `submitTicket`.
3. **A failed ticket↔booking link leaves an orphan appointment.** In the
   schedule step, `POST /api/scheduling/bookings` and
   `POST /api/pos/tickets/:id/schedule` are two calls. If the second fails the
   appointment already exists, the line stays pending, and retrying books a
   SECOND appointment — nothing offers to link the orphan. Fix: a "link an
   existing booking" picker on that step.
   Site: `minion_hub/src/lib/components/pos/ScheduleStep.svelte`, `onbooked`.
4. **The /pos/accounts resume link points at `/pos/sell`.** A role holding
   `pos.accounts:view` but not `pos.sell:view` gets a 403 on click instead of a
   hidden link. Gate it with `canViewPath('/pos/sell')`, or give the resume step
   a home that is not the till.
   Site: `minion_hub/src/routes/(app)/pos/accounts/+page.svelte`.
5. **"Pending scheduling" counts the whole back catalogue.** The state is
   DERIVED (`kind = 'service' and booking_id is null` on a non-void ticket), so
   on first deploy it lights up for every service ever sold without a booking —
   including services that never needed one. A cutoff date or a per-org opt-in
   is the fix if the noise is real.
   Site: `minion_hub/src/server/services/pos-accounts.service.ts`,
   `listClientAccounts` CTE `s`.
6. **Only the NEWEST pending ticket per client is linkable.** A client with
   several pending tickets gets one link; the older ones are reachable only by
   finding the ticket. A per-ticket breakdown in `ClientAccountDrawer` is the
   upgrade.
   Site: `pos-accounts.service.ts`, `ClientAccountSummary.pendingTicketId`.
7. **The migration is NOT applied anywhere.**
   `minion_hub/supabase/migrations/20260915000000_pos_requirements_pending_scheduling.sql`
   adds `pos_settings.requirements jsonb not null default '{}'` and the partial
   index `pos_ticket_lines_org_pending_scheduling_idx`. Both are additive and
   `if not exists`; until applied, `getPosSettings` reads `undefined` for the
   column and `normalizeRequirements` renders it as `'off'` — i.e. current
   behaviour, unchanged. The owner applies it.
8. **Times are still browser-locale.** Task 1 localised every DATE label the
   calendar renders (weekday, day+month, and the toolbar range title) through
   the new `formatDate` in `$lib/utils/format`. `hhmm()` in `BookingCalendar`
   and `AppointmentForm` still uses `toLocaleTimeString(undefined, …)`: an
   es-PE clock is 12-hour ("7:00 p. m.") where the grid deliberately reads
   24-hour, so converting it is a product decision, not a bug fix.
9. **No browser QA.** Same constraint as S1–S6 — the only dev server on :5173 is
   bound to the production database. Verified by `bun run check` (0 errors /
   0 warnings), `lint:design` (no changed file in the ▲ list), `lint:tokens`
   (0 violations) and the pos/scheduling/routes/nav suites.

## §31 — Optional quick-add phone · atomic book-and-link (2026-09-15)

Closes §30.1 (the quick-add captured no phone) and §30.3 (a failed ticket↔booking
link left an orphan appointment). Owner directives, verbatim: *"yes, optional
phone"* and *"please fix with a hardened SINGLE endpoint"*.

`POST /api/pos/tickets/:id/schedule` now takes the BOOKING payload and creates the
appointment and the `pos_ticket_lines.booking_id` stamp in one transaction
(`bookAndLinkTicketLine`, `minion_hub/src/server/services/scheduling-bookings.service.ts`).
The client-side pair is gone; `setTicketLineBooking` was deleted with it, since
nothing can create an orphan for a "link an existing booking" picker to adopt.

Open ends, each with a matching `TODO(handoff)` where noted:

1. **An EXISTING party with no phone still cannot get one from the till.** The
   quick-add's optional phone only reaches `POST /api/crm/parties` on the CREATE
   path; when the DNI matches a party already on file the picker takes that row
   verbatim, phone column included (empty or not). Editing it is the CRM's job
   today, so a long-standing client with no phone on file still books a
   reminder-less appointment. Definition of done: either a phone patch on the
   party from the picker (a new gated write), or a "missing phone" nudge on the
   booking row that deep-links to the CRM contact.
   Site: `minion_hub/src/lib/components/pos/CustomerPicker.svelte`, above
   `commitQuick`.
2. **Minimum notice is still bypassed for this path.** The endpoint books with
   `bypassRules: true` / `source: 'internal'` — byte-for-byte the posture of the
   `POST /api/scheduling/bookings` call it replaces, because the till books
   same-day appointments all day. Slot computation, conflict detection and
   resource availability all still run. If the org ever wants min-notice enforced
   at the counter, that is a product decision and a new `pos_settings` flag, not a
   silent flip here.
3. **`created: false` is not surfaced in the UI.** A double-submit gets the SAME
   booking back with `created: false`; `ScheduleStep` simply closes the form and
   re-reads the ticket, so the operator cannot tell "I booked it" from "it was
   already booked". Harmless (the outcome is identical and correct) but a toast
   reading the flag would explain the no-op.
   Site: `minion_hub/src/lib/components/pos/ScheduleStep.svelte`, `onbooked`.
4. **`pos_sched_link_failed` is now an orphan message key.** The two-call failure
   it described cannot happen any more. Left in `messages/en.json` / `es.json`
   because those files are append-only in this workflow; delete it in a pass that
   sweeps unused keys wholesale.
5. **No browser QA.** Same constraint as S1–S6 and §30: the only dev server on
   :5173 is bound to the production database. Verified by `bun run check`
   (0 errors / 0 warnings), `lint:design` (no changed file in the ▲ list),
   `lint:tokens` (0 violations) and the pos + scheduling suites (13 files /
   185 tests), including the new
   `src/server/services/scheduling-bookings-ticket-link.test.ts`.

## §32 — POS customer control: one Picker-backed surface (2026-09-15)

Owner ask: *"I think a better job can be done in laying out the UI for the crm
picker (include the crm primitive picker). Also, improve the quick-add UI so its
more cohesive and its logic doesnt conflict between add new and search."*

`CustomerPicker.svelte` showed a free-text "Buscar cliente…" input AND a separate
DNI quick-add form stacked in the same 380px rail, both live at once. The two
overlapped: the DNI ladder's first rung already searches the parties endpoint, so
the second search box was redundant, and nothing told the cashier which input was
in play.

Rebuilt as a two-state control over the shared `Picker` primitive:

- **Empty** — one full-width outline button (`pos_customer_select`) that opens
  `Picker` (`loadRows` → `GET /api/crm/parties?type=person`, which already matches
  name / email / document / phone server-side; columns name · document · phone).
- **Create path** — the DNI quick-add is the picker's `PickerCreateConfig.form`
  (new `CustomerQuickAdd.svelte`), not a parallel form. The resolution ladder is
  byte-identical to the old one: existing party by `docNumber` → `/api/crm/dni-lookup`
  registry name → manual-name fallback on registry miss only, plus the optional
  phone. Rung 1 calls the picker's `oncreated` with the EXISTING row, so the same
  DNI resolves to the same one client whether it is typed in browse or in create —
  search and create can no longer disagree.
- **Selected** — a compact summary: name, document, phone (each with an explicit
  "no document" / "no phone" state), `In CRM` vs `Ticket only` badge, Change,
  Clear, and an account deep link. When the org requires an identity document and
  the selected client has none, the summary itself turns danger-bordered and
  states the block, instead of only surfacing as a toast at charge time.

Bindings (`partyId` / `customerName` / `phone` / `docNumber`), the `required`
prop, the ticket-only fallback when `POST /api/crm/parties` is refused, and the
`?step=schedule` path that hides the control are all unchanged.

Open ends, each with a matching `TODO(handoff)`:

1. **The browse search term does not seed the create tab.** `PickerCreateContext`
   carries only `oncreated` / `oncancel`, so a DNI typed in the picker's search box
   is retyped in the quick-add. Correctness is unaffected (rung 1 re-searches that
   DNI, so no duplicate can be created) — it is one keystroke set too many.
   Definition of done: extend `PickerCreateContext` with the current query and
   thread it through every consumer (`PartyPicker` already seeds its create form
   from its own external input, so the contract change would let it drop that).
   Site: `minion_hub/src/lib/components/pos/CustomerPicker.svelte`, above the
   `quickAddForm` snippet.
2. **`/pos/accounts?client=party:<id>` only opens the drawer for a client that
   already has account rows.** `listClientAccounts` lists movements, not every
   party, so a freshly created client's link lands on the plain list. Definition of
   done: either have the accounts load synthesize an empty row for a requested
   `?client=`, or point the link at a party detail surface once one exists (today
   `/crm/[contactId]` is keyed by CONTACT, not by party).
   Site: `minion_hub/src/lib/components/pos/CustomerPicker.svelte`, on the account
   link; the seed itself is `src/routes/(app)/pos/accounts/+page.svelte`.
3. **§31.1 is still open and now reads worse.** An existing party with no phone
   still cannot get one from the till — and the new selected state says so out
   loud ("Without a phone the appointment reminder has no recipient") without
   offering a fix. Same definition of done as §31.1.
   Site: `minion_hub/src/lib/components/pos/CustomerQuickAdd.svelte`, above `commit`.
4. **`pos_sell_customer_ph`, `pos_sell_customer_dni_ph` and
   `pos_sell_customer_phone_ph` are now orphan message keys.** The free-text search
   placeholder and the pre-DNI-ladder inline fields they named no longer exist.
   Left in `messages/en.json` / `es.json` because those files are append-only in
   this workflow; delete in a pass that sweeps unused keys wholesale.
5. **No browser QA.** Same constraint as every slice above: the only dev server on
   :5173 is bound to the production database. Verified by `bun run check`
   (0 errors / 0 warnings), `bun run lint:design` (neither new file appears in the
   ▲ list; global `raw-icon-size` fell 1147 → 1145), `bun run lint:tokens`
   (0 violations) and the POS suites (9 files / 156 tests).

## §33 — Follow-up closeout: tender re-fit · till-side phone · replay notice · deep-link resolve · picker query (2026-09-15)

Owner ask: *"implement the remaining gaps, make sure theyre covered and tested properly."*
Five items, each with a test. No database was touched and no migration was
written — none of these needed one.

### CLOSED

**§31.1 + §32.3 — an existing party with no phone can now get one from the till.**
The selected-customer card grows an inline "add phone" affordance
(`src/lib/components/pos/CustomerPicker.svelte`, `savePhone`) that PATCHes the
CRM's OWN party-edit route — `PATCH /api/crm/parties/[id]`, which already served
the customers-table verified checkmark and is gated centrally as `crm:edit` by
`apiWriteCapability` ('/api/crm' prefix). No second write route was invented, and
the affordance is hidden for a role without `crm:edit` (`canAct('crm','edit')`),
so it never renders a button that would only 403. The new service write is
`setPartyPhone` (`src/server/services/party.service.ts`): it normalizes through
the existing `phone9()` — the spine stores the last-9-digits key and that column
is also a dedup key — and OVERWRITES rather than coalesce-backfilling, because it
is an explicit user edit. The UI binding is updated from the STORED value the
route answers with, so the card and the spine cannot disagree.
Tests: `src/server/services/party-phone.service.test.ts` ("stores the phone9 key,
not the typed string" · "refuses a number too short to be a key, without touching
the row" · "answers null when no party in this org has that id") and
`src/routes/api/crm/parties/[id]/server.test.ts` ("writes a phone onto an existing
party and answers the stored value" · "still serves the verified-checkmark body it
was built for" · "refuses a phone the spine cannot key on, without writing").
The `TODO(handoff)` in `CustomerQuickAdd.svelte` is removed.

**§29.1 — tenders re-fit when the cart changes after payment was entered.**
New pure helper `fitTendersToTotal` in `src/lib/components/pos/checkout-money.ts`
(the file the existing `checkout-money.test.ts` was named for but that did not
exist). Rule: when Σ tenders exceeds the new total the excess comes off the
LAST-ENTERED row, which is dropped when fully absorbed, and the walk continues
backwards; a row's `tendered` follows its amount DOWN only when it was the
prefilled `tendered === amount` (real cash handed over is kept and the change
owed simply grows, and a short tender is never silently raised). A total that
RISES returns the same array reference — the shortfall stays "Remaining".
Wired in `src/routes/(app)/pos/sell/+page.svelte` as an `$effect` on the cart
total (`untrack`ed read of `payments`, converges in one pass).
`pos_pay_over_tendered` stays as the guard for any state the re-fit does not
reach. Tests: `src/lib/components/pos/checkout-money.test.ts`, describe
`fitTendersToTotal` — exact/identity, under-tender, single-row trim, multi-row
drop, zero total, real-cash change preserved, short tender never raised, cent sums.

**§31.3 — `created: false` is surfaced.** `AppointmentForm` was dropping the flag
on the floor (`const { booking } = await res.json()`); its `onbooked` is now
`(booking, created?)` — strictly optional, so `/pos/appointments/new` is
unchanged. `ScheduleStep.svelte` keeps the returned appointment in `replay` when
`created === false` and renders an info notice naming its date and time
(`pos_sched_already_booked`), instead of closing as though a new one was made;
starting another booking clears it. Test:
`src/routes/api/pos/tickets/[id]/schedule/server.test.ts` ("reports a fresh
booking as created" · "reports an idempotent replay as NOT created, with the same
appointment") — the pair the UI now reads.

**§32.2 — `?client=` resolves any party/contact key.** New
`resolveClientAccount(ctx, clientKey)` in `pos-accounts.service.ts` reads the
party spine / CRM contact directly and returns a named, ZEROED
`ClientAccountSummary`; `/pos/accounts/+page.server.ts` calls it only when the
movements list has no row for the requested key, and the page opens the drawer on
`accounts.find(…) ?? data.requestedClient`. A key naming nothing in this org
resolves to null, so the drawer now opens on NOTHING for a forged id (it
previously opened an anonymous empty one). Test:
`src/server/services/pos-accounts-resolve.test.ts` ("resolves a party key to a
named, zeroed account" · "resolves a contact key and carries its party spine
along" · "answers null for a key that names nothing in this org" · "rejects a
malformed key rather than guessing a column").

**§32.1 — the picker's create tab receives the browse query.**
`PickerCreateContext` gains `query: string` (`src/lib/components/ui/picker.ts`),
passed at the single render site in `Picker.svelte`. The addition is safe: the
create contract has exactly ONE consumer today — `CustomerPicker` — and the other
three `<Picker` users (`PartyPicker`, `StockItemPicker`, `PackageEditor`) either
type their create snippet with an inline structural subset (`{ oncreated }`,
which stays assignable under parameter contravariance) or pass no create config
at all. All four re-checked: `bun run check` 0/0 and their suites pass.
`CustomerQuickAdd` seeds its DNI field through the new pure `dniFromQuery`, which
fires only for an exact 8-digit number — the same search box matches names,
emails and phones, and seeding "ana" into a DNI field would be worse than blank.
Test: `src/lib/components/pos/customer-quick-add.test.ts`.

### Still open

1. **`PartyPicker` still seeds its create form from its own external input.**
   §32.1 noted the contract change would let it drop that. It was left alone on
   purpose: the change is additive, the duplication is inside one component, and
   touching a fourth consumer to delete three lines buys nothing this slice needs.
2. **No component test covers the two UI behaviours** (the "add phone" affordance
   and the replay notice). There is no component-test harness in this repo — zero
   `@testing-library/svelte` imports under `src/` and no DOM environment in
   `vitest.config.ts` — so the proof for those two stops at the service/route
   boundary (the writes and the flag they render) plus `bun run check`. Standing
   up a DOM lane is a repo-wide decision, not this slice's.
3. **No browser QA.** Same constraint as every slice above: the only dev server
   on :5173 is bound to the production database, and exercising the till would
   ring real tickets and book real appointments.
4. **`resolveClientAccount` returns zeroed counters**, not a re-aggregation. It is
   only called when `listClientAccounts` had no row for the key; a client who HAS
   rows but fell outside that list's 200-row limit would also get zeros here. The
   drawer's own `GET /api/pos/accounts/[clientKey]` is the authority for every
   number it displays, so nothing user-visible is wrong — noted at the site.
5. **§32.4's orphan message keys** (`pos_sell_customer_ph`,
   `pos_sell_customer_dni_ph`, `pos_sell_customer_phone_ph`, `pos_sched_link_failed`)
   are still in `messages/{en,es}.json`; those files stay append-only in this
   shared checkout. Three keys were APPENDED by this pass:
   `pos_customer_add_phone`, `pos_customer_phone_save_failed`,
   `pos_sched_already_booked`.
6. **The ui-audit baseline re-pin is still outstanding** (§25/§29.3/§S6.6). This
   pass added no route and no screen — the new `server.test.ts` files are tests —
   so the counts did not move; the route/nav/ui-audit suites are green at 111.

### Status ledger delta

| § | State after §33 |
|---|---|
| 29.1 | **CLOSED** — `fitTendersToTotal` + the `$effect` on the cart total |
| 31.1 | **CLOSED** — `setPartyPhone` + `PATCH /api/crm/parties/[id]` + the card affordance |
| 31.3 | **CLOSED** — `created` threaded to `onbooked`, replay notice in `ScheduleStep` |
| 32.1 | **CLOSED** — `PickerCreateContext.query` + `dniFromQuery` |
| 32.2 | **CLOSED** — `resolveClientAccount` fallback on the accounts load |
| 32.3 | **CLOSED** — same fix as §31.1 |
| 32.4 | open — orphan keys await a wholesale sweep |
| 32.5 | open — no browser QA (production-bound dev server) |


## §34 — RUC parties are SUNAT-verified at create (2026-09-17)

Owner (2026-09-17): "All RUC/business account SHOULD be verified via API."
Live probe of the documented endpoint (`GET api.perudevs.com/api/v1/ruc`)
with `20511417253` returned LABORATORIOS BIOPAS S.A.C.; an unknown RUC answers
HTTP 200 `{estado:false}`, which the parser now treats as not-found.

### CLOSED

- `POST /api/crm/parties` verifies every 11-digit document against SUNAT
  server-side (`src/server/services/ruc-registry.ts`, 10-min per-instance
  cache); unknown → `422 {code:'ruc_not_found'}`, outage → 502, no key → 503.
  The registry's razón social overrides the typed name; the party is flagged
  `dni_verified=true` with `metadata.ruc_registry` as the audit trail.
- POS quick-add no longer offers a manual name for an unknown RUC (DNI keeps
  its manual rung); the CRM create form surfaces the 422.

### Still open

- **34.1 Pre-existing RUC parties are unverified.** Rows created before this
  change (finance/SUSII reconcile, earlier quick-adds) carry no
  `ruc_registry` and `dni_verified=false`. The DNI backfill mechanism
  (`/api/crm/dni-validation/tick`) is still `wiring: 'unscheduled'` in
  `system-automations.ts`, so extending it to 11-digit company docs would be
  inert until the crontab line exists. Pointer:
  `TODO(handoff)` in `src/server/services/ruc-registry.ts`.
