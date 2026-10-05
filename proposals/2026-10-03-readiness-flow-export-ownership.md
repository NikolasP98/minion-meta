---
id: 2026-10-03-readiness-flow-export-ownership
title: Keep export toggles owned by the selected flow and current viewer
stage: proposal
status: approved
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [ui, logic, test]
type: fix
---

# Flow export state ownership

The user authorized all readiness findings and adjacent failures. HC-040 was discovered while checking HC-038 shared Button consumers. It is separate from the shared primitive correction.

## AS-IS

`src/lib/components/flow-editor/FlowExports.svelte` seeds its local toggle map once. Selecting flow B with different props retains A's toggles. A pending PATCH for A can later fail and roll its old value into the visible B controls. The actual mounted component reproduces both failures with synthetic data in `evidence/hc040-flow-export-ownership-recon.log`; the exact executable reproduction is retained beside it. No production writes occurred.

The control allows overlapping optimistic writes and catches transport errors by reverting silently, without proving whether the write committed. These paths require an action-outcome and authority audit before a bounded implementation contract. Its 28px by16px custom toggle target and hardcoded thumb color also require the shared UI contract review.

## TO-BE

Displayed export state belongs to the current flow, actor and organization. Fresh authoritative props update it deliberately; stale completions never affect a replacement owner or newer operation. Writes expose saving, failure and uncertain outcome, with safe read reconciliation that does not replay an unknown mutation. Disabled permission state rejects activation at the handler as well as the UI. The control uses a named, token-based, keyboard and touch-accessible primitive.

## DELTA and proof

Trace the actual route's owner, load/invalidation, permission and export endpoint contract. Define admission and reconciliation before altering optimistic behavior. Mount actual route/consumer sequences for A to B to A, same-flow incoming props, reversed writes, revoked authority and late success/failure. Use a meaningful before/after negative and actual browser mobile/keyboard evidence. Preserve raw variable keys and exactly-once path encoding verified under HC-026. No merge, deployment or production mutation is authorized by this artifact.
