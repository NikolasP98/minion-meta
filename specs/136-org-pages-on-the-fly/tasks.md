# Tasks: slice S5 — hub MCP endpoint for sandbox pages

- [x] T001 Migration (two additive columns + scope check) and whatever `check-migration-seed-pairing` requires; Drizzle schema columns.
- [x] T002 Key scopes through service, types, API route, and the Developers settings UI (checkbox on create, badge in list). Tests first.
- [x] T003 `src/server/mcp/protocol.ts` + tests.
- [x] T004 Sandbox service additions (`listPages`, `datasetCatalog`, `writtenByKey`) + `src/server/mcp/sandbox-tools.ts` + tests.
- [x] T005 `src/routes/api/mcp/+server.ts` + route test; allow-list and route-contract counts.
- [x] T006 i18n keys en/es for the checkbox, badge and help text; `bun run i18n:compile`.
- [x] T007 Gates: targeted vitest (new files, key service, doors, sandbox, `scripts/qc`, `src/lib/assistant`, `src/lib/routes`, `src/lib/nav`, `scripts/ui-audit-inventory.test.ts`, `src/server/ui-audit`), `lint:design`, `lint:tokens`, prettier on touched files.
- [x] T007b Block tools over MCP (FR-005a–c): shared catalogue module, `sandbox_blocks`, four writers, registry validation, tests.
- [ ] T008 (orchestrator) `bun run check`, `vite build`, local end-to-end call against the QA stack, draft PR, meta PR.
