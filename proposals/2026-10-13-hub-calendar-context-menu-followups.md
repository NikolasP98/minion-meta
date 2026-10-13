---
id: 2026-10-13-hub-calendar-context-menu-followups
title: Calendar context menu + cancel/refund — open ends after S1/S2
status: draft
created: 2026-10-13
updated: 2026-10-13
repos: [minion_hub]
tags: [ui, billing, logic]
value: 4
effort: S
source: 2026-10-13-hub-calendar-context-menu-and-cancel-refund-spec
---
# Open ends ledger — calendar context menu and cancel/refund

Spec: `specs/2026-10-13-hub-calendar-context-menu-and-cancel-refund-spec.md`.
Shipped as hub PRs #516 (server: void from any shift + refund) and #517 (UI: pre-populated
menus, never empty, cancel-paid dialog, tray right-click).

1. **Instalment-only visits lose `charge` from the menu.** `plan.isPaid` is not in the window
   payload, so an open payment plan with nothing left to sell no longer offers "Cobrar" from
   the context menu (the drawer still does). `TODO(handoff)` at
   `src/lib/components/scheduling/calendar-context-menu.ts:105`. Fix: add `planPaid` per
   booking to `calendar-window.service.ts` (one query on `pos_payment_plans`).
2. **Cancel dialog lists the visit's services, not every ticket line.** Spec I6 wants the
   whole ticket spelled out when the void is whole-ticket. `TODO(handoff)` at
   `src/routes/(app)/pos/appointments/+page.svelte:844`. Fix: `GET /api/pos/tickets/[id]`
   on dialog open, or add `tickets[].lines` to the window payload.
3. **RBAC mismatch on `cancel-paid`.** Entry is gated on `canEdit` (scheduling) while
   `POST /api/pos/tickets/[id]/void` requires `pos:manage`; a scheduler without it gets a
   403 toast instead of a hidden entry. Fix: pass `canManagePos` to the page and gate the entry.
4. **ShiftBanner income menu renders negative refund rows** (`listShiftPayments` now returns
   them). Sum is right; the row styling of a negative amount was not visually checked.
5. **Postgres integration suite not run** for the refund rows
   (`pos-money.sql.integration.test.ts`, needs `HUB_TEST_DB_URL`).
6. **No mounted test for the cancel dialog payload** (no `+page` component test exists for
   `/pos/appointments`); proven only through the pure `cancelPaidTickets` unit test.
7. **SUNAT baja** for a voided ticket that was emitted (B999 shadow or real) is still a
   one-off script; the void does not touch `pos_emissions`. Separate spec.
