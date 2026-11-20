---
id: 2026-11-10-faces-weekly-sync-backlog
title: FACES weekly sync (2026-11-10) — receivables noise, client lookup, campaign attribution, variable consumption
status: draft
created: 2026-11-10
updated: 2026-11-10
repos: [minion_hub]
effort: M
source: faces-weekly-sync-2026-11-10
---

# FACES weekly sync (2026-11-10): backlog triage

## Request

The first weekly FACES staff sync after the restart. Attendees: the owner, Cass (POS and sales),
Pamela (reception: agenda and payments), Ale (brand strategy, alliances, content) and Renzo
(joined late). The owner wants staff to bring change requests every week. The owner then lists
them, gives dates, ships, and collects feedback. Goal one is less manual work.

Every request below was checked against hub `origin/master` `206d9ae2`, read-only through
`git show`. Item 1 was also measured with a read-only prod query against the FACES org
(`21e0601b-…`, `begin read only` … `rollback`). No application code or data was changed.

## Triage

| # | Request (staff words) | Verdict | Size |
|---|---|---|---|
| 1 | "285 por cobrar", but "this month we validated 99.5%" | **Real bug and real backlog.** See §1 | S + ops |
| 2 | Profile: appointments first, dates on purchases, Spanish labels | Small UI debt | S |
| 3 | "How do I find a client's next appointment?" (Slim Face, 4 sessions) | **Mostly exists.** Needs training, plus a "next appointment" field | S |
| 4 | Clients per brand/event/alliance over a date range, with ticket | Partly exists (web/IG attribution, CRM tags). No offline-event source and no campaign report | M |
| 5 | Variable vial consumption (one vial per patient vs. split in three) | **Already supported.** Training gap, not code | ops |
| 6 | Milly left; book with "cualquier profesional" for now | Ops: new resource + reassign future bookings | ops |
| 7 | Could not book until doctor set + forced out-of-hours | Covered by `2026-11-04-hub-visible-capacity-and-custom-booking-time` | — |
| 8 | Deploys knock staff offline (last week's 10:00 outage) | Covered by `2026-08-22-factory-dev-staging-daily-production-promotion` | — |
| 9 | CRM score/stage logic is arbitrary | Needs a marketing session; owner decision | — |
| 10 | Ale/Pamela access to Marketing → CRM | Ops: check roles | ops |
| 11 | Alicia Lengua's afinamiento (S/ 1,700) not on her profile | Data from the pre-validation period. Item 1's backlog clean-up resolves it | ops |

## §1 Receivables ("Cuentas", `/pos/accounts`): the 285

### AS-IS (measured 2026-11-10)

The side-menu badge (`countPosPendingWork`, `src/server/services/pos-accounts.service.ts`) sums
two halves:

- **Paid service lines with no appointment: 2.**
- **Scheduled services with no charge (`UNBILLED_BOOKING_WHERE`,
  `src/server/services/pos/accounts/unbilled.ts`): 284.**

The 284 break down as follows:

| Slice | Count | Meaning |
|---|---|---|
| Service price **0**: Control 86, Control Botox 18, CONTROL FINAL AFINAMIENTO 7 | **111** | Can **never** be charged, yet they count as owed forever. The rule excludes only `cancelled`/`rejected`/`no_show` and cannot see price |
| Priced, **future** (accepted/pending) | ~30 | Not due yet |
| Priced, **past**, no ticket line, no package, no plan, no invoice link | ~143 (Sep 4, **Oct 127**, Nov 12) | The real backlog |

The past priced slice is mostly Afinamiento de Rostro completo (S/ 1,800) and Afinamiento Facial
individual (S/ 500). About 10 of those clients have a paid ticket line for the same product that is
not linked to the booking. About 9 have a package.

So staff are right about November: 12 past priced items are unbilled. They are also right that
"most are controls". But October holds 127 genuinely unlinked priced appointments. That matches
staff saying payments were not validated "last month and the month before". A secondary
misconception showed up in the meeting: green in the calendar means **completed**, not **charged**.

The invoice-match probe (a fin_invoice within 7 days for `client_id = party_id`) returned 0. I am
**not certain** `fin_invoices.client_id` holds a party id, so the probe proves nothing yet. Confirm
the join key before concluding that these were never invoiced in SUSII.

### TO-BE

- A booking whose resolved service price is **0** never reads as owed. This applies to the badge,
  the `/pos/accounts` list, the drawer's Charge button and the calendar's "Cobrar" item.
- The accounts list shows the **appointment date**, and separates **due** (past) from **upcoming**
  (future). The badge counts only due items.
- Invariant: a priced service with no ticket line, grant, plan or invoice link still reads as owed.
  A `null` price (no catalog product) still reads as owed, shown as "—", never as 0.

### DELTA

1. `UNBILLED_BOOKING_WHERE` and `chargeableRows` (`src/lib/components/scheduling/visit.ts`) are
   documented as ONE rule. Add the price-0 exclusion to **both** in the same change, with a test
   on each side (SQL fixture + `visit.test.ts`).
2. Add the date column to `/pos/accounts`, plus a due/upcoming split. Move the badge to due-only.
3. Ops (Cass/Pamela, owner supervises): close the ~143 past priced items. Charge each one, link it
   to its existing ticket or package, or mark it no-show/cancelled.
   Step 1's fix is in hub draft **#649** with spec meta draft **#986**. Prod dry-run of the new
   predicate, read-only on 2026-11-10: 284 → **174** unbilled bookings, so the badge goes 286 → 176.
   The ungrouped-booking fallback also showed Charge/Cobrar on price-0 bookings. That is closed
   in `c278b546` on #649: `getBookingDetail` serves `unitPrice` through a primary-key lookup,
   only for ungrouped bookings.
4. Optional: `pos_ticket_lines (org_id, booking_id) where booking_id is not null`. The index is
   already flagged by the `TODO(handoff)` in `unbilled.ts`. It needs a QA seed.

## §2 Customer profile (`/crm/[contactId]`)

- AS-IS: the profile has a bookings section with "View on calendar". The owner reordered blocks
  live in the meeting. It is **unverified** whether that order persists per user or per org.
  Purchase rows have no date ("hay que ponerle fecha"). The connection counts showed English
  labels (bookings / stock entries / invoices).
- TO-BE: appointments first by default for the org, newest first. Every purchase row carries its
  date. All labels go through Paraglide `es`.

## §3 "When is my next appointment?"

- AS-IS: `/pos/appointments` already has a **table** view (`views={['calendar','table','board']}`).
  It searches the attendee name (`BookingTable.svelte` `searchFields`). `/crm/customers` searches
  by name or DNI. Staff do not know either exists. It is **unverified** whether the table spans all
  dates or only the loaded window.
- TO-BE: a "next appointment" value on the customer row and the profile header, so looking up one
  client answers the question.

## §4 Campaign / alliance attribution (Ale)

- Ask: the Pilates centre event is on **21 Nov**. Count the clients who came through that event or
  brand between 21 Nov and 21 Dec, with their revenue and average ticket, to decide long-term
  alliances and a future co-branded event.
- AS-IS: web forms capture UTM and referrer (`src/lib/doors/attribution.ts`, spec 041). IG ads are
  captured by `meta_lead_attribution`. CRM customers can filter by tag. Offline events and partner
  brands have no source, and nothing reports per-campaign revenue or ticket.
- Smallest TO-BE: tag contacts with the event or alliance at intake, or give the event a
  door/UTM link. Then a campaign view shows tagged clients in a date range: count, revenue and
  average ticket. **Time-sensitive:** the tag or link must exist **before 21 Nov**. Otherwise the
  event's clients are captured untagged.
- Doors (spec 041) cover only the **self-serve** half. The public `/book/[slug]` page and form
  doors stamp `{door, utm_*, referrer_host}`. Bookings store it in `sched_bookings.metadata.attribution`
  and as the contact's `firstTouch` (`scheduling-public.service.ts`). Form doors store it in
  `crm_door_submissions.attribution`. In FACES prod on 2026-11-10 there were **0 doors, 0 submissions,
  and all 494 bookings had `source = internal`**, so reception books everything. Walk-ins and phone
  bookings never pass through a door, so they still need the tag. No report yet reads booking
  attribution by campaign over a date range; only the door SubmissionsPanel shows it.
- Relates to `2026-09-21-hub-configurable-jev-crm-tags`.

## §5 Variable vial consumption (Cass)

- AS-IS: "Mark completed" already opens `ConsumptionConfirmDialog`. It shows the service's default
  consumption as **expected** and an editable **actual** (owner ask 2026-09-25). Actual becomes the
  stock entry. Expected stays on the accrual for variance analysis. Staff do **not** need to
  re-enter stock by hand.
- TO-BE: show Cass the dialog. Set the service default to the current best guess. At the next sync
  (~2026-11-24), read expected vs. actual variance to fix the standard.

## Out of scope

CRM score/stage formula (needs a marketing session). The unified "PDV" workspace. The staging
environment (already proposed). Booking without a doctor (already proposed).

## Definition of done

- §1 steps 1–2 merged and live. The FACES badge equals the count of past priced unbilled
  appointments (re-run the §1 query).
- §2 and §3 TO-BE visible in prod in `es`.
- §4: the 21-Nov event tag or link exists before the event, and the campaign view ships before
  the ~21-Dec read-out.
- §5 and the §1 step-3 backlog are reviewed with staff at the next sync.
