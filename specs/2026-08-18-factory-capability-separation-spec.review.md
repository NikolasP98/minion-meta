---
spec: 2026-08-18-factory-capability-separation-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 review

## Changes made

- Updated the title from “per-run GitHub App identities” to purpose-separated Apps and run-bound grants because App identities are long-lived while their installation tokens/grants are short-lived.
- Set `pass: 2`, `updated: 2026-08-18`, and `verdict: approved` as required by the completed correctness review.
- Added `minion-base` to `repos` because its current server directly writes proposal/spec lifecycle state in minion-meta and must change for the claimed exclusive meta publisher boundary to be true.
- Added `[security, infra]` tags so the spec retains the source proposal's high-stakes classification and human merge gate.
- Added durable-state/outbox and possibly-shipped specs to `related` because the former is a prerequisite authority/evidence spine and the latter overlaps the lifecycle body/actor contract.
- Clarified that server-derived attribution proves an authenticated principal, not an unverified human identity behind a service.
- Added the verified minion-base direct-write/read-token AS-IS path at commit `ccc5db78cd7f07ee832ab5cfe04c3b78ad01c4e9`, closing a missing cross-repo impact zone.
- Added the verified `train.sh`, `self-update.sh`, and monitor-intake PAT consumers because revoking the PAT without replacing them would break production behavior or leave a hidden fallback.
- Replaced the ambiguous single `principal` run grant with one canonical envelope containing distinct purpose bindings, so target/meta/memory authority can coexist without conflation.
- Added trusted system-operation envelopes for the promotion train because that PAT consumer is not a dev/spec run but still needs bounded, auditable authority.
- Made the capability resolver a closed controller/repo policy and stated that topics, paths, request bodies, and model output may only narrow or deny authority, preserving the controller-owned-truth rule in `/memory/MINION/sdlc-board-triage-and-phase-gates.md`.
- Enumerated exact maximum GitHub App permission maps and the conditional Workflows permission because “minimum permissions” was otherwise unverifiable and workflow-file pushes need a distinct GitHub permission.
- Added fixed-ref promotion-train behavior and adversarial tests so the target App cannot turn the train into arbitrary repo/ref/merge authority.
- Expanded typed meta operations to cover transition, spec pass, reconciliation, chat proposal commits, and monitor issues because all currently share the PAT.
- Required the landed M2 outbox/evidence spine instead of the prior optional “if landed” wording, matching the roadmap's M2→M4 ordering and preventing parallel authority tables.
- Added a minion-base slice that routes mutations through a lifecycle-only service principal, preserves revision CAS/canonical responses, and leaves only mechanically read-only GitHub access.
- Reconciled memory publishing with `2026-08-18-factory-memory-governance-spec`: separate private quarantine repo, `<run-id>/<candidate-id>.json`, no canonical-memory access, and no production caller before M8 validation.
- Removed the pass-1 `MEMORY_NOTE.md` mini-governance design because it contradicted the approved M8 structured candidate/scanner contract.
- Added self-update's read-only GitHub/monitor replacement and scoped service bearers to deployment cutover so the old PAT can actually be revoked.
- Narrowed the legacy-token source scan to production injection forms and excluded tests, avoiding an impossible DoD where security tests mentioning forbidden variable names would fail the grep.
- Required the full test suite in addition to focused patterns and explicit execution evidence for every named `T-*` control, preventing a zero-match pattern from being accepted as proof.
- Expanded cross-repo impact rows for target rulesets, train, minion-meta, quarantine, canonical memory, minion-base, other lifecycle callers, self-update, and monitor intake.
- Clarified that product-release canary policy is out of scope while the credential cutover's own fail-closed canary/rollback remains in scope, removing a pass-1 contradiction.
- Expanded end-to-end verification to cover minion-base CAS/actor derivation, dormant quarantine publishing, fixed train refs, self-update read-only behavior, and host-script secret scans.
- Updated rollout numbering and prerequisites for six slices and prohibited rollback to broad worker/host credentials or direct minion-base meta writes.
- Preserved concurrent meta-writer revalidation/retry because `/memory/MINION/minion-factory-agent-pipeline.md` records both wholesale `.env` rewrites and push/rebase/retry as load-bearing constraints.
- Preserved native GitHub commit/blob CAS and canonical committed responses because `/memory/MINION/projects-github-repo-link-and-factory-gates.md` requires decisions to live first in native GitHub state and foreign handles to receive their own ownership proof.
- Recorded that the required read-only FTS query produced no stronger factory-specific observation and that no semantic memory-search MCP was available, so no unsupported memory claim shaped the design.

## Human flags

None. The durable-state prerequisite still has `changes_requested`, but this spec now explicitly blocks M4 implementation until that spec or an approved equivalent lands; no capability-separation decision depends on guessing its unresolved design.
