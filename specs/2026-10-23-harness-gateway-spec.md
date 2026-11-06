---
id: 2026-10-23-harness-gateway-spec
title: Gateway watcher receipts usage and explicit target binding
stage: dev
status: implementing
pass: 2
created: 2026-10-23
updated: 2026-10-23
repos: [minion]
proposal: 2026-10-22-agent-decision-and-proactivity-experiments
relationship: extends
related: [2026-10-22-agent-harness-reliability-and-proactivity-spec]
tags: [logic, data, security, migrations, test]
type: fix
verdict: approved
---

# Gateway watcher receipts, usage and explicit target binding

## 0. Product

Approved parent slices 11–16 plus Gateway A20/A30 seams ship in one group C Gateway PR under the owner's batching directive. See [specification](107-harness-gateway/spec.md), [plan](107-harness-gateway/plan.md), [tasks](107-harness-gateway/tasks.md), [receipts](107-harness-gateway/contracts/receipts.md), [usage/shadow](107-harness-gateway/contracts/usage-shadow.md), and [cron handoff](107-harness-gateway/contracts/cron-binding.md). Source-backed AS-IS, TO-BE, DELTA and every acceptance ID are in the specification. Both independent Astra reviews approved revision 1 plus the exact null-compatibility correction; parent implementation authorization does not waive merge, deployment or paid/active-experiment gates.

## 1. AS-IS, TO-BE and DELTA

See the source-pinned specification and A11–A16/A20gateway/A30gateway mapping linked above. Existing watcher hooks ignore merged provenance; the refinement adds durable receipts, qualified usage and explicit cron binding through current runtime components.

## 2. Out-of-scope

No new engine/framework, WhatsApp certification, automatic classifier activation, paid holdout, merge or deployment.

## 3. Verification

Run the executable command and crash matrix in [validation](107-harness-gateway/contracts/validation.md). Independent review and joint D/F acceptance evidence are required before claiming completion.
