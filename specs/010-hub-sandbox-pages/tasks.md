# Tasks: Sandbox pages (POC)

**Input**: `spec.md`, `plan.md`, `contracts/query-and-bridge.md` | **Repo**: minion_hub (`master`), worktree `~/.cache/claude-tmp/hub-sb` branch `feat/sandbox-pages-poc`

## Phase 1: Gates & prerequisites
- [X] T001 Spec/plan/contracts written. [OWNER] T002 Owner approves this spec before the POC PR leaves draft (Principle V). The POC runs on `dev:local` meanwhile.

## Phase 2: Data layer (S1) — `src/server/sandbox/`
- [ ] T003 `datasets.ts`: registry per contract §2 (8 datasets, column allowlists, modules, owner column, PII flags).
- [ ] T004 `query-compiler.ts`: pure `compile(spec, dataset, orgId, ownerScope?) → {sql, params, columns}`; ops, groupBy/aggregate, limit clamp, escapes. `query-compiler.test.ts`: happy path per op, unknown col/op/dataset → named errors, limit clamp, in ≤100, like escaping.
- [ ] T005 `sandbox.service.ts`: `runQuery(locals, spec)` = capability(`<module>:view`) → `resolveOwnerScope` → compile → `withOrgCore` + `set local statement_timeout = 5000` → mask PII columns when `shouldMaskSensitive`. `listDatasets(locals)` filtered by capability.
- [ ] T006 Routes `api/sandbox/query/+server.ts` (POST), `api/sandbox/datasets/+server.ts` (GET): `requireAuth`, zod-ish validation, field-named 400s. Tests with a low-privilege persona (negative controls).

## Phase 3: Elements + page (S2)
- [ ] T007 Migration `supabase/migrations/2026101600_sandbox_elements.sql` + seed matrix row + seed (one demo element) + `seed.contract.test.ts` assertion.
- [ ] T008 `sandbox.service.ts`: element CRUD (org-scoped, html+css+js ≤ 64 KB); routes `api/sandbox/elements` (GET/POST) + `[id]` (PATCH/DELETE) with `requireAdmin`; `API_WRITE_PREFIXES` gets `['/api/sandbox', 'settings']`.
- [ ] T009 `src/lib/sandbox/vendor.ts` (`echarts` `?url` asset allowlist), `bridge.ts` (the in-iframe script as a string), `srcdoc.ts` (template with CSP + theme tokens), `host.svelte.ts` (frame registry, postMessage router, query → fetch).
- [ ] T010 `routes/(app)/sandbox/+page.server.ts` (`requireAdmin`, load elements) + `+page.svelte` (grid, `ElementFrame.svelte`, add/remove, empty state "ask the assistant"), tokens only; `lint:design && lint:tokens`.
- [ ] T011 Wiring: nav item + palette route (`modules.ts`, `routes.ts`), `route-access-registry.ts` `'/sandbox': 'role:admin'`, `route-design-manifest.ts` screen, `site-map.ts` keywords, i18n keys EN/ES (`nav_sandbox`, `sandbox_*`), `i18n:compile`, route-contract tests updated (all 6 counts).

## Phase 4: Agent (S3)
- [ ] T012 `src/lib/sandbox/tools.ts`: the five tools per contract §5; registered in `+page.svelte` with an `AbortController` aborted on unmount.
- [ ] T013 `turn-router.ts`: manifest `sandbox` (mode `record_action`, threshold 0.5, question per spec FR-009); `assistant-router.service.ts`: state `page: <route>`; `assistant-context.ts`: core 1-line hint when route starts with `/sandbox`; gated protocol section; tests updated (`turn-router.test.ts`, `assistant-context.test.ts`, SC-004 size assertion).

## Phase 5: Proof (S4)
- [ ] T014 `bun run dev:local`; login as owner persona; on `/sandbox` ask: "show me gross margin by product for this month as a bar chart" → element renders (screenshot); isolation checks via the element console (SC-003).
- [ ] T015 Gates: prettier, svelte-check, design/token lints, `bun run vitest run src/server/sandbox src/routes/api/sandbox src/lib/assistant src/lib/state/features src/lib/routes scripts/qa/seed`, route-contract tests. Draft PR with screenshot; `TODO(handoff)` + proposal entry for: `sandbox` RBAC module, sharing to members, write tools, dayjs vendor.

## Dependencies
T003→T004→T005→T006; T007→T008; T009→T010→T011; T012 after T009/T006; T013 independent; T014 after all; T015 last.
