# Tasks: Close the agenda (147)

- [x] T001 Migration `supabase/migrations/20261123180000_sched_closures.sql` + Drizzle table in `pg-scheduling-schema.ts` (D1)
- [x] T002 Pure `src/server/scheduling/closures.ts` `expandClosureDays` + `closures.test.ts` (D2)
- [x] T003 `scheduling-closures.service.ts` list/create/delete(+group) + test (D2)
- [x] T004 Shared handlers + `/api/pos/appointments/closures` (CREATE_COLLECTION_ENDPOINTS) + `/api/scheduling/closures`; GET/POST + `[id]/reopen` POST; route + hook-permission test (D3)
- [x] ~~T005 Slot engine~~ DEFERRED (EGM critic B2) → TODO(handoff) + follow-up proposal
- [x] T006 Calendar window: `closures` in `loadCalendarWindow`, both page loads, window-cache refetch path (D4)
- [x] T007 BC `closures` prop: grid band, month line, list row, accessible button, popover with reopen (optimistic) + mounted test (D4)
- [x] T008 Create drawer "Cita | Cerrar agenda" switch + closure form; toolbar "…" item; i18n es/en + mounted test (D5)
- [x] ~~T009 Overlap confirm~~ CUT (EGM) → non-blocking drawer banner in T008
- [x] T010 Gates: `bun run check`, lint, `lint:design`, `lint:tokens`, scoped unit/mounted tests, a11y story gates if BC stories change
- [ ] T011 Independent code audit (done: 0 critical/high; 3 medium → 2 fixed `178be63d`, 1 optimistic flash accepted) → hub #725 → CI green → merge → deploy verify
- [ ] T012 D6 one-off: 3 fake FACES bookings → closures, cancel bookings without notifying (owner-approved 2026-11-23)
