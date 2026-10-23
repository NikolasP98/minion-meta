# Tasks: Bounded dependency digest in Pulse

**Input**: [spec](spec.md), [plan](plan.md), [data model](data-model.md), [runtime contract](contracts/digest.md), [D shared contract](../108-harness-pulse/contracts/shared.md). Paths are relative to isolated Hub E checkout. Parent stacks E on D before shared-file work. Tests are required by approved A21–A25/A32; fixture/provider traffic never uses paid endpoints.

## Phase 1: Setup

- [ ] T001 Record D implementation commit, E base/source/`bun.lock` hashes and installed Node/Bun/AI SDK versions in `docs/pulse-digest.md`; verify two independent approved SDD reviews and actual D shared API signature before code. Preserve one E PR and parent-owned stacking.
- [ ] T002 Inspect installed `$server/llm`/AI SDK request/result types and freeze exact serialized retry/fallback/output/usage fixture in `src/server/test-utils/fixtures/pulse-digest/provider-contract.json`; no network or live model request. Set ordinary fixture mode to deny external network.

## Phase 2: Foundation

- [ ] T003 Build isolated marked PostgreSQL fixture setup through `scripts/qc/disposable-postgres.ts` in `src/server/services/pulse-digest.admission.test.ts`; separate connections/worker processes and cleanup; real migrations/RLS, no mocked repository concurrency.
- [ ] T004 Add red schema invariants in `pulse-digest.admission.test.ts` and `pulse-feedback.test.ts`; implement `supabase/migrations/20261023020000_pulse_digest.sql`, `src/server/db/pg-schema/pulse-digest.ts`, `pulse-feedback.ts` with scoped unique/FK/state/immutability checks, restricted deletion and org+owner RLS. Pair `scripts/qa/seed/{pulse,index,matrix,ids}.ts` with zero-budget, unknown, duplicate, revoked and stale-cursor cases (FR-003/005/007/009).
- [ ] T005 Apply actual D+E migrations twice and verify seed/constraints in `pulse-digest.admission.test.ts`; assert effective app role and same-org other-owner denial; record invariants in `docs/pulse-digest.md`.

## Phase 3: US1 — Collect bounded relevant inputs (P1, A21)

**Independent test**: actual policy/collector/fetch with counted deterministic fixture transport.

- [ ] T006 [US1] Add red `src/server/services/pulse-digest.sources.test.ts` for disabled/business/nonowner, 5/6 sources, 20/21 items, 49152/49153 bytes, unchanged timestamp/hash, unknown package relationship, failed/partial 304 and cursor preservation (FR-001/002).
- [ ] T007 [US1] Implement strict `pulse-digest.policy.ts` and server-only `src/server/pulse/digest-policy.example.json`: verified personal owner, maximum 5 exact official HTTPS sources, pinned dependency/file/lock anchors, maximum 20 items/49152 bytes, one call/30000 ms/1024 tokens/maximum 5 per UTC day, zero spend+disabled defaults and immutable approval/budget namespace (FR-001/003/004).
- [ ] T008 [US1] Implement `pulse-digest.fetch.ts` with connection-time validated public DNS/address, original-host TLS/SNI, no private operator bypass/proxy, default 0 redirects, 1048576-byte streaming limit, 10000 ms request/15000 ms aggregate deadline and 2 concurrent requests; add rebinding/private/mapped IPv6/mixed-answer/redirect/oversize/stalled-body tests in `pulse-digest.sources.test.ts` (FR-002).
- [ ] T009 [US1] Implement deterministic normalization/conditional requests/dependency matching/immutable evidence in `pulse-digest.sources.ts`; total 20 items/49152 bytes, request <=65536 bytes, timestamp-independent hash, no lossy truncation or cursor writes; create provenance-bearing official-source/dependency fixtures under `src/server/test-utils/fixtures/pulse-digest/` (FR-001/002).

## Phase 4: US2 — One durable informational result (P1, A22–A24)

**Independent test**: actual store+registered worker+publication with real PostgreSQL and counted local provider across child-process crashes.

- [ ] T010 [US2] Add red admission races in `pulse-digest.admission.test.ts`: duplicate input one run/job, competing snapshots one owner slot/last allowance, UTC rollover/policy change preserve outstanding reservation/fence, stale settlement cannot release successor and retired namespace replay denied (FR-003/009).
- [ ] T011 [US2] Implement `pulse-digest.store.ts` domain dedup-before-enqueue and stable namespace row-lock budget admission with D `enqueueJobInTransaction`; reserve integer micro-USD, count <=5/day, one active attempt and generation/day-bound settlement atomically; preserve unknown/old-day exposure (FR-003).
- [ ] T012 [US2] Add red `pulse-digest.reasoning.test.ts` using actual installed adapter and local HTTP stub: no tools, one request, wire 1024-token bound, retries/fallback disabled, 30s deadline, unknown/known-zero costs, invalid SDK/schema/citations/model drift, received/admitted crashes and lost lease (FR-004/009).
- [ ] T013 [US2] Extend `src/server/llm.ts` with narrow opt-in digest transport options preserving existing metered callers; implement `pulse-digest.reasoning.ts` with request <=65536 bytes, response <=65536 bytes, maxOutputTokens 1024/maxRetries 0/no fallback, 30s total timeout and durable terminal receipt before custom validation. Unknown bills never become estimates/zero (FR-004).
- [ ] T014 [US2] Implement registered `pulse-digest.worker.ts` via D ownership/remaining-budget API: no reasoning admission without 30000 ms + 2000 ms remaining, no hot-loop on deferral, atomic admitted reservation, received recovery no recall, unknown fence, queued proven pre-admission retry 5s/30s cap 3 and stale generation denial (FR-003/004/009).
- [ ] T015 [US2] Add red `pulse-digest.publication.test.ts` through actual worker/API boundaries: card/checkpoint/run/job atomic rollback, cursor CAS conflict, duplicate exact content, binding mismatch, decided card immutability, no-signal no card, invalid/unknown no cursor advance (FR-005/006).
- [ ] T016 [US2] Implement transaction-taking internal insertion in `pulse-publication.ts` and publication/no-signal/superseded settlement in `pulse-digest.store.ts`: reserved key, full owner/run/policy/input/result/content binding readback, title <=500/summary <=4000/payload <=16384 bytes and same ownership transaction for card/checkpoints/run/job (FR-005/006).
- [ ] T017 [US2] Reject reserved `internal:dependency-digest:v1:` prefix/internal binding fields in `pulse-ingest-contract.ts`; extend `pulse-ingest-contract.test.ts` and actual gateway ingestion route tests, preserving legacy external informational inputs (FR-006).
- [ ] T018 [US2] Run child-process crash/restart/fault cases in `pulse-digest.reasoning.test.ts` and `pulse-digest.publication.test.ts` around admission, terminal receipt, card insert, cursor CAS and commit; assert actual transport count and final DB invariants. Preserve human claim-support promotion distinction in `docs/pulse-digest.md` (A22–A24).

## Phase 5: US3 — Reasoned feedback (P2, A25)

**Independent test**: actual feedback routes/export/SQL and current mounted Pulse component.

- [ ] T019 [US3] Add red `src/server/services/pulse-feedback.test.ts`: same-action idempotency, mismatched replay, 500/501-character limit, stale content, cross-owner/card/org, self-supersession, two concurrent corrections one successor, export pagination and factual/preference partition (FR-007/010).
- [ ] T020 [US3] Implement `pulse-feedback.service.ts`, `src/routes/api/pulse/proposals/[id]/feedback/+server.ts` and `src/routes/api/pulse/feedback/export/+server.ts`: current owner+view/edit/export capability, immutable revisions, enum reasons, comment <=500, clientAction UUID, append-only correction and bounded 100-row/256 KiB export. No policy/weight mutation (FR-007/010).
- [ ] T021 [US3] Implement `src/lib/components/pulse/PulseFeedback.svelte` on existing Pulse card/receipt; integrate existing page, D receipt component and action runtime with stable action IDs, keyboard controls, failed-save input preservation and committed-refresh read-only reconciliation (FR-007/010).
- [ ] T022 [US3] Add EN/ES messages in `messages/en.json`/`messages/es.json`, verify existing Pulse nav/write/view gates and extend `src/lib/routes/route-design-manifest.ts`/capture fixture as needed; add actual-component critical-journeys feedback/reconnect cases (FR-010).

## Phase 6: US4 — Scheduled cold-start (P1, A32)

**Independent test**: shipped schedule script triggers authenticated real tick with initially empty queue and no browser/CLI producer.

- [ ] T023 [US4] Add red `pulse-digest.collection.test.ts`/`src/routes/api/pulse/tick/tick.test.ts`: immediate/15min durable poll, 30s generation lease, simultaneous ticks/restart/expired claim, 15s aggregate/2 concurrency, partial/failure 5min, no cursor writes, revoked policy/owner, unrelated >20 backlog untouched and insufficient remaining model budget (FR-008/009).
- [ ] T024 [US4] Implement `pulse-digest.collection.ts` using admission-row due/lease fields, current-authority generation checks and dedup+enqueue; extend D `pulse-tick.ts`/`pulse-worker-config.ts`/tick route to collect then drain only configured families within 50s, with explicit handler imports and unchanged default jobs tick (FR-008/010).
- [ ] T025 [US4] Add uninstalled `deploy/pulse-tick.cron.example`, `scripts/ops/pulse-tick.sh`, `docs/pulse-digest.md` activation/disable/rollback runbook using existing CRON_SECRET management; add `scripts/ops/pulse-tick.test.mjs` that invokes actual script against local authenticated tick, controlled minute scheduler/source fixtures and no external network (FR-008).
- [ ] T026 [US4] Run empty-queue scheduled fixture with browser/CLI producers closed, change stub source, duplicate ticks and restart, then reconnect to exactly one visible card; retain scheduler/template/source/build hashes and request counts through `scripts/ops/pulse-tick.test.mjs` and critical-journeys evidence. Real cron installation remains separately gated (A32).

## Phase 7: Retention, verification and handoff

- [ ] T027 Extend D scoped cancellation helper and policy reconciliation plus existing `user.service.ts` caller path for digest job/collection generation fences; add bounded 100-row/tick housekeeping under 50s, raw evidence/response/comments 30-day redaction, canceled expired queued data and replay namespace retirement in `pulse-digest.store.ts`/`pulse-feedback.service.ts`; test actual cleanup/revocation/export callers and retained tombstones (FR-009).
- [ ] T028 Run all focused tests in `contracts/validation.md`, full Hub check/test/build, i18n/design/token/route gates, seed verification, D regressions and critical journeys; record exact source/lock/SDK/migration evidence in `docs/pulse-digest.md`. Resolve all errors/warnings/failures (SC-001–005).
- [ ] T029 Use browser-harness with current source-built local app/fixture for EN/ES evidence, keyboard feedback, failed-save preservation, one committed write despite refresh failure, reconnect and owner denial; retain screenshots and actual request counts in the root E audit (SC-003–005).
- [ ] T030 Obtain independent Standards/Spec code reviews and full A21–A25/A32 trace; parent creates one E PR after D commit stacking and records unresolved live schedule/provider/claim-support gates in `docs/pulse-digest.md`. Any implementation gap requires exact-site `TODO(handoff)` plus meta proposal; no automatic merge/activation/paid inference (SC-001–005).

## Dependencies and execution order

T001–T005 foundation precedes stories. US1 T006–T009 → US2 T010–T018 → US3 T019–T022. US4 T023–T026 needs source/admission/publication and D selected runner; test design may precede UI. T027 extends current D cleanup once domain tables exist. All converge T028–T030. Shared page/localization/seed/tick files serialize after D and within E. Independent fixture test design may run in parallel with no shared-file edits; no extra agents authorized by this plan. First viable increment is bounded no-signal/source storage; delivery is the complete six-acceptance E PR, disabled by default.

## Acceptance and requirement coverage

| Acceptance | Functional requirements | Tasks |
|---|---|---|
| A21 | FR-001/002 | T006–T009,T028 |
| A22 | FR-003/009 | T003–T005,T010–T011,T014,T018,T027 |
| A23 | FR-004/009 | T002,T012–T014,T018,T027 |
| A24 | FR-005/006/009 | T015–T018,T027 |
| A25 | FR-007/010 | T019–T022,T027–T029 |
| A32 | FR-008/009/010 | T023–T029 |
