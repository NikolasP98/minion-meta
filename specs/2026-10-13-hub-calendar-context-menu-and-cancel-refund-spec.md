---
id: 2026-10-13-hub-calendar-context-menu-and-cancel-refund-spec
title: Calendar context menus pre-populated, never empty; paid and unpaid items cancelable with an explicit refund
stage: dev
status: implementing
pass: 1
created: 2026-10-13
updated: 2026-10-13
repos: [minion_hub]
tags: [ui, billing, logic]
type: feature
owner_ask: "context menu shows LOADING on each click, this is bad UX and the context menus need to be pre-populated. some context menus are completely empty and render a thin blank box. There needs to be a way for both scheduled and unscheduled items to be fully cancelable: a scheduled but unpaid item can simply be deleted; a paid item (scheduled or not) can be deleted, but with confirmation and a request for additional actions (cancel invoices as well, like a refund?). store credit or cash are viable refund methods. Cash would be the go-to in most scenarios to keep business logic simple. For voiding, the idea would be a full ticket void."
---

# Calendar context menus and the cancel/refund flow

## 0. Product

Three owner asks on `/pos/appointments` (2026-10-13), decided in chat the same day:

1. The event context menu must open already populated. No per-click "Cargando…".
2. A context menu must never render empty. A closed visit (cancelled, rejected, no-show,
   completed) still gets something to do.
3. Scheduled and unscheduled items are fully cancelable. Unpaid scheduled: plain delete.
   Paid (scheduled or in the "Unscheduled paid services" tray): confirm, void the whole
   ticket, and choose how the money comes back: **cash (default)** or **store credit**.
   Partial changes to a ticket are out of scope: void and re-sell the remaining items.

## AS-IS (verified on `origin/master` @ `c49b536b`)

- Menu open fetches `GET /api/pos/appointments/[id]` (the drawer's full detail) and shows a
  disabled `pos_appt_ctx_loading` row until it lands (`(app)/pos/appointments/+page.svelte`
  `openEventMenu`; `calendar-context-menu.ts` `calendarMenuEntries` returns the loading entry
  when `detail` is null). `ContextMenu.svelte` renders `{#each items}` with no empty guard.
- `calendarMenuEntries` yields zero entries for a visit whose header status is inactive
  (`booking-groups.ts` `INACTIVE_STATUSES`) or completed: charge is gated on active, split on
  `members.length > 1`, destructive on `active`. The host still mounts `<ContextMenu>` → a thin
  empty box (owner screenshot, cancelled "QA Minion" booking).
- Page load already carries per booking: `status`, `groupId/groupSeq`, `productId`, `partyId`,
  and `invoices[].lines[].bookingId` for the loaded window only (`calendar-window.service.ts`,
  `pos-accounts.service.ts` `listTicketsForCalendar`, void tickets excluded). Funding
  (`cash | grant | plan`) and an anchored `paid` are NOT in the payload.
- Destructive today: unpaid visit → `delete` = `setVisitStatus(id,'cancelled','deleted')`;
  paid visit → `unschedule` = `POST /api/pos/appointments/[id]/unschedule` (lines back to the
  tray, visit cancelled). Tray lines (`listPendingSchedulingLines`: service lines with
  `booking_id IS NULL`, `plan_id IS NULL`, ticket not void) have drag + click only.
- `voidTicket` (`pos.service.ts`) guards `not_found → already_void → reconciled →
  shift_closed → package_in_use`, then cancels the stock entry, reverses redemptions, cancels
  grants, writes opposing client-ledger rows, marks the ticket void. **It refuses a ticket
  whose shift is closed**, so nothing sold on an earlier day can be voided.
- Shift totals: `paymentsByMethod` sums `pos_payments` joined to NON-void tickets, so a void
  in the open shift silently drops its cash from `expected` (assumes the cash was handed back).
- No refund endpoint. Store credit exists as `pos_client_ledger` kind `refund`
  (`POST /api/pos/accounts/topup`). SUNAT baja exists as builders only (no route).

## TO-BE

**Invariants**
- I1 The event menu never fetches on open. Entries derive from the window payload.
- I2 A mounted context menu has ≥ 1 entry. A closed visit offers "Ver detalle".
- I3 Every destructive action on a paid item goes through one confirm dialog that names the
  ticket(s) and the refund method. Default refund = cash.
- I4 Money truth: a void ALWAYS states where the money went. `cash` writes an opposing
  payment row (negative amount, `metadata.kind='refund'`, `metadata.voidOf=<ticketId>`) into
  the acting user's OPEN shift; `credit` writes a `pos_client_ledger` `refund` row for the
  ticket's party and leaves the till untouched. Shift `expected` counts every payment row
  (original and refund) regardless of ticket status, so cash refunded in a later shift is
  visible in THAT shift and store credit never reduces expected cash.
- I5 `reconciled` (accountant lock) still blocks a void. `shift_closed` no longer does.
  A cash refund with no open shift for the actor is refused: `no_open_shift`.
- I6 Whole-ticket void only. The dialog lists every service line on the ticket.

**Behavior**
- Window payload adds per booking `paid: boolean` (any non-void ticket line references the
  booking, anchored server-side, not window-scoped) and `funding: 'cash'|'grant'|'plan'`.
- Menu entries (synchronous): active visit → charge (cash funding, unpaid), split (members>1),
  then `delete` (unpaid) or `cancel-paid` (paid). Closed visit → `detail`. Tray line →
  `cancel-paid` only (right-click on the tray item).
- `cancel-paid` dialog (existing `ConfirmDialog`, `tone="danger"`, `details` snippet): ticket
  human ids + their service lines, radio `Devolver en efectivo` (default) / `Saldo a favor` /
  `Sin devolución`, confirm label `Anular y cancelar`. On confirm: `POST
  /api/pos/tickets/[id]/void` with `{ refund: 'cash'|'credit'|'none' }` for each ticket, then
  for a scheduled visit `setVisitStatus(id,'cancelled','deleted')`. Tray lines disappear on
  their own (void tickets are excluded from the tray query).

## DELTA

| # | Transition | Slice | Proof |
|---|---|---|---|
| D1 | `voidTicket(ctx,id,actor,{refund})`: drop `shift_closed`; `cash` → negative payment row in actor's open shift (409 `no_open_shift` if none); `credit` → ledger refund row (409 `no_party` if anonymous); `none` → nothing; `paymentsByMethod` counts all rows incl. refunds | S1 | `pos.shifts.test.ts` / `pos.packages.test.ts` void cases: open-shift cash (expected unchanged net), closed-shift cash (current shift −X), credit (expected unchanged, ledger +X), none |
| D2 | void route accepts `{refund}`; sell page void sends `refund:'cash'` (today's semantics) | S1 | route test |
| D3 | window payload `paid` + `funding` per booking (one query over the window's booking ids) | S2 | `calendar-window.service` test |
| D4 | `calendarMenuEntries(box, flags)` synchronous; no `loading` kind; closed visit → `detail`; paid → `cancel-paid` | S2 | `calendar-context-menu.test.ts` (replace loading case; add closed→detail, paid→cancel-paid) |
| D5 | page: remove `openEventMenu` fetch; `{#if ctxAt && ctxItems.length}`; `cancel-paid` dialog with refund radio; tray right-click menu | S2 | `+page` component test for the dialog payload; existing calendar tests green |
| D6 | i18n es/en keys for the new entries and dialog | S2 | `i18n:compile` + check |

**Out of scope:** partial voids, real payment-gateway reversals, SUNAT baja (separate spec),
line-level cancel endpoint.

## Verification
1. Cancelled booking right-click → one entry "Ver detalle", no empty box, no "Cargando…".
2. Active unpaid visit right-click → entries appear instantly; "Eliminar" cancels at once.
3. Paid visit right-click → "Cancelar y anular" → dialog lists POS-xxxx lines; cash default;
   confirm → ticket void, visit cancelled, shift expected cash down by the ticket total when
   the ticket's shift is closed (refund row) or unchanged net when it is the same open shift.
4. Tray item right-click → same dialog → the line leaves the tray.
5. Credit path → `pos_client_ledger` refund row, expected cash unchanged.
