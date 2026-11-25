---
id: 2026-10-23-durable-agent-sessions-spec
title: Durable agent sessions (reset.mode never) and /new for member-mode senders
stage: spec
status: draft
pass: 1
created: 2026-10-23
updated: 2026-10-23
repos: [minion, minion_hub, minion-meta]
---

## 0. Product

Spec Kit feature: [`specs/035-durable-agent-sessions/`](035-durable-agent-sessions/spec.md).

Agent sessions stop resetting on a clock. A new reset policy `never` (default for new installs) keeps a conversation alive until someone ends it; compaction and memory flush bound the context as they do today. A verified org member on a member-mode WhatsApp account can `/new` their own personal-agent session, and nothing else. Production FACES and MINION gateways move from `daily` (which, with no container TZ, fired at 23:00 Lima) to `never`.

**Out of scope:** `/new` for customers on business lines; transcript rollover or size caps (measured, not built); deleting the `daily` literal from the schema.

**Verification:** SC-001 to SC-006 in the Spec Kit spec; rollout evidence under `specs/035-durable-agent-sessions/evidence/`. Owner decisions D1-D3 are listed at the end of the spec.
