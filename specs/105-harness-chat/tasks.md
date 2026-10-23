# Tasks: Owned chat callbacks and decision evidence

**Input**: [spec](spec.md), [plan](plan.md), [chat contract](contracts/chat-evidence.md), [adapter contract](contracts/eval-adapter.md). All source paths below are Hub-relative. A owns these files; meta SDD and evidence registration belongs to F/orchestrator. Tasks remain unchecked until implemented and evidenced.

## Phase 1: Setup

- [ ] T001 Record source `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283`, `bun.lock`, installed `@minion-stack/shared` version/`beginRequest` declaration and frozen-install receipt; read Hub `AGENTS.md` and UI governance. Inventory actual callers listed in `specs/105-harness-chat/research.md` in the implementation receipt.
- [ ] T002 Confirm two independent reviews approve exact `specs/105-harness-chat/` artifact hashes; preserve wave1 code/tests and serialize shared critical-journeys edits with D/E through the parent.

## Phase 2: Foundational

- [ ] T003 Define discriminated accepted-run/observation types in `src/lib/assistant/accepted-runs.ts` and `decision-lineage.ts` following `contracts/chat-evidence.md`: “256 entries”, “two hours from creation”, opaque surface plus epoch, fixed origins, separate transport/final/decision states, no raw content (FR-001/004/006).

## Phase 3: US1 live callback ownership (P1, A03)

**Independent test**: actual gateway final dispatch and model-context registry with controlled await/scope changes; mounted Home/Floating.

- [ ] T004 [US1] Add red `src/lib/assistant/dispatch.ownership.test.ts` and gateway-final integration cases in `src/lib/services/gateway.session.test.ts` for duplicate/delayed final, final-before-ack, reload/expiry/257th eviction, owner A→B→A and canceled/terminal late ack (FR-001/002).
- [ ] T005 [US1] Implement bounded accepted store lifecycle in `src/lib/assistant/accepted-runs.ts`; wire optional binding and submitted/ack/unknown observations in `src/lib/services/gateway/chat-rpc.ts`, preserving old caller return/signature compatibility and no replay (FR-001/004).
- [ ] T006 [US1] Capture/claim originating run before clearing it and before smoother callback scheduling in `src/lib/services/gateway.svelte.ts`; reject unknown/expired/stale/canceled automatic authority while rendering ordinary history; terminalize error/abort without revival (FR-001/002).
- [ ] T007 [US1] Guard every awaited boundary in `src/lib/assistant/{dispatch,runner,model-context}.ts`; pass cancellation into actual tools/waits, serialize context-changing batches, create fresh validated completed-results follow-up, preserve terminal navigation proposals and “five-follow-up” root cap (FR-001/002).
- [ ] T008 [US1] Wire current surface/scope/page lifetime and exact-run Stop in `src/routes/(app)/home/+page.svelte` and `src/lib/components/layout/FloatingAssistant.svelte`; propagate explicit `ui_choice`/`artifact` origin and optional exact source binding through `src/lib/chat/ChatBlocks.svelte`, `src/lib/components/my-agent/ChatTurn.svelte` and existing callbacks without guessing history lineage; user text remains a new root (FR-002/004/008).
- [ ] T009 [US1] Extend `src/lib/assistant/pending-submission.mounted.test.ts` and `tests/e2e/ui-audit/critical-journeys.spec.ts` for held tool, page/tool revision, teardown, callback bypass and cap cases; demonstrate a deliberate removed ownership check fails a real gateway/mounted scenario (SC-001).

## Phase 4: US2 route provenance (P1, A04)

**Independent test**: production classifier service → route → capture → actual sanitizer, stub provider/SDK sink only.

- [ ] T010 [US2] Add red `src/server/services/assistant-router.provenance.test.ts` and extend `src/lib/server/observability-context.test.ts` for requested/resolved model, SHA revisions, all valid probabilities including p_sandbox, known zero/unknown/null, invalid/timeout/error and actual elapsed duration (FR-003).
- [ ] T011 [US2] Add additive classifyAssistantTurnWithEvidence/requestRouteDecisionWithEvidence helpers with nullable compatibility wrappers, result envelope/revision computation in `src/server/services/assistant-router.service.ts`, early optional UUID header/metadata validation in `src/lib/assistant/turn-router.ts` and Home/Floating callers, and authoritative attempt emission in `src/routes/api/assistant/route/+server.ts`; disabled/off/bypass emits no provider attempt (FR-003/004).
- [ ] T012 [US2] Extend `fields` and `eventFields` in `src/lib/server/observability-context.ts` and real capture-boundary tests in `src/lib/server/posthog.test.ts`; verify null cost/status pairing, bounded model/revisions/IDs and unknown-field rejection reach final SDK sink without raw content (FR-003/005).
- [ ] T013 [US2] Exercise prepared→applied only at local submitted commit, successful-attempt→discard on cancel/context/transport rejection and separate gateway-ack/unknown in `src/lib/assistant/decision-lineage.test.ts` through actual Home/Floating/chat-rpc producers (FR-004, SC-002/003).

## Phase 5: US3 observation ingestion and fixture bridge (P1, A05/A26-Hub)

**Independent test**: actual authenticated endpoint boundary plus real adapter subprocess/runtime and event export.

- [ ] T014 [US3] Add red `src/routes/api/assistant/decision-events/decision-events.test.ts` for missing auth/org, forged actor/org, cross-origin JSON, unknown kind/raw text, malformed UUID, nested fields, streaming body >16KiB, batch >20, weighted minute cap and disabled capture; test current auth/RBAC/sanitizer, not duplicated test validation (FR-005).
- [ ] T015 [US3] Implement strict flat schema in `src/lib/assistant/decision-lineage.ts`, endpoint `src/routes/api/assistant/decision-events/+server.ts` and weighted default-compatible charging in `src/server/auth/rate-limit.ts`; classify exact self-only path in `src/server/services/rbac.service.ts` with tests, inspect `src/hooks.server.ts` and `src/lib/routes/route-design-manifest.ts` to record correct auth/inventory coverage (FR-005/008).
- [ ] T016 [US3] Implement `src/lib/assistant/decision-events.ts` memory buffer “at most 20 events”, abort/drop on actor/org transition, bounded flush failure/overflow accounting; wire real producers in Home/Floating/dispatch/chat-rpc. Add ownership/drop tests in `decision-lineage.test.ts` (FR-004/006).
- [ ] T017 [US3] Add `tests/fixtures/critical-journeys/eval-protocol.ts` and `EvalFixture.svelte`, extend actual fixture transport/build inputs for full/Jev/core-discovery arms, fresh resets, actual classifier parser bridge, typed controls and independent fixture mutation receipts; preserve existing journey cases from D/E (FR-007).
- [ ] T018 [US3] Implement `tests/fixtures/critical-journeys/eval-adapter.mjs --stdio` using owned fresh build/server/browser lifecycle and fixed protocol; require hash handshake, strict network/operation allowlist, no provider credentials, no arbitrary JS/commands; add `eval-adapter.test.mjs` for invalid message/process death/reset/output evidence (FR-007).
- [ ] T019 [US3] Run real A↔F adapter integration from F `scripts/agent-evals/run.mjs`, pin A source/Bun lock/adapter hashes, verify three arm context paths and identical initial-state hashes, dedupe/missing receipt signals and zero external calls; record complete/incomplete evidence separately from synthetic server identity (SC-003/004).

## Phase 6: Verification and review

- [ ] T020 Run all `contracts/quickstart.md` focused tests plus existing navigation/context/history regression; run `bun run i18n:compile`, design/token lint, `bun run check`, `bun run test`, `bun run build` and installed critical-journeys matrix. Record zero errors/warnings and exact candidate identities (FR-008, SC-001–004).
- [ ] T021 Use browser-harness on the installed private fixture for EN/ES Home/Floating Stop/callback/context-transition checks at desktop/compact sizes; retain screenshots, keyboard observations and network receipts in group A evidence. Synthetic evidence is not deployed/login proof (SC-001/004).
- [ ] T022 Obtain independent Standards and Spec review; create one scoped Hub PR to registered `master`; update parent proposal/evidence via orchestrator. Any required unimplemented seam gets an exact-site `TODO(handoff)` plus proposal entry before stopping; merge/deploy/paid calls remain gated (SC-001–004).

## Dependencies & Execution Order

T001–T003 precede production changes. US1 T004→T005→T006→T007→T008→T009; US2 T010→T011→T012→T013; shared Home/Floating/chat-rpc edits serialize. US3 T014→T015→T016 depends on the US1/US2 producers; T017→T018→T019 needs stable event/lineage contracts. All converge at T020–T022. T019 waits for F adapter client; no Factory/Pulse requirement.

## Parallel opportunities and strategy

Only independent test design (T010 server provenance and T014 ingress) may run alongside US1 after shared types freeze; do not parallel-edit Home/Floating/dispatch or the fixture builder. No extra agents are authorized by this task list. First useful increment is US1, but complete all stories in the one A PR. Existing wave1 tests are regression gates, not work to reimplement.
