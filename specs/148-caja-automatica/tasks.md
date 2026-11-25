# Tasks: Caja automática (148)

Plan: see spec DELTA; no separate design artifacts (small slice). Anchors: `pos.service.ts` openShift :363, closeShift :385, sale shift lock :2285-2291, refund :2612, correction :2992; `pos/settings.ts` :69/:210/:287; `cron-auth-path.ts`; `vercel.json` crons; `ShiftBanner.svelte`; `inbox/rules/shift-open-after-hours.ts`.

- [ ] T001 Migration `pos_settings.shift_mode` + Drizzle + settings read/write/validation + seed pairing (D1)
- [ ] T002 In-tx auto-open helper used by sale, refund and correction; conflict-safe; tests (D2)
- [ ] T003 Cron route `/api/pos/shifts/auto-close` + `CRON_AUTH_PATHS` + `vercel.json` `0 5 * * *`; reuses `closeShift`; tests (D3)
- [ ] T004 Settings toggle UI; ShiftBanner auto copy; sell page no longer blocks without a shift in auto mode; inbox rule skip; i18n (D4)
- [ ] T005 Gates (foreground, one at a time): check, lint, lint:design, lint:tokens, scoped tests, prettier with svelte plugin
- [ ] T006 Independent audit → fixes → PR → CI → merge → deploy
- [ ] T007 D5: FACES `shift_mode = 'auto'`; verify first auto open
