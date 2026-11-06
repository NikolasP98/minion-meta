---
id: 2026-10-23-harness-factory-spec
title: Bounded Factory Jev admission and deadlines
stage: dev
status: implementing
pass: 2
created: 2026-10-23
updated: 2026-10-23
repos: [minion-factory]
proposal: 2026-10-22-agent-decision-and-proactivity-experiments
relationship: extends
related: [2026-10-22-agent-harness-reliability-and-proactivity-spec]
tags: [logic, security, data, test]
type: fix
verdict: approved
---

# Bounded Factory Jev admission and deadlines

## 0. Product

This source-backed refinement implements approved parent slices 8–9 in one Factory PR under the owner's explicit batching instruction. See [specification](106-harness-factory/spec.md), [plan](106-harness-factory/plan.md), [tasks](106-harness-factory/tasks.md) and [contract](106-harness-factory/contracts/admission-deadline.md). AS-IS, TO-BE, DELTA and A08/A09 traceability are in the specification. Two independent Astra technical passes approved the batch; the owner authorized implementation. Human merge, deployment and paid-experiment gates remain.

## 1. AS-IS, TO-BE and DELTA

The source-pinned specification maps token-reset/concurrent admission and hook deadline defects to A08/A09. Retained run accounting, complete/unknown coverage and bounded HTTP/hook lifetime are the desired behavior.

## 2. Out-of-scope

No engine redesign, distributed limiter, automatic paid replay, acting-mode activation, merge or deployment. Existing direct host/idless calls do not acquire a new per-run guarantee.

## 3. Verification

Run the executable command matrix and installed-loopback harness procedure in [admission/deadline contract](106-harness-factory/contracts/admission-deadline.md). Require independent Standards and Spec review and preserve the separate human release gates.
