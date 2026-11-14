# Implementation Plan: Till corrections

**Branch**: `120-till-corrections` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/120-till-corrections/spec.md`

## Summary

One rule change and one new server function carry four of the five stories.

- **Rule**: `resolveIssueLines` ignores treatment lines, so a sale issues stock for products only.
  Scheduling and completion already reserve and deduct a treatment's recipe once.
- **Function**: `repostTicketStock(ticketId)` cancels the sale's stock movement and runs the
  existing `postTicketStock` again from the sale's current lines. The product swap calls it after
  changing the line. The one-time repair calls it for each affected sale, which gives back exactly
  the treatment supplies because the new rule no longer issues them.
- **Agenda**: the week's ticket payload gains a `products` list per ticket; the hover card and the
  block read it.
- **Guided correction**: the existing void plus the existing till handoff, with the corrected
  line.

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

**Scale/Scope**: FACES is the only organisation with affected data (9 sales). About 5 server
functions touched or added, 2 API routes added, 3 UI surfaces touched

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
src/server/services/pos.service.ts                 S1 rule; S4 repostTicketStock, swapTicketLineProduct
src/server/services/pos.tickets.test.ts            S1, S4 unit tests (or a sibling test file)
src/server/services/scheduling-bookings-*.test.ts  S1 sell → schedule → complete
scripts/repair-service-sale-stock.ts               S2 repair (preview by default)
src/server/services/pos-accounts.service.ts        S3 calendar ticket payload gains products
src/lib/components/scheduling/calendar-window.ts   S3 CalendarInvoice.products
src/routes/(app)/pos/appointments/PageBody.svelte  S3 hover card section
src/lib/components/scheduling/ (calendar block)    S3 marker
src/routes/api/pos/tickets/[id]/lines/[lineId]/swap/+server.ts   S4
src/routes/(app)/pos/tickets/[id]/PageBody.svelte  S4 "Cambiar producto"; S5 guided action
src/lib/components/pos/sell-charge-handoff.ts      S5 lines without an appointment
messages/{es,en}.json                              S3–S5 strings
```

**Structure Decision**: existing files only, plus one script and one API route. The swap dialog
reuses the till's product picker.

## Slices

| Slice | Stories | Content | Gate |
|---|---|---|---|
| S1 | 1 | Rule change in `resolveIssueLines`; tests D1–D3 | none beyond CI |
| S2 | 2 | `repostTicketStock` + repair script; preview run against prod read-only attached to the PR | owner runs `--apply` |
| S3 | 3 | Payload, hover card, block marker | design gates |
| S4 | 4 | Swap service, route, ticket-page entry | RBAC, i18n |
| S5 | 5 | Guided void + pre-filled till | browser check |

S1 ships first and alone: it stops new damage. S2 depends on S1 being live (the repair relies on
the new rule). S3 is independent. S4 depends on S2's function. S5 depends on S4's dialog.

## Risks

- **Old sales and swap**: reposting an old sale's stock also drops its treatment supplies. That is
  the repair's effect, so it is correct, but the repair must then skip that sale. The repair
  compares current movement lines with the resolved lines and skips equal ones.
- **Repost is two transactions** (cancel, then issue), like a sale today. A failure between them
  leaves the sale with a stock warning and the existing retry. Availability is checked first.
- **Valuation**: cancelling reverses at the original value; reissuing uses the current rate. The
  quantity is exact; the value can differ by the rate drift. Accepted and reported in the preview.
- **Recipes changed since the sale**: reposting resolves product lines with today's recipes. The
  repair refuses any sale whose product quantities would change and lists it for a manual look.
- **Spec 116** (open) edits the same files. Rebase on it if it lands first.
- **Reception permission**: voiding needs `pos:manage`. Reception may lack it; the guided action
  then says who can do it (FR-018).

## Complexity Tracking

None.
