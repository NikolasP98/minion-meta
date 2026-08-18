---
spec: 2026-08-18-factory-memory-governance-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

- Set `status: approved`, `pass: 2`, `updated: 2026-08-18`, and `verdict: approved` because every correctness defect was mechanically resolvable without a product decision.
- Added `type: infra` and security/infra/data/logic/test tags so the spec remains human-gated and is classifiable by the factory topic policy.
- Added the roadmap, capability-separation proposal, containment spec, and durable-state/outbox spec to `related` because the design explicitly consumes their authority, identity, isolation, and restart-safety contracts.
- Corrected the cloud-memory relationship to say this spec replaces only that spec's factory no-write statement, because introducing candidate write-back contradicted the claim that the earlier artifact was untouched.
- Made M0–M7 controls, capability separation, containment, durable evidence/HITL, and release/rollback activation prerequisites, matching the normative M8 ordering in `2026-08-18-sdlc-transformation-roadmap`.
- Added bulk SQLite and semantic-index identity to AS-IS because the original provenance gap described only the Git snapshot despite all three retrieval tiers influencing a run.
- Replaced worker-mounted snapshots with controller-private storage plus a runner-owned adapter because direct `cat`/SQLite access would bypass the claimed controller-observed retrieval ledger.
- Defined one canonical versioned manifest and overall SHA-256 over Git entries, SQLite identity, and semantic availability/identity so `memory_snapshot_hash` binds every retrievable component.
- Required exact retained bulk artifacts for requeues and fail-closed expiry because a Git commit alone cannot rematerialize the historical SQLite snapshot.
- Defined `memory_mode=none` to disable both retrieval and candidate submission so an unproven evidence reference cannot enter quarantine.
- Restricted semantic search to an immutable manifest-bound index and marked a mutable external MCP unavailable, removing the contradiction between pinned snapshots and live semantic results.
- Added a short-lived run/stage-bound adapter capability and event-before-return ordering so retrieval events are authenticated, idempotent, and controller observed.
- Removed agent-authored `memoryConsulted` as controller evidence and reserved the API terms `retrieved` for adapter facts and `cited` for validated agent declarations, avoiding an unverifiable comprehension claim.
- Limited candidate submission to successful dev runs with a runner-owned reviewed SHA because failed, unreviewed, and spec-stage outputs cannot supply the claimed reviewed source provenance.
- Replaced ambiguous `source/reviewed SHA` wording with separate fields that must equal the runner-recorded reviewed PR head, making run binding testable.
- Defined evidence references as a closed union of pinned-memory and reviewed-repository references and rejected arbitrary URLs/free text so evidence validation has a finite contract.
- Clarified title units, lesson byte/line units, no-follow regular-file ingestion, serialized-size limits, and a unique one-candidate-per-run DB constraint so boundary tests are deterministic.
- Required runner-owned envelope fields and an idempotency key to make candidate retries return the existing object rather than overwrite or create another candidate.
- Defined a versioned scanner profile containing normalization, decoding, entropy, pattern, link, and bound rules plus golden fixtures so “deterministic scanning” is verifiable across releases.
- Defined shadow validation as event-only and non-reserving so a shadow result cannot consume the run's single production candidate slot.
- Added a deterministic canonical Markdown renderer and content hash so promotion scans the actual bytes written and duplicate-content rejection has a stable identity.
- Replaced the incomplete candidate state machine with explicit `received`, `validation_rejected`, review, promotion, success, and failure states, including bounded retry behavior and terminal validation/blob/profile failures.
- Required revision-bound approval through the landed durable HITL interface with a server-derived human actor distinct from App/worker principals, because generic authentication does not prove human review.
- Required promotion to fetch the approved Git blob object by SHA rather than mutable branch/path HEAD, eliminating the quarantine mutation race in the original verification procedure.
- Bound approval to a scanner-profile version, required that profile to remain current, and required revalidation under the approved profile so scanner upgrades invalidate stale approvals fail-closed.
- Routed promotion through the landed transactional outbox and added deterministic receipt reconciliation so a crash after GitHub creation cannot duplicate a canonical note or lose provenance.
- Split the rollout into exact opt-ins for governance/read-shadow, candidate writes, and promotion because disabling the original single V2 flag contradicted the requirement to retain pinned reads on rollback.
- Changed credential checks from token-string inequality to pairwise-distinct GitHub App installation/principal identities and repository scopes because different ephemeral strings can represent the same authority.
- Required the direct `MEMORY_NOTE.md` path to be absent before any write flag can enable and added a no-flag-restores-it regression check, preserving the prompts-are-not-security-boundaries rule.
- Added the adapter implementation/API files and DB changes to the affected slice lists so every named control has an implementation owner.
- Expanded D1, D3, D5, D6, and D7 tests for component hashes, direct-read prevention, human identity, immutable-blob fetch, honest terminology, flag dependencies, and principal scopes so their definitions of done are machine-checkable.
- Added missing impact zones for roadmap prerequisites and shared durable state/HITL, and clarified the intentional narrowed change to existing memory sync behavior.
- Reconciled snapshot/quarantine/audit minimum retention with the general retention out-of-scope statement so required requeue and audit evidence cannot be cleaned up prematurely.
- Rewrote the end-to-end race and rollback steps to test immutable blob retrieval, stale scanner approval, unreviewed/failed submissions, idempotent retry, component hashes, and read-preserving mutation shutdown without contradictory restore/reapprove behavior.
- Cited `/memory/MINION/minion-factory-agent-pipeline.md` for reviewer/applier separation and wholesale `.env` rewrites, `/memory/MINION/sdlc-board-triage-and-phase-gates.md` for controller-owned truth/prompts-not-boundaries/read-only review/automerge constraints, and `/memory/MINION/context-bloat-management.md` for rejecting stale instruction-wrapper blocks because those operator-memory constraints shaped the corrections.
- Recorded that the read-only claude-mem FTS query returned no factory-memory quarantine/provenance observation and that no semantic memory-search MCP tool was available, so no unavailable memory result was treated as evidence.

## Human flags

None.
