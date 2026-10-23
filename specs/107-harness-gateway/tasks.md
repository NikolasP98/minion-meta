# Tasks: Gateway watcher receipts and binding

**Input**: [spec](spec.md), [plan](plan.md), [receipts](contracts/receipts.md), [usage/shadow](contracts/usage-shadow.md), [cron binding](contracts/cron-binding.md). Paths are Gateway-relative unless explicitly meta. Tests are required by the parent. Unchecked means not implemented/proven.

## Phase 1: Setup and foundations

- [ ] T001 Verify `pnpm-lock.yaml` hash, isolated installed Drone0.6.0 `dist/types.d.ts`/`run.js` hashes and registered `DEV` base; record parent frozen-install receipt and source SHA. Obtain two independent approved SDD hash reviews before code.
- [ ] T002 Re-run merged slice10 producer tests in `src/auto-reply/reply/dispatch-provenance.test.ts` and `src/channels/impl/telegram/inbound-provenance.test.ts`; preserve WhatsApp member-traffic and legacy/manual flow behavior in actual watcher `index.test.ts` fixtures (FR-C01/C09).
- [ ] T003 Create installed-result contract tests in `extensions/alert-watcher/src/usage-finalization.test.ts` and core `src/drones/host.test.ts`, observing actual Drone0.6.0 success/failure/fallback shape with stubbed provider completion; no mocked error may invent resolvedModel (FR-C06).

## Phase 2: US1 original source admission (A11, P1)

**Independent test**: actual dual hook invocation, Telegram ordered originals, real database admission count.

- [ ] T004 [US1] Add red cases in `extensions/alert-watcher/src/provenance.test.ts`: same-ID different chat/account, dual hooks, exact whitespace source hash, batches, config/model revision redelivery, identity conflict, provider edit, explicit reevaluation, forged RPC origin/receipt and idless fresh invocation (FR-C01/C09).
- [ ] T005 [US1] Implement canonical tuple/hash/binding adapter in `extensions/alert-watcher/src/provenance.ts`; freeze stable namespace/policy identity separately from mutable authority and config hashes per `contracts/receipts.md` (FR-C01/C09).
- [ ] T006 [US1] Wire actual `index.ts` inbound/received metadata and subscriptions to original units; retain custom hook policies, legacy flow gate/v1 envelopes and uncertified baseline path; remove pre-provider seen suppression only from certified path in `dedup.ts` (FR-C01).

## Phase 3: US2 durable work and delivery (A12–A15, P1)

**Independent test**: file-backed SQLite, two processes and filesystem queue with kill/restart barriers.

- [ ] T007 [US2] Add real SQLite concurrency/migration tests in `src/classification-work.test.ts` under watcher: unique admission, source/ownership change, generations, due predicates, three-attempt bound, negative/invalid response persistence and old-schema upgrade twice (FR-C02/C09).
- [ ] T008 [US2] Add the two tables/checks/indexes and prepared transaction helpers in watcher `store.ts`/`migrate.ts`; enforce attempts0..3, snapshot<=64KiB, SDK result<=64KiB, suggestions<=16KiB, recipient payload<=64KiB, safe code<=128 chars and no tombstone cascade (FR-C02/C05).
- [ ] T009 [US2] Implement `classification-work.ts` queued/admitted/received/terminal transition helpers, source count/first-sent markers and immutable suggestion subreceipt, all owner/generation fenced; expire received payload only after local materialization or explicit cancellation (FR-C02/C05/C09).
- [ ] T010 [US2] Add process kill/restart tests in `extensions/alert-watcher/classification-recovery.test.ts`: admission ambiguity, received local replay, negative completion, schema error usage, revoked policy, lease loss and retry5s/30s cap3 (FR-C03/C09).
- [ ] T011 [US2] Wire lifecycle dispatcher in `classification-work.ts`/`index.ts`: poll5s, lease30s, renew10s, one active classifier, <=10 due candidates/tick; recheck authority before claim/dispatch; stop/abort/fence/close safely (FR-C03). Depends on T020–T022 terminal observer integration before real provider boundary.
- [ ] T012 [US2] Make `classifier.ts` persist bounded terminal SDK result/usage through observer before local validation; connect actual hook and legacy RPC result paths without treating SDK error as a negative (FR-C02/C03/C06).
- [ ] T013 [US2] Add `src/delivery-bridge.test.ts` with real queue files: crash at SQLite admission, enqueue, provider admission, terminal checkpoint, SQLite settlement and acknowledgement; missing/mismatched entry never re-enqueues (FR-C04).
- [ ] T014 [US2] Implement narrow `delivery-bridge.ts` using actual `deliverOutboundPayloadsWithOutcome` with required durability, persisted queueId and caller completion; reconcile under queue entry lease and exact generation/bindings; SQLite settles before acknowledgement (FR-C04/C09).
- [ ] T015 [US2] Extend outbound `delivery-queue-store.ts`/`delivery-queue-files.ts` with caller-managed minimal tombstone/retirement helpers and enqueue tombstone rejection, preserving generic callers; cover parser/recovery and filesystem fault cases in owning queue tests (FR-C04/C05).
- [ ] T016 [US2] Add `src/delivery-recovery.test.ts`: two recipients/split success, one-time cooldown/window count, current recipient revoke, suggestion admission/received/materialization kills and no repeated suggestion; unknown suggestions become explicit empty unavailable (FR-C05).
- [ ] T017 [US2] Wire atomic positive/suggestion/recipient materialization in watcher `index.ts`, `store.ts`, `destinations.ts` and `reply-flow/suggestions-drone.ts`; persist final suggestion disposition, normalize/freeze recipients, and stamp cooldown only on first confirmed sent receipt (FR-C05/C09).
- [ ] T018 [US2] Remove old automatic all-recipient boot fan-out for migrated `legacy_unreconciled` rows in watcher `index.ts`/`store.ts`; restore window/cooldown from durable receipt markers on restart; retain complaint visibility and custom/manual compatibility tests (FR-C05).
- [ ] T019 [US2] Add bounded seven-day payload cleanup/owner-scoped namespace retirement to `classification-work.ts` and queue helpers; erase DB/queue/usage copies, retain minimal replay tombstones and cancel expired queued inputs. Test cleanup-before-dispatch on restart, redacted queue recovery, explicit namespace retirement and behavior-first rollback (FR-C05/C09).

## Phase 4: US3 per-invocation usage (A16, P1; integrate before T011)

**Independent test**: installed SDK transport stubs and concurrent classifier/suggestion calls.

- [ ] T020 [US3] Add result-mode option in `src/drones/host.ts` and narrow `src/drones/run-with-usage.ts` wrapper if needed; fresh host per invocation, exact candidate credential resolution, lifecycle preserved, inferred price suppressed only when opted in (FR-C06).
- [ ] T021 [US3] Wire both actual hook and flow calls in watcher `index.ts`, `classifier.ts` and `reply-flow/suggestions-drone.ts` to terminal observer/finalizer; persist response before local validation, emit one final observation and never reemit on received recovery (FR-C06).
- [ ] T022 [US3] Complete overlap A/B, fallback A→B, missing resolved failure, missing earlier usage, cache tokens, ordinary unopted callers and persistence-failure tests in `usage-finalization.test.ts`/core `host.test.ts`; assert unknown/incomplete coverage survives export (FR-C06).

## Phase 5: US4 cron owner binding (A20gateway, P1)

**Independent test**: actual add/update/store/execution with two agents and no provider/tool side effects.

- [ ] T023 [US4] Add red `src/gateway/server-core/server-cron.binding.test.ts`: explicit unknown/deleted agent, wrong/global session, effective patch changing agent only, omitted-ID default, canonical origin plus same-agent isolated execution, no announcement (FR-C07).
- [ ] T024 [US4] Wire shared current-config binding validation into `src/gateway/server-methods/cron.ts`, `src/gateway/server-core/server-cron.ts`, effective cron service add/update under lock and `src/platform/cron/isolated-agent/run.ts`; reject before workspace/auth/tool/provider setup; preserve omitted general-cron behavior (FR-C07/C09).
- [ ] T025 [US4] Run existing cron handler/service/tenant-scope/delivery suites and produce exact source/build `cron-binding-v1` fixture record per `contracts/cron-binding.md`; hand to group D, retaining separate deployed-gateway qualification gate (FR-C07/SC-C04).

## Phase 6: US5 eligible census and shadow (A30gateway, P2)

**Independent test**: frozen stub records with network denied.

- [ ] T026 [US5] Add red watcher `src/jev-shadow-eligibility.test.ts`: default/certified pass, custom/idless/flow/model-drift bypass, disabled zero extra calls, no-eligible stop, shadow baseline always runs, timeout/abstain unavailable (FR-C08).
- [ ] T027 [US5] Implement deterministic eligibility/census and injected shadow adapter in `src/jev-shadow-eligibility.ts`, wire actual classifier completion/receipt seam in `index.ts`/`classification-work.ts`; config allows off/census/shadow only, default off, real shadow requires separate approved manifest with known bound (FR-C08/C09).
- [ ] T028 [US5] Implement exact versioned schema/export in `src/complaint-evaluation.schema.json` and `src/complaint-evaluation.ts` under watcher; produce `ComplaintEvaluationRecordV1` fixtures from real receipt/usage identities; test monotonic transactional receiptRevision, stale/conflicting export rejection, duplicate hook/attempt export and gate+baseline+retry+unknown costs under one logical-source denominator; hand fixtures/contract to group F for joint A30 report qualification (FR-C08/SC-C05).

## Phase 7: Qualification and review

- [ ] T029 Run `contracts/validation.md` commands, actual process/storage tests, migration twice, existing watcher/outbound/cron regressions and full Gateway `pnpm check`, `pnpm tsgo`, `pnpm test`; record source/installed hashes and exact exits (SC-C01–C06).
- [ ] T030 Obtain independent Standards and Spec code review; close full acceptance trace with group D/F joint evidence, document any genuine remaining implementation gap in exact `TODO(handoff)` plus meta proposal, and prepare one scoped Gateway PR to `DEV`. Keep merge/deployment/paid/active classifier gates (SC-C06).

## Dependencies and execution strategy

T001–T003 block implementation. A11 T004→T005→T006 precedes store T007→T008→T009. Usage T020→T021→T022 runs before final dispatcher wiring T011/T012, which follows T010 red proof. A14 T013→T014→T015 follows store; A15 T016→T017→T018→T019 follows dispatcher, usage and bridge. Cron T023→T024→T025 is independent after setup and can be tested while watcher review runs. A30 T026→T027→T028 follows completed receipt/usage paths and group F schema agreement. T029→T030 closes the batch. Do not parallel-edit shared watcher index/store or queue files; optional parallel work is test design in separate files only. No task authorizes additional agents. Intermediate green increments remain in one complete group PR.
