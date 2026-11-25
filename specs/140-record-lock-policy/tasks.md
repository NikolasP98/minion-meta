# Tasks: Record lock policy

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), [quickstart.md](quickstart.md)

**Tests**: included, because the spec's DELTA table names a proof for every row. Tests are written before the code they prove where marked "test first".

Paths are in the hub repository. "SVC" is `src/server/services/`. "CORR" is `SVC/stock-corrections.service.ts`. "RL" is `SVC/record-locks`. "ENTRY" is `src/routes/(app)/stock/entries/[id]/`. "PAGE" is `src/routes/(app)/settings/record-locks/`. `[P]` = can run in parallel with the other `[P]` tasks of the same phase (disjoint files). Slice S1 = phases 1–2; S2 = phase 3; S3 = phase 4; S4 = phase 5; S5–S6 = phase 6.

Each slice: fresh hub clone from `origin/master`, one gate at a time in the foreground, focused test files only (never `bun run test`), independent code audit, draft PR to `master` with the title from plan.md.

## Phase 1: Setup (S1)

- [ ] T001 Clean hub clone on `feat/140-record-lock-policy-s1` from `origin/master`; `bun install --frozen-lockfile`, `bunx svelte-kit sync`, `bun run i18n:compile`
- [ ] T002 Record the baseline: run `bun x vitest run SVC/stock-corrections.logic.test.ts src/routes/api/stock/corrections/server.test.ts` and keep the output for the parity comparison

## Phase 2: Foundation and parity (S1) — no visible change

- [ ] T003 [P] Migration `supabase/migrations/20261124100000_record_lock_policy.sql`: `org_lock_policy`, `org_record_locks`, `org_lock_events` with constraints, indexes, RLS and grants exactly as data-model.md; every statement idempotent
- [ ] T004 [P] Drizzle mirror in `src/server/db/pg-org-integrations-schema.ts`: `orgLockPolicy`, `orgRecordLocks`, `orgLockEvents` and their row types
- [ ] T005 [P] Types in `src/lib/types/record-locks.ts`: `LockRule`, `LockHitKind`, `LockHit`, `LockPolicy`, `LockableRecord`, `RecordLockResult`, `LockEventRow`
- [ ] T006 [P] Seed: add the three tables to `scripts/qa/seed/db.ts`, one explicit default policy row and one `refused` event for the main QA org, and their entries in `scripts/qa/seed/matrix.ts` (pattern: hub commit `4ea8b4e9`)
- [ ] T007 Test first, `RL.logic.test.ts`: (a) parity table "default policy equals `receipt_period_v1`" over original month locked, current month locked, both, neither, no finance settings, a posting at a Lima month boundary; (b) `days` rule at X, X+1 and across a timezone day boundary; (c) `webhook` by date (inclusive) and by record id incl. a chain id; (d) combinations return every hit; (e) `month_current` is `unlockable: false`; (f) an active unlock clears only unlockable hits
- [ ] T008 `RL.logic.ts`: `DEFAULT_LOCK_POLICY`, `evaluateRecordLock(input)` (month rule delegates to `evaluateReceiptPeriod`, `SVC/stock-corrections.logic.ts:249`), `parsePolicyInput`; no database, no clock reads
- [ ] T009 Test first, `RL.service.test.ts` (mocked DB): no policy row → default; replacement receipt resolves the first receipt's date and the chain ids; `policy_unverified` propagates; external locks are ignored while the webhook rule is off
- [ ] T010 `RL.service.ts`: `getLockPolicy(tx, orgId)`, `recordLockFor(tx, orgId, record, opts)` with the recursive chain query over `stk_corrections` (cap 20) and the reads of `fin_settings`, `pos_period_locks`, `org_record_locks`, unlock events
- [ ] T011 `SVC/stock-corrections.logic.ts:12-58`: add refusal code `record_locked` (422) to `CorrectionRefusalCode` and `CORRECTION_STATUS`
- [ ] T012 CORR `:447-471`: replace the `posPeriodLocks` read and the `evaluateReceiptPeriod` call with `recordLockFor`; month-only hits throw `period_locked` with today's message and no detail; other hits throw `record_locked` with `{ locks }`; `policyExtra` byte-identical without a policy row, plus `lockPolicy` with one (research R3); add `record_locked` to the `direct` list at `:296`
- [ ] T013 Native case in `SVC/stock-corrections.sql.integration.test.ts`: with a policy row `days = 1`, a receipt posted two days ago is refused `record_locked` at preview and at apply; with no row the existing receipt cases are untouched
- [ ] T014 Gates: `git diff origin/master -- SVC/stock-corrections.logic.test.ts` is empty; the focused files of quickstart S1; `bun run check`; `bun run qa:reset`; manual check; independent audit; draft PR

## Phase 3: Settings, lock notice, audit (S2) — user stories 2 and part of 1

- [ ] T015 Test first, `RL.service.test.ts`: `setLockPolicy` refuses a non-owner with `owner_required`, validates days, writes `policy_changed` with before/after, writes nothing when unchanged; `logLockEvent`; `listLockEvents` paging
- [ ] T016 `RL.service.ts`: `setLockPolicy` (owner read in the transaction through `resolveFreshOperatorCapabilitiesForWriteInTransaction`, `SVC/rbac.service.ts:1204`), `logLockEvent`, `listLockEvents`
- [ ] T017 [P] `src/routes/api/settings/record-locks/policy/+server.ts` (PUT) and `src/routes/api/settings/record-locks/server.test.ts` (owner 200; admin 403 `owner_required`; bad days 400; unknown key 400)
- [ ] T018 [P] `SVC/rbac.service.ts:897`: add `['/api/settings/record-locks', 'settings']` to `API_WRITE_PREFIXES`; case in `SVC/rbac.service.test.ts`
- [ ] T019 `src/routes/api/stock/_corrections-http.ts`: for `period_locked` and `record_locked` emit `locks` and `unlockBy: 'owner'`; CORR passes the hits as detail for both codes; both correction routes (`src/routes/api/stock/corrections/+server.ts`, `preview/+server.ts`) write a `refused` event after the refusal; cases in `src/routes/api/stock/corrections/server.test.ts` (body shape; event written; log failure does not change the refusal)
- [ ] T020 [P] Messages in `messages/es.json` and `messages/en.json` (same commit): `record_locks_*` (page, rules, hints, read-only note, audit actions, lock reasons, who can unlock), `stock_corr_err_record_locked`, reworded `stock_corr_err_period_locked`, `settings_nav_record_locks`
- [ ] T021 [P] `src/lib/components/stock/LockNotice.svelte` (lock icon, one line per hit, who can unlock; semantic tokens only) and `src/lib/components/stock/correction-refusals.ts` (`record_locked`)
- [ ] T022 `ENTRY/+page.server.ts`: return `lock` (receipts only, through `recordLockFor` in `withOrgCore`) and `isOwner`; `ENTRY/PageBody.svelte`: render `LockNotice`, disable "Corregir entrada" while `lock.locked`; cases in `ENTRY/page.correction.mounted.test.ts`
- [ ] T023 [P] `src/lib/components/settings/record-locks/LockPolicySection.svelte` (month toggle, days toggle + number, save with optimistic feedback, read-only for non-owners) and `LockAuditSection.svelte` (date, action, record link, rule, actor, reason; "Cargar más")
- [ ] T024 `PAGE/+page.server.ts` (`requireOrgCapability(locals, 'settings', 'manage')`; policy, `isOwner`, events) and `PAGE/+page.svelte`; `PAGE/page.mounted.test.ts` (owner edits; admin read-only; audit rows)
- [ ] T025 Route registrations: `src/lib/components/settings/SettingsNav.svelte` (after `developers`, `:135`), `src/lib/routes/route-access-registry.ts:144`, `src/lib/routes/route-design-manifest.ts:406`, counts in `src/lib/routes/route-design-validation.ts:45-47` and `route-design-contracts.test.ts`, `src/lib/assistant/site-map.ts`, `scripts/ui-audit-inventory.test.ts`
- [ ] T026 [P] One line under "Periodos contables" in `src/routes/(app)/finances/settings/PageBody.svelte:794` linking to `/settings/record-locks`
- [ ] T027 Gates: quickstart S2 focused files; `bun run i18n:compile`; `bun run lint:design && bun run lint:tokens`; `bun run check`; manual check (six steps); audit; draft PR

## Phase 4: Owner one-shot unlock (S3) — user story 3

- [ ] T028 Test first, `RL.service.test.ts`: `grantUnlock` refuses non-owners, `not_locked`, `not_unlockable`; returns the active unlock on a second grant; expiry after 24 h; `consumeUnlockInTx` writes `unlock_used` once (unique index)
- [ ] T029 `RL.service.ts`: `grantUnlock`, `consumeUnlockInTx`; `recordLockFor` returns `unlock` and `locked: false` when one is active
- [ ] T030 CORR: `Planned.unlockEventId` from the plan; after the `stk_corrections` insert (`:806-831`) call `consumeUnlockInTx` with the correction id; the unlock event id is part of `policyExtra`
- [ ] T031 [P] `src/routes/api/settings/record-locks/unlocks/+server.ts` (POST) and cases in `src/routes/api/settings/record-locks/server.test.ts` (owner 201; admin 403; unknown record 404; not locked 409)
- [ ] T032 [P] Messages (es, en): unlock dialog, unlocked state, `not_locked`, `not_unlockable`; final `stock_corr_err_record_locked` text
- [ ] T033 `ENTRY/PageBody.svelte` and `LockNotice.svelte`: owner button "Desbloquear para una corrección", dialog with required reason, unlocked state with expiry; "Corregir entrada" enabled while an unlock is active; cases in `ENTRY/page.correction.mounted.test.ts`
- [ ] T034 Native case in `SVC/stock-corrections.sql.integration.test.ts`: locked receipt + unlock → correction applies and the unlock is consumed; the replacement is locked again; a failed correction leaves the unlock usable
- [ ] T035 Gates: quickstart S3 focused files; i18n; design lints; `check`; manual check; audit; draft PR

## Phase 5: Webhook and `locks` scope (S4) — user story 1

- [ ] T036 [P] Migration `supabase/migrations/20261124110000_api_key_scope_locks.sql` (drop + add `org_api_keys_scopes_known` with `sandbox`, `locks`); seed a revoked `locks` key and one lifted external lock in `scripts/qa/seed/doors.ts` (`:179-188`) + `matrix.ts`
- [ ] T037 [P] `src/lib/types/api-keys.ts:17`: `API_KEY_SCOPES = ['sandbox', 'locks']`; cases in `SVC/org-api-keys.service.test.ts` and `src/routes/api/settings/api-keys/server.test.ts`
- [ ] T038 [P] `src/lib/components/settings/developers/ApiKeysSection.svelte` (`:45`, `:74`, `:174`, `:269`): second scope checkbox and badge; messages `settings_developers_scope_locks`, `_hint`
- [ ] T039 Test first, `src/server/locks/caller.test.ts`: no key 401; malformed 401; revoked 401; no scope 403; limiter 429; valid key returns org, key id and name; then `src/server/locks/caller.ts` (pattern `src/server/mcp/caller.ts:64-74`)
- [ ] T040 Test first, `RL.service.test.ts`: `applyExternalLock` by date (idempotent, later date adds a row), by ids (skips existing, reports unknown and other-org ids), lift by date and by ids, `webhook_rule_off`, one event per change with the key's name; `liftLock` owner only with reason; then implement both in `RL.service.ts` and `parseHookBody` in `RL.logic.ts`
- [ ] T041 `src/routes/api/hooks/record-locks/+server.ts` and `server.test.ts` (wrong scope refused; lock by date; lock by ids; repeat call; lift; rule off; body validation)
- [ ] T042 `src/hooks.server.ts:531`: add `/api/hooks/record-locks` to `API_HANDLER_AUTH_PATHS` with its comment; regenerate `src/server/db/rls-bypass-inventory.json` (`bun scripts/rls-bypass-inventory.ts`)
- [ ] T043 [P] `src/routes/api/settings/record-locks/locks/[id]/lift/+server.ts` and cases in `src/routes/api/settings/record-locks/server.test.ts`
- [ ] T044 `LockPolicySection.svelte`: "Por webhook" toggle; new `src/lib/components/settings/record-locks/ExternalLocksSection.svelte` (list, "Quitar bloqueo" with reason, empty state with the curl example); `PAGE/+page.server.ts` returns `externalLocks`; policy PUT accepts `webhook`; messages; cases in `PAGE/page.mounted.test.ts`
- [ ] T045 Gates: quickstart S4 focused files; `bun scripts/rls-bypass-inventory.ts --check`; i18n; design lints; `check`; `bun run qa:reset`; manual check with curl; audit; draft PR

## Phase 6: Later slices (each needs owner confirmation first)

- [ ] T046 S5: decide the "emitted" definition (research, spec correction 4), then add `pos_ticket` to `LockableRecord`, call `recordLockFor` in the spec 120 guard chain (`SVC/pos/tender-correction.ts:26`, loaders at `SVC/pos.service.ts:1468-1478`, `:2935-2945`), show "Tras SUNAT"
- [ ] T047 S6: manual stock entries (`cancelEntryInTx`, `SVC/stock.service.ts:1223`)

## Open items to ledger (meta `proposals/`, with `TODO(handoff)` at the site)

- [ ] T048 Month rule on replacement receipts uses the replacement's own date (research R4); site: the month branch of `evaluateRecordLock`
- [ ] T049 Reopening a month is unaudited and not owner-only (`SVC/pos.service.ts:3037-3052`); append to `proposals/2026-10-15-hub-pos-shift-scoped-edits-followups.md` item 1
- [ ] T050 Webhook locks by id accept hub uuids only; no lookup by document number

## Dependencies

- Phase 2 before everything. Phase 3 before phases 4 and 5. Phases 4 and 5 are independent of each other.
- T007 → T008; T009 → T010 → T012 → T013. T003–T006 are parallel.
- T019 needs T016. T022 needs T021. T024 needs T023 and T016. T025 needs T024.
- T030 needs T029. T033 needs T031.
- T041 needs T039 and T040. T044 needs T043.
