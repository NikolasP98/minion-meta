---
id: 2026-10-23-harness-evals-spec
title: Reproducible agent evaluation and gated inference
stage: dev
status: implementing
pass: 2
created: 2026-10-23
updated: 2026-10-23
repos: [minion-meta]
proposal: 2026-10-22-agent-decision-and-proactivity-experiments
relationship: extends
related: [2026-10-22-agent-harness-reliability-and-proactivity-spec]
tags: [logic, data, security, test]
type: feature
verdict: approved
---

# Reproducible agent evaluation and gated inference

## 0. Product

This is the board entry for [Spec Kit feature 110](./110-harness-evals/spec.md), an implementation refinement of the approved parent contract under the owner's one-PR-per-group directive. Parent approval authorizes requirements. Both independent Astra reviewers approved revision 1 at exact hashes. Merge, deployment and paid operations keep their separate gates.

## AS-IS, TO-BE and DELTA

The [spec](./110-harness-evals/spec.md) carries current source anchors, user outcomes, acceptance mapping and bounded assumptions. The [plan](./110-harness-evals/plan.md) and [tasks](./110-harness-evals/tasks.md) define implementation ownership and cross-batch prerequisites.

## Verification

Run the feature's [validation guide](./110-harness-evals/contracts/quickstart.md), the repository's required gates and both independent review passes. Source/fixture evidence does not assert deployment or paid quality qualification.

## Out-of-scope

No new parent requirements, engine P1–P4 scope, paid runs, merge or deployment. One implementation PR for this group; this stub is included in the single meta F PR with the other batch SDD records.
