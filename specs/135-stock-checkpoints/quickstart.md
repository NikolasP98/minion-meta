# Quickstart: validating spec 135

## Prerequisites

- A fresh hub clone of `origin/master` with the slice branch checked out. Run `bun install` and `bun run i18n:compile`.
- **Never** run the full suite. Unset `SUPABASE_DB_URL` and every prod variable in that shell. Run only the scoped files below.
- Local QA stack (hub QA-stack recipe):
  - `bun run qa:up`, then `bun run dev:local` (seeded DB on loopback);
  - apply the slice's migration to the local DB the way the recipe does for other migrations;
  - the seeded org needs one warehouse, three stock items (A, B, C), a service whose recipe uses A and B, and an owner user plus a staff user.
- Native lane (S1 SQL test): run it as the existing `qa-native` lane runs `stock-corrections.sql.integration.test.ts` (owned child database), after registering the file in `scripts/qc/native-postgres-manifest.ts`.

## 135-S1 — tables, completion rule, backfill

Automated:

```bash
bunx vitest run src/server/services/stock-checkpoints.test.ts \
  src/server/services/stock.service.test.ts \
  src/server/services/stock-accruals.service.test.ts \
  src/lib/components/scheduling/consumption-confirm-dialog.mounted.test.ts \
  scripts/backfill-stock-count-1118.test.ts \
  scripts/qc/native-postgres-manifest.test.ts
bun run check && bun run lint:design && bun run lint:tokens
```

Manual (QA stack). There is no count UI yet, so seed a locked count by SQL or with the backfill script pointed at a local entry:
1. Book an appointment yesterday 10:00 for the A+B service. Its accruals for A and B are open.
2. Create a locked count for item A, counted today 08:00.
3. Open the appointment and press "Marcar completada".
   - Expect: the dialog shows "Contado el … 08:00: no descuenta A" and an editable row for B only.
4. Confirm.
   - Expect: one issue entry with lines A and B, one ledger row (B), one `stk_checkpoint_skips` row (A).
   - Accrual A is `released`, accrual B is `realized`, and bin A is unchanged.
5. Try to cancel the count's adjustment entry from Stock → Movimientos.
   - Expect: refused with "Este movimiento es el ajuste del conteo …".

Backfill (local first, then prod by the owner's go):

```bash
bun scripts/backfill-stock-count-1118.ts --org <org id> --entry STE-2026-00694            # preview, read-only
bun scripts/backfill-stock-count-1118.ts --org <org id> --entry STE-2026-00694 --apply    # write
bun scripts/backfill-stock-count-1118.ts --org <org id> --entry STE-2026-00694            # must plan nothing
```

Expected preview: six rows (item, counted, system at 16:00, difference, STE delta). Differences equal the STE deltas, or the run stops (research R8).

## 135-S2 — Conteo físico

Automated:

```bash
bunx vitest run src/server/services/stock-counts.service.test.ts \
  "src/routes/api/stock/counts/[id]/lock/server.test.ts" \
  "src/routes/(app)/stock/counts/[id]/page.mounted.test.ts" \
  src/lib/routes/ src/lib/routes/business-route-shells.test.ts \
  src/server/ui-audit/frontend-contract-scanner.test.ts scripts/ui-audit-inventory.test.ts
bun run check && bun run lint:design && bun run lint:tokens
```

The route-contract counts live in six places, two of them outside `src/lib/routes/`. Bump all six (hub route-contract build step).

Manual (US1):
1. As staff, open Stock → Conteos → "Nuevo conteo". Choose the warehouse, counted time 16:00, items A, B, C.
2. Type the counted quantities. A gets −20, B gets 0, C gets +3. Save the draft.
   - Expect: each row shows the system qty at 16:00 and the difference. "Validar y bloquear" is disabled with "Solo el dueño o un administrador puede bloquear un conteo."
3. As owner, sell one A at 17:00. Then lock at 18:00.
   - Expect: one adjustment with two lines (A −20, C +3), three checkpoints, and the 17:00 sale still applied (US1 scenario 2).
4. Try to edit the locked count.
   - Expect: read-only, with a "Nuevo conteo" action.
5. Draft-window check (research R3):
   - Create a draft counted at 08:00 for A.
   - Complete an appointment dated last week that uses A, then lock.
   - Expect: A ends at counted − (moves after 08:00 by physical time). The old appointment's issue is absorbed, not deducted twice.

## 135-S3 — remaining paths and notes

Automated:

```bash
bunx vitest run src/server/services/stock.service.test.ts \
  src/server/services/pos.tickets.test.ts \
  src/server/services/stock-corrections.logic.test.ts \
  src/server/services/stock-entries-read.service.test.ts \
  "src/routes/(app)/pos/tickets/[id]/page.swap.mounted.test.ts"
bun run check && bun run lint:design && bun run lint:tokens
```

Manual:
1. **Void (US3)**: a sale of A made yesterday, with A counted today.
   - Open the sale, then "Anular".
   - Expect: "No vuelve al stock: A (contado el …)" and a "Registrar entrada" link.
   - Void it. Expect: A unchanged, uncounted items returned, and "No mueve stock" on the reversal's A line.
2. **Entry cancel**: cancel a receipt of A posted before the count.
   - Expect: A unchanged and the skip shown on the entry.
3. **Receipt correction**:
   - On a receipt of A before a zero-difference count, change only the rate. Expect: applied.
   - Change the qty. Expect: "La cantidad de esta compra ya quedó contada…".
4. **SC-001**: the test `stock.service.test.ts › replaying the spec-120 rebuild leaves a counted item at its count` passes.
5. **Item page**: A's movements show the checkpoint row ("Contado · … · bloqueado por …") and the skip rows in time order.

## 135-S4 — reminders

Automated:

```bash
bunx vitest run src/server/services/inbox/rules/stock-count-due.test.ts \
  src/server/services/inbox/rules/stock-count-unlocked.test.ts
bun run check
```

Manual:
1. Set the interval to 1 day on Stock → Conteos. Wait for, or trigger, `/api/jobs/tick` locally.
   - Expect: "Conteo pendiente · <almacén> · N ítems" for owner and staff with `stock:create`.
   - Its link opens "Nuevo conteo" pre-filled.
2. Lock a count of all due items. Expect: the notification is resolved on the next tick.
3. Leave a draft more than 24 h old (set `created_at` back locally).
   - Expect: "Conteo por validar" for owner/admin only.
4. Switch reminders off. Expect: no "Conteo pendiente" on the next tick.

## Post-merge verification (prod, read-only, owner present)

- After the S1 deploy and the backfill:
  - `select human_id, status, counted_at from stk_counts` shows CNT-2026-00001, `locked`, 2026-11-18 21:00 UTC;
  - six lines;
  - the six bins equal their ledger sums.
- After FACES closes its old appointments (spec 134):
  - every skip row of a counted item points to CNT-2026-00001;
  - the six counted items' bins moved only by movements with a physical time after 18/11 16:00 (SC-002).
- Two months after S4: every FACES item with movement has a checkpoint younger than the interval (SC-003).
