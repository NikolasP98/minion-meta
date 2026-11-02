# Tasks: Module SDK and install packages (spec 047)

Worktrees `~/.cache/claude-tmp/hub-047-s6` (from `origin/master`) and `hub-047-s4` (from S6's branch until it merges). One draft PR each. Gates in the foreground with `timeout`.

## S6 — SDK

- [ ] T101 [S6] `src/lib/modules/sdk.ts`: types, `defineModule`, `manifestFrom`, `tablesFrom`.
- [ ] T102 [S6] `src/lib/modules/stock/index.ts`: stock definition with the two TableDefs moved from `tables/defs/index.ts`.
- [ ] T103 [S6] `src/server/modules/sdk.server.ts` + `stock.server.ts`: datasets moved from `sandbox/datasets.ts`; `links` from `grep -i "references stk_\|references crm_parties" supabase/migrations`.
- [ ] T104 [S6] Derive: `availability.ts`, `tables/defs/index.ts`, `sandbox/datasets.ts` (names, order, types unchanged).
- [ ] T105 [P] [S6] `src/lib/modules/sdk.test.ts` parity snapshots; `src/server/modules/links.sql.integration.test.ts`.
- [ ] T106 [S6] Gates: `bun run check`; full `bun run test` with `SUPABASE_DB_URL` unset; `format:check`. Draft PR.

## S4 — install

- [ ] T110 [S4] `BASE_MODULES` + `toggleIds()` in `availability.ts`.
- [ ] T111 [S4] `module-install.service.ts` (`installBaseModules`).
- [ ] T112 [S4] Provisioning step `modules` after `rbac`, before `workforce`; kind from the org row; step id union; provision route test.
- [ ] T113 [S4] Settings → Modules from `toggleIds()`; labels; remove per-module state.
- [ ] T114 [P] [S4] Tests: installer integration (4 cases), provision order/failure, route-guard with base states.
- [ ] T115 [S4] Gates as T106 + `lint:design`, `lint:tokens`, `i18n:compile` if keys added. Draft PR; screenshot of Settings → Modules in the body.

## Post-merge

- [ ] T116 QA-stack provisioning proof recorded in the spec stub.
