# Tasks: slice S5 — hub MCP endpoint for sandbox pages

- [ ] T001 Migration (two additive columns + scope check) and whatever `check-migration-seed-pairing` requires; Drizzle schema columns.
- [ ] T002 Key scopes through service, types, API route, and the Developers settings UI (checkbox on create, badge in list). Tests first.
- [ ] T003 `src/server/mcp/protocol.ts` + tests.
- [ ] T004 Sandbox service additions (`listPages`, `datasetCatalog`, `writtenByKey`) + `src/server/mcp/sandbox-tools.ts` + tests.
- [ ] T005 `src/routes/api/mcp/+server.ts` + route test; allow-list and route-contract counts.
- [ ] T006 i18n keys en/es for the checkbox, badge and help text; `bun run i18n:compile`.
- [ ] T007 Gates: targeted vitest (new files, key service, doors, sandbox, `scripts/qc`, `src/lib/assistant`, `src/lib/routes`, `src/lib/nav`, `scripts/ui-audit-inventory.test.ts`, `src/server/ui-audit`), `lint:design`, `lint:tokens`, prettier on touched files.
- [ ] T008 (orchestrator) `bun run check`, `vite build`, local end-to-end call against the QA stack, draft PR, meta PR.
