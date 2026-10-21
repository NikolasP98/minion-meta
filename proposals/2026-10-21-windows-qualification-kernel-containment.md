---
id: 2026-10-21-windows-qualification-kernel-containment
title: Qualify Windows test-process cleanup with kernel containment
status: in-spec
created: 2026-10-21
updated: 2026-10-21
repos: [minion]
tags: [infra, test]
source: assistant-capability-production-adoption-2026-10-21
spawned_spec: 2026-10-21-windows-qualification-kernel-containment-spec
---

# Qualify Windows test-process cleanup with kernel containment

## AS-IS

PR #344 merged at `2231ac53aa31c368cb857f22de8ec05861a4f83b`. Updated #342 head `eb56ae70cb7e0440387cdf31bb38a62e8bb51556` passed local helper, workflow, outbound and Teams tests and repository checks. Native CI `39560356777` rejected ordinal 1 after all 74 tests passed, exit 0, no timeout and no owned survivors. Two new unowned processes (`CompatTelRunner.exe` and `svchost.exe`) descended from stable pre-existing service processes. Receipt `audits/2026-10-18-assistant-capability-repair/windows-eb56ae70-qualification-attempt1.json` retains exact source/checkout identity and artifact SHA-256 `1d989fcfd1c4a20dd2e1809c4da394f74e0459b73aa4178b37ee4e266330b9a4`.

The monitor compares every process on the shared Windows host and rejects any new survivor whose test ownership is unproven. Birth-aware tracking fixes false baseline adoption, but global process difference still cannot distinguish unrelated host activity from broker-created test work. Repeated unchanged retries and executable-name exemptions cannot resolve that contract. Infrastructure PRs currently skip native focused qualification, so previous helper fixes reached DEV without exercising their native OS boundary.

## TO-BE

Qualify cleanup of each invocation's ordinary process tree using a private Windows kernel Job Object. Place the suspended root in the job atomically at creation, verify membership before execution, prohibit breakaway, and use job membership/emptiness and handle-based termination as the process-lifecycle authority. Keep host-wide snapshots as diagnostics without treating unrelated host processes as test leaks. This is an explicit qualification-contract change requiring human review, not a reinterpretation of failed evidence.

Preserve ten successful fresh invocations, exactly 74 passed assertions per invocation, exact source and checkout binding, existing absolute deadlines, no skipped/failed tests, both full Windows shards and final integrated DEV qualification. Require native infrastructure contract tests in the feature PR before merge. Job containment is not a hostile-code security sandbox and does not prove containment of broker-created WMI/SCM/service work.

## DELTA

1. Specify kernel containment, evidence versioning, cleanup semantics and unchanged release gates in a two-pass-reviewed implementation spec.
2. Add a narrowly scoped Windows native runner with no new package dependency, elevation or production access. Fail before root execution if job creation, limits, membership or suspended startup cannot be established.
3. Exercise real Windows root/child/grandchild lifecycle, root exit with surviving child, timeout cleanup, unexpected supervisor exit, setup failure and unrelated host activity in an infrastructure CI lane with read-only repository permissions that grants no product qualification.
4. Integrate versioned, source-bound per-ordinal job evidence into the ten-run monitor. A child leak or timeout fails even if cleanup later succeeds. Refuse legacy, mixed or malformed evidence. Preserve failed receipts.
5. Obtain human review and merge only after complete native infrastructure proof. Then refresh #342, require fresh ten-run and full-shard qualification, merge only when passing, and qualify final DEV before the previously approved production promotion.

## Out of scope

No OS executable-name allowlist, disabling Windows update/telemetry, relaxed test count/deadline, repeated retry-to-green, production mutation, model change, product runtime change, new secret access or new npm dependency. Do not claim containment of brokered work or same-user adversarial code.

## Completion

A reviewed implementation and real Windows infrastructure proof precede human merge. The release remains held until the new ten-run contract and both full shards pass on the exact candidate and final integrated DEV source. Historical failures remain failures.
