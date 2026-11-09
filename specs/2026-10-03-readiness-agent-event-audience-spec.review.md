---
spec: 2026-10-03-readiness-agent-event-audience-spec
pass: 2
verdict: approved
reviewer: root-orchestrator
created: 2026-10-03
---

Independent Standards PASS: Sol gateway_fixes. Final Spec PASS: root orchestrator. Reviewed source SHA-256: `3aec58a5357e4dac91eb37d5f48445c4cab21290479010ccc13b5d854dd3fa9f`.

Raw agent events and all five session-bearing pi-agent views require the same server-derived audience as chat. Target connection IDs only narrow recipients; they cannot authorize them. Unknown ownership withholds tenant delivery. Paperclip shared-token/device compatibility stays explicit and tested; the wire payload is unchanged. The separate orchestration-progress event bridge remains open under GW-005.

The user's all-findings authorization covers local security implementation. Human merge and production release remain separate. Spec approval is not implementation qualification.
