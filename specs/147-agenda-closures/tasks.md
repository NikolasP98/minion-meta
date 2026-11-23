# Tasks: Close the agenda (147)

- [ ] T001 Migration `supabase/migrations/20261123180000_sched_closures.sql` + Drizzle table in `pg-scheduling-schema.ts` (D1)
- [ ] T002 Pure `src/server/scheduling/closures.ts` `expandClosureDays` + `closures.test.ts` (D2)
- [ ] T003 `scheduling-closures.service.ts` list/create/delete(+group) + test (D2)
- [ ] T004 API routes GET/POST `/api/scheduling/closures`, DELETE `[id]` with guards + 403 wording + route test (D3)
- [ ] T005 Slot engine: closures as busy intervals in both `loadDayOffOverrides` callers + slots test (D5)
- [ ] T006 Calendar window: `closures` in `loadCalendarWindow`, both page loads, window-cache refetch path (D4)
- [ ] T007 BC `closures` prop: grid band, month line, list row, accessible button, popover with reopen (optimistic) + mounted test (D4)
- [ ] T008 Create drawer "Cita | Cerrar agenda" switch + closure form; toolbar "…" item; i18n es/en + mounted test (D5)
- [ ] T009 Overlap confirm on booking create + drag-move in POS and SCHED (D5)
- [ ] T010 Gates: `bun run check`, lint, `lint:design`, `lint:tokens`, scoped unit/mounted tests, a11y story gates if BC stories change
- [ ] T011 Independent code audit → fixes → PR → CI green → merge → deploy verify
- [ ] T012 D6 one-off: 3 fake FACES bookings → closures, cancel bookings without notifying (owner-approved 2026-11-23)
