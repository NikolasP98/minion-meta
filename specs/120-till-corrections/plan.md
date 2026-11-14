# Implementation Plan: Till corrections

**Branch**: `120-till-corrections` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/120-till-corrections/spec.md`

## Summary

- **Rule (S1)**: `resolveIssueLines` decides by kind. Product lines always issue, linked to a visit
  or not. Treatment lines awaiting scheduling issue nothing; counter-redeemed sessions and bundle
  lines keep issuing. Scheduling a paid line reserves the line's quantity. The stock retry treats
  a cancelled stamped movement as none.
- **Rebuild (S2)**: `repostTicketStock(ticketId, allowedItems)` claims the sale's stamp, cancels
  the movement and runs `postTicketStock` from the current lines. A drift guard refuses when any
  item outside `allowedItems` would change. The repair calls it for the affected sales; the swap
  calls it after changing the line.
- **Agenda (S3)**: the visit-to-ticket links, which are anchored on the appointment and not on the
  week, gain the product lines of the linked sales.
- **Swap (S4)** and **guided correction (S5)**: one service function and route; the void action is
  made reusable and the till handoff learns to carry charged prices.

No schema change. No new dependency.

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes

**Primary Dependencies**: SvelteKit 2, Drizzle ORM, Zod, Paraglide (all already in `minion_hub`)

**Storage**: Postgres (Supabase). Existing tables only: `pos_tickets`, `pos_ticket_lines`,
`stk_entries`, `stk_ledger`, `stk_accruals`

**Testing**: Vitest (`bun run test` scoped to files; never the full suite with prod env present),
`*.sql.integration.test.ts` against `HUB_TEST_DB_URL` only, browser check with browser-harness

**Target Platform**: Vercel (hub)

**Project Type**: web application, one repo (`minion_hub`), PR base `master`

**Performance Goals**: agenda load adds one query per week window, none per visit (FR-012)

**Constraints**: no migration; money paths untouched; repair is owner-run, preview by default

**Scale/Scope**: FACES is the only organisation with till sales (9 affected). About 6 server
functions touched or added, 1 API route added, 1 script, 3 UI surfaces touched

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | Pass. `spec.md` exists; this plan and `tasks.md` precede code |
| II. AS-IS → TO-BE → DELTA with evidence | Pass. Spec carries anchors and measured numbers; one unverified item (STE-2026-00500 Bioestimulador) is named and handled by the repair preview |
| III. Slice-scoped delivery | Pass. Five slices, one PR each, from a clean hub clone, gates in the foreground |
| IV. Required build steps | Applies to S3–S5: design-token gates, RBAC on two new routes, Paraglide strings, route contract manifest if a route is added under `src/routes/api` (verify in S4) |
| V. Security and data gates | Applies. Tagged `data`: owner approves the spec before code, owner merges, owner runs the repair. Repair is preview by default, run twice, asserts an invariant |

No violations. Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/120-till-corrections/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (`minion_hub`)

```text
src/server/services/pos.service.ts                 S1 rule, retry heal; S2 repostTicketStock, void safety; S4 swapTicketLineProduct
src/server/services/scheduling-bookings.service.ts S1 bookAndLinkTicketLine passes the line quantity
src/server/services/pos.tickets.test.ts            S1, S2, S4 unit tests (existing tests that encode the old rule are rewritten)
scripts/repair-service-sale-stock.ts               S2 repair (preview by default)
src/server/services/pos-accounts.service.ts        S3 bookingTicketLinks gains products
src/lib/components/scheduling/calendar-window.ts   S3 CalendarBooking.tickets[].products
src/routes/(app)/pos/appointments/PageBody.svelte  S3 hover card section; S5 void action extracted
src/lib/components/scheduling/ (calendar block)    S3 marker
src/routes/api/pos/tickets/[id]/lines/[lineId]/swap/+server.ts   S4
src/routes/(app)/pos/tickets/[id]/PageBody.svelte  S4 "Cambiar producto"; S5 guided action
src/lib/components/pos/sell-charge-handoff.ts      S5 version 4: charged price, discount, optional appointment id
messages/{es,en}.json                              S3–S5 strings
```

**Structure Decision**: existing files only, plus one script, one API route and one extracted
void component.

## Slices

| Slice | Stories | Content | Gate |
|---|---|---|---|
| S1 | 1 | Rule by kind, line quantity on the reservation, retry heal; tests D1–D3 | none beyond CI |
| S2 | 2 | `repostTicketStock` + repair script; preview run against prod read-only attached to the PR | owner runs `--apply` |
| S3 | 3 | Ticket links carry products, hover card, block marker | design gates |
| S4 | 4 | Swap service, route, ticket-page entry | RBAC, i18n |
| S5 | 5 | Handoff version 4, reusable void action, guided flow | browser check |

S1 ships first and alone: it stops new damage. S2 depends on S1 being live (the repair relies on
the new rule). S3 is independent. S4 depends on S2's function. S5 depends on S4's dialog.

## Rebuild sequence (S2)

1. Load the sale; refuse `already_void`.
2. Plan: the live movement's lines against the lines the current rule resolves, both in stock
   units. Refuse `stock_drift` when an item outside `allowedItems` differs, or any item increases
   other than the swap's new product.
3. Claim: one conditional update sets the stamp to null with a `repost_pending` warning, where the
   stamp still equals the movement read in step 1 and the sale is not void. No row → `operation_conflict`.
4. Cancel the old movement. On failure restore the stamp and rethrow.
5. `postTicketStock`. It refuses a void sale. On a stock error the sale keeps a warning and the
   retry (now healed by S1) completes it.

Void safety: `voidTicket` ends by looking up a live `pos`-sourced movement for the sale and
cancels it if one exists, so a rebuild that raced the void cannot leave stock posted.

## Review record (EGM, 2026-11-14)

Reports: `.local/egm/2026-11-14-till-corrections/` (untracked). Stages 5–7 ran in parallel.

| Finding | Disposition |
|---|---|
| Skipping every treatment line creates zero-deduction paths (counter redemption, bundle, quantity above 1, gateway sale) | Rule narrowed to lines awaiting scheduling; reservation takes the line quantity. A gateway-sold treatment awaits scheduling like any other |
| Linked product lines never issue; swap would be a no-op for them | Products always issue (FR-002); the visit's product follows a swap. Prod has 0 such lines |
| Retry cannot heal an interrupted rebuild | FR-005a, in S1 |
| No concurrency control on rebuild; void can leave a live movement | Conditional claim plus void's final check. A database constraint stays out of scope |
| Swap skipped the shared guard chain | FR-014a; deliberate narrower meaning of "document" recorded in Assumptions |
| Guided void can dead-end | Each void refusal names the next step (FR-017) |
| Agenda window is sale-date scoped | Products read through the appointment-anchored ticket links |
| Repair diff unsound across units and recipe drift | Compare in stock units; refuse increases and changes outside treatment recipes (FR-007a) |
| Handoff re-prices lines; sale page has no void action | S5 grows: handoff version 4 and a reusable void action |
| Cut products-only sales on the agenda | Accepted; out of scope with a follow-up |
| Cut the document branch | Rejected: the owner asked for a guided path. The branch is one guard and one message; no document of that kind can exist today |
| Treatments no longer refused at the till for lack of supplies | Accepted and recorded in Assumptions |

Structural and style reviewers were skipped (deviation).

## Risks

- **Rebuild is several transactions.** The claim, the cancel and the post are separate. The claim
  and the healed retry make every interruption recoverable; none is atomic.
- **A void that finishes before a racing rebuild posts** is covered by `postTicketStock` refusing
  a void sale; a post that passes that check just before the void commits is caught by the void's
  final lookup only if it lands before it. The residual window is recorded as `TODO(handoff)`.
- **Valuation**: cancelling reverses at the original value; reissuing uses the current rate.
  Quantities are exact; the value can differ by the rate drift. Reported in the preview.
- **Spec 116** (open) edits the same files. Rebase on it if it lands first.
- **Reception permission**: voiding needs `pos:manage`; whether FACES reception holds it was not
  checked. FR-018 covers both cases.
- **S5 is the largest slice** (handoff format, extracted void action, guided flow). It can ship
  after S4 without blocking it: until then a swap refusal names the manual void.

## Complexity Tracking

None.
