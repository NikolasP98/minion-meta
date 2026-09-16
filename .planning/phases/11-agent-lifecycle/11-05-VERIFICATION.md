---
phase: 11-agent-lifecycle
plan: "05"
status: gaps_found
slice_status: task1_passed_task2_recorded_requirement_open
requirements_completed: []
verified: 2026-09-11
snapshot: /home/nikolas/.cache/claude-tmp/11-05-g9v2tq/minion-factory
---

# 11-05 goal-backward verification (executor self-check; independent review pending)

## must_haves.truths

| Truth | Verdict | Evidence |
|---|---|---|
| Fixtures fail when a prohibited effect is admitted | **PASS** | Test 5 asserts a forged `admitted` expectation for the budget case does not equal the seam's actual outcome; test 3 compares every case's verdict/receipt/effects against the fixture with `deepEqual` (an admitted prohibited effect changes verdict, receipt and counts). `checks/task1-governance-replay.log`. Historical red: `draft-run4.log` shows one mismatched receipt failing the corpus. |
| Fixtures fail when manifest identity is missing | **PASS** | Test 2: removing `identity`, removing `topicPolicyHash`, tampering the policy, drifting the tool contract each throw from `loadCorpus`. Test 1 requires sha256-pinned images and hash equality with `hashTopicPolicy`. |
| Repeated seeded runs give identical effect verdicts | **PASS** | Test 4 (in-process p2 vs p3 transcripts `deepEqual`); two fresh processes with fresh `FACTORY_DATA` produce identical `ok` lines (`determinism-run1/2.log`). |
| Effect evidence and every source gap disposition are recorded | **PASS** | `11-GOVERNANCE-GAPS.md`: per-case seam/effect/receipt table (18 rows) + GG-01..GG-07 with seam, reason, smallest follow-up, dependency. |
| No failed or untested boundary is marked complete | **PASS** | GAPS closure statement and SUMMARY `requirements-completed: []`; GG-01/02/03/07 explicitly open or blocked; `11-VERIFICATION.md` status unchanged (`gaps_found`). |

## must_haves.artifacts

| Artifact | Verdict | Evidence |
|---|---|---|
| `minion_factory/runner/src/governance-replay.test.ts` defines deterministic admission/effect fixtures | PASS | hash `21c54cef…`; 5/5; typecheck 0; runner suite 1146/1146 with the file included by the project glob. |
| `.planning/phases/11-agent-lifecycle/11-GOVERNANCE-GAPS.md` closes proven source gaps with explicit follow-up admission | PASS (no proven source gap; unreached boundaries recorded with follow-up) | hash `9d8c5972…`. |

## key_links

- test → `containment-effects.ts`: the corpus exercises the same effect ledger (`db.ensurePhaseEffect`, `MAX_PHASE_EFFECT_ATTEMPTS`, lineage binding) that `applyContainmentRemoteEffects` routes through; the remote-writing path itself stays covered by `containment-effects.test.ts` (30/30 at base, `baseline-seams.log`) and is listed as GG-02 for real effects.
- GAPS → test: every GG row names the seam the corpus stops at and the case that reaches its edge.

## Negative / rejection cases required by the plan

Forged control token; cross-instance lease; out-of-phase write; unknown `permissions` field; `:latest` image; schema version 2; policy version 2 manifest; tampered effective/risk; rewritten manifest hash; rewritten policy hash; widened prior manifest; budget over cap; model rebinding; expired lease (renew + submit share the receipt); untagged/high-risk/non-draft proposal; bounded retry exhaustion; lineage-changed replay; cancel of completed history. Corpus-level: missing identity, missing hash, tampered policy, drifted contract, forged expectation.

## Standards check

- Only owned files created/changed; Factory tree shows exactly the two untracked owned paths; `git diff --check` clean; typecheck 0; no runner source edited.
- No `.env`, Infisical, production/staging URL, credential, provider, container or network use; tests run under `env -i PATH HOME TMPDIR`; SQLite under a temp dir removed after each run.
- No commit/stage/push/PR/publish/deploy/branch/stash; main checkouts untouched except the two planning files the plan owns.

## Open gates before AGT-06 can close

1. GG-01 tool-host/broker runtime denial test (new bounded plan, Factory ownership).
2. Phase 17 external containment drill for GG-02/GG-03/GG-07 (D360-03).
3. Independent review of this candidate (D360-07); root decides requirement status.
