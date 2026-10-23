# Tasks: Pulse approval and dispatch receipts

**Input**: [spec](spec.md), [plan](plan.md), [data model](data-model.md), [contracts](contracts/pulse.md), [shared D/E seam](contracts/shared.md). Paths below are relative to isolated Hub D checkout. All tests are required by the approved parent. Do not mark a task complete from source inspection alone.

## Phase 1: Setup

- [ ] T001 Record source/lock/tool-schema hashes and installed Node/Bun/dependency versions in `docs/pulse-dispatch.md`; validate the parent frozen-install receipt against current `bun.lock` and audit all current `pulse.approve/dismiss` and `advanceJob/runTick` callers.
- [ ] T002 Record two independent approved SDD artifact hashes for `specs/108-harness-pulse/`; confirm Gateway C contract at `specs/107-harness-gateway/contracts/cron-binding.md` and preserve one D PR against `master`. No production activation.

## Phase 2: Foundation

- [ ] T003 Create marked disposable PostgreSQL fixtures through `scripts/qc/disposable-postgres.ts` in `src/server/services/pulse-dispatch.store.test.ts`; run under explicit loopback environment with independent connections/processes, restricted roles and cleanup. No SQLite/repository mock substitutes for SQL proof.
- [ ] T004 Add red A17 tests in `src/server/services/pulse-dispatch.store.test.ts`: unique proposal revision dispatch/job, scoped FK mismatch, immutable approved content, state checks, tombstone survival and migration rerun (FR-001/002).
- [ ] T005 Implement `supabase/migrations/20261023010000_pulse_dispatch_receipts.sql`, `src/server/db/pg-schema/pulse.ts`, new `pulse-dispatches.ts` and `bg-jobs.ts`: revision `>=1`; attempts `0..3`; payload `<=16 KiB`; scheduled requires remote ID/admission; indeterminate requires admission/reason; internal bindings all-present-or-absent; owner/org RLS and restricted deletion. Pair `scripts/qa/seed/{pulse,index,matrix,ids}.ts` with legacy, two-owner, ambiguous and conflict cases (FR-001/002/005).
- [ ] T006 Add transaction-taking `enqueueJobInTransaction` in `src/server/services/bg-runtime.ts` and atomic proposal/dispatch store in `pulse-dispatch.store.ts`, using `withOrgCoreTransaction` and restoring bookkeeping role for job writes without wider grants (FR-001/002).
- [ ] T007 Apply actual migration twice and verify seed/constraints through `src/server/services/pulse-dispatch.store.test.ts`; capture schema/RLS/row invariants in `docs/pulse-dispatch.md` (A17).

## Phase 3: US1 — Decide the reviewed revision (P1)

**Independent test**: actual POST/PATCH/service transactions under concurrent connections.

- [ ] T008 [US1] Add red `src/routes/api/pulse/proposals/pulse-approval.test.ts` using real domain DB and external-boundary stubs: concurrent approve/edit/dismiss, repeated approval, stale/missing revision, wrong owner/org and all informational kinds (FR-001/003/004).
- [ ] T009 [US1] Implement strict action parsers and pinned Gateway schema fixtures in `src/server/services/pulse-action-contract.ts` and `src/server/test-utils/fixtures/pulse-tool-schemas.json`; reject unknown keys, invalid dates/timezones and instruction-like authority fields; serialize typed arguments as data with existing `<=16 KiB` ceiling (FR-008).
- [ ] T010 [US1] Replace independent mutations in `src/server/services/pulse.service.ts` and `src/routes/api/pulse/proposals/[id]/+server.ts` with one versioned locking decision transaction; current personal-owner/capability check, freeze target/action, enqueue exactly once, stable duplicate receipt and no route RPC (FR-001/002/003/006).
- [ ] T011 [US1] Run actual route SQL concurrency cases in `pulse-approval.test.ts`; preserve gateway ingestion and legacy informational behavior using `pulse-ingest-contract.test.ts` and `pulse-tenant-boundary.sql.integration.test.ts` (A17/A18).

## Phase 4: US2 — Inspect authoritative status (P1)

**Independent test**: real Pulse page, popup and notifications-page Pulse consumer with current mutation helpers; notifications SSR load with actual owner-scoped reader; stale rendered revision, failed refresh and reconnect.

- [ ] T012 [US2] Add owner-filtered `listRecentPulseDecisions` (limit `1..50`, keyset cursor) and receipt projection to `pulse.service.ts`, `src/routes/api/pulse/proposals/[id]/receipt/+server.ts`, pending feed/count and `src/routes/(app)/pulse/+page.server.ts`; integrate the same owner filter/safe read projection and revision into `src/routes/(app)/notifications/+page.server.ts` `data.pulseProposals`. Preserve its existing `users:manage` review and org-kind gates together with Pulse read capability requirements. Add `src/routes/(app)/notifications/notifications-page.server.test.ts` invoking the real load/reader against disposable PostgreSQL: same-org other-owner exclusion, allowed legacy informational rows, denied review access, business visibility and safe field projection; verify inbox/join-request access unchanged. Legacy executedAt projects unverified, not execution (FR-002/004/009; D2-01).
- [ ] T013 [US2] Thread `expectedRevision` and receipt responses through `src/lib/state/features/pulse.svelte.ts`, `src/lib/components/layout/NotificationsPopup.svelte`, `src/routes/(app)/pulse/+page.svelte` and `src/routes/(app)/notifications/+page.svelte`; both notifications actions pass the exact rendered `p.id`/`p.revision` into `decidePulse` and the real helper, never a revision derived from newer shared state or a pre-submit fetch. Add shared `src/lib/components/pulse/PulseReceipt.svelte`, bounded recent section and recovery without write replay. Preserve the committed action outcome before notifications invalidation, fence stale decision controls if invalidation fails, and expose only read recovery; reconnect reads the same authoritative decision/receipt (FR-003/004/009; D2-01).
- [ ] T014 [US2] Localize all changed Pulse/popup/notifications Pulse copy in `messages/en.json` and `messages/es.json`, verify existing nav/view/write gates and affected route contracts, and add real mounted fixture `tests/fixtures/critical-journeys/PulseFixture.svelte` plus `tests/e2e/ui-audit/critical-journeys.spec.ts` cases for keyboard, reconnect, owner privacy and committed-refresh failure. Retain Pulse page/popup cases and mount the actual notifications page with its real mutation helper: SSR display revision 1 with shared list/server revision 2 must submit 1 for both approve and dismiss, conflict and create zero dispatches; explicit refresh must display 2 before a new decision submits 2. Cover committed approve and dismiss followed by failed `app:notifications` invalidation with exactly one write, read-only recovery, reconnect to the same decision/receipt, owner-scoped SSR/readback, safe projection and EN/ES keyboard controls. Replacement markup or a copied action handler cannot qualify (A18, FR-003/004/009; D2-01).

## Phase 5: US3 — Advance only authorized work (P1)

**Independent test**: real queue SQL and registered worker with local WS server/process crashes.

- [ ] T015 [US3] Add red `src/server/services/bg-runtime.selection.test.ts` with over 20 older unrelated jobs, selected type/org/owner/due predicates, stale candidate after postpone, direct advance bypass, missing handler and count assertions (FR-005).
- [ ] T016 [US3] Implement `runSelectedTick`, repeated atomic due/generation checks, typed bounded `postponeUntil` transaction result and remaining-budget signal in `bg-runtime.ts`; keep other handlers and default `src/routes/api/jobs/tick/+server.ts` behavior unchanged (FR-005).
- [ ] T017 [US3] Implement disabled-by-default `pulse-worker-config.ts`, explicitly registered dispatch handler import in `pulse-tick.ts`, authenticated `src/routes/api/pulse/tick/+server.ts` and `src/lib/server/cron-auth-path.ts`; no caller-selected scope and no installed schedule (FR-005/009).
- [ ] T018 [US3] Run `bg-runtime.test.ts` and `bg-runtime.selection.test.ts`; assert actual SQL and direct callers cannot wake unrelated/future jobs, postponement releases current generation only and booking retry behavior remains (A19).
- [ ] T019 [US3] Implement strict current personal-owner/agent/session/assignment and gateway qualification checks in `pulse-dispatch.authority.ts`, shared fresh capability-row adapter in `rbac.service.ts`, and exact scoped credential/RPC path in `src/lib/server/gateway-rpc.ts` (FR-006/008/009).
- [ ] T020 [US3] Add red `src/server/services/pulse-dispatch.worker.test.ts` against local WS transport: two same-gateway profiles, actual serialized cron schema, ambient fallback trap, unknown/deleted agent, mismatched qualification, revoked membership/grant/assignment and malformed remote receipt (FR-006/007/008).
- [ ] T021 [US3] Implement `pulse-dispatch.worker.ts`: frozen queued input, atomic admission before one call, explicit target and `delivery.mode:none`, validated scheduled receipt only, indeterminate after any uncertain admission, no reset/retry API, proven pre-admission retries `5s,30s` with cap `3` (FR-006/007/008).
- [ ] T022 [US3] Add child-process crash/restart cases to `pulse-dispatch.worker.test.ts` after admission/RPC/settlement boundaries; assert zero automatic repeats and no stale generation settlement (A20).
- [ ] T023 [US3] Implement scoped cancellation/retention in `pulse-dispatch.store.ts` and call it from `user.service.ts` deletion/membership-update paths plus `pulse-worker-config.ts` reconciliation; cancel queued work/fence generations together, retain admitted tombstones, redact expired payload and reject missing payload. Test actual callers and current-authority recheck (FR-002/006/007/009).

## Phase 6: Verification and handoff

- [x] T024 Run all commands in `contracts/validation.md`: full check/test/build, i18n, design/token lint, route contract and critical-journeys; record current source/lock evidence in `docs/pulse-dispatch.md`. Fix all errors/warnings/failures (SC-001–005).
- [x] T025 Use browser-harness on the current source-built local fixture/QA app; retain EN/ES keyboard, popup/Pulse page/notifications-page Pulse section, rendered-vs-current revision conflict, owner denial, reconnect and failed-refresh screenshots/call counts in the root D audit. Follow `tests/fixtures/critical-journeys/README.md` (SC-004).
- [ ] T026 Obtain independent Standards and Spec code reviews, map every A17–A20 case to actual evidence, and freeze D commit/shared contract for E; parent creates the single D PR. Record any true open end at its code site and meta proposal; do not claim C deployment qualification from stubs (SC-001–005).

## Dependencies and execution order

T001–T007 precede US1. T008→T009→T010→T011; US2 T012→T013→T014 follows stable decisions. A19 T015–T018 can be developed after foundation without digest; A20 T019–T023 requires decisions and selected runtime. No parallel edit of `pulse.service.ts`, `bg-runtime.ts`, Pulse page/notifications page/state/popup or shared localization. Independent test design may be parallel, but this task does not authorize extra agents. All converge on T024–T026. MVP is atomic decisions/receipts with dispatch disabled; final D PR includes all four acceptances.

## Acceptance coverage

| Acceptance | Tasks |
|---|---|
| A17 | T003–T007,T010,T011,T023 |
| A18 | T008–T014,T024,T025; D2-01 notifications SSR/action/mounted coverage in T012–T014,T024,T025 |
| A19 | T015–T018,T024 |
| A20 Hub | T009,T019–T023,T024,T026; C owns Gateway implementation |


## Phase 7: Convergence

Current-source assessment follows independent review `audits/2026-10-23-agent-harness-batches/verification/d-pulse/review-01.md` (77 intent entries). Existing T001–T026 remain unchanged. These tasks close observed implementation and qualification gaps; they add no release authority.

- [x] T027 **CRITICAL** Exclude every owner-bound Pulse row from the shared organization corpus content and terminal identity queries in `src/server/services/brain-business-corpus.service.ts`, including the indexing owner's row; include the owner column in required-schema checks and prove both queries on actual restricted-role PostgreSQL with two owners plus a null-owner legacy row. Trace D-01; Constitution IV owner scope, FR-002/004/009 and SC-003 (contradicts).
- [x] T028 Fence same-owner stale feed/count/receipt successes, errors and refresh continuations in `src/lib/state/features/pulse.svelte.ts` with bounded per-resource/request generations, retiring reads across newer reads and decision commits; prove actual compiled-store and mounted/browser ordering preserves scheduled receipts and cannot resurrect stale controls/count. Trace D-02; FR-004/009 and SC-004 (partial).
- [x] T029 Preserve a validated same-admission remote acceptance as immutable evidence bound to the frozen dispatch, target and admitted generation, including after revocation; do not settle a stale job, modify successor state/generation/cursor, grant authority or permit replay. Prove actual PostgreSQL/local-WS retention, wrong-target/generation and conflicting-overwrite rejection with no second RPC. Trace D-03; FR-002/007 and receipt remote-ID contract (partial).
- [x] T030 Complete and qualify monotonic selected-runtime and outer Pulse tick budgets, including authority/retention time and admission remainingMs, while retaining wall time for SQL due/lease and unchanged legacy generic behavior. Prove backward-clock and exhausted-budget cases through actual runtime/tick callers. Trace D-06; FR-005 and shared remaining-budget contract (partial).
- [x] T031 Reject malformed wildcard/numeric cron ranges in `src/server/services/pulse-action-contract.ts` before approval or dispatch, preserve documented valid bounded expressions, and record actual parser versus installed Gateway Croner regressions. Trace D-04; FR-008 (partial).
- [x] T032 Return 409 refresh-required when an executable PATCH omits expectedRevision, retain 400 for malformed supplied revisions, and prove the actual route changes no proposal/dispatch/job. Trace D-05; FR-003 (contradicts).
- [x] T033 Record actual selected-query EXPLAIN evidence on the guarded fixture queue with more than 20 unrelated rows; inspect the planned due-selection index without forcing planner choices or inventing latency claims. Trace D-08; plan/data-model selected-index evidence (missing).
- [x] T034 Qualify the exact frozen corrected tree with declared i18n/design/token/route gates, full check/test/build, actual mandatory default combined browser inventory/reporter/caps, fresh browser-harness proof and independent Standards/Spec convergence. Preserve failed/intermediate receipts and separate local source proof from Supabase, deployed Gateway and release operations. Trace D-07; T024–T026 and SC-001–005 (partial).

## Qualification checkpoint

Convergence source findings T027–T033 independently closed; T034 and final qualification/delivery remain open. See the batch program and independent review evidence.
