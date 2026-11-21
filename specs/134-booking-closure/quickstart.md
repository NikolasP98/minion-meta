# Quickstart: validating spec 134

## Prerequisites

- A fresh hub clone of `origin/master` with the slice branch checked out. Then run `bun install` and `bun run i18n:compile`.
- **Never** run the full suite or anything with prod env present:
  - unset `SUPABASE_DB_URL`;
  - run scoped vitest files only;
  - no `bun run test`.
- Browser checks use the local QA stack:
  - `bun run dev:local` starts a seeded Supabase in Docker plus `vite dev` on the host, with `.env.qa` forced over `.env.local`;
  - follow the hub QA-stack recipe for its traps (stale QA key ⇒ 500s).
- The seeded org has resources, event types and the booking status matrix (`scripts/qa/seed/scheduling.ts:39-46`). Each slice adds its own matrix row (plan.md).
- **Slice order**: 134-S1 needs 135-S1 merged (or its branch merged locally) for `checkpointFor`.

## Gates, every slice (foreground)

```bash
bun run check && bun run lint:design && bun run lint:tokens
```

Expected: no new type errors; design and token debt does not grow.

## 134-S1: Por cerrar, Pendientes, daily count

```bash
bunx vitest run src/lib/components/scheduling/booking-lifecycle.test.ts \
  src/server/services/inbox/rules/appointments-por-cerrar.test.ts \
  src/server/services/scheduling-bookings-pending.test.ts \
  src/lib/components/pos/pending-groups.test.ts \
  src/lib/components/scheduling/consumption-confirm-dialog.mounted.test.ts \
  src/server/services/scheduling-bookings-accrual.test.ts \
  src/lib/inbox/feed.test.ts
```

Manual (QA stack, `/pos/appointments`):
1. **Por cerrar on the grid (US1-1)**
   - The seeded `sched.booking.por-cerrar` (accepted, yesterday) shows the dashed sliver and "Por cerrar" in its hover card.
   - Today's accepted bookings do not.
2. **Tray**
   - The tray is titled "Pendientes (N)".
   - The chip "Por cerrar" lists yesterday's booking; "Pagado sin agendar" lists the seeded paid lines; "Todos" shows both, Por cerrar first.
   - `/pos/appointments?pendientes=por_cerrar` opens the tray on that chip.
3. **Inbox (FR-002)**
   - Trigger the jobs tick locally (the same route the netcup cron calls).
   - Expect one "Citas por cerrar · 1 citas por cerrar" row and no "Cita sin cerrar" rows.
   - Complete the booking, tick again: the row resolves.
4. **Completion note (FR-012, US2 of spec 135)**
   - On the QA stack, lock a 135 count for one supply of a service with a recipe, counted time after the booking's start.
   - Open "Completar" on that booking. The counted row reads "Contado el {fecha}: no descuenta {ítem}" and has no quantity field; the other rows are editable as today.
   - Confirm. The stock entry has no line for the counted item (135-S1's realize).

## 134-S2: Archivar, Anular in "Más…", readers

```bash
bunx vitest run src/server/services/scheduling-bookings-transitions.test.ts \
  src/server/services/scheduling-bookings-packages.test.ts \
  src/lib/components/scheduling/calendar-context-menu.test.ts \
  src/lib/components/scheduling/booking-detail-drawer.mounted.test.ts \
  src/lib/components/scheduling/BookingBoard.mounted.test.ts \
  src/lib/components/scheduling/booking-groups.test.ts \
  src/lib/components/scheduling/color-source-preview.test.ts \
  src/server/services/pos/accounts/audit.logic.test.ts \
  src/server/services/pos/accounts/audit.evidence.test.ts \
  src/server/services/pos-accounts-list.test.ts \
  src/lib/notifications/catalog.test.ts
```

Manual:
1. **Menu (US1-2, FR-007/008)**
   - Right-click any live event. Top level shows Archivar…; "Anular cita" appears only under "Más…".
   - No "Marcar inasistencia" or "Cancelar" in the menu, the hover card, the drawer, or `/scheduling/bookings`.
2. **Archivar (US4)**
   - Archivar a package-funded booking with no reason: confirm is disabled.
   - Pick "Duplicada": the box is struck through and labelled "Archivada".
   - The grant's used sessions are unchanged (account page), and the booking's reserved supplies show "Liberado".
3. **Anular cita (US4-3)**
   - On a paid visit as an admin: today's void dialog with the refund choice runs unchanged.
   - As staff without `pos:manage`: the entry is disabled with "Pide a un administrador que anule la venta".
4. **History (FR-011)**: the seeded `cancelled` and `no_show` bookings read "Anulada" and "No vino (anterior)".
5. **Board**: dragging a card onto the "No vino (anterior)" column is refused with the menu hint.

## 134-S3: Desagendar, `unscheduled`

```bash
bunx vitest run src/server/services/scheduling-bookings-unschedule.test.ts \
  src/server/services/scheduling-bookings-reschedule.test.ts \
  src/server/services/scheduling-bookings-group.test.ts \
  src/server/services/scheduling-bookings-transitions.test.ts \
  src/server/services/scheduling-bookings-override.test.ts \
  src/server/scheduling/reminders.test.ts \
  src/server/services/calendar-window.service.test.ts \
  src/lib/components/scheduling/kit/booking-mover.test.ts \
  src/lib/components/pos/pending-groups.test.ts
```

Manual:
1. **No vino on a paid, package-funded visit (US2)**
   - Ring a seeded client's package session on the agenda, then choose "No vino".
   - The box leaves the grid. The tray shows "No vino · Pagado" with "Antes: {fecha hora} · {miembro}".
   - The sale still lists the line on that appointment, the session is still used, and the reserved supplies are still "Reservado".
2. **Slot freed (US2-3)**: book another client into the old slot. No conflict dialog.
3. **Re-assign (US2-2)**
   - Drag the tray item onto a free slot: the box returns as "Confirmada" at the new time, with the same sale and session.
   - Its history shows "Desagendada → Confirmada (reagendada)".
4. **Desagendar a future, unpaid appointment (US3)**
   - It lands under "Desagendada" with no "Pagado" mark.
   - No reminder goes out for its old time (check `sched_reminders` stays empty for it after a tick).
5. **Refusals**
   - "Completada" on a Desagendada item: refused with "Primero elige una hora para esta cita…".
   - Archivar from the tray item: works and frees the reservation.

## Post-merge verification (prod, read-only, owner-run)

- **SC-001**, one day after 134-S1:
  ```sql
  select count(*) from sched_bookings
  where org_id = '<FACES>' and status in ('pending','accepted')
    and start_time < now() - interval '1 day';
  ```
  Every such row must show in the tray. Compare the count with the tray's "Por cerrar" number.
- **SC-002**, two weeks after 134-S3: the same count is under 10.
- **SC-004**, 30 days after 134-S2: every `pos_package_redemptions.reversed_at` since release belongs to a booking whose status-log row is `→ cancelled` or `→ rejected`.
