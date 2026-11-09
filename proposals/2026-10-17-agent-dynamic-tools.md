---
id: 2026-10-17-agent-dynamic-tools
title: Discover current authorized tools and answer catalog questions directly
status: approved
created: 2026-10-17
updated: 2026-10-18
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

## Qualification blocker: audited checksum baseline

Gateway PR333 remains blocked by the repository rule that an implementation branch cannot allowlist its own secret-scan findings. Dedicated audit https://github.com/NikolasP98/minion-ai/pull/334 contains only the two public contract-checksum entries from the synthetic fixture. Its PR security gate intentionally also rejects baseline changes; the owner must authorize the existing audited baseline-update process. No scanner or approval rule was weakened. Once the audited entries land on DEV, update PR333's base and repeat CI. The exact guard lives in `.github/scripts/ci-security-scope.sh`; its existing baseline-refresh TODO links the broader audit proposal.

### Qualification repair prepared for owner review

PR334 now also removes the inherited dependency symlink. The security proposal already specifies a temporary dedicated-update allowance; the dynamic-tools spec addendum limits it to PR334's exact repository/branch/base and immutable reviewed two-entry baseline transition. Ordinary PRs and all changed-commit scans remain enforced. This is a security-policy change prepared as a draft, not owner approval or authorization to merge. Root and independent reviewer must verify context failures, historical tampering and real scanner execution before requesting release.

After the audited baseline lands, retire PR334's one-time scanner allowance and its dedicated regression fixtures in a normal follow-up. The exact source site carries `TODO(handoff)` pointing to the existing baseline-refresh proposal; ordinary baseline immutability and commit-delta scans must remain unchanged.

## Current qualification and production boundary

Production inspection still finds the gateway revision predating dynamic tool discovery. PR #337 includes the CRM test correction and supported Linux process-fork qualification mode; full DEV results remain required before promotion #335. Repeated hosted-runner shutdowns have no established root cause. The specification records the unchanged coverage/failure gates and pending proof. The separate click-to-open Hub guard is tracked by proposal 2026-10-18-assistant-navigation-confirmation; neither repair is described as live before deployment receipts.
