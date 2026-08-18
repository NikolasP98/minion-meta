---
spec: 2026-08-18-factory-orchestration-round7-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

## Changes made

- Set `status: approved`, `pass: 2`, and `verdict: approved` because every correctness defect was mechanically resolvable without a product-policy decision.
- Added the M1 repository-policy, M4 capability/containment, and browser-verification relationships because the implementation consumes those contracts and the roadmap orders them before or conditionally within M5.
- Split prerequisite gates by consuming slice and made `changes_requested` explicitly unsatisfied so work cannot start against unresolved or partial contracts.
- Reconciled graph authoring with mounted repositories by limiting minion-meta to repo/profile syntax validation and making the effective factory registry/profile table authoritative; this follows `/memory/MINION/factory/2026-08-18-ac227e10.md`.
- Made node `profile` an optional stricter override rather than a required resolved value because the manifest—not the author—must select the effective profile.
- Bound each graph node to exactly one prose slice and its validated topic annotation so profile selection has a deterministic per-slice input.
- Replaced mixed acceptance strings with ordered discriminated command/evidence objects and repository-relative `cwd` validation so acceptance is machine-interpretable and path-safe.
- Defined canonicalization boundaries so object/node/set ordering is hash-insensitive while acceptance command ordering remains semantically significant.
- Strengthened the multi-repo join invariant from “roots span repos” to every multi-repo graph having an integration node whose transitive closure covers work from every participating repo.
- Split completion by node kind: work nodes require merged-attested PR proof, while integration nodes run controller-owned command-only verification and never manufacture a no-op implementation PR.
- Added explicit node states and guarded retry/completion transitions so failed or canceled attempts cannot ambiguously unlock dependents.
- Added graph, manifest, topic-policy, repository-policy, and profile-policy bindings to executions/runs/retries so mutable policy cannot reinterpret active work.
- Expanded execution idempotency from `(spec_sha, graph_hash)` to include every policy hash because the same spec under changed policy is not the same execution.
- Moved profile definition/selection ahead of durable graph persistence and dispatch because the original S2/S3 ordering required profiles that were not implemented until S5.
- Defined deterministic profile precedence, ambiguity handling, explicit compatible overrides, immutable table hashing, and budget/gate property tests so profile selection is verifiable.
- Preserved manifest-derived `data` human gates and made unavailable `ui-flow` browser evidence block dispatch as well as merge, preventing unusable runs.
- Added a validated integration run kind plus a contained command-only entrypoint, image impact, credential constraints, and tests because the prior “same dispatcher” language omitted the executor needed for joins.
- Added a stale/removed graph-hash guard to `completed_slices` projection so an old execution cannot write node ids into a materially revised spec.
- Defined versioned acceptance-criterion extraction as a multiset and a generate-then-validate flow because the original resolver tried to prove preservation before a candidate existed.
- Added final source-revision/run/PR rechecks and race tests before candidate publication so a concurrently activated source fails closed.
- Removed the contradiction that allowed a later resolver action to retire sources; only a later human lifecycle decision may do so.
- Split graph shadow from dispatch and relationship shadow from consolidation with four exact-opt-in flags because the original two booleans could not express the specified shadow rollout.
- Defined disable semantics to stop new admission while draining already-committed outbox work so rollback does not strand active executions.
- Expanded D1–D8, slice DoDs, impact zones, and the E2E/operator sequence to prove policy-hash changes, mounted repos, integration head binding, stale projection refusal, resolver races, and all flag combinations.
- Corrected the overlapping-file rule and landing order so listed sequential edits to `queue.ts`, `db.ts`, and manifest code no longer contradict the claim that slices cannot share files.
- Cited `/memory/MINION/factory/2026-08-18-60a08042.md` and `/memory/MINION/factory/2026-08-18-39c3a54c.md` for first-attempt repo guards, `/memory/MINION/sdlc-board-triage-and-phase-gates.md` for controller-owned slice completion, and `/memory/MINION/minion-factory-agent-pipeline.md` for deploy-env preservation.

## Flagged for the human/operator

- No unresolved design choice requires human adjudication; verdict is approved.
- Implementation remains blocked until the §2 M1–M4 prerequisites are implemented and tested; the durable-state spec currently has `verdict: changes_requested` and therefore does not satisfy the gate.
- `ui-flow@1` nodes remain non-dispatchable until browser verification is implemented; containment alone is insufficient.
- Live Docker/image/deployment evidence remains an operator step because factory dev containers lack Docker and SSH, as recorded in `/memory/MINION/factory/2026-08-17-c5f12e0e.md`.
- No relevant semantic-memory MCP was available; the required read-only SQLite FTS query returned no factory-specific observation that superseded the cited file-backed constraints.
