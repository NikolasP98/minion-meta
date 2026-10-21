---
id: 2026-10-21-windows-heartbeat-qualification-timing
title: Drain heartbeat delivery fixtures and scope their measured Windows budget
status: draft
created: 2026-10-21
updated: 2026-10-21
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
