---
id: 2026-10-17-agent-dynamic-tools
title: Discover current authorized tools and answer catalog questions directly
status: approved
created: 2026-10-17
updated: 2026-10-17
repos: [minion_hub, minion]
tags: [logic, security, data, test]
value: 10
effort: L
---

# Current tools and direct answers

## AS-IS

A business data question can trigger navigation, obsolete SQL and repeated discovery. The executable tool inventory and the discovery index can diverge across concurrent runs. The previous SDK prompt override uses a private API changed in SDK1.1. See the source anchors in `specs/2026-10-17-agent-dynamic-tools-spec.md`.

## TO-BE

Return an answer with links from authorized data. Discover live versioned tool schemas from the deployed service, isolate each run's catalog, activate tools within the same run, and reject retired contracts before execution. Bound repeated calls and preserve semantic failures and cancellation.

## DELTA

The reviewed spec covers a live Hub query manifest, price ranking, gateway dynamic tool adapter, discovery/SDK migration, transport and execution guards. Implementation uses isolated feature clones; merge and deployment are separate owner-gated steps.

## Open verification and lifecycle work

- Source changes and focused test evidence do not prove production deployment or answer quality with a selected model. Complete exact-candidate local/browser/provider evaluation before release.
- UI markdown fences still require a typed, request-bound effect protocol; answer-first prompts do not constitute deterministic navigation authorization.
- Selection defaults remain shadow pending task-quality evaluation. Coding tools are not yet dynamically restricted by information-request intent.
- Forty tool calls is a hard safety ceiling across internal attempts in one embedded run, not the intended interactive lookup latency/cost target. A shared wall-clock/token/cost budget, cross-provider write receipts and measured selection quality remain separate work. Higher-level provider fallback creates a new guard state if the answer-only recovery itself fails.
- Pending classifier cancellation, draft admission and late UI session ownership require the broader lifecycle repair.
- Custom script credentials, approval receipts, provisioning, cache/memory scope and model selection require their own authority and runtime qualification.

These are retained follow-ups, not claims that the full lifecycle audit is resolved. Existing audit material remains local; no production transcript or credentials are published here.

## Implementation drafts

- Hub: https://github.com/NikolasP98/minion_hub/pull/567
- Gateway: https://github.com/NikolasP98/minion-ai/pull/333
- Reviewed spec: https://github.com/NikolasP98/minion-meta/pull/840

These drafts implement the S1/S2 incident and dynamic-discovery foundation. The open lifecycle work above remains open; production release and model qualification are separate evidence levels.
