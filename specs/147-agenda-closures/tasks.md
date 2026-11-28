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
- [x] T011 Independent code audit (0 critical/high; 3 medium → 2 fixed `178be63d`, 1 optimistic flash accepted) → hub #725 merged `8f12c9be` (19/19 green after re-running the pre-existing `gateway.accepted-lineage` flake) → Vercel prod success → table + forced RLS verified → prod visual check found the label spilling into neighbouring days → fix hub #726 merged `960c6438`, live recheck OK
- [x] T012 D6 applied 2026-11-23: closures 27-Nov 15–20, 30-Nov 09–14, 31-Dec 09:30–14:45 created; the 3 fake bookings cancelled; re-run = no-op
