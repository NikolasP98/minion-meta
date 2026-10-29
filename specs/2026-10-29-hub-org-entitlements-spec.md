---
id: 2026-10-29-hub-org-entitlements-spec
title: Hub org entitlements — plans gate AI per org
stage: spec
status: review
verdict: pending
type: feature
pass: 1
created: 2026-10-29
updated: 2026-10-29
repos: [minion_hub, minion, minion-meta]
tags: [security, data, permissions, ui]
---

## 0. Product

Spec Kit feature: [`specs/043-hub-org-entitlements/`](043-hub-org-entitlements/spec.md), with plan.md, tasks.md and the source design (design.md, goldfish-reviewed) alongside. Status: spec, awaiting owner approval.

Every org gets a plan (Premium or Base). AI features are Premium (owner rule 2026-10-26). Platform admins set plans on `/orgs/plans`. The server enforces it on hub AI routes, model calls, ticks and jobs; the gateway enforces it from JWT claims (a Base-org session may call only a non-AI method allowlist) and from a per-account `aiEnabled` field for channel replies; the flows runner ends AI branches. A Base org sees no AI in the UI and keeps channels, non-AI flows, the message history and the cloud workstation. Everything is inert until `ENTITLEMENTS_ENFORCED=true`, turned on by the owner after a backfill that makes every org Premium except Bernibites.

Five slices: S1–S3 hub, S4 gateway + flows runner, S5 backfill and docs. Security and data tagged: the owner approves the spec and merges every PR.

**Out of scope:** billing and automatic plan changes, spend caps, gateway crons/heartbeats/webhooks (need spec 042 S1), channel types outside the mirror, the Gmail auto-labeler, the pre-existing shared-token exposure for Premium orgs (all in `proposals/2026-10-29-hub-org-entitlements-followups.md`).

**Verification:** per-slice tests in the Spec Kit tasks.md; the live acceptance walk is design.md §Launch order step 5 (tasks.md T106). Success criteria SC-001 to SC-006 are in the spec.
