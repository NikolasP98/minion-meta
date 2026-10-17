# Tasks: POS void refusal names its reason

- [X] T001 Diagnose (read-only prod): ticket `POS-2026-00040` state, FACES open shift (owner = the actor), `permission_rules` `staff/pos manage=f`, PostHog autocapture/rageclick trail, Vercel logs (nothing for the route).
- [X] T002 S1 hub: `canVoid` in `calendarMenuEntries` + page gate (`canAct('pos','manage')`), tray no-op; tests.
- [X] T003 S2 hub: `voidRefusalKey` + page mapping + `voidFailure` on the dialog; es/en keys; tests.
- [ ] T004 Gates green; draft PR to `master` with root cause, evidence, **Out of scope**.
- [ ] T005 Owner: decide FACES `staff` → `pos:manage`, or have a manager void `#POS-2026-00040` from their own open register.
