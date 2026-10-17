# Tasks: QA seed — 90 days of realistic business activity

- [X] T001 Diagnose on the live QA DB: element dataset ids vs registry; booking/ticket/invoice counts and time spread (spec §Diagnosis).
- [X] T002 Spec/plan (this dir).
- [X] T003 S1: `activity.ts` (PRNG, bookings, shifts+tickets+lines+payments, clients+invoices+items, delete-then-insert, register 3 ids); `index.ts` MODULES; `matrix.ts`; README; contract assertion.
- [X] T004 (prettier 0 · vitest 0, 240 DB-backed · check 0) Gates: `bunx prettier --check`, `bun run vitest run scripts/qa/seed` (DB-backed suite skipped without `HUB_TEST_DB_URL`; run it with the local URL + service key), `bun run check`.
- [X] T005 S2 (192/69/116/219/116/8/38/71 rows applied; 58 non-zero Lima cells; `/api/sandbox/query scheduling.bookings` → 205 rows; element still zero = its own dataset-id bug, screenshot `015-heatmap.png`): apply with `bun scripts/qa/seed/index.ts --only activity` using `.env.qa` of the running stack; SQL weekday×hour matrix; Playwright screenshot `~/.cache/claude-tmp/hub-sb-proof/015-heatmap.png`.
- [~] T006 hub #552 open PRs: hub → `master`, meta → `dev`; ledger line if anything stays open.
