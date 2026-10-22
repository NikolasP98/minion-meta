---
id: 2026-10-21-windows-heartbeat-qualification-timing
title: Drain heartbeat delivery fixtures and scope their measured Windows budget
status: draft
created: 2026-10-21
updated: 2026-10-22
repos: [minion]
tags: [test]
source: windows-342-full-shard-one-heartbeat-failures
---

# Drain heartbeat delivery fixtures and scope their measured Windows budget

## AS-IS

Gateway #342 CI `39669098214` on `71e8b2dcb748bce3970c78c5b3f6cbb4f71937ea` failed seven assertions in the ACK heartbeat test file. Three delivery cases exceeded the existing 15-second case budget; four later cases then observed missing or leftover calls. The later suppression failure includes the prior case's `responsePrefix` value, consistent with a still-running earlier fixture reaching reset spies. The other five assertions passed. The unchanged file passes all 12 locally. No product runtime correctness defect has been established.

Local instrumentation counted 34 real FileHandle.sync calls in the first ACK delivery, spanning the durable queue, sessions and containing directories. An external diagnostic adding 460 ms to each real sync reproduced the first 15-second timeout and the next case's missing-call failure. Native sibling heartbeat delivery cases took 5.3–9.3 seconds; native per-operation filesystem latency was not captured. The timeout/cascade mechanism is reproduced, while native slow-storage attribution remains an inference from timing and code. The failed full shard and aggregate result remain failed.

## TO-BE

Retain all 12 cases, all routing/account/ACK/suppression assertions and the real durable delivery pipeline. Scope a measured 30-second budget to only the six cases that send through durable storage; the remaining six retain 15 seconds. Ensure the entire owned sandbox Promise, including finally cleanup, settles before a subsequent case resets channel runtime, configuration or spies. A timed-out/failed case must remain failed. A permanently hung fixture must fail closed through existing bounded hook behavior; no cancellation guarantee is claimed.

## DELTA

Prepare an ACK-test-file-only wrapper that registers Vitest onTestFinished cleanup and a first-registered beforeEach drain for owned fixture work. Do not modify shared runtime code, adapters, filesystem operations, global timeouts, test counts or skip behavior. Prove unchanged-code latency failure, drain-only isolation while retaining the first failed outcome, corrected scoped-budget completion and normal 12-case execution. Independent Standards/Spec review and fresh complete Windows qualification remain required.

## Lifecycle and release boundary

This is a bounded extension of #342's observed test timing/cleanup hotfix, tracked alongside `2026-10-21-windows-release-qualification-timing`. It bypasses a new standalone spec while preserving the product and release contracts in `2026-10-18-assistant-capability-failure-recovery-spec.md` and the approved kernel qualification specification. The existing owner-authorized repair and conditional #342 merge remain applicable after complete checks. Source preparation and portable reproduction do not qualify native Windows, final integrated DEV, deployment or authenticated chat. No production mutation occurred.

## Prepared and reviewed correction

#342 source `ab18426b3fc682d6c2c1b37c75411510d8bd81d3`, tree `3fe16765343ac2e09f35a402d8935ac35e2bb22d`, includes the exact one-file heartbeat correction alongside its original three test fixes and merged artifact-path correction #347. Independent Standards and Spec reviews passed. Local 43 helper contracts, 136 assertions across the four affected suites and full repository check passed (zero errors, 57 existing warnings). Controlled delay/drain/hook-bound outcomes, complete original logs and explicitly reconstructed diagnostic snapshots are retained by `audits/2026-10-18-assistant-capability-repair/heartbeat-qualification-reproduction.json` and its checksum-bound archive. Fresh complete native Windows and final merged DEV qualification remain pending.

## Current qualification block

Fresh corrected-source CI `39682653940`, attempt 1, passed earlier applicable checks, but GitHub refused both full Windows runners before allocation due failed payments or spending-limit admission. This is not a test result and grants no qualification. Source `5d72bb8a404bd2bf82487a07279464f87585544e` remains pushed and held pending owner billing resolution and a complete fresh attempt. Receipt: `audits/2026-10-18-assistant-capability-repair/windows-5d72-runner-admission-block.json`. No production mutation occurred.

## Merged content

From `handoff-minion-ai-2905928301` (factory handoff-ledger sweep, 2026-10-22): the open end is
anchored at `NikolasP98/minion-ai@DEV src/infra/heartbeat-runner.respects-ackmaxchars-heartbeat-acks.test.ts:50`
— "Verify the bounded delivery cases in full Windows shards."
https://github.com/NikolasP98/minion-ai/blob/DEV/src/infra/heartbeat-runner.respects-ackmaxchars-heartbeat-acks.test.ts#L50
