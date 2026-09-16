---
id: 2026-09-13-pos-scheduling-packages-payment-plans-spec
title: POS + Scheduling to production — session packages, payment plans, client ledger, booking detail
stage: spec
status: approved
pass: 1
created: 2026-09-13
updated: 2026-09-13

repos: [minion_hub]
type: feature
---

# POS + Scheduling to production — session packages, payment plans, client ledger, booking detail

## 0. Product

Owner, verbatim: *"I feel that there's still a feature gap to push the 2 modules to
production."* and *"implement a way to schedule multiple events for a single invoice
(4 sessions for a single-time payment) or viceversa (multiple invoices for a single
event; for example for clients that pay for an expensive treatment and want to credit
their procedure in 4 payments)"*, plus *"more features to these modules … UI and
backend covered"* — richer event detail, advanced scheduling/POS management.

Two directions of the same money↔calendar relationship:

- **One payment → N sessions.** Client buys a course ("6 sessions of X") in a single
  POS ticket; the sessions are drawn down over weeks as bookings.
- **N payments → one treatment.** An expensive procedure is paid in instalments; each
  instalment is its own fully-paid POS ticket, all applied to one plan attached to the
  treatment's booking.

Market baseline (Fresha, Boulevard, Zenoti, Mindbody, Phorest, Vagaro, Aesthetic
Record, Jane, Cliniko, Square): every comparable ships a **package/course** entity and
a **per-client credit ledger**; only Zenoti ships true card-on-file auto-instalments —
everyone else models instalments as deposit + balance-due drawn against that ledger.
We follow the majority pattern. Deposits, no-show fees, consents/clinical notes,
before/after photos, waitlists and commissions are explicitly **out of scope of this
spec** (tracked in §7 as the next pass).

## 1. Current state (recon, 2026-09-13)

- `submitTicket` requires `sum(payments) === total` (±0.01) or throws `payment_mismatch`.
  **This invariant stays.** Instalments are N fully-paid tickets, never a partial ticket.
- `fin_product_components` (bundle edges) + `listBundleEdges`/`setBundleComponent`/
  `deleteBundleComponent` exist in schema and service but are wired to **no** API route
  and `submitTicket` never explodes a bundle. Packages build on these rails.
- `pos_tickets.invoice_provider_ref` is a dead column (only `voidTicket` reads it).
- `sales_orders_booking_uniq (org_id, source_booking_id)` enforces one sales order per
  booking. **We do not touch it** — the "single invoice" in the owner's ask is the POS
  ticket that sold the package, not a sales order.
- `sched_bookings` has no series/recurrence, no package link, and no status history.
  `rescheduled_from_id` is a single hop.
- There is **no booking detail drawer anywhere**; the calendar day-grid `.evt` box has
  no click handler at all.

## 2. Data model

New tables (migration `supabase/migrations/20260914000000_pos_packages_plans.sql`,
Drizzle in `src/server/db/pg-pos-schema.ts`; every table `org_id text not null`, forced
RLS + `withOrgCore` like its neighbours).

### 2.1 `pos_client_ledger` — append-only stored value per client

| column | notes |
|---|---|
| `id` uuid pk, `org_id` | |
| `party_id`, `crm_contact_id` | at least one non-null (check constraint) |
| `kind` | `topup` · `deposit` · `redemption` · `refund` · `adjustment` |
| `amount` numeric(12,2) | **signed**: positive adds credit, negative consumes |
| `currency` | defaults to `pos_settings.currency` |
| `ticket_id`, `plan_id`, `booking_id` | nullable provenance links |
| `note`, `created_by`, `created_at`, `metadata` | |

Never updated, never deleted — a reversal is a new opposing row. Balance =
`sum(amount)` per client. Index `(org_id, crm_contact_id)` and `(org_id, party_id)`.

### 2.2 `pos_payment_plans` — one treatment, N payments

`id, org_id, party_id?, crm_contact_id?, title, total_amount numeric(12,2), currency,
status ('open'|'settled'|'cancelled'), product_id? (the treatment sellable),
booking_id? (the event being paid for), due_schedule jsonb? ([{dueOn, amount}] — advisory,
no auto-charge), created_by, created_at, settled_at?, cancelled_at?, note`.

Paid-to-date = `sum(pos_ticket_lines.total)` where `plan_id = plan.id` and the parent
ticket is not void. `status` flips to `settled` when paid ≥ total (service-computed on
each applicable write; never a stored running total).

### 2.3 `pos_package_grants` + `pos_package_redemptions` — one payment, N sessions

`pos_package_grants`: `id, org_id, party_id?, crm_contact_id?, source_ticket_id,
source_line_id, package_product_id (the bundle sellable), service_product_id (the child
service), sessions_total int, unit_value numeric(12,2) (price allocated per session,
for revenue recognition and for pricing a redeemed line at 0 with a visible value),
expires_at date?, status ('active'|'exhausted'|'expired'|'cancelled'), created_at,
cancelled_at?`.

`pos_package_redemptions`: `id, org_id, grant_id, booking_id?, ticket_id?,
ticket_line_id?, redeemed_at, redeemed_by, reversed_at?, reversed_by?`.

**Sessions used is derived** — `count(*) where reversed_at is null` — never a stored
counter (no drift). `sessions_remaining = sessions_total - used`. A grant is exhausted
when remaining = 0; expired when `expires_at < today` (today resolved in the ORG'S BUSINESS TIMEZONE via `getFinSettings().timezone`, never UTC; `expires_at === today` is still valid) (computed in the read model, and
a nightly tick may materialise `status` later — not in this pass).

### 2.4 Column additions

- `pos_ticket_lines.plan_id uuid null` — an instalment line.
- `pos_ticket_lines.redemption_id uuid null` — a line paid by a package session.
- `sched_bookings.package_grant_id uuid null`, `payment_plan_id uuid null`,
  `series_id uuid null`, `series_index int null`, `client_note text null`.
- `sched_booking_status_log` (new): `id, org_id, booking_id, from_status, to_status,
  reason?, changed_by, changed_at` — feeds the detail drawer's history.

## 3. Behaviour

1. **Selling a package.** A sellable with `fin_product_components` edges is a package.
   On `submitTicket`, inside the money transaction, each package line writes one grant
   per child edge: `sessions_total = edge.qty * line.qty`, `unit_value = line.total /
   (line.qty * Σ edge.qty)` — corrected in pass 1 implementation: dividing by `Σ(edge.qty)`
   alone double-values every session when `line.qty > 1`; this is the only reading where
   `Σ(unit_value × sessions_total) === line.total`. `expires_at` comes from the package product's metadata
   (`packageValidityDays`, null = no expiry).
2. **Redeeming a session.** Redemption happens **at booking time** (the clinic books the
   next session; the money already moved). Creating a booking with `packageGrantId`
   writes a `pos_package_redemptions` row + sets `sched_bookings.package_grant_id`, and
   fails 409 `package_exhausted` / `package_expired` when the grant cannot cover it.
   Cancelling or no-showing a booking **reverses** the redemption (sets `reversed_at`)
   so the session returns to the client. Completing it leaves it consumed.
3. **Booking a series.** `createBookingSeries(grantId, slots[])` creates N bookings in
   one transaction sharing a `series_id`, each with `series_index`, each redeeming one
   session. Partial failure rolls the whole series back. Editing a booking edits that
   occurrence only; cancelling offers "this one" vs "the rest of the series" (the API
   takes an explicit `scope: 'one' | 'following'`).
4. **Payment plans.** `createPlan` from either a booking (event detail → "pay in
   instalments") or a POS sale. Paying an instalment = an ordinary ticket carrying a
   line of `kind: 'service'` with `plan_id` set; the ticket still balances exactly, so
   the shift, SUNAT emission and stock paths are untouched. A plan's remaining balance
   and its next due date show on the booking detail and on the client account page.
5. **Client credit.** Deposits and refunds-to-credit write `pos_client_ledger` rows; a
   ticket may be paid with the `credit` method, which writes a negative ledger row and
   requires sufficient balance (409 `insufficient_credit`). Registering `credit` as a
   payment method is a `pos_settings.methods` entry with `takesTendered = false`.
6. **Void reverses everything.** `voidTicket` additionally: reverses redemptions created
   by that ticket, cancels grants it created (only if they have no live redemptions —
   otherwise 409 `package_in_use`), and writes opposing ledger rows.

## 4. Surfaces

### 4.1 Booking detail drawer (new, scheduling)

`src/lib/components/scheduling/BookingDetailDrawer.svelte`, opened from the calendar
grid (make `.evt` a real button), from `BookingsView` rows, and from `/pos/appointments`.
Shows: event type + resource + time, status with **history** (`sched_booking_status_log`),
attendee/contact with a link to the CRM contact, internal note vs client-visible note
(two fields, both editable), linked POS ticket(s), package grant with
`sessions_remaining`, payment plan with balance and next due, stock accrual summary,
series siblings (when `series_id` is set). Actions, RBAC-gated: reschedule, cancel
(`scope` one/following), mark no-show, mark complete, charge in POS, pay-in-instalments,
book the next session from the remaining grant.

### 4.2 POS client accounts (new page)

`/pos/accounts` — list of clients holding any credit balance, active package or open
plan, with a detail drawer: ledger entries, grants with remaining sessions and expiry,
plans with paid/remaining. Actions: add credit (topup), cancel a grant, cancel a plan.
Registered in the module registry as a POS page (`getAreaItems('pos')`) and gated by a
new `pos.accounts` sub-resource.

### 4.3 Catalog

`/pos/catalog` gains package composition editing — the existing `setBundleComponent` /
`deleteBundleComponent` service functions get their missing API route
(`/api/pos/sellables/[id]/components`), plus the `packageValidityDays` metadata field.

## 5. Slices

| # | Scope | Definition of done |
|---|---|---|
| **S1** | Migration + Drizzle schema + services: `pos-accounts.service.ts` (ledger, plans), `pos-packages.service.ts` (grants, redemptions, `sessionsRemaining`), pure balance/expiry helpers | `bun run check` clean; unit tests for balance math, expiry, exhaustion, reversal; migration applies on a disposable Postgres |
| **S2** | POS wiring: bundle explosion in `submitTicket`, `credit` tender, plan-payment lines, void reversal, API routes (`/api/pos/accounts/**`, `/api/pos/packages/**`, `/api/pos/plans/**`, sellable components) | tests: sell a package → grants; pay a plan twice → settled; void → reversed; RBAC on every new route |
| **S3** | Scheduling backend: booking columns, redemption at booking, `createBookingSeries`, cancel/no-show reversal, `sched_booking_status_log` writes, series cancel scope | tests: series creation is atomic, cancel returns the session, exhausted grant 409s |
| **S4** | UI: `BookingDetailDrawer` + clickable calendar + series/next-session booking + `/pos/accounts` page and drawer + catalog package editor | `bun run check`, `lint:design`, `lint:tokens` clean; no new design debt; every new string via paraglide (en+es) |
| **S5** | Governance: module registry entries, route-access rules + RBAC sub-resources for new pages/APIs, `modules-rbac.test.ts` extended, ui-audit baseline re-pin | all gates green; no page reaches the `authenticated` fallback |

## 6. Out of scope (this pass)

Deposits with cancellation windows and automatic no-show fees; card-on-file; consents
and clinical/SOAP notes; before/after photos; waitlists; commissions; tips; gift cards;
X/Z reports; refunds to original tender (void stays the only reversal); third-party
financing; recurring auto-charged memberships; parallel multi-provider bookings;
processing/gap time.

## 7. Next pass (ranked, from the market brief)

1. Deposit + cancellation window + staff-charged no-show fee (routes through the ledger
   built here, which is why it is cheap once this lands).
2. Consents/intake forms + clinical note + before/after photos — the medical-clinic
   differentiator; generic salon parity is not sufficient.
3. Processing/gap time (laser/numbing waits) and resource+staff dual conflict checks.
4. Commissions per practitioner, tips, X/Z reconciliation reports.
5. Waitlist auto-match on cancellation.

## 8. Verification

End-to-end on the local QA stack: sell a 4-session package to a contact → book 4
sessions as a series from the grant → cancel one → confirm the session returns →
rebook it → complete all four → grant reads exhausted. Then: create a plan for an
S/ 4,000 treatment on a booking, pay 4 instalments of S/ 1,000 in four tickets →
plan settles, booking detail shows zero balance, every ticket individually balanced.
