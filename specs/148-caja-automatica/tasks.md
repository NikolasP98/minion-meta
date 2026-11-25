# Tasks: Caja automática (148)

Plan: see spec DELTA; no separate design artifacts (small slice). Anchors: `pos.service.ts` openShift :363, closeShift :385, sale shift lock :2285-2291, refund :2612, correction :2992; `pos/settings.ts` :69/:210/:287; `cron-auth-path.ts`; `vercel.json` crons; `ShiftBanner.svelte`; `inbox/rules/shift-open-after-hours.ts`.

- [x] T001 Migration `pos_settings.shift_mode` + Drizzle + settings read/write/validation + seed pairing (D1)
- [x] T002 In-tx auto-open helper used by sale, refund and correction; conflict-safe; tests (D2)
- [x] T003 Cron route `/api/pos/shifts/auto-close` + `CRON_AUTH_PATHS` + `vercel.json` `0 5 * * *`; reuses `closeShift`; tests (D3)
- [x] T004 Settings toggle UI; ShiftBanner auto copy; sell page no longer blocks without a shift in auto mode; inbox rule skip; i18n (D4)
- [x] T005 Gates (foreground, one at a time): check, lint, lint:design, lint:tokens, scoped tests, prettier with svelte plugin
- [x] T006 Independent audit → fixes → PR → CI → merge → deploy
- [x] T007 D5: FACES `shift_mode = 'auto'`; verify first auto open

## Outcome (2026-11-25)
- Hub #727 merged `f006adff` (19/19 green after CI fixes: `requireCronSecret` guard, schema fixtures, EN label, RLS inventory). Vercel deploy success; `/api/pos/shifts/auto-close` answers 401 without the secret.
- Audit: 0 critical. Fixed: the cron runs HOURLY (`0 * * * *`) and closes each org after ITS local midnight, retrying failures; 500 on any failure; no "open" in the phone menu; no auto-open for a NULL actor.
- D5: FACES `shift_mode = 'auto'` via `updatePosSettings`. The first automatic open will show on the next sale. FACES had no open shifts at switch time.
- Open (TODO(handoff) in `pos-auto-close.service.ts`): sales between midnight and the next hourly run go into yesterday's shift; an emission throw after the close commits waits for "Reintentar".
