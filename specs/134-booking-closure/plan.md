# Implementation Plan: Closing appointments

**Branch**: `feat/134-booking-closure-s<N>` per slice (hub, base `master`) | **Date**: 2026-11-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/134-booking-closure/spec.md` (approved 2026-11-20, meta #1056)

## Summary

Every open appointment gets a way out, and none is closed by an action that hands back money or sessions by accident.

Three hub PRs, interleaved with spec 135:
1. **Por cerrar**: open appointments from earlier days are drawn as such. One "Pendientes" tray lists them next to the paid services still waiting for a time. The inbox sends one daily count instead of one alert per visit. The completion dialog names supplies a stock count already covered.
2. **Archivar**: the main close (reason required, frees the reservation, keeps money and sessions). Today's cancel moves under "Más… → Anular cita". "Marcar inasistencia" and "Cancelar" leave every agenda surface. Every status reader learns both new statuses.
3. **Desagendar**: a new live status, `unscheduled`. It leaves the grid, keeps its reservation, sale and session, and waits in the tray as "No vino" or "Desagendada". Dropping it back on the calendar makes it `accepted` again.

No migration, no new route. Design detail: [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md). Validation guide: [quickstart.md](quickstart.md).

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes, SvelteKit 2 (hub)

**Primary Dependencies**:
- Drizzle ORM over postgres.js (`withOrgCore`) and Paraglide i18n;
- hub UI kit: `ContextMenu` (nested `children` for "Más…"), `ConfirmDialog`, `Badge`, `SegmentedControl`;
- `createOptimistic` (booking mover), lucide-svelte.

**Storage**: Supabase Postgres, existing tables only:
- `sched_bookings`, `sched_booking_status_log`;
- `pos_ticket_lines`, `stk_accruals`, `app_notifications`.

No migration: `sched_bookings.status` is unconstrained text (research R1).

**Testing**:
- Vitest (bun) mocked-DB service tests (`scheduling-bookings-*.test.ts`);
- pure-helper unit tests;
- `*.mounted.test.ts` component tests;
- inbox rule tests.

**Target Platform**: Hub on Vercel; the FACES reception runs desktop Chrome. Inbox rules run on the netcup worker tick (every 30 min).

**Project Type**: Web application (SvelteKit services + routes + Svelte components in one repo)

**Performance Goals**:
- The page load adds one indexed query (`org_id, status`) capped at 200 rows, run in parallel with today's tray read.
- The inbox rule replaces N per-visit upserts with one count query and at most one upsert per org per tick.

**Constraints**:
- No new route, so RBAC and the route-contract manifest are untouched.
- Every user string goes through `m.*()` (es, en). Semantic design tokens only; `lint:design` and `lint:tokens` may not regress.
- 134-S1 must not merge before 135-S1 (FR-012 reads `checkpointFor`).

**Scale/Scope**:
- FACES only: 101 open past appointments today, about 600 appointments in total.
- About 6 service/route files and 9 Svelte/TS UI files; about 30 i18n keys over three slices.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Spec before code | ✅ spec.md approved 2026-11-20 (meta #1056); this plan; tasks next; no code yet |
| II. AS-IS → TO-BE → DELTA with evidence | ✅ in spec.md; this plan re-anchored every claim on `63c4313b` and lists five spec corrections (research "Spec corrections") |
| III. Slice-scoped delivery | ✅ three hub PRs from fresh clones of `origin/master`, base `master`, in the cross-spec order below. Foreground gates: `bun run check`, scoped vitest, `lint:design`, `lint:tokens`, `i18n:compile` |
| IV. Required build steps | ✅ No new page, route, endpoint or nav link. Existing gates kept (`scheduling:edit` on `/api/scheduling`, `pos:edit` + module checks on `/api/pos/appointments`). i18n es/en per slice. Design-token contract followed. |
| V. Data work keeps human gates | ✅ tagged `data`: owner approved the spec; owner merges each slice. No production data script in this spec (the FACES backfill belongs to 135-S1). |
| FigCraft demo first (AGENTS.md) | ⏳ to be added by the orchestrator before 134-S1 starts |

Post-design re-check: ✅. The design adds no table, no route and no migration. The one deviation from the shared slice order (status readers move from 134-S3 to 134-S2, research R14) makes each slice safer on its own.

## Project Structure

### Documentation (this feature)

```text
specs/134-booking-closure/
├── spec.md
├── plan.md                 # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md                # next: /speckit-tasks
```

### Source Code (hub repository, `minion_hub`)

```text
src/lib/components/scheduling/
├── booking-lifecycle.ts            # NEW pure: status sets, isPorCerrar, porCerrarCutoff (S1; sets grow in S2)
├── booking-status.ts               # BOOKING_STATUSES from lifecycle; labels for archived/unscheduled (S2)
├── booking-groups.ts               # INACTIVE = CLOSED_NOT_DONE + unscheduled (S2)
├── calendar-context-menu.ts        # entries: complete, unschedule/no_vino, archive, more→annul (S2/S3)
├── BookingCalendar.svelte          # .por-cerrar style + badge (S1); archived tone/strike; label map → shared (S2)
├── BookingBoard.svelte             # drop targets pending/accepted/completed only (S2)
├── BookingDetailDrawer.svelte      # footer: Completada · Desagendar · Archivar · Más… → Anular cita; "Antes: …" (S2/S3)
├── BookingsView.svelte             # no-show/cancel buttons out; shared labels (S2)
├── ConsumptionConfirmDialog.svelte # "Contado el …: no descuenta …" per counted row (S1)
├── color-source-preview.ts         # + archived (S2)
└── kit/booking-mover.ts            # unschedule(id, reason) on the same optimistic overlay (S3)
src/lib/components/pos/pending-groups.ts   # pendientesItems(): merge + chip order (S1; chips grow in S3)
src/lib/notifications/fields.ts            # BOOKING_STATUS_VALUES + both (S2)
src/lib/inbox/feed.ts                      # label for appointments.por_cerrar (S1)
src/routes/(app)/pos/appointments/
├── +page.server.ts                 # pendingAppointments (S1)
└── PageBody.svelte                 # Pendientes tray + chips + ?pendientes=; menu labels; hover actions (S1–S3)
src/routes/(app)/scheduling/calendar/PageBody.svelte   # hover actions, complete filter (S2)
src/routes/(app)/crm/[contactId]/PageBody.svelte       # label map → shared (S2)
src/routes/api/scheduling/bookings/_handlers.ts        # enums + archived reason; LIVE eligibility (S2)
src/routes/api/scheduling/bookings/[id]/complete/+server.ts  # refuse unscheduled (S3)
src/routes/api/pos/appointments/[id]/unschedule/+server.ts   # body { reason } (S3)
src/server/services/
├── scheduling-bookings.service.ts  # listPendingAppointments (S1); archived + RELEASING split (S2);
│                                   # unscheduled guard, unscheduleVisit rewrite, move flip, addService inherit (S3)
├── stock-accruals.service.ts       # (built by 135-S1: listAccruals checkpoint field)
├── calendar-window.service.ts      # drop unscheduled (S3)
├── pos/accounts/{unbilled.ts,audit.logic.ts,audit.evidence.ts,audit.ts}  # archived/unscheduled (S2)
└── inbox/rules/
    ├── appointments-por-cerrar.ts  # NEW (S1)
    ├── appointment-overdue.ts      # DELETED (S1)
    └── index.ts                    # swap the rule (S1)
scripts/qa/seed/scheduling.ts            # status matrix rows: por-cerrar (S1), archived (S2), unscheduled (S3)
messages/es.json, messages/en.json
```

**Structure Decision**: the existing hub layout. One new pure module holds the status sets that six files copy today. It has no i18n, so both the server and the client import it. One new inbox rule replaces the old one.

## Implementation slices

Cross-spec order (shared with spec 135's plan). Each line is one hub PR, base `master`, merged by the owner.

1. **135-S1**: checkpoint tables, lock rule on appointment completion, `checkpointFor`, FACES backfill of the 2026-11-18 count. *(spec 135's plan)*
2. **134-S1**: Por cerrar, Pendientes tray, daily inbox count, completion-dialog note.
3. **135-S2**: Conteo físico UI. *(spec 135)*
4. **134-S2**: Archivar, Anular in "Más…", labels, reader sweep for both new statuses.
5. **134-S3**: `unscheduled`, Desagendar everywhere, re-assign by move.
6. **135-S3**: lock rule on the remaining paths. *(spec 135)*
7. **135-S4**: count reminders. *(spec 135)*

### 134-S1: Por cerrar, Pendientes tray, daily count (after 135-S1)

Ships:
- `booking-lifecycle.ts` with `ON_CALENDAR_LIVE`, `isPorCerrar`, `porCerrarCutoff` (zone: `schedulingTimeZone(resources)`, fallback America/Lima).
- `listPendingAppointments` (Por cerrar half only in this slice) → `+page.server.ts` `pendingAppointments`.
- **Pendientes tray**: replaces "Servicios pagados sin agendar" in `PageBody.svelte:994-1098`.
  - Title "Pendientes (N)"; a `SegmentedControl` of chips "Todos · Por cerrar · Pagado sin agendar" (S3 adds "No vino" and "Desagendada").
  - Each item shows its chip as a `Badge` (semantic tone: Por cerrar = warning, Pagado sin agendar = info), plus a "Pagado" badge when paid.
  - Por cerrar items open the event menu on click or right-click; paid lines keep today's drag, pick and void.
  - `?pendientes=<chip>` preselects a chip and opens the tray.
- **Calendar**: a Por cerrar box gets the `.por-cerrar` class (dashed `--color-warning-border` sliver) and a "Por cerrar" badge in the hover card. Its menu puts "Completada" first. Until S2/S3 the rest of the menu is today's (Eliminar / Cancelar y anular).
- **Inbox**: `appointments-por-cerrar.ts` replaces `appointment-overdue.ts` (research R8); it resolves every open `appointment.overdue` row. Adds the `feed.ts` label and its case in `src/lib/inbox/feed.test.ts:37`. It deletes `appointment-overdue.ts` and its test, and updates the rule list in the comment at `system-automations.ts:72`.
- **QA seed**: `scripts/qa/seed/scheduling.ts:39-46` gains `sched.booking.por-cerrar`, an `accepted` booking dated yesterday, so the QA stack shows one Por cerrar item.
- **FR-012 note**: built by **135-S1** (orchestrator decision 2026-11-20): `listAccruals` adds `checkpoint` via `checkpointFor`, and `ConsumptionConfirmDialog` shows "Contado el {fecha}: no descuenta {ítem}" on that row and hides its quantity input. 134-S1 builds none of it and only depends on it. Plus `TODO(handoff)` for default rows without an accrual (research R11) and a proposal ledger entry.

Tests:
- `src/lib/components/scheduling/booking-lifecycle.test.ts` (new): `isPorCerrar` at 23:59 / 00:00 Lima; a Europe/Madrid DST-change day; completed/archived never; `porCerrarCutoff` with an invalid zone → Lima.
- `src/server/services/inbox/rules/appointments-por-cerrar.test.ts` (new; replaces `appointment-overdue.test.ts`):
  - count of anchors only; one upsert with the date key;
  - yesterday's key resolved; today's resolved at 0;
  - open `appointment.overdue` rows resolved.
- `src/server/services/scheduling-bookings-pending.test.ts` (new): `listPendingAppointments` cut-off, anchors only, `paid` flag, limit.
- `src/lib/components/pos/pending-groups.test.ts`: `pendientesItems` chip order and grouping.

### 134-S2: Archivar, Anular in "Más…", reader sweep (after 135-S2)

Ships:
- **Server**:
  - `archived` in `SETTABLE`, `_handlers.ts` enums, `DEAD_BOOKING_STATUSES`, and the reschedule refusals;
  - archived reason required (400 `archive_reason_required`);
  - `RELEASING` split into `RELEASES_RESERVATION` / `RETURNS_SESSION` (research R3).
- **Reader sweep for both new statuses** (research R12 rows 18, 20–35, R14): `unbilled.ts`, the audit trio, `fields.ts`, `booking-status.ts`, `booking-groups.ts`, `BookingBoard`, `BookingCalendar`, `color-source-preview.ts`, analytics test. The five label maps collapse onto `bookingStatusLabel`.
- **Menus** (`calendar-context-menu.ts`, the `PageBody.svelte` handler):
  - top level: Ver detalle · Cobrar · Ver venta · Dividir · **Archivar…** · **Más… → Anular cita**;
  - "Anular cita" runs today's "Eliminar" (unpaid) or "Cancelar y anular" (paid, `pos:manage`) unchanged.
  - Without `pos:manage` on a paid visit, "Anular cita" is shown disabled with the title "Pide a un administrador que anule la venta" (owner rule: no dead end).
- **Archivar dialog**: `ConfirmDialog` with a radio (El cliente desistió / Duplicada / Otro + text). The confirm is disabled until a reason is set; it calls `mover.setVisitStatus(anchor, 'archived', reason)`.
- **Drawer footer**: Completada · Archivar · Más… → Anular cita ("Rechazar" stays for `pending`). "Marcar inasistencia" and "Cancelar" are removed.
- **Hover-card actions** (`pos/appointments/PageBody.svelte:1269-1312`, `scheduling/calendar/PageBody.svelte:571-606`) and `BookingsView` (`:240-278`) keep only "Completar".
- **Board**: drops only on pending/accepted/completed. Other columns answer "Usa el menú de la cita para archivarla o anularla."
- Labels: "Anulada", "No vino (anterior)", "Archivada", "Anular cita".
- QA seed matrix gains `sched.booking.archived`.

Tests:
- `src/server/services/scheduling-bookings-transitions.test.ts`:
  - live → archived; archived is final;
  - reason required;
  - `releaseAccruals` called; `reverseRedemptionInTx` **not** called; lines not unlinked.
- `src/server/services/scheduling-bookings-packages.test.ts`: archived keeps the session; cancelled still returns it.
- `src/lib/components/scheduling/calendar-context-menu.test.ts`: menu shape (Archivar top level, Anular only under Más…, no no-show).
- `src/lib/components/scheduling/booking-detail-drawer.mounted.test.ts`: footer has no "Marcar inasistencia"/"Cancelar".
- `src/lib/components/scheduling/BookingBoard.mounted.test.ts`: drop on a no-show column is refused with the message.
- `src/server/services/pos/accounts/audit.logic.test.ts`: archived → `inactive`; unscheduled → not `source_corrupt`.
- `src/server/services/pos/accounts/audit.evidence.test.ts`: both statuses admitted.
- `src/server/services/pos-accounts-list.test.ts`: `UNBILLED_BOOKING_WHERE` excludes archived.
- `src/lib/notifications/catalog.test.ts`: both values admitted.
- `src/lib/components/scheduling/booking-groups.test.ts`: archived member counts as inactive.
- `src/lib/components/scheduling/color-source-preview.test.ts`.

### 134-S3: Desagendar, `unscheduled` (after 134-S2)

Ships:
- **Server**:
  - `LIVE` guard plus the transition table (data-model.md); 409 `unscheduled_needs_time`;
  - `unscheduleVisit` rewrite (research R5) and the route body `{ reason }`;
  - the move flip in `rescheduleBookingInTx` and `moveGroup` (R6); `addServiceToVisit` inherits LIVE;
  - `cancelBooking` `following` uses LIVE; `/complete` refuses `unscheduled`;
  - `loadCalendarWindow` drops `unscheduled` (R10);
  - `listPendingAppointments` adds `unscheduled` rows with the reason chip.
- **UI**:
  - `mover.unschedule(id, reason)` (optimistic);
  - menu and drawer (POS only, `canUnschedule`): "No vino" (start passed) and "Desagendar";
  - tray chips "No vino" / "Desagendada" with "Antes: 18/11 17:15 · {miembro}";
  - drag onto the grid → `mover.moveBooking`; click "Agendar" → drawer with the reschedule form open;
  - the item's menu also offers Archivar and Más… → Anular cita.
- QA seed matrix gains `sched.booking.unscheduled` (log reason `no_vino`).

Tests:
- `src/server/services/scheduling-bookings-unschedule.test.ts` (rewritten):
  - status `unscheduled` + log reason; lines stay linked;
  - no `releaseAccruals`, no redemption reversal;
  - completed members skipped; idempotent replay.
- `src/server/services/scheduling-bookings-reschedule.test.ts`: moving `unscheduled` → `accepted` + log row, reservation untouched; `archived` refused.
- `src/server/services/scheduling-bookings-group.test.ts`: `moveGroup` flips every unscheduled member.
- `src/server/services/scheduling-bookings-transitions.test.ts`: `unscheduled → completed` refused 409; → archived / cancelled allowed.
- Slots: `scheduling-bookings-override.test.ts` pins `findBookingConflicts`/`loadBusyInTx` status lists (unscheduled frees its slot).
- `src/server/scheduling/reminders.test.ts`: `dueStages` returns `[]` for `unscheduled`.
- `src/server/services/calendar-window.service.test.ts`: unscheduled absent.
- `src/lib/components/scheduling/kit/booking-mover.test.ts`: unschedule overlay and rollback on error.
- `src/lib/components/pos/pending-groups.test.ts`: four chips.

## Risks

| Risk | Mitigation |
|---|---|
| A reader misses a new status (the audit flags `source_corrupt`, the badge counts archived as owed) | Full inventory (research R12); sweep lands in S2 before any row can hold either value (R14); one test per changed reader |
| 134-S1 merges before 135-S1, so `checkpointFor` is missing | Hard order in this plan; S1's PR description names 135-S1's PR as a prerequisite |
| Spec 133 lands on the same menu and the same status matches | Whichever lands second rebases; 133 must add `archived` to its dead/unmatched sets and keep `unscheduled` matchable (research R15) |
| Staff use "Anular" for no-shows out of habit, handing sessions back | Anular sits one level deep under "Más…"; "No vino" is top level and named in the client's words; SC-004 is checked by query 30 days after release |
| An `unscheduled` appointment completed at its old time would skip or issue stock against the wrong checkpoint | Refused with `unscheduled_needs_time`; the real time is set by Agendar first (R4) |
| The reminder already sent for the old time is not resent for the new one (`sentStageKeys` is per booking) | Today's behaviour for every move; out of scope; noted in the proposals ledger |
| Default consumption rows (no accrual) show no checkpoint note before confirming | `TODO(handoff)` + ledger; the skip still happens and is noted on the movement by 135-S1 |
| The org zone comes from the first active resource; a mis-set resource zone moves midnight | Same zone the grid already uses (R7); the fallback is documented |

## FigCraft demo

FigCraft demo (shared with spec 135): [booking-closure-stock-checkpoints.figcraft](booking-closure-stock-checkpoints.figcraft), page "Spec 134 · demo". Frames: appointment menu with "Por cerrar" (as-is/to-be), Pendientes tray (as-is/to-be), Archivar dialog, completion of an appointment dated before a count, inbox (as-is/to-be). Build script: `~/.cache/claude-tmp/fc134/build134.py` (local, not committed).

Frames to cover, as-is and to-be:
- the Pendientes tray with four chips;
- a Por cerrar box and its menu;
- the event menu with "Más… → Anular cita";
- the Archivar reason dialog;
- the drawer footer;
- the "Antes: …" tray item;
- the completion-dialog checkpoint note.

## Open questions for the owner

1. **WhatsApp reply "no"**: today a client's "no" to the reminder stores `cancelled` and hands the session back (`reminders.service.ts:387`). Should it become **Desagendada** instead (keeps the session, waits in Pendientes)? This plan keeps today's behaviour until you say so.
2. **Completing an unscheduled appointment**: this plan refuses "Completada" on a Desagendada/No vino item until it has a new time ("Primero elige una hora…"), so stock is dated correctly against counts. Is that acceptable, or should "Completada" ask for the date the treatment happened?
3. **Team calendar (`/scheduling/calendar`)** has no Pendientes tray, so Desagendar is offered only on the POS agenda. Is that acceptable, or should the team calendar get the tray too (a later slice)?

## Complexity Tracking

No constitution violations.
