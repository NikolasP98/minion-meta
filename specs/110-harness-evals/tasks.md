# Tasks: Reproducible agent evaluation and gated inference

**Input**: [spec](spec.md), [plan](plan.md), [evaluation contract](contracts/evaluation.md), [A/F adapter](../105-harness-chat/contracts/eval-adapter.md). Paths are meta-relative unless explicitly Hub/C. Tasks remain unchecked until evidenced. F owns meta implementation; A owns Hub code and C owns watcher runtime.

## Phase 1: Setup

- [ ] T001 Record meta `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`, `pnpm-lock.yaml`, Node/pnpm versions and parent frozen-install receipt; confirm root instructions and current registry `dev` PR base in `repo-policy.yaml` (FR-010).
- [ ] T002 Confirm two independent approved reviews of `specs/110-harness-evals/` hashes; confirm A adapter and C's authoritative ComplaintEvaluationRecordV1 schema/revision contract with their owning developers in `contracts/evaluation.md` and A's `contracts/eval-adapter.md` before dependent implementation (FR-001/007/010).

## Phase 2: Foundational

- [ ] T003 Add strict versioned manifest/receipt parsing in `scripts/agent-evals/lib/{manifest,receipts}.mjs` with boundary tests; reject unknown fields, duplicate/conflicting IDs, invalid hashes/numbers, unapproved paths and raw production data; define private artifact lifecycle and complete/incomplete evidence states (FR-001/002/010).

## Phase 3: US1 matched fixture trajectories (P1, A26)

**Independent test**: actual CLI/subprocess A protocol; synthetic inference only, zero external network.

- [ ] T004 [US1] Add red `scripts/agent-evals/run.test.mjs` covering fixture default, external-network denial, matched resets/seeded order, joins, missing receipts, duplicate/conflicting events, zero budget and dead adapter (FR-001/002).
- [ ] T005 [US1] Implement `scripts/agent-evals/run.mjs` and `lib/hub-adapter.mjs` with explicit pinned `--hub-root`, subprocess protocol/hash handshake, bounded lifecycle/cancel, three arm selection and fresh `runs/<run-id>/events.jsonl`/`receipts.jsonl`; never copy production context/route algorithms (FR-001/010).
- [ ] T006 [US1] Add parent-designated `audits/2026-10-22-agent-use-transcripts/spec/fixtures/smoke-manifest.json` and small disposable episode/provider fixtures; actual A adapter smoke must prove full/Jev/core-discovery paths, callback bypass and identical state hashes. Record source/lock/adapter/network receipts (SC-001).

## Phase 4: US2 corpus governance (P1, A27)

**Independent test**: offline corpus import/readiness/holdout-access behavior with independent labeled fixtures.

- [ ] T007 [US2] Add red `scripts/agent-evals/corpus.test.mjs` for absent truth/permissions/receipt expectations, duplicate IDs/leakage groups/content, mislabeled synthetic records, bilingual/compaction and dev-mode holdout body refusal before file load (FR-003).
- [ ] T008 [US2] Implement `scripts/agent-evals/corpus.mjs` validate/import/readiness and strict episode/split/label schemas under `scripts/agent-evals/fixtures/`; append label corrections by revision, count human-adjudicated matching labels only, report ≥60 dev/≥240 holdout/twelve families/bilingual applicable strata/≥40 consequential readiness without fabricating corpus (FR-003, SC-002).
- [ ] T009 [US2] Write `scripts/agent-evals/README.md` corpus freezing/independent adjudication/unblinding/retention procedure and small validated examples in `audits/2026-10-22-agent-use-transcripts/spec/fixtures/corpus/`; clearly mark corpus300 collection as a separately governed operation (FR-003/010).

## Phase 5: US3 outcomes, economics and trace screening (P1, A28/A29)

**Independent test**: exact independently calculated counterexamples and deterministic repeated CLI results; no providers.

- [ ] T010 [US3] Add red `scripts/agent-evals/report.test.mjs` for all-attempt cost numerator, cheaper-but-less-successful failure, missing receipt/paired arm, critical veto, known zero, zero-success bootstrap draws, bounded adverse exposure, unbounded unknown and source/model/rubric drift (FR-004/005).
- [ ] T011 [US3] Implement `scripts/agent-evals/report.mjs` and `lib/statistics.mjs`: dedupe/quarantine explicit joins, receipt-based terminal scoring, cohort splitting, “10,000 seeded matched-episode cluster” percentile draws, exact CPS ratios and paired success/p95 latency; preserve repeats within cluster and undefined draws; show coverage/stopping/expansion/power (FR-004/005, SC-003).
- [ ] T012 [US3] Add red `scripts/agent-evals/screen.test.mjs` with unauthorized/missing receipt/hidden failure/duplicate/post-cancel/unsupported citation faults, hidden independent labels, semantic abstain and apparently-good control selection probabilities; assert fixed budget and weighted uncertainty (FR-006).
- [ ] T013 [US3] Implement `scripts/agent-evals/screen.mjs` deterministic-first checks and separately typed semantic fixtures, random/prioritized-plus-controls protocol, gold-label isolation and weighted miss report; preserve severity veto/inconclusive conditions and no billing/release authority. Add optional explicit E feedback file importer only for compatible revisioned exports (FR-006, SC-005).

## Phase 6: US4 bounded actual live adapter (P1, A31)

**Independent test**: actual live CLI/adapter with test-only trusted attestation and injected provider transport; every real-network attempt denied.

- [ ] T014 [US4] Add red `scripts/agent-evals/live-provider.test.mjs` and `lib/approval.test.mjs`: valid attestation reaches actual provider shaping; missing/expired/wrong-owner/self-key/self-approved/tampered/circular-digest cases reject, wrong endpoints/model/fixtures and unknown/exhausted caps dispatch zero (FR-002/008/009).
- [ ] T015 [US4] Implement `lib/approval.mjs` detached built-in-crypto verifier, explicit external trust config and manifest-hash binding; add live flags to `run.mjs`. No signer/minting command, operational key discovery or `approved:true` bypass; retain attestation digest outside manifest hash (FR-002/008).
- [ ] T016 [US4] Add red subprocess crash/concurrent-writer tests in `lib/budget.test.mjs`: journal fsync before dispatch, response lost, known invalid result, truncated journal/stale lock, new run/midnight reuse, double settlement, overshoot, cancel and received-result recovery; request counter must prove no automatic replay (FR-008/010).
- [ ] T017 [US4] Implement `lib/budget.mjs` single-writer approval-namespace journal/reservations with positive conservative bound checks, per-call/run/day limits, carried unresolved exposure, idempotent settlement and fail-closed crash recovery. Private modes and tombstones survive raw redaction; no automatic unlock/unfencing (FR-008/010).
- [ ] T018 [US4] Implement `lib/live-provider.mjs` actual allowlisted OpenRouter profile requests with bounded input/output/body/time, explicit injected credential, requested/resolved identity and cost-status receipt; no retry/fallback/redirect; persist received/unknown before interpretation. Live changes inference only, all tools stay on A fixtures (FR-008/009).
- [ ] T019 [US4] Wire same adapter through `run.mjs`, exercise the complete valid live-mode path with stub transport and real A disposable fixture protocol; implement `inspect`/`redact`/`retire-namespace` local artifact operations with permanent retired-namespace markers and tests proving deletion cannot recreate paid work. Record zero actual paid calls (FR-009/010, SC-004).

## Phase 7: US5 complaint qualification (P2, A30-F)

**Independent test**: offline import of versioned C-produced compatibility fixtures, no gate activation.

- [ ] T020 [US5] Add red `scripts/agent-evals/complaint.test.mjs` using C-produced certified/default/custom/idless/model-drift/timeout/zero-eligible fixtures and its exact pinned schema; reject missing/mismatched schema SHA, conflicting same/higher receipt revisions and immutable-binding changes; require baseline in shadow, logical-source/attempt dedupe and actual-versus-counterfactual costs (FR-007).
- [ ] T021 [US5] Implement `scripts/agent-evals/complaint.mjs` and `report.mjs` complaint summary consuming C's schema/export through explicit pinned --gateway-root: reconcile receiptRevision without replacing known bills; no eligible→do_not_pilot, incomplete baseline→inconclusive, independently labeled severity/threshold/pre-registration gates; keep actual shadow bills separate from counterfactual forwarded costs and C runtime eligibility proof separate and never activate/suppress delivery (FR-007, SC-005).

## Phase 8: Verification and review

- [ ] T022 Add an executed nested test command in root `package.json` and `.github/workflows/ci.yml`; run `node --test scripts/agent-evals/*.test.mjs scripts/agent-evals/lib/*.test.mjs`, real A adapter smoke and all commands in `contracts/quickstart.md`. Freeze fixture source/lock/result hashes (FR-010, SC-001–005).
- [ ] T023 Run root declared build/typecheck/lint/test/scripts/policy/index/changeset gates; orchestrator alone regenerates shared spec/proposal indices after all six SDDs are final. Preserve unrelated WIP; record any unrelated failing gate precisely, fix within authorized scope or ledger before claiming completion (FR-010).
- [ ] T024 Obtain independent Standards and Spec code review; create one scoped meta F PR to `dev` including complete software and SDDs, no patch-only sources; report corpus readiness, paid-smoke-not-run, holdout-not-run and release-not-authorized separately. Any required unimplemented software gets exact-site `TODO(handoff)` and matching proposal entry (FR-010, SC-001–005).

## Dependencies & Execution Order

T001–T003 precede changes. US1 T004→T005→T006; US2 T007→T008→T009 after fixture identity exists; US3 T010→T011 then T012→T013 after stable outcomes. US4 T014→T015 and T016→T017 precede T018→T019; valid live path also needs US1/US2/US3 preflight. US5 T020→T021 needs C export contract and US3 report. All converge at T022–T024.

## Parallel opportunities and strategy

Corpus negative-case design and approval negative-case design can proceed independently after foundational schemas freeze; report/screen/budget edits serialize wherever shared libraries/runner overlap. F integration waits for A's actual adapter, while pure offline parser/statistics work can proceed. C's runtime tests do not block F's imported fixture validation but do block cross-group A30 completion. No additional agents are authorized here. First useful increment is matched fixture trajectories; all required software stories complete in the one F PR.
