---
id: 2026-10-23-harness-pulse-spec
title: Pulse approval and dispatch receipts
stage: dev
status: implementing
pass: 2
created: 2026-10-23
updated: 2026-10-23
repos: [minion_hub]
proposal: 2026-10-22-agent-decision-and-proactivity-experiments
relationship: extends
related: [2026-10-22-agent-harness-reliability-and-proactivity-spec]
tags: [logic, data, security, infra, ui, test]
type: feature
verdict: approved
---

# Pulse approval and dispatch receipts

## 0. Product

Implement approved parent acceptances A17–A20 in one group pulse PR under the owner's batching directive. See [specification](108-harness-pulse/spec.md), [plan](108-harness-pulse/plan.md) and [tasks](108-harness-pulse/tasks.md). Parent implementation authorization remains valid; both independent technical reviewers approved revision 1 at exact hashes. D2-01 adds the existing notifications-page Pulse consumer and SSR projection to the same scope, with exact rendered-revision propagation and committed-refresh/reconnect proof. Both approvals cover the revised artifact hashes.

## 1. AS-IS, TO-BE and DELTA

Hub source `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283` contains independent Pulse decision writes, an unselected generic job runtime and no integrated dependency-digest collector. The [source-backed acceptance matrix](108-harness-pulse/spec.md#as-is--to-be--delta) maps this group's exact changes to A17–A20. Pulse D establishes versioned owner-bound receipts and selected workers; digest E consumes those interfaces after D and adds bounded informational collection/reasoning/publication/feedback.

## 2. Out-of-scope

No automatic merge, production migration/deployment, paid inference, business digest pilot, external announcement, new global scheduler or replay of uncertain admitted work. The approved parent's limits and distinct activation/qualification gates remain normative.

## 3. Verification

Follow the executable [local validation procedure](108-harness-pulse/contracts/validation.md): exact source/dependency pins, real disposable PostgreSQL races/crashes, migration+seed, current caller tests, full Hub gates and EN/ES mounted/browser proof. Independent two-pass SDD and separate Standards/Spec implementation reviews are required. Source/stub success does not establish deployed gateway/schedule/provider qualification.
