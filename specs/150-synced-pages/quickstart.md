# Quickstart — validate S1

Prereqs: hub clone at `feat/150-synced-pages-s1`, QA stack up (`hub-local-qa-stack-recipe`), admin QA login.
1. Unit: `bunx vitest run src/lib/sandbox src/server/sandbox src/routes/api/sandbox src/lib/components/sandbox` — grammar, `values.svelte.ts`, `blockQueries` bindings, `pageWiring`, refusals, compiler type check, "change preset keeps listens".
2. Connections write: mocked-db harness asserts `for update` + merged-spec validation; "change preset keeps listens", "change dataset refuses a stale connection".
3. Mounted: SyncedPage with 6 blocks / 3 connected → one filter change = 3 requests; superseded request aborted; filter bar keyboard path.
4. e2e (QA stack, `tests/e2e/ui-audit/synced-pages.spec.ts`): build the story-1/2 page, change filters, compare numbers with direct queries (SC-001, SC-002).
5. Agent trial (SC-003, post-merge): fixed request 5× through MCP or the in-page assistant; ≥ 4 builds without a refused save.
6. Gates: `bun run check`, `bun run lint:design && bun run lint:tokens`, a11y gates (spec 137), i18n compile, full-suite-only gates (content contract, RLS-bypass inventory, rls-coverage allowlist, formatter ratchet).
