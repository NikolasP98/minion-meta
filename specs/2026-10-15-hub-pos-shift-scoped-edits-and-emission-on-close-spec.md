---
id: 2026-10-15-hub-pos-shift-scoped-edits-and-emission-on-close-spec
title: POS shifts own the editable window — tender corrections, SUNAT emission on close, accounting period locks
stage: spec
status: approved
pass: 1
created: 2026-10-15
updated: 2026-10-15
repos: [minion_hub]
type: feature
tags: [logic, data, test]
---

# POS shifts own the editable window — tender corrections, SUNAT emission on close, accounting period locks

## 0. Product

Owner 2026-10-15: "I need you to figure out a hardened way to change an invoice's payment
method. The users might get it wrong the first time and go through the whole process without
noticing." Then: "I like quick edits for open shifts. Lets give shifts more purpose: SUNAT
submission on shift close (allows for more permissive edits on shift items while its still
open). For post-closed shift items, the user has to nav to the individual invoices and make
edits from their details page." And: when SUNAT is live, "block invoices that have already
been locked/claimed by the accountant."

The shift becomes the unit of trust:

1. **Open shift = working draft.** A cashier fixes their own mistakes in place (wrong tender,
   wrong customer, note) from the till's recent-sales popover or the ticket page, with
   `pos:edit`, no manager, a one-tap preset reason.
2. **Shift close = commit.** Closing the shift emits the shift's tickets to SUNAT (prod when
   live, shadow until then) and freezes them: from then on edits only happen on the
   ticket's detail page, by `pos:manage`, with a typed reason, and never by rewriting the
   closed shift's numbers.
3. **Accounting period lock = archive.** Once the accountant locks a month, every mutation
   (tender change, void, re-stamp) on a ticket in that month is refused.

## AS-IS (verified on hub `origin/master` 2026-10-15; file anchors from the recon)

- `pos_payments` is insert-only: written once by `submitTicket` (`src/server/services/pos.service.ts`
  ≈ L1512), no update/delete anywhere, no PATCH endpoint under `src/routes/api/pos/tickets/`.
  The only mutation is void (`voidTicket` ≈ L1654, hub #516 adds the explicit cash / store-credit
  refund counter-rows on the REFUNDING shift). Fixing a wrong tender today = void + refund +
  re-sell + a second emission.
- Drawer math: `computeExpected` / `paymentsByMethod` (≈ L388–422) sum NON-void tickets' payments
  per method; `closeShift` (≈ L475–494) SNAPSHOTS `expected` + `counted` into `pos_shifts`;
  `shiftSummary` (≈ L510) recomputes live. Editing a payment on a closed shift silently makes
  the snapshot and the live recompute disagree.
- Surfaces: ticket page `/pos/tickets/[id]` (linked from `/pos/history`), calendar drawer
  "Pago" block (`BookingDetailDrawer.svelte` ≈ L455–500: status badge + ticket id, no method,
  no link), till recent-sales popover (`pos/sell/+page.svelte` ≈ L833–975: void only,
  `pos:manage`).
- SUNAT: `pos_emissions` (`pg-pos-schema.ts` ≈ L226–258) status `pending → accepted | rejected |
  error`, fired per ticket at submit by `triggerShadowEmission` (`pos-emission.service.ts`
  ≈ L224–318, fire-and-forget). Doc type derives from the customer's RUC only
  (`pos-emission-mapping.ts` ≈ L24–34); the per-method `documentDefault` setting is stored but
  never read. No void/baja/nota-de-crédito path for an accepted emission. No lock / claimed /
  period concept anywhere; the only "accounted" signal is `pos_tickets.invoice_provider_ref`
  (void refuses when set, ≈ L1659).
- RBAC: submit `pos:create`, void `pos:manage`, generic POS writes `pos:edit`; no
  reason-required pattern on POS writes. Audit: POS writes nothing to the house rail
  `doc_audit_log` (`pg-activity-schema.ts` ≈ L38–56, `activity.service.ts`).

## TO-BE

### T1 — Open-shift quick edits (cashier)
- A ticket whose shift is OPEN accepts, with `pos:edit`: (a) tender method per payment row
  (amount unchanged), (b) customer party / document (only while the ticket has no emission
  row), (c) note. Reason: a preset chip ("Error de registro") or free text, stored.
- Entry points: the till's recent-sales popover row (method shown, "Cambiar" inline select),
  the ticket page's Pago block, and the calendar drawer's Pago block which now shows the
  method and links to the ticket page (no editing in the drawer).
- Writes are in place (`UPDATE pos_payments SET method`), audited (`doc_audit_log` row,
  `refType: 'pos_ticket'`, `op: 'update'`, `changes: [{field:'payment.method', old, new}]`,
  plus `{changedFrom, by, at, reason}` appended to the payment's `metadata`). The drawer
  recomputes live, so the open shift stays consistent by construction.

### T2 — Emission on shift close
- `closeShift` emits every not-yet-emitted, non-void ticket of the shift to SUNAT (environment
  from settings: shadow/beta today, prod after cutover) and records one `pos_emissions` row
  per ticket; failures do not block the close (stored `error`, surfaced in the close dialog
  and on `/pos/history` as a red count with a "Reintentar" action on the shift row).
- Per-ticket **"Emitir ahora"** stays available during the open shift for a customer who needs
  their comprobante on the spot; once emitted, that ticket is frozen as in T3 even though the
  shift is open.
- The close dialog gains a line: "Se emitirán N comprobantes a SUNAT" with the count, and the
  shift row on `/pos/history` shows emitted / failed counts.

### T3 — Post-close edits (manager, from the detail page only)
- After close, the popover and drawer offer no edit; the ticket page's Pago block offers
  "Corregir método de pago" to `pos:manage` with a required typed reason.
- A closed-shift tender change never edits history: it writes a **correction pair** on the
  CURRENT open shift (negative row old method, positive row new method, both
  `metadata.correctionOf = <paymentId>`), same rule as #516's refund rows. No open shift →
  refused with "Abre la caja para registrar la corrección". The closed shift's snapshot stays
  what was counted.
- Emitted tickets: tender changes are still allowed (the CPE carries no tender); customer,
  items, totals are not — the page says "Emitido a SUNAT: requiere nota de crédito" and the
  only actions are the existing void (refused) and, in a later slice, nota de crédito /
  comunicación de baja.

### T4 — Accounting period lock
- New table `pos_period_locks (org_id, period 'YYYY-MM', locked_by, locked_at, note)`; the
  accountant locks/unlocks a month from `/finances` (capability `finance:manage`); the lock
  also appears on `/pos/history` shift rows (lock icon) and on the ticket page.
- Every POS mutation (tender change, void, re-stamp, nota de crédito) checks the ticket's
  `submitted_at` month: locked → HTTP 423 "Periodo cerrado por contabilidad", shown verbatim.
- Guard order, shared by every mutator: `not_found → ticket void → period locked →
  invoice_provider_ref set → (emitted ∧ field is fiscal) → shift closed (T3 path) → ok`.

### Invariants
- I1 `sum(pos_payments.amount) per ticket == ticket.total` after any edit (method-only edits
  cannot break it; correction pairs net to zero per ticket).
- I2 A closed shift's `expected`/`counted` snapshot is never rewritten.
- I3 Every POS mutation leaves one `doc_audit_log` row with actor, reason and the field delta.
- I4 A ticket in a locked period has no successful mutation in the audit log after
  `locked_at`.
- I5 Emission is idempotent per ticket (`pos_emissions` unique on ticket + doc type while not
  `error`); close retries only `error` rows.

## DELTA (slices; each one hub PR, each with its tests)

- **S1 tender correction** — `changePaymentMethod(ctx, ticketId, paymentId, {method, reason})`
  in `pos.service.ts` beside `voidTicket`, shared `assertTicketMutable()` guard chain (T4's
  lock check stubbed to "no table yet" until S3), in-place vs correction-pair by shift state;
  `PATCH /api/pos/tickets/[id]/payments/[paymentId]` (`pos:edit` open / `pos:manage` closed,
  zod `{method, reason}`); `doc_audit_log` write via `activity.service.ts`; UI: popover inline
  select, ticket page block, drawer shows method + link; "Método corregido" chip. Tests:
  service unit (both branches, guard order, I1), route contract, audit-coverage.
- **S2 emission on close** — move `triggerShadowEmission` from submit to `closeShift` (batch,
  per-ticket rows, error tolerant), keep "Emitir ahora" per ticket, close-dialog count, history
  counts + retry. Delete the never-read `documentDefault` method setting. Tests: close emits N,
  error does not block, retry only errors, idempotency (I5).
- **S3 period locks** — migration `pos_period_locks`, finance UI (lock/unlock month, note),
  guard wired into every mutator (void included), 423 copy, lock icons. Tests: locked month
  refuses all four mutators; unlock restores.
- **S4 (later, SUNAT prod)** — nota de crédito / comunicación de baja replacing plain void for
  accepted emissions. Out of this spec's slices; S3 leaves the refusal copy in place.

i18n: every new key appended to the end of `messages/en.json` + `messages/es.json` in the same
PR; owner nouns: *turno*, *comprobante*, *corrección*, *periodo cerrado*.

**Out of scope:** amount or item edits (that is a void and re-sale); multi-currency tenders;
retroactive emission of pre-cutover tickets; the accountant role itself (uses `finance:manage`).

## Verification

- Per slice: `bun run check`, the slice's vitest folders, route/service contract tests,
  `lint:design:ci`, `lint:tokens`, prettier — all foreground.
- Prod proof after S1: on FACES, change one real mis-tendered ticket in the open shift (in
  place) and one in a closed shift (correction pair visible on `/pos/history` under today's
  shift), with the audit row present; the closed shift's snapshot unchanged.
- After S2: close a shift with ≥1 ticket → one `pos_emissions` row per ticket, counts on the
  history row; after S3: lock a past month, confirm 423 on tender change and void.
