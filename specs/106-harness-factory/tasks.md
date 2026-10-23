# Tasks: Bounded Factory Jev admission and deadlines

**Input**: [spec](spec.md), [plan](plan.md), [contract](contracts/admission-deadline.md). All code paths are relative to the isolated Factory checkout. All tasks remain unchecked until implemented and evidenced.

## Phase 1: Setup

- [x] T001 Record `runner/package-lock.json`, `agent/Dockerfile`, Node/npm/Express/tsx/TypeScript and actual harness versions in the group B verification receipt; use parent frozen-install receipt and verify lock unchanged.
- [x] T002 Record two independent approved reviews of `specs/106-harness-factory/` hashes before code; verify `AGENTS.md`, registered `dev` base and clean ownership boundary. Preserve slices 6–7 tests in `runner/src/jev.test.ts`, `runner/src/jev-proxy.test.ts` and `scripts/jev-shadow-report.test.mjs`.

## Phase 2: US1 run admission and accounting (A08, P1)

**Independent test**: real loopback provider request counter plus deferred HTTP response and exact attempt receipts.

- [x] T003 [US1] Add failing cap-one concurrency, `run_busy` no debit, malformed counter saturation, token rotation/revocation/expiry, duplicate settlement, known-zero/overshoot, settled live-run expiry→cleanup→remint without counter reset, retired-run mint rejection and unknown-cost cases in `runner/src/jev-proxy.test.ts` (FR-B01/B02/B06).
- [x] T004 [US1] Separate token lookup and retained run ledger in `runner/src/jev-proxy.ts`; reserve authoritative attempt ID and call debit before await, allow one in-flight, reserve remaining allowance, settle once, and retain unresolved exposure through revoke/remint/expiry (FR-B01/B02).
- [x] T005 [US1] Wire `runner/src/queue.ts`, `runner/src/queue-retirement.ts` and capability sweep to ledger lifetime; only authoritative terminal retirement plus no-remint tombstone permits settled-ledger cleanup. Keep live-run debits across expiry/revoke and old capabilities invalid after restart; never recreate prior admitted work. Add bounded ledger-pressure denial rather than evicting unresolved entries (FR-B02/B06).
- [x] T006 [US1] Extend `agent/lib/cost.test.sh` and `runner/src/stats.test.ts` with known billed failures, unknown errors, duplicate proxy/comparison receipts and legitimate zero; assert guard temp cleanup→actual run/spec/reconcile emitters→queue parser/settlement; denied401/429/busy produce zero provider bills, and late terminal settlement invalidates incomplete stats cache (FR-B03).
- [x] T007 [US1] Add bounded durable v2 accounting journal helpers in `runner/src/jev-proxy.ts`/`jev.ts` and `agent/lib/jev.sh`, admitted before dispatch and retained after guard cleanup. Wire shared coverage in `agent/lib/cost.sh` into `agent/run.sh:emit`, `agent/spec.sh:emit`, `agent/reconcile.sh:emit`, then `runner/src/queue.ts:FinishResult`/`parseFinishResult`/`finishRunInner` and restart reads. Extend `budget-reservations.ts:settleRunReservations` to retain unknown commitments on incomplete coverage. Update `stats.ts` to refresh incomplete/late-settled terminal runs by receipt revision. Preserve numeric subtotal, v2 dedup and authority; add `knownCostUsd`, `unknownAttemptCount`, `costCoverage`, `receiptRevision`; no general billing engine (FR-B03).
- [x] T008 [US1] Run A08 focused tests plus `scripts/jev-shadow-report.test.mjs`; prove v2 IDs, authoritative cost precedence, unjoined legacy rows and all existing slice 6–7 report behavior remain (FR-B03/B06).

## Phase 3: US2 bounded hook and HTTP lifetime (A09, P1)

**Independent test**: direct and proxy calls to stalled-header/body/disconnect loopback servers, followed by the installed hook mechanism.

- [x] T009 [US2] Add red HTTP integration cases in `runner/src/jev-deadline.test.ts`: budget rejection, delayed headers/body, genuine disconnect, normal completed request body, elapsed middleware work, timer cleanup and unknown receipt after possible dispatch (FR-B04/B05).
- [x] T010 [US2] Thread additive signal/remaining-duration options through `runner/src/index.ts`, `runner/src/jev-proxy.ts` and `runner/src/jev.ts`; include body consumption and keep existing general timeout ceiling (FR-B04/B05).
- [x] T011 [US2] Add direct/proxy/legacy-call regression in `agent/lib/jev.test.sh` and guard preparation/proxy-delay/floor tests in `agent/hooks/jev-guard.deadline.test.sh` (FR-B04/B05/B06).
- [x] T012 [US2] Update `agent/lib/jev.sh` and `agent/hooks/jev-guard.sh` to share monotonic remaining duration; enforce at most 4000ms total semantic preparation/request and unchanged 6000ms outer settings in `agent/hooks/claude-settings.json`; preserve immediate floor output and no implicit retries (FR-B04/B06).
- [x] T013 [US2] Exercise the actual pinned installed harness using `agent/hooks/claude-settings.json` with loopback proxy/provider stubs and no paid call; retain installed version, source hash, invocation count and elapsed evidence. Escalate inability to exercise the installed mechanism as missing A09 runtime proof (SC-B02/B04).

## Phase 4: Verification and review

- [x] T014 Run commands in `contracts/admission-deadline.md`, including declared runner typecheck/full tests, shell syntax/shellcheck and report regressions; record exact outputs and source SHA (SC-B01–B04).
- [x] T015 Obtain independent Standards and Spec code review, map every A08/A09 case to evidence, and create one scoped Factory PR to `dev`; record any true implementation open end at its code site with `TODO(handoff)` and in the matching meta proposal. Leave merge/promotion/live calls gated (SC-B04).

## Dependencies and execution strategy

T001–T002 precede code. T003→T004→T005; T006→T007; both converge at T008. T009→T010 and T011→T012 converge at T013, after ledger semantics are stable. All converge at T014→T015. Work on shared `jev-proxy.ts` and `jev.sh` is serialized. Independent test design for T006 and T009 may proceed concurrently after setup; this document does not authorize additional agents. The first internally testable increment is A08, followed by A09; delivery remains one complete group PR.

## Implementation qualification record

All 15 tasks are evidenced by the [frozen revision-one packet](../../audits/2026-10-23-agent-harness-batches/development/b-factory/revision1/README.md) and [independent convergence review](../../audits/2026-10-23-agent-harness-batches/verification/b-factory/revision1/review.md). Factory source `4e2ec83bcc52ef875a6dc17332be7156291f89a6` is in [PR 201](https://github.com/NikolasP98/minion-factory/pull/201) against `dev`. Local implementation qualification is complete; GitHub CI is pending, and merge/promotion/production activation remain unperformed. Task descriptions and normative requirements are unchanged; checkmarks record completed implementation and delivery work.
