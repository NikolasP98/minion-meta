---
id: 2026-10-18-assistant-capability-failure-recovery-spec
title: Assigned assistant capability discovery and bounded output recovery
stage: spec
pass: 1
status: implementing
verdict: approved
created: 2026-10-18
updated: 2026-10-21
repos: [minion, minion_hub]
proposal: 2026-10-18-assistant-capability-failure-recovery
---

# Assigned assistant capability discovery and bounded output recovery

## 0. Product

Answer catalog questions with current authorized prices and source links. When identity or a tool is unavailable, explain the limitation without page navigation, repeated capability hunting or raw tool syntax.

## AS-IS

Gateway hub-query-tools.ts converts a structured403 into[]; search/load results cannot distinguish missing remote inventory from a complete index. ToolProgressState requests answer-only recovery after six discovery calls, but recovery issuance is attempt-local and returned text is not validated. Raw DSML reaches partial, block and final extraction paths. Hosted ensureActivePersonalAgent writes an empty serverId, returns early for active rows, and calls an unscoped gateway connection. The principal correctly requires an active persisted agent/gateway/org assignment. Production has a NULL assignment and a runtime callback hint for a different org; this evidence is a configuration/provisioning defect, not grounds to weaken authorization.

## TO-BE and invariants

### A. Truthful run-scoped discovery

- A per-build result distinguishes ready (including an authorized empty catalog) from unavailable (disconnected, HTTP denial/failure, invalid schema). Carry only sanitized source/status/code/retryability into that run's discovery context; no credentials, raw response bodies or principal identifiers.
- search_tools/load_tools expose incomplete inventory and actionable permanent failure rather than recommending repeated searches. Keep authorized local tools usable; never fabricate or activate remote schemas on failure. A later successful build clears the failure; concurrent agents cannot inherit another run's status.
- Preserve all existing Hub RBAC, assignment, module/scope and agent/profile deny gates. Discovery status itself grants no authority. Search and SDK inspection metadata alone do not disable usable local tools. If load requests an unavailable remote capability (including an empty remote group), return native isError with TOOL_CATALOG_UNAVAILABLE and retryable:false; the existing guard requests answer-only recovery immediately. Repeated searches remain bounded by the existing discovery-call ceiling. Never auto-navigate or invoke unrelated write/browser tools.

### B. Bounded output recovery

- Recognize exact model DSML control syntax outside fenced code, inline code and Markdown blockquoted examples. Never interpret textual markup as executable tool calls. Preserve native typed tool calls.
- A shared boundary removes malformed control material before every partial, block and final user-visible sink, including fallback extraction. Handle arbitrary stream chunk boundaries and incomplete opening/control blocks without transient leakage. Keep safe ordinary prose and legitimate quoted documentation.
- If a later attempt tries to issue recovery again, fail through existing non-retryable runner error handling before a provider request; do not change abort/provider-error semantics. A malformed final response can request the existing answer-only recovery once; recovery issuance is part of shared run state across attempts. Six-call discovery guard and40-call hard ceiling remain enforced.
- If that recovery is malformed or empty, deliver exactly one deterministic honest inability response. Do not claim data absence, successful tool execution, successful writes, or a completed answer without evidence. Abort/error delivery semantics remain intact.

### C. Persisted hosted assignment

- Resolve the authenticated CoreCtx tenant's configured gateway/channel using existing canonical gateway selection. Pin agents.create/verification to that exact gateway, preserving the existing personal-agent id.
- For an already-active NULL row, verify exactly one exact persisted agentId using agents.list on the selected target; do not create a new agent or treat an arbitrary already-exists exception as proof. For new/pending rows, create and then verify that exact roster. Only persist a NULL binding and mark active together after the matching runtime agent is established on the selected gateway and ownership/membership/current gateway org are verified. A conditional database transaction must recheck profile/agent/status, actual membership and selected gateway org/channel/URL/credential identity before committing; reject concurrent target changes or revocation. Re-read and fence against concurrent assignment changes. An existing different non-NULL binding must fail closed with a clear conflict; org switches do not silently rebind.
- Hosted creation, retry, explicit create and automatic ensure paths share the same binding contract. Do not accept a model-selected gateway or arbitrary URL as authority. Maintain permission and profile uniqueness constraints.
- The runtime's own callback server hint must identify its canonical gateway row. Prepare exact FACES config/NULL-pointer repair separately with preconditions and rollback; no production mutation until owner approval. Do not implement a broad token fallback, wildcard assignment or URL-based permission grant.
- If source investigation shows a wider assignment model is needed, stop that slice for a concrete design correction while completing independent A/B work. Keep unresolved provisioning sites linked to the proposal.

## DELTA and verification

| Boundary | Required proof |
| --- | --- |
| Manifest errors to discovery | Actual403-shaped loader result through factory/policy/search/load; empty-success differs; later success recovers; two concurrent principals isolated |
| Output egress | DSML opening/closing split at every boundary; partial/block/final no leakage; quoted examples intact; native calls untouched |
| Runtime recovery | Actual SDK six-discovery failure and malformed-output fixtures; at most one recovery across attempts; fallback exactly once; abort/error paths |
| Provisioning | NULL active row repair, correct canonical org gateway, explicit create/retry, conflict/concurrency rejection, failed create leaves no active assignment |
| Integration | Loopback real auth/database, real manifest/principal and ordinary unrestricted policy; service fixtures ranked by sale price with source and ties; unauthorized org denied |

No test may fill in the missing assignment directly to claim hosted provisioning passed. A paid model test, if used, is bounded and separate from deterministic identity/tool proof. Independent behavior and authority spec reviews precede implementation; focused tests, repository gates and review precede new release approval. Source, local acceptance and production adoption are reported separately.

## Out of scope

No general multi-organization delegation, model replacement, brain-authority restoration, arbitrary SQL, tool-text execution, permission widening or automatic production assignment repair. Existing full Windows qualification debt is tracked separately.

## Implementation review corrections

Independent implementation review identified these necessary corrections within
the repair boundaries:

- Apply the same control-text boundary to visible reasoning and displayed
  provider errors, while leaving raw error classification intact. An escaped,
  unmatched or paragraph-spanning backtick pair is not a valid inline-code
  exemption. Preserve complete Markdown examples and native tool calls.
- Bind-only retries of an active NULL-assigned agent must preserve its runtime
  personality. A late client failure callback must not demote a verified active
  assignment. Verify current organization authority before accepting an existing
  active binding.
- Gateway lease reads must use the actual postgres-js result-array contract.
  Prove a current lease wins over an older candidate using real SQL and verify
  the other runtime receives no provisioning RPC.
- Existing subscriber qualification exposed two missing browser/canvas action
  descriptions and a stale same-action retry fixture. Preserve the declared
  action verb in inferred tool summaries. Keep mutation fingerprint matching
  strict; make the same-action fixture repeat identical arguments rather than
  weakening production write-outcome checks.

The release procedure is tracked at
`audits/2026-10-18-assistant-capability-repair/release-procedure.md`. These
corrections do not authorize a production merge, configuration change or
assignment mutation.


## Production checkpoint, 2026-10-21

The owner-selected credit-efficient release is deployed: Gateway source `97ccd699eac4dcc75194714d2a9c8a92053e535a`, successful exact DEV qualification, immutable Docker receipt and successful production controller convergence. Both canonical services are healthy. The approved FACES callback correction is applied with exactly one persistent field changed; assignment was already canonical and was not rewritten. Configured catalog/permission authority and bounded typed service reads now pass. No model turn was used for operator verification. Authenticated Hub chat acceptance remains pending, so this artifact is not marked complete. See [production adoption receipt](../audits/2026-10-18-assistant-capability-repair/credit-efficient-production-adoption.json) for exact source/run/operation evidence and retained limits.
