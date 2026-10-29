# Tasks: Org entitlements (premium orgs)

**Input**: [design.md](./design.md) §Detailed Implementation (exact files and behavior), [plan.md](./plan.md) §Slices (branches, gates), [spec.md](./spec.md) (stories US1–US8).
**Paths**: hub tasks are relative to `minion_hub/`, gateway tasks to `minion/`, runner tasks to `langgraph-server/` (meta repo).
**Format**: `[P]` = parallel-safe (different files, no dependency on an unfinished task). `[USn]` = user story in spec.md. **OWNER** = only the owner runs it.
**Rules**: gates run in the foreground with `timeout`, exit code captured (`cmd; echo "x=$?"`), never piped. Hub: never run the full `bun run test` with a prod `.env` present (`unset SUPABASE_DB_URL` first). Gateway: never run the full `pnpm test`; use the targeted files and `pnpm vitest run test/ci/`. Tests listed in design.md are written first and must fail before the code that makes them pass. The owner merges every PR.

## Phase 1: Setup

- [ ] T001 **OWNER** Approve `specs/043-hub-org-entitlements/spec.md` (security + data). No code commit in any repo before this.
- [ ] T002 Each implementer: `git -C <repo> fetch origin && git worktree add ~/.cache/claude-tmp/<worktree> -b <branch> <base>` per plan.md §Slices; real install (`bun install --frozen-lockfile` / `pnpm install --frozen-lockfile`); read the repo's `AGENTS.md`/`CLAUDE.md`, and for hub UI `.claude/skills/ui-design-governance/SKILL.md`.

## Phase 2: S1 hub — schema, catalog, evaluator, admin page (`feat/entitlements-s1-model`) · security/data · blocks S2, S3, S5

- [ ] T010 [P] [US1] Test first: `src/server/entitlements/evaluate.test.ts` — Base grants nothing; Premium expands to `['ai','ai.chat','ai.proactive','marketplace']`; child without parent not granted; a rule on org kind; `has()` cannot read a later key; unknown feature key → `not_in_plan` + warning; unknown plan key → Base.
- [ ] T011 [US1] `src/server/entitlements/catalog.ts`: `PLANS`, ordered `FEATURES`, `PLAN_DEFAULTS` (`premium: ['ai','marketplace']`, `base: []`), helpers `all`/`any`/`not`/`plan`/`kind`/`has` (design §Catalog and rules).
- [ ] T012 [US1] `src/server/entitlements/evaluate.ts`: pure `isEntitled(snapshot, feature)` and `expandFeatures(snapshot)`. T010 passes.
- [ ] T013 [P] [US1] `supabase/migrations/20261029100000_org_entitlements.sql`: `org_plans`, `org_plan_events`, index, `ENABLE`+`FORCE` RLS, `org_plans_org_guc` SELECT policy, `GRANT SELECT` to `app_ledger`, `REVOKE ALL … FROM anon, authenticated`. Schema only (design §Data model).
- [ ] T014 [P] [US1] `src/server/db/pg-schema/entitlements.ts`: Drizzle definitions for both tables (imported directly, no barrel).
- [ ] T015 [US1] Seed pairing (hub `AGENTS.md` rule; not in design.md): `scripts/qa/seed/entitlements.ts` writing one Premium row for `qa-business` and leaving one QA org without a row (Base); register in `scripts/qa/seed/index.ts`, a block at the end of `scripts/qa/seed/matrix.ts`, and `SEEDED_TABLES` in `scripts/qa/seed/db.ts`. `bun run qa:seed:verify`.
- [ ] T016 [P] [US1] Tests first: `src/server/services/entitlements.service.test.ts` (target-org invalidation; no channel signal or restart from `setOrgPlan`; audit row incl. null actor + note; flag off → full catalog with no row; flag on + lookup error → full catalog on the UI path and `requireFeature` fails; `lookup_error` comes from the service; no PostHog event on a tick skip) and `src/server/services/entitlements.sql.integration.test.ts` (QA DB via `HUB_TEST_DB_URL` only: member reads own `org_plans` row; writes and other orgs' rows denied).
- [ ] T017 [US1] `src/server/services/entitlements.service.ts`: `resolveEntitlements`, `setOrgPlan` (`requireAdmin`, one transaction on `getCoreDb()`, invalidate target tag, no `signalChannelChange`), `listOrgPlans`, `listPlanEvents`, `isEnforced`, `requireFeature`, `requireOrgFeature` (design S1). T016 passes.
- [ ] T018 [P] [US1] Test first: `src/routes/(app)/orgs/plans/page.server.test.ts` — non-admin 403; admin change writes plan + audit row.
- [ ] T019 [US1] `src/routes/(app)/orgs/plans/+page.server.ts` (`can('orgs.all', locals.user)` in load and `setPlan`) and `+page.svelte` (org table, plan select via `createOptimistic()` with pending state, effective-features panel from the pure evaluator, events list; design tokens only).
- [ ] T020 [US1] Entry links: `src/routes/(app)/orgs/+page.svelte`, `src/routes/(app)/settings/organizations/+page.svelte` (via `canViewPath`); `src/lib/components/layout/utility-links.ts` adds `/orgs/plans` (shield icon, `m.nav_orgPlans()`); add the link to `topbar-parity.test.ts`.
- [ ] T021 [US1] Route contract in one commit: `src/lib/routes/route-access-registry.ts` (`'/orgs/plans': 'capability:orgs.all'`), `route-design-manifest.ts` (`screen('/orgs/plans', 'Plans', 'organization', 'collection')`), `route-design-validation.ts` (endpoints, screens +1), `route-design-contracts.test.ts` (wave count +1), `src/server/ui-audit/frontend-contract-scanner.test.ts` (`report.pages` +1), `scripts/ui-audit-inventory.test.ts` (endpoints, screens +1); update `docs/artifacts/UI-ROUTE-CONTRACT.md`.
- [ ] T022 [US1] i18n: `nav_orgPlans` and `admin_plans_*` in `messages/en.json` and `messages/es.json` (same position, append-only); `bun run i18n:compile`.
- [ ] T023 S1 gates (plan §S1) + live check (CUJ 1, CUJ 5). Draft PR `feat(orgs): plans per org with a platform-admin page` (security/data).

## Phase 3: S2 hub — server gates (`feat/entitlements-s2-server-gates`) · security · after S1

- [ ] T030 [US3] Tests first, chokepoint: not enforced; enforced + denied; authenticated with no org → denied; no scope → allowed + logged; `appHandle` sets the org for a route that never calls `getTenantCtx` (beside `src/server/ai-usage.ts`, `src/server/llm.ts`).
- [ ] T031 [US3] `src/server/ai-usage.ts` (`AiUsageScope.authenticated`, copied by `withAiUsageOrg`/`withAiUsageFeature`); `src/hooks.server.ts` `appHandle` (`setAiUsageOrg` after `resolveIdentity`, mark `authenticated`; `handleError` unchanged); `src/server/entitlements/errors.ts` (`EntitlementError`); `src/app.d.ts` (`App.Error.feature?`).
- [ ] T032 [US3] Backstops: `src/server/llm.ts` (`usageMiddleware.wrapGenerate`/`wrapStream`), `src/server/services/embeddings.ts`, `src/server/services/assistant-router.service.ts`. T030 passes.
- [ ] T033 [P] [US3] Test first: one test per gated route family asserting 403 `{code:'premium_required', feature}`, and `structured-stream` refusing before the stream starts.
- [ ] T034 [US3] `requireFeature(locals, 'ai')` first line in every route of design S2 "AI routes": `src/routes/api/builder/ai/{analyze-run,dry-run,suggest-chapter,suggest-prompts,suggest-skill}`, `api/notes/{autocomplete,polish,refine,spelling,transcribe}`, `api/voice/tts`, `api/structured-stream`, `api/flows/[id]/copilot`, the eight `api/crm/...` routes, `api/artifacts/generate`, `api/artifacts/[id]/regenerate`, `api/agent-memories{,/ingest,/recall}` (R22), every handler under `api/brains/` except `reconcile/tick`, every handler under `api/workshop/` and `api/workforce/`, `api/builder/agents/[id]`, `api/personal-agent/create`.
- [ ] T035 [US3] `requireOrgFeature(orgId, 'ai')` in `src/routes/api/gateway/{brain-search,brain-remember,search-crm-conversations}/+server.ts`; `requireFeature(locals, 'ai.chat')` in `api/assistant/route`; `requireFeature(locals, 'marketplace')` in `api/marketplace/{agents,agents/[id],install,generate-agent}` (test: 401 with no tenant only when enforced; `sync`, `sync/tick` unchanged).
- [ ] T036 [P] [US2] Test first + `src/server/services/personal-agent-provisioner.ts` (`ensureActivePersonalAgent`): no provisioning and no pending flag for an org without `ai` when enforced; unchanged when not.
- [ ] T037 [US5] Test first + `src/routes/api/servers/[id]/token/+server.ts`: 403 `premium_required` for an org without `ai` only when enforced; on lookup error the cached answer, else the token + `lookup_error` log. Add `TODO(handoff)` for R6.
- [ ] T038 [US5] Test first + `src/server/services/gateway-jwt.service.ts`, `src/routes/api/gateway/jwt/+server.ts`: `plan` and `features` only when enforced; absent on lookup error; never from `mintOrgGatewayJwt` (`organization-provision.service.ts`).
- [ ] T039 [US4] Test first + ticks: `src/routes/api/brains/reconcile/tick`, `crm/conversations/analyze/tick`, `crm/conversations/vectorize/tick`, `crm/relationship/tick` (check inside `withAiUsageOrg`, count skips); `src/routes/api/scheduling/reminders/tick` + `src/server/services/reminders.service.ts` (personalize and `inferConfirmation` off → plain template, prompt `:180`, `parseYesNo` `:309`); `api/scheduling/reminders/preview` (`personalize: false`); `api/gateway/pulse/proposals` (403 `ai.proactive`).
- [ ] T040 [US4] Test first + `src/server/services/bg-runtime.ts`: `JobHandler.feature`; check in `advanceAdmittedJob` inside `withAiUsageOrg(job.tenantId, …)`; skipped job ends `{done:true, error:'skipped_by_entitlement'}` and is not re-leased; `skippedByEntitlement` in `runTick`/`runSelectedTick` results; finance job unaffected. Set `feature` on `pulse_digest`, `pulse_dispatch`, `brain_ingest`, `brain_corpus_conversations`, `brain_corpus_whatsapp`, `brain_corpus_business` (`ai.proactive`) and `groupchat` (`ai`).
- [ ] T041 [US6] [US7] Test first + `src/server/services/channel-publish.service.ts` (`toResolvedChannels` takes a `tenantId → aiEnabled` map) and `src/routes/api/internal/channels/resolved/+server.ts`; `src/routes/api/internal/flows/[id]/+server.ts` (`aiEnabled`; null `tenant_id` → `true` + log + `TODO(handoff)` R13). `false` only when enforced.
- [ ] T042 [US3] `src/server/entitlements/ai-call-inventory.test.ts` with `AI_CALL_SITES` (initial rows per design S2; `scripts/**` excluded). It must fail on an unlisted call site, a listed route without `requireFeature(`/`requireOrgFeature(`, and a stale row.
- [ ] T043 S2 gates (plan §S2) + live check (CUJ 3, CUJ 4, flag on and off). Draft PR `feat(ai): refuse AI and marketplace for orgs without the plan` (security).

## Phase 4: S3 hub — do not render disabled AI (`feat/entitlements-s3-hide-ai-ui`) · after S1; merge after S2

- [ ] T050 [P] [US2] Tests first: layout load + hook guard (flag off/no row, flag off/lookup error, flag on/Base, flag on/lookup error); `availability.test.ts` and `route-guard.test.ts` (every AI prefix blocked for Base, open for Premium); `canViewPath` hides a feature-gated page; Base-org cases in `sections.test.ts` and `topbar-parity.test.ts`; `hasFeature` exact membership.
- [ ] T051 [US2] `src/hooks.server.ts` `applyModuleAvailabilityGuard` (resolve UI entitlements, `locals.entitlements`, pass `features`); `src/app.d.ts` (`App.Locals.entitlements`); `src/routes/(app)/+layout.server.ts` (return `entitlements`, full-catalog fallback); `src/lib/modules/route-guard.ts` (`features` in `RouteGuardContext`).
- [ ] T052 [US2] `src/lib/modules/availability.ts`: optional `feature`, `features` in context, `isModuleAvailable` check; `feature` on existing `pulse` and `workforce`; new entries for the design §UI AI prefixes and for `/plugins`, `/settings/plugins` (key `ai`, comment + `TODO(handoff)` pointing at R8).
- [ ] T053 [US2] `src/lib/access/can.svelte.ts`: `canViewPath` feature check; new `hasFeature(key)`. T050 passes.
- [ ] T054 [P] [US5] Test first + `src/lib/state/features/hosts.svelte.ts`, `src/lib/services/gateway.svelte.ts`: a 403 `premium_required` token answer → JWT-only connect frame, no `JWT_RETRY_COOLDOWN_MS` fallback; `TODO(handoff)` for R8 in `hosts.svelte.ts`.
- [ ] T055 [P] [US5] Test first + `src/routes/(app)/channels/[id]/+page.server.ts` (404 without `ai`); `src/routes/(app)/channels/+page.svelte` and `src/lib/components/channels/ChannelsNav.svelte` (link to `/settings?s=comms`); `src/lib/components/users/ChannelLinking.svelte` (no `iframe` entries); `src/routes/(app)/settings/+page.svelte` (no `ai`/`agents` tabs, default `comms`).
- [ ] T056 [P] [US2] Test first (`EmailModal` neither renders nor fetches the summary without `ai`; `my-agent-rpc.ts` returns `null` on `premium_required`) + `src/lib/components/my-agent/EmailModal.svelte`, `src/lib/services/my-agent-rpc.ts`.
- [ ] T057 [P] [US2] Wrap in `{#if hasFeature(...)}` and skip the fetch; drop `premium_required` silently at the call site: `src/lib/components/layout/FloatingAssistant.svelte`, `src/lib/state/features/assistant.svelte.ts`, `src/lib/assistant/turn-router.ts` (`ai.chat`); `src/lib/state/features/voice-call.svelte.ts`; `src/lib/components/my-agent/{NoteEditor.svelte,tiptap-autofill.ts,TranscribeButton.svelte}`, `src/lib/state/features/notes-autocomplete.ts`.
- [ ] T058 [P] [US2] Same treatment: `src/lib/components/crm/{CrmHygiene,CrmFunnel,CrmInsightsChat,CrmSimilarWins}.svelte`; `src/routes/(app)/crm/[contactId]/PageBody.svelte`, `crm/insights/PageBody.svelte`, `crm/settings/PageBody.svelte`; `src/lib/components/doors/faq/Editor.svelte`; `src/routes/(app)/scheduling/reminders/PageBody.svelte` (`ai.proactive`).
- [ ] T059 [P] [US7] `src/lib/components/flow-editor/FlowSidebar.svelte` (hide AI node types, the two `AI_PLUGIN_ACTION_METHODS`, router `llm`/`hybrid`, handoff suggestion settings) and `FlowCopilotPanel.svelte` (not rendered).
- [ ] T060 Re-run the client grep for fetches to every gated route and add any caller missing from T057–T059.
- [ ] T061 S3 gates (plan §S3, incl. `lint:design && lint:tokens`) + live check (CUJ 2). Rebase on `master` after S2 merges and re-run check + guard tests. Draft PR `feat(ui): hide AI for orgs without the plan`.

## Phase 5: S4 gateway (`minion`, `feat/entitlements-s4-gateway`, base `DEV`) · security · independent of hub slices

- [ ] T070 [P] [US5] Tests first: `src/gateway/server/ws-connection/jwt-only-connect.test.ts` (accepted with `oidcIssuers`; rejected without; rejected for invalid or revoked JWT; scopes from the JWT role; no rate-limiter failure recorded); `src/gateway/auth/auth-jwt.test.ts` (`features` parsed; malformed → `[]`; absent → undefined).
- [ ] T071 [US5] `src/gateway/server/ws-connection/message-handler.ts` (JWT-only path before `:709` and `:515-533`, skip rate limiter at the primary `authorizeGatewayConnect` call; copy `plan`/`features` onto `nextClient`); `src/gateway/server/ws-jwt-auth.ts`; `src/gateway/auth/auth-jwt.ts`; `src/gateway/server/ws-types.ts`, `src/gateway/server-methods/types.ts` (impersonation keeps own `features`). T070 passes.
- [ ] T072 [US5] Test first (`auth.refresh` clears `features` when the new token has none; `/mcp` Base identity refused `tools/call` for an AI tool) + `src/gateway/server-methods/auth-refresh.ts`, `src/gateway/mcp/registry.ts`, `src/gateway/server.impl.ts`.
- [ ] T073 [US5] Test first in `src/gateway/server-core/server-methods.test.ts` (Base client may call every listed method; refused `chat.send`, `agents.create`, `cron.add`, `models.list`, `myAgent.emailSummary`, `shells.invoke`, `shells.invoke_durable`, an unknown method, incl. with admin scope; no `features` → unchanged; plan gate never admits what scope refuses) + `BASE_PLAN_GATEWAY_METHODS` and the gate in `src/gateway/server-core/server-methods.ts`.
- [ ] T074 [P] [US7] `src/gateway/server-methods/flows-run.ts`: send `aiEnabled` (`true` when `features` undefined, else `features.includes('ai')`).
- [ ] T075 [P] [US6] Tests first (`src/gateway/channel-hydrate.test.ts`: `aiEnabled` survives `parseHydrationBody`, absent → `true`; `src/auto-reply/reply/dispatch-from-config.test.ts`: `false` → hook fires, no agent run; `true`/absent/miss → unchanged; new `src/web/inbound/monitor.ledger-entitlement.test.ts`: ledger row still written) + `src/gateway/channel-hydrate.ts` (`TODO(handoff)` R2) and `src/auto-reply/reply/dispatch-from-config.ts`.
- [ ] T076 [P] [US7] Test first + `extensions/flows/src/relay/index.ts`: count 0 when `suggestionCount === 0` or the client's `features` lack `ai`; skip `generateSuggestions`; relay still opens.
- [ ] T077 [P] `TODO(handoff)` comments only: `src/gateway/server-core/server-cron.ts`, `src/infra/heartbeat-runner.ts`, `src/web/auto-reply/heartbeat-runner.ts`, `src/gateway/server/hooks.ts` (R1); `src/hooks/gmail-auto-label.ts` (R14); `src/gateway/capability-api.ts` (R19).
- [ ] T078 S4 gateway gates (plan §S4). Draft PR to `DEV` `feat(gateway): plan claims, Base-org method allowlist, channel reply gate` (security).

## Phase 6: S4 flows runner (meta `langgraph-server/`, `feat/entitlements-s4-flows-runner`, base `dev`)

- [ ] T080 [US7] Tests first in `src/flow/compile-flow.test.ts` with `aiEnabled:false`: `trigger → llm → channel` makes no model call, the channel node does not run, `run-triggered` returns `reply: ''`; one AI + one non-AI branch runs only the non-AI branch; `pluginAction` `alertWatcher.classify` ends its branch, `alertWatcher.gate` runs; `handoff` sends `suggestionCount: 0`; `router` `llm` selects nothing, `hybrid` only rule branches; `aiEnabled` absent → unchanged.
- [ ] T081 [US7] `src/flow/compile-flow.ts` (branch end, router, handoff, `skipped_by_entitlement` log, `AI_PLUGIN_ACTION_METHODS` + `TODO(handoff)` R20) and `src/flow/server.ts` (read `aiEnabled` from the hub flow response and from the `/flows/run` body; absent → `true`; empty reply rule). T080 passes.
- [ ] T082 Runner gates (vitest `src/flow/`, typecheck). Draft PR to `dev` `feat(flows): AI nodes end their branch for orgs without the plan`.

## Phase 7: S5 data launch and docs (hub `feat/entitlements-s5-backfill`, after S1) · data

- [ ] T090 [US8] Test first: unit test of the backfill's planning and assertion functions (Bernibites by name, exactly one match; `--expect-base` mismatch refuses; assertion failure rolls back; second run plans 0 writes).
- [ ] T091 [US8] `scripts/entitlements/backfill-launch-plans.ts` (design S5: `SUPABASE_DB_URL` only, refuses with `HUB_TEST_DB_URL` set; dry run default; `--apply --expect-base <uuid>`; snapshot to `scripts/entitlements/snapshots/org_plans-<timestamp>.json` (gitignored); one transaction; audit rows `actor_profile_id = NULL`, `note = 'launch-backfill'`; post-write assertions). Run it twice against the QA DB.
- [ ] T092 [P] `.env.example`: document `ENTITLEMENTS_ENFORCED` (default off).
- [ ] T093 S5 gates (targeted vitest, check). Draft PR `chore(orgs): launch backfill for org plans` (data).
- [ ] T094 Meta (this branch): spec.md, plan.md, tasks.md, board stub `specs/2026-10-29-hub-org-entitlements-spec.md`, proposal `proposals/2026-10-29-hub-org-entitlements-followups.md`, both indexes regenerated and `--check` green.

## Phase 8: Launch (design §Launch order)

- [ ] T100 **OWNER** Merge S1 → S2 → S3; deploy hub with the flag off. Walk FACES: every AI page and control present (SC-001).
- [ ] T101 **OWNER** Merge S4 gateway and release; merge and deploy the runner change.
- [ ] T102 **OWNER** Merge S5. Run the backfill dry run against prod; confirm the printed Bernibites id and that exactly one org will not be Premium.
- [ ] T103 **OWNER** Run `--apply --expect-base <id>`; confirm the assertions pass; run it again and confirm 0 writes (SC-002). Keep the snapshot file.
- [ ] T104 **OWNER** Check Q4: `PUBLIC_GATEWAY_JWT_AUTH=true` in hub prod; `multiTenant.oidcIssuers` and `hubMetrics` on every gateway; the S4 image running; spec 045 A1 deployed with `multiTenant.jwtOnlyAudiences` set (045 decision 18: JWT-only connect is disabled while it is empty, which also stops cross-gateway replay). Stop here if any is false.
- [ ] T105 **OWNER** Set `ENTITLEMENTS_ENFORCED=true` in hub prod and redeploy.
- [ ] T106 **OWNER** + orchestrator: acceptance walk, design §Launch order step 5 (SC-003, SC-004), with a test org moved to Base on `/orgs/plans`; then move it back. Browser QA in a private chromium or a named cloud browser, never the shared `:9223`.
- [ ] T107 If anything regresses: **OWNER** unsets the flag and redeploys (plan §Rollback, SC-006).

## Phase 9: Post-launch

- [ ] T110 Append anything found during launch to `proposals/2026-10-29-hub-org-entitlements-followups.md` and flip the board stub to `shipped`.

## Dependencies & parallelism

- S1 blocks S2, S3 and S5. S2 and S3 can be built in parallel from S1's branch; merge S2 before S3 (shared `hooks.server.ts`, `app.d.ts`).
- S4 (gateway and runner) has no code dependency on the hub and can start at T001; it is inert until the hub sends claims and `aiEnabled: false`.
- The flag flip (T105) needs S1–S5 merged, T103 and T104.
- Inside a slice, `[P]` tasks touch different files.

## MVP

S1 + S2 with the flag on stops a Base org's AI spend on the hub. S3 removes the UI. S4 closes the gateway, channel and flow paths. Do not turn the flag on in production before S4 is released: without it, Base-org browsers lose the gateway (no shared token, no JWT-only connect).
