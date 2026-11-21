# Tasks: PDV marketing funnel and targetable customers

- [ ] T001 `pos-funnel.logic.ts`: `ratio(n,d)` (null on 0/missing), `stageRates(stages)`, `funnelMetrics(input)`, `reachability(row)`, `filterCustomers(rows, {reach, tier})`, `reachTotals(rows)`. Tests first (`pos-funnel.logic.test.ts`) covering every acceptance scenario and edge case in the spec.
- [ ] T002 `pos-funnel.service.ts`: `listTargetableCustomers(ctx)`, `funnelStages(ctx, range)`, `salesTotals(ctx, range)`, `adDataLastDate(ctx)`. SQL per plan "Data definitions". `TODO(handoff)` at the provider filter.
- [ ] T003 Route `/pos/funnel`: loader (`datasetCtx(locals,'pos')`, date range parsed like the other dashboards), page with three sections: targetable customers (summary + filters + table), metrics tiles, funnel stages with rates; "estimate" label on leads; ad-data-ends notice.
- [ ] T004 Menu entry in `modules.ts` + i18n keys en/es + `bun run i18n:compile`.
- [ ] T005 Route contract: manifest entry and every count the route tests assert (`route-design-validation.ts`, `route-design-contracts.test.ts`, `business-route-shells(.test).ts`, `frontend-contract-scanner.test.ts`, `scripts/ui-audit-inventory.test.ts`, and any other the failing tests name).
- [ ] T006 Gates: targeted vitest for the new files and the route-contract tests; `bun run lint:design && bun run lint:tokens`; prettier on touched files.
- [ ] T007 (orchestrator) `bun run check`, build, prod-data read check of SC-001, FigCraft as-is/to-be, PR.
