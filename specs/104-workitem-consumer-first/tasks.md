# Tasks: WorkItem consumers before producer migration

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [admission contract](contracts/admission.md).
**Prerequisite**: Owner security approval of the revised parent spec. All tasks
below remain pending; this planning PR authorizes no implementation or release.
Factory paths below are relative to that independent repository.

## Phase 1: Setup

- [ ] T001 Record owner approval and current source revisions in the parent spec `specs/2026-08-18-factory-workitem-handoff-schema-spec.md` before code.
- [ ] T002 Follow plan.md's held dispatch procedure: establish/verify the existing operator brake through supported deployment (safe active-container adoption or drain), preserve prior pause authority, fetch this feature's complete plan/tasks at the approved flat parent's reviewed last-touch commit, and submit one Factory S5-only task. Before releasing only an owned unchanged hold, verify queued/never-started state, full stored task and exact `spec_commit_sha`; mismatch cancels only that untouched row and requires source refresh/review. Create an isolated Factory feature branch at the registered base and read `AGENTS.md`, `runner/package.json`, `runner/src/lifecycle.ts` and `runner/src/index.ts`.

## Phase 2: Foundational contract

- [ ] T003 Add failing contract cases in `runner/src/workitem.test.ts` for missing/invalid fields, wrong scalar/array shapes, duplicate control keys and id/path mismatch.
- [ ] T004 Define the DB-free parser/validator in `runner/src/workitem.ts`: `source` is a nonempty slug, `source_trust` is human/trusted-automation/untrusted-external, `risk_class` is high/low/unclassified, `priority` is critical/high/medium/low, `owner` is nonempty and max 120 characters, and status uses the existing proposal enum.
- [ ] T005 Reuse/export existing policy risk aggregation in `runner/src/manifest.ts` and test aliases, high/unclassified/empty/low precedence and declared-risk mismatch in `runner/src/workitem.test.ts`; unknown tags and unavailable policy cannot validate.

## Phase 3: US1 — Meaningful approval (P1)

**Goal**: Only valid trusted low-risk automation may auto-approve; valid explicit
human approval remains usable. **Independent test**: trust/risk matrix plus zero
approval PUTs for invalid or changed canonical records.

- [ ] T006 [US1] Add failing tests in `runner/src/lifecycle.test.ts` for every trust class, legacy metadata, known-unclassified topics and canonical source changed after index discovery.
- [ ] T007 [US1] Apply strict WorkItem validation and exact derived-low eligibility in `runner/src/lifecycle.ts:proposalAutoApproveEligible`, preserving status/duplicate/reopen checks.
- [ ] T008 [US1] In `runner/src/lifecycle.ts:transition`, validate prospective canonical proposal bytes before approval PUT; automatic mode is controller-selected, rechecks current trust/risk and requires expected draft status. Preserve terminal legacy transitions.
- [ ] T009 [US1] Prove valid explicitly approved human/external controls, invalid metadata refusals and actor-label independence through real transition behavior in `runner/src/lifecycle.test.ts`.

## Phase 4: US2 — One admission boundary (P2)

**Goal**: Automatic and explicit starts use canonical validated WorkItems.
**Independent test**: actual HTTP and DB assertions with malformed-source
refusals, accepted controls and valid/invalid/valid sibling isolation.

- [ ] T010 [P] [US2] Add failing approved-index sweep and new retry admission cases in `runner/src/lifecycle.test.ts`, asserting zero new rows for incomplete or changed authority and one enqueue for valid later siblings.
- [ ] T011 [P] [US2] Add failing actual `/pipeline/spec` HTTP cases in `runner/src/index.test.ts` for legacy, duplicate-key, wrong-id, risk mismatch and unavailable source/policy, plus complete approved human/external controls.
- [ ] T012 [US2] Validate current canonical proposal identity/metadata and approved status before NEW automatic spec admission in `runner/src/lifecycle.ts`; use strict file-commit resolution, commit-pinned fetch and pre-insertion file-revision comparison, reject drift and isolate deterministic invalid entries.
- [ ] T013 [US2] Apply the same strict parser/validator, file-commit resolver, commit-pinned fetch and pre-insertion revision comparison in `runner/src/index.ts`; return 422 for metadata errors and a retryable service failure for unavailable authority/policy, preserving auth/status/manifest/dedupe gates.
- [ ] T014 [US2] In `runner/src/lifecycle.ts`, require current valid metadata/policy plus compatible normalized topics, derived risk and policy hash for NEW automatic retries; hold changed authority for renewed review/fresh lineage. Prove changed-topic and changed-policy refusals plus unchanged compatible inheritance with real DB cases in `runner/src/lifecycle.test.ts`; existing queued/running retries remain unchanged.

## Phase 5: US3 — Preserve migration continuity (P3)

**Goal**: Existing work survives while legacy intake waits for enrichment.
**Independent test**: persisted queue/manifests before and after repeated sweeps
and restart, plus existing ordering and immutable merge-authority tests.

- [ ] T015 [US3] Extend real-DB lifecycle fixtures in `runner/src/lifecycle.test.ts` to compare queued/running records, retry manifests and lifecycle history across repeated sweeps and restart.
- [ ] T016 [US3] Run `runner/src/queue-order-integration.test.ts`, relevant `runner/src/manifest.test.ts` and `runner/src/automerge.test.ts` to prove unchanged filtering/order and pinned merge authority; do not add source-string assertions.
- [ ] T017 [US3] Record legacy-held intake and current admission-time versus execution-time proposal-content limits in Factory `README.md` and the parent proposal `proposals/2026-08-17-factory-workitem-handoff-schema.md`; add the required exact-site TODO/handoff pointer if implementation leaves that known code boundary open.

## Phase 6: Review and release

- [ ] T018 Run focused scenarios from `specs/104-workitem-consumer-first/quickstart.md`, then Factory `runner/package.json` typecheck/full suite and independent code review; attach observed evidence to the Factory PR.
- [ ] T019 Obtain owner merge of the security implementation PR, follow the trusted promotion in Factory `.github/workflows/promote-dev-daily.yml`, and verify production/main/dev identity and preserved active work.
- [ ] T020 Exercise the deployed validation module with an isolated DB and controlled source fixtures, repeat invariants, and record proof in the parent proposal/spec before allowing S4 producer/backfill review to proceed.

## Dependencies and execution order

Owner approval → setup → foundational contract → US1 → US2 → US3 → owner merge,
trusted promotion and runtime proof → separately reviewed S4 → S6. Existing S1/S2
and S3 dispatch refusal are regression boundaries, not duplicate implementations.

## Parallel opportunities

T010 and T011 may prepare their different test files concurrently after US1;
implementation remains sequential at each shared approval/admission boundary.
No phase permits concurrent producer rollout before consumer runtime proof.

## Implementation strategy

Deliver the cohesive Factory consumer gate in one PR. Validate each story in
order, then review/release once. S4 inventory/backfill and S6 monitor intake are
separate remaining parent slices. Revalidate the current base and prior runs
before dispatch so no shipped slice is replayed.
