# Implementation Plan: Close the agenda (147)

**Spec**: [spec.md](spec.md) · **Repo**: `minion_hub` · **Branch**: `feat/147-agenda-closures` from `master` `b4d2e383`

## Technical context

SvelteKit 2 / Svelte 5 runes, Drizzle on Supabase Postgres (RLS via `app.current_org_id` GUC + `app_ledger` role), Paraglide i18n (es + en), Vitest unit + mounted tests, design-token contract (`bun run lint:design && bun run lint:tokens`). Migrations: `supabase/migrations/<ts>_<name>.sql`, applied by the production build.

## Design

### Data — `sched_closures`

```sql
create table public.sched_closures (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  reason text not null check (char_length(reason) between 1 and 120),
  group_id uuid not null,
  created_by text,
  created_at timestamptz not null default now()
);
create index on public.sched_closures (org_id, starts_at);
-- + grant/enable/force RLS/policy exactly as 20261010140000_sched_booking_products.sql
```

Drizzle table in `src/server/db/pg-scheduling-schema.ts` next to `schedBookings`.

### Service — `src/server/services/scheduling-closures.service.ts`

- `expandClosureDays({fromDate,toDate,startTime,endTime,tz})` — pure, in `src/server/scheduling/closures.ts`: one `{startsAt,endsAt}` per local day; all-day = local 00:00 → next 00:00; refuses `toDate < fromDate`, ranges over 62 days, `endTime <= startTime`. Uses the existing tz helpers in `src/server/scheduling/tz.ts`.
- `listClosures(ctx,{from,to})`, `createClosures(ctx,input,actorProfileId)` (one transaction, one `group_id`), `deleteClosure(ctx,id,{group})`.
- Audit with the existing `recordAudit` pattern used by scheduling bookings, if present; otherwise skip (no new infra).

### API

- `GET /api/scheduling/closures?from&to` — `requireSchedulingRead`.
- `POST /api/scheduling/closures` — same guard as `POST /api/scheduling/bookings` (`getCoreCtx` + module enabled + the booking-create permission check that route uses). 403 body: `Tu rol no puede cerrar la agenda`.
- `DELETE /api/scheduling/closures/[id]?group=1` — same guard as POST.

### Agenda

- `loadCalendarWindow` (calendar-window.service.ts) returns `closures` for `[from,to)`; both `+page.server.ts` and the window-cache client refetch path carry it (follow how `bookings` flows through `window-cache.svelte.ts` and `/api/pos/appointments`).
- BC prop `closures?: CalendarClosure[]` (`{id, groupId, groupSize, start, end, reason}`) and `onclosure?: (c) => void`. Grid: an absolutely positioned band per day column, drawn after `.offhours` and before events, `--color-danger-*` tokens + the existing hatch pattern, reason label at the top (truncate with title). Month: a line in the day cell. List: a row in the day group. Band is a `<button>` with an accessible name "Agenda cerrada de 09:00 a 14:00: Viaje del doctor".
- Popover (existing popover/tooltip primitive used by the hover card) → reason, time, "Reabrir este día", "Reabrir todos (N días)" when `groupSize > 1`. Optimistic removal via `createOptimistic()`.
- `BookingCreateDrawer`: a segmented switch "Agendar cita | Cerrar agenda" at drawer level that swaps whole panels (not inside `AppointmentCreatePanel`, which has its own Cita|Control switch); the closure form = Desde, Hasta, Todo el día toggle, De/A times (prefilled from the clicked slot), Motivo. Toolbar "…" menu item "Cerrar agenda" opens the drawer in closure mode with today.
- No client overlap check (cut, EGM F3): the band intercepts clicks; its popover's "Agendar aquí igual" calls `onslot` for the clicked time. Events stay above the band and drops still reach the grid.

### Slot engine

`scheduling-slots.service.ts`: load closures for the range and append them as `BusyInterval`s for every resource. `scheduling-bookings.service.ts` `createBooking`: same, ONLY when `!input.bypassRules` (public/assistant path); staff paths are untouched (EGM F1).

## Tests

Unit: `closures.test.ts` (expansion/validation), slots test (closure subtracts), service test (group delete). Route test for 403 wording. Mounted: BC renders band + reopen; drawer closure mode posts.

## Risks

- BC is 5k lines and shared by two pages plus phone layout (spec 145): keep the change additive (new prop, new layer). 
- Window cache keys: closures must invalidate with the window like bookings do, or a reopen reappears on refetch.

## EGM round-1 resolutions (2026-11-23)

See spec §Review. These supersede the sections above where they conflict: no slot-engine change; POS twin route + `[id]/reopen` POST; band `pointer-events: none` with only the label as a button; drawer banner; closures in both pages' seed/merge/refetch paths; `groupSize` from the server; tz via `schedulingTimeZone(resources)`.
