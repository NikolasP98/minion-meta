---
id: 2026-10-22-whatsapp-member-agents-spec
title: WhatsApp member agents and channel linking
stage: spec
status: approved
pass: 1
created: 2026-10-22
updated: 2026-10-22
repos: [minion, minion_hub, minion-meta]
---

## 0. Product

Spec Kit feature: [`specs/032-whatsapp-member-agents/`](032-whatsapp-member-agents/spec.md), with plan.md and tasks.md alongside.

A verified org member DMs the org's WhatsApp account and their own personal agent answers, with the same agent and the same RBAC as the hub web assistant. The spec also covers a safer linking flow (card's own gateway, mismatch and foreign-org refusal, lifecycle callbacks) and a P3 roadmap for consolidating channel logic. Security-tagged: the owner approves the spec before code.

**Out of scope:** member mode in groups; leases, outbox and canonical memory from drafts #330/#544; cleaning up the owner's PANIK-in-FACES test state; multi-gateway auto-binding.

**Verification:** SC-001 to SC-006 in the Spec Kit spec. The live rollout runs with the owner present (tasks T301); evidence goes under `specs/032-whatsapp-member-agents/evidence/`.
