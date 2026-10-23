---
id: 2026-10-23-harness-digest-spec
title: Bounded dependency digest in Pulse
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

# Bounded dependency digest in Pulse

## 0. Product

Implement approved parent acceptances A21–A25 and A32 in one group digest PR under the owner's batching directive. See [specification](109-harness-digest/spec.md), [plan](109-harness-digest/plan.md) and [tasks](109-harness-digest/tasks.md). Parent implementation authorization remains valid; both independent technical reviewers approved this refinement at exact hashes.

## 1. AS-IS, TO-BE and DELTA

Hub source `ef62e8ac2dd8d83d7f38dae8ec04f59c50cf4283` contains independent Pulse decision writes, an unselected generic job runtime and no integrated dependency-digest collector. The [source-backed acceptance matrix](109-harness-digest/spec.md#as-is--to-be--delta) maps this group's exact changes to A21–A25 and A32. Pulse D establishes versioned owner-bound receipts and selected workers; digest E consumes those interfaces after D and adds bounded informational collection/reasoning/publication/feedback.

## 2. Out-of-scope

No automatic merge, production migration/deployment, paid inference, business digest pilot, external announcement, new global scheduler or replay of uncertain admitted work. The approved parent's limits and distinct activation/qualification gates remain normative.

## 3. Verification

Follow the executable [local validation procedure](109-harness-digest/contracts/validation.md): exact source/dependency pins, real disposable PostgreSQL races/crashes, migration+seed, current caller tests, full Hub gates and EN/ES mounted/browser proof. Independent two-pass SDD and separate Standards/Spec implementation reviews are required. Source/stub success does not establish deployed gateway/schedule/provider qualification.
