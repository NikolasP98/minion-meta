---
id: 2026-08-18-factory-memory-governance-spec
title: Factory memory governance — quarantined write-back, provenance, and pinned snapshots
stage: spec
status: approved
pass: 2
created: 2026-08-18
updated: 2026-08-28
proposal: 2026-08-17-factory-memory-governance
verdict: approved
repos: [minion-factory]
tags: [security, infra, data, logic, test]
type: infra
relationship: extends
related: [2026-08-17-cloud-agent-memory-sync-spec, 2026-08-18-sdlc-transformation-roadmap, 2026-08-17-factory-capability-separation, 2026-08-18-factory-worker-containment-spec, 2026-08-18-factory-durable-state-outbox-spec]
possibly_shipped: https://github.com/NikolasP98/minion-factory/pull/32
---

# Govern factory memory as evidence, not instruction

## 0. Product

From approved proposal `2026-08-17-factory-memory-governance`, verbatim:

> Agent MEMORY_NOTE write-backs land in canonical memory unreviewed with the same GitHub credential — an agent
> can poison future agents' context. The sqlite mirror is agent-writable; no retrieval telemetry proves memory
> influenced outcomes; runs carry no memory snapshot version.
>
> **Definition of done:** write-backs go to a quarantined candidate area (separate credential) with schema/size
> validation and secret+injection scanning; promotion to canonical memory requires review; run provenance records a
> memory snapshot hash; operator ★★★ policy and agent observations live in visibly separate trust domains
> (factory/ subdir already separates files — enforce read-side labeling in prompts).

This is M8 memory-governance work. It preserves memory as fallible evidence, never an authority that may expand a
run's capability, scope, risk class, or lifecycle state.

### Relationship recommendation

- `2026-08-17-cloud-agent-memory-sync-spec` — **extends**: the approved spec established the canonical
  `minion-agent-memory` read path and three retrieval tiers; this spec adds quarantine, promotion, pinning,
  trust-label, and evidence controls. It preserves that artifact except for §3's factory-specific statement that
  factory agents have no write-back lane: this spec replaces only that statement with a runner-mediated,
  human-reviewed candidate lane. Interactive-session write behavior is unchanged.
- `2026-08-18-sdlc-transformation-roadmap` — normative ordering: this is M8 and activates only after the M0-M7
  controller, durable evidence/HITL, capability, containment, and release/rollback controls it consumes are landed.
- `2026-08-17-factory-capability-separation` and `2026-08-18-factory-worker-containment-spec` — hard prerequisites:
  the former supplies runner-owned, repository-scoped GitHub principals; the latter keeps runner credentials outside
  workers and registered repo commands. This spec does not reimplement either boundary.
- `2026-08-18-factory-durable-state-outbox-spec` — integration dependency: memory decisions, promotion jobs, and
  append-only events use its landed transaction/idempotency conventions rather than creating a second generic
  lifecycle/outbox mechanism. Memory-specific tables and payload validation remain owned here.

## 1. AS-IS

Verified against `NikolasP98/minion-factory@main` through the GitHub Contents API on 2026-08-18. Re-read HEAD before
implementation; line numbers are anchors, not immutable coordinates.

1. `agent/run.sh:21-29` executes an EXIT trap on success and failure. If a model creates `MEMORY_NOTE.md`, the same
   worker calls `gh api -X PUT` directly against
   `NikolasP98/minion-agent-memory/contents/MINION/factory/<date>-<run>.md`. There is no quarantine, schema,
   duplicate/run binding, size, secret, or prompt-injection validation and no review/promotion state.
2. `agent/run.sh:176-214` labels all three tiers together as “Operator memory,” calls ★★★ items hard constraints,
   and then asks the same untrusted worker to author `MEMORY_NOTE.md`. Canonical operator policy and agent-authored
   observations have different paths but are not visibly different trust domains in the read-side prompt.
3. `runner/src/queue.ts:48-75` passes `GH_TOKEN` and model credentials to every worker, mounts canonical markdown at
   `/memory:ro`, but mounts `/opt/factory/memory-bulk` read-write because WAL readers create siblings. The comment
   calls the SQLite copy disposable, yet no container-level or SQLite-level control prevents a run from altering
   observations seen later by another concurrent or subsequent run.
4. `runner/src/queue.ts:78-153` starts from the current host mirrors and passes no resolved canonical commit, tree
   hash, bulk SQLite hash, semantic-index identity, or trust-domain manifest. A run may therefore read a different
   memory revision from another run or even different revisions across stages.
5. `runner/src/db.ts:28-51,69-91` stores spec/head provenance but no memory snapshot, retrieval count, cited memory,
   candidate id, or promotion id. `runner/src/queue.ts:200-229` accepts the agent-authored result fields and has no
   validated memory evidence artifact.
6. `agent/spec.sh:97-121` supplies the same mounted tiers to both spec passes and correctly requires citations, but
   neither the script nor runner persists which snapshot or entries shaped the plan. Spec stages have no write-back
   path; the direct canonical write is in dev `run.sh`.
7. The repository tree contains no first-party memory-policy module or tests. Existing `runner/src/queue.test.ts`
   does not prove candidate credential separation, snapshot immutability, scanner behavior, trust labeling, or
   promotion gating.

Memory constraints that shape this design:

- `/memory/MINION/minion-factory-agent-pipeline.md` says reviewers propose and an applier re-verifies, and that
  `deploy.sh` rewrites `/opt/factory/.env` wholesale. Therefore the scanner is not allowed to self-approve, promotion
  re-runs validation, and every credential/flag must be emitted by deployment configuration.
- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` makes controller-owned truth, prompts-not-security-boundaries,
  technically read-only reviewers, and `FACTORY_AUTOMERGE=0` through M0-M7 hard constraints. Memory citations are
  evidence, not agent attestation, and memory promotion remains human-gated.
- `/memory/MINION/context-bloat-management.md` records that stale `<claude-mem-context>` blocks can become duplicated
  instructions. The injection scanner therefore rejects instruction-shaped wrapper blocks and canonical reads stay
  revision-pinned rather than trusting a mutable session artifact.
- The required read-only FTS query returned no observation specific to factory memory quarantine/provenance. No
  semantic memory-search tool was available in this session, so no semantic result is used as evidence.

## 2. TO-BE

The runner resolves one immutable canonical memory snapshot before a run starts and prepares a run-private,
controller-only view served through a bounded read adapter. Workers never receive the snapshot directory or bulk
database as a mount. The adapter exposes an explicit trust manifest: operator-curated policy is `operator-policy`,
factory notes are `agent-observation`, and SQLite/semantic results are `untrusted-observation`. Prompts state that only
`operator-policy` entries may contain binding ★★★ constraints; observations may inform investigation but may never
override the approved spec, repository instructions, controller policy, or capability manifest.

A worker can submit at most one structured candidate through a runner-owned ingestion boundary. The worker never
receives a canonical-memory credential. The runner validates and scans the candidate, then writes it with a
candidate-only credential to a separate private quarantine repository. Human review records an immutable decision;
a runner-owned promoter with a different canonical credential re-fetches the exact candidate bytes, re-runs all
checks, and copies an approved candidate into canonical `MINION/factory/`. Rejection and promotion are append-only
audit events. Direct agent writes to canonical memory are impossible by credential and API design, not prompt
instruction.

### Target invariants

1. **Immutable per-run snapshot.** Before any stage starts, the controller resolves the canonical memory commit and
   tree OID, materializes that exact revision into a run-private controller directory, and creates a consistent
   SQLite backup. A versioned canonical manifest contains sorted `(trustDomain, path, gitBlobOid)` markdown entries,
   the SQLite file SHA-256/schema identity, and either an immutable semantic-index identity derived from that SQLite
   snapshot or an explicit unavailable marker. The run's `memory_snapshot_hash` is SHA-256 over the canonical manifest
   bytes; the commit, tree OID, component identities, manifest bytes, and overall hash are stored durably. Every stage
   and requeue derived from that run uses the same adapter-backed snapshot. If the exact bulk artifact is no longer
   retained, requeue refuses rather than substituting current data. Missing, drifting, or unverifiable snapshots fail
   closed; offline/no-memory execution is allowed only by an explicit runner policy recorded as `memory_mode=none`,
   which disables retrieval and candidate submission rather than silently omitting provenance.
2. **Separate trust domains.** `MINION/MEMORY.md` and curated topic files are `operator-policy` except
   `MINION/factory/**`, which is `agent-observation`; SQLite/semantic results are `untrusted-observation`. The
   manifest and prompt render the label beside every returned item. ★★★ is binding only in operator policy. No
   memory content can alter executable commands, repository routing, tags, stage configuration, credentials, or
   lifecycle decisions.
3. **Read-only, observable retrieval.** Only the runner-owned adapter opens the controller-private markdown and
   SQLite snapshot; workers receive a per-run read capability for the closed read/search operations, not filesystem
   paths or database mounts. The adapter allowlists path reads and parameterized FTS/search queries, applies
   row/byte/time limits, labels every returned item, and commits a redacted retrieval event before returning it.
   Direct reads therefore cannot bypass provenance. Semantic search is disabled unless its immutable index identity
   is in the run manifest and it is served read-only by the same boundary; an external mutable MCP result may not be
   presented as part of the pinned snapshot. The adapter may not write embeddings, observations, or settings.
4. **Quarantine-only submission.** `MEMORY_NOTE.md` direct upload is removed. Only a terminal successful dev run with
   a runner-owned reviewed SHA may submit. A versioned `memory-candidate.json` contains separate `runId`, `sourceRepo`,
   `sourceSha`, `reviewedSha`, `title`, `lesson`, and `evidence` fields and no controller-owned fields; the runner
   requires `sourceSha` and `reviewedSha` to equal the runner-recorded reviewed PR head for that successful run and
   rejects values that differ from its run/evidence records. Evidence is a closed union of pinned-memory references
   `(path, blobOid)` and reviewed-repository references `(path, reviewedSha, optional line span)`; arbitrary URLs and
   free-form evidence strings are invalid. Bounds are one candidate/run enforced by a unique DB constraint, title
   ≤120 Unicode scalar values, lesson ≤2,000 UTF-8 bytes and 15 logical lines, at most five evidence references,
   no symlinks/binary/invalid UTF-8, and 8 KiB maximum serialized size. The runner stamps candidate id, snapshot hash,
   submitter principal, timestamps, and scanner versions.
5. **Fail-closed scanners.** A versioned deterministic scanner profile (normalization, decoding passes, entropy
   algorithm/thresholds, pattern set, link policy, and size limits) rejects known secret/key/token/private-key and high-entropy credential
   patterns; instruction-shaped content (role/system/developer overrides, “ignore previous,” tool/credential/action
   requests, XML memory-context wrappers, encoded payloads, and attempts to declare ★★★ policy); unsupported links;
   and evidence paths absent from the run snapshot/diff. Scanner findings are structured, bounded, redacted, and
   versioned. Normalized and encoded variants are covered by golden positive/negative fixtures. A scanner error or
   unknown scanner profile creates no quarantine write and cannot be overridden by the worker.
6. **Human-reviewed promotion.** Accepted candidates are committed once to a separate private quarantine repository
   using a candidate-only GitHub App installation token. Reviewers receive no write token and record approve/reject
   against candidate blob SHA and scanner-profile version through the landed durable HITL endpoint, whose server-side
   actor is a human principal distinct from every GitHub App/worker principal. Only that revision-bound human approval
   can enqueue promotion. The promoter uses a separate runner-only canonical-memory token, fetches the Git blob by
   the approved blob SHA rather than mutable branch/path HEAD, revalidates exact bytes under the same approved scanner
   profile, and confirms that profile is still current before writing,
   writes a collision-safe canonical filename, and records canonical commit/blob SHA. SHA mismatch, stale scanner,
   rejection, duplicate content, or GitHub race fails closed and preserves an auditable state.
7. **Honest retrieval evidence.** A runner-owned `memory_events` ledger records snapshot prepared, query/read result
   metadata, agent-declared citation, candidate validation, review, and promotion. “Retrieved” means the adapter
   successfully returned an item; “cited” means a validated agent-declared reference in the structured stage result.
   The UI/API must never claim memory caused an outcome—causality is not machine-provable. Raw query text, memory
   bodies, secrets, and credentials are not logged. Event insertion is idempotent and survives restart.
8. **Safe rollout.** `FACTORY_MEMORY_GOVERNANCE_V2=1` is the exact opt-in for pinned reads, the adapter, audit, and
   shadow candidate validation. `FACTORY_MEMORY_CANDIDATE_WRITES=1` and `FACTORY_MEMORY_PROMOTION=1` are independent
   exact opt-ins; promotion additionally requires candidate writes. The canonical-read, quarantine-write, and
   canonical-promotion GitHub App installation/principal identities are pairwise distinct, repository-scoped, and
   startup refuses missing/equal identities or permissions inconsistent with the configured slug. Token-string
   inequality alone is not accepted as proof of principal separation. The old direct write path is removed and
   regression-tested before candidate writes can be enabled. Rollback leaves governance V2 on while setting both
   write flags to `0`, preserving pinned reads and the audit ledger; it never restores direct canonical writes.

## 3. DELTA

| Delta | Transition | Slice | Proving test/evidence |
|---|---|---|---|
| D1 | Mutable shared memory mounts become a runner-resolved, immutable, controller-private snapshot with durable identities for markdown, SQLite, and semantic availability. | S1 | Snapshot unit/integration tests prove deterministic hashes, component binding, same revision across stages/requeue, isolation between concurrent runs, and fail-closed missing/drifted/expired materialization. |
| D2 | Unlabeled mixed-trust prompt content becomes path-derived trust labels with binding authority restricted to operator policy. | S2 | Prompt/manifest fixtures classify root topic, `factory/`, SQLite, and semantic results; adversarial ★★★ observation remains visibly non-binding. |
| D3 | Direct markdown and writable shared SQLite/MCP access become a bounded runner-owned adapter with retrieval events. | S2 | Direct-path/mutation/WAL attempts fail; FTS timeout/row/byte limits, semantic-unavailable behavior, and redacted idempotent query/read events pass. |
| D4 | Direct canonical `MEMORY_NOTE.md` PUT becomes schema-bound runner ingestion into a credential-isolated quarantine. | S3 | Adversarial fixtures cover schema/bounds, symlink/binary/UTF-8, secret/high-entropy/injection/encoded payloads, evidence mismatch, credential target, duplicate, and GitHub failure. |
| D5 | Unreviewed canonical write becomes blob/SHA-bound durable human decision plus revalidated, idempotent promotion by a separate principal. | S4 | State-machine/API tests prove human-principal auth, approve/reject races, stale blob/scanner, immutable-blob fetch, revalidation, conditional GitHub writes, duplicate promotion, and no agent/reviewer canonical credential. |
| D6 | No run memory provenance becomes durable snapshot, retrieval, citation, candidate, decision, and promotion evidence exposed honestly by the API. | S5 | Migration/restart/API tests reconstruct the full lineage, distinguish controller-observed retrieval from agent-declared citation and causal claims, redact payloads, and preserve existing run responses. |
| D7 | Uncontrolled activation becomes staged exact-opt-in deployment with pairwise-distinct principals, audit-only shadow validation, and a no-direct-write rollback. | S6 | Startup/config tests plus operator E2E prove fail-closed flag dependencies/principal scopes, shadow rejection metrics, enabled promotion, and read-preserving rollback behavior. |

Every implementation change must trace to one row above. Work without a DELTA row requires a new or revised spec.

## 4. Vertical slices

Each slice is one focused 4–8 hour factory PR. S1–S5 modify only `minion-factory`; creation of the private quarantine
repository and its GitHub App installation is an operator provisioning step in S6, not a source repository. Slices
may be planned early, but activation follows the roadmap: the named M0–M7 prerequisites must be landed before S6.

### Slice 1 — Snapshot resolver and run binding (6–8h)

**Files to touch:** `runner/src/db.ts`; `runner/src/queue.ts`; `runner/src/github.ts`; new
`runner/src/memory/snapshot.ts`; new `runner/src/memory/snapshot.test.ts`; focused `runner/src/queue.test.ts` cases.

- Add additive and fresh-schema columns: `memory_mode`, `memory_commit_sha`, `memory_tree_oid`,
  `memory_sqlite_sha256`, `memory_semantic_identity`, `memory_snapshot_hash`, and `memory_manifest_json`, all nullable
  for historical rows but required as applicable by the V2 spawn guard for new runs.
- Resolve the configured canonical ref once, fetch/materialize by commit without hooks, submodules, filters, or
  repository code execution, derive trust-domain entries, and atomically publish a run-private snapshot.
- Replace host-shared markdown/bulk mounts with controller-private snapshot storage and expose no snapshot path to a
  worker. Copy SQLite with its backup API or a verified immutable snapshot procedure; never copy a live DB file alone.
- Requeues inherit the original snapshot identity and rematerialize exact content, not current HEAD. Retain component
  artifacts for at least the configured requeue window; after expiry, fail the requeue with a durable reason.

**Machine-checkable DoD:** focused tests and TypeScript pass; two concurrent fixture runs cannot observe each
other's files; stage/requeue manifests are byte-identical; SQLite/semantic identity changes alter the overall hash;
missing commit/blob/bulk artifact, copy inconsistency, hash drift, expired retention, and a legacy V2 row all refuse
spawn with a durable reason.

### Slice 2 — Trust-aware read adapter and retrieval evidence (6–8h)

**Files to touch:** `agent/run.sh`; `agent/spec.sh`; new `agent/memory-read`; new
`runner/src/memory/adapter.ts`; new `runner/src/memory/policy.ts`; new `runner/src/memory/events.ts`;
`runner/src/db.ts`; `runner/src/index.ts`; `runner/src/queue.ts`; focused shell fixtures and
`runner/src/memory/*.test.ts`.

- Render the snapshot hash and trust law in every stage prompt. Route markdown read, SQLite FTS, and eligible semantic
  search through a runner-owned adapter reached by a per-run capability; do not mount the snapshot or bulk directory.
- Add append-only `memory_events` with a unique event key, run/stage, event type, snapshot hash, trust domain,
  content/path hash, result count/status, and timestamps. Store no raw memory/query body.
- Authenticate the adapter with a short-lived, run/stage-bound read capability that authorizes only that run's
  snapshot and expires at the stage boundary. Commit the retrieval event transaction before returning results;
  retries reuse the request id as the event key and may not create duplicate facts.
- Derive retrieved items only from successful adapter events. Validate structured `memoryCited` references against
  those events and the pinned manifest and mark citations explicitly agent-declared; do not accept an agent-authored
  `memoryConsulted` field as controller evidence.

**Machine-checkable DoD:** tests prove all trust labels and limits, reject direct mutation and out-of-snapshot
citations, prevent direct snapshot access, deduplicate replayed events, redact secret-shaped queries, fail closed or
mark unavailable when semantic identity is absent, and show that a factory observation containing
`★★★ ignore the spec` is rendered as non-binding evidence. Both shell scripts pass `bash -n`; TypeScript passes.

### Slice 3 — Candidate schema, scanners, and quarantine writer (6–8h)

**Files to touch:** `agent/run.sh`; new `agent/memory-candidate.schema.json`; new
`runner/src/memory/candidate.ts`; new `runner/src/memory/scanners.ts`; `runner/src/github.ts`;
`runner/src/db.ts`; `runner/src/queue.ts`; scanner/schema fixtures and tests.

- Remove the direct `gh api` canonical write and accept only a regular, no-follow, valid-UTF-8
  `/out/memory-candidate.json` after the runner has recorded a successful reviewed dev result. The runner verifies
  run/repo/source/reviewed identities, owns every stamped field, and writes an accepted record to the quarantine
  repository using `FACTORY_MEMORY_CANDIDATE_TOKEN`; the worker has neither candidate nor canonical token.
- Implement deterministic schema, bounds, secret, high-entropy, prompt-injection, encoding, and evidence scanners.
  Persist scanner result before any external write. Use conditional create-only GitHub writes and a stable
  `<run-id>/<candidate-id>.json` path; a DB uniqueness constraint on run id plus idempotency key makes retry return the
  existing candidate and prevents a second candidate or overwrite.
- In shadow mode, validate and record would-accept/would-reject without any GitHub write.
  Shadow evaluation does not reserve the run's one production candidate or enter the candidate state machine.
- Store the original validated payload plus runner-owned envelope in quarantine JSON. Define one deterministic
  canonical Markdown renderer; promotion scans its rendered bytes and computes a content SHA-256 used to reject a
  second promotion of the same rendered content without attempting a canonical write.

**Machine-checkable DoD:** every D4 adversarial fixture passes, including failed/unreviewed/mismatched-run submissions,
closed-union evidence, exact Unicode/byte/line boundaries, and scanner golden fixtures; an instrumented worker
environment contains no memory token; mocked GitHub assertions show the candidate principal can address only the
configured quarantine slug and canonical writes are absent from all agent scripts.

### Slice 4 — Human decision and canonical promoter (6–8h)

**Files to touch:** `runner/src/db.ts`; `runner/src/index.ts`; `runner/src/github.ts`; new
`runner/src/memory/promotion.ts`; new `runner/src/memory/promotion.test.ts`; API tests.

- Add a closed candidate state machine:
  `received -> validation_rejected|awaiting_review -> approved|rejected -> promoting -> promoted|promotion_failed`.
  Transitions use compare-and-swap and append events. `validation_rejected`, `rejected`, `promoted`, and
  `promotion_failed` are terminal; a retryable external failure returns `promoting -> approved` with a bounded
  attempt event, while any blob/profile/revalidation mismatch ends at `promotion_failed` and requires a new candidate
  and approval. Scanner rejection is never reviewable into approval.
- Add durable-HITL list/detail/approve/reject endpoints. Derive reviewer identity from the authenticated principal,
  require candidate blob SHA and scanner version, and forbid the candidate/canonical principals from acting as the
  human reviewer.
- Promotion fetches the approved Git blob object by SHA, verifies its bytes and approved scanner-profile version,
  re-runs validation, then conditionally creates a
  canonical `MINION/factory/<date>-<run>-<candidate>.md` using `FACTORY_MEMORY_PROMOTION_TOKEN`. Record canonical
  commit/blob SHA before reporting success. Enqueue/claim promotion through the landed transactional outbox;
  reconcile a crash after the GitHub create by the deterministic path/content hash before recording the receipt.

**Machine-checkable DoD:** D5 state/API/race tests pass; non-human/App/worker principals cannot approve and a reviewer
cannot directly promote; one approval produces at most one canonical blob across crash/retry; branch-path mutation
cannot change the approved blob; rejected, blob-mismatched, stale-scanner, and duplicate-content candidates never
write canonical memory.

### Slice 5 — Provenance API and audit reconstruction (4–6h)

**Files to touch:** `runner/src/index.ts`; `runner/src/db.ts`; new `runner/src/memory/provenance.ts`; API/DB tests;
`README.md` for the operator-visible semantics.

- Extend run detail with backward-compatible `memory` provenance: mode/snapshot, counts by trust domain, validated
  retrieved/cited references, candidate/scanner state, human decision receipt, and canonical promotion receipt.
- Make absent historical provenance explicit as `availability: unavailable`, never a fabricated empty/green value.
- Document the difference between available, retrieved, cited, and promoted; never expose memory bodies or raw
  query text through the general run API.

**Machine-checkable DoD:** a fresh DB and additive-upgrade DB pass; restart between every candidate transition still
reconstructs one ordered lineage; JSON fixtures preserve old run fields and redact bodies/queries/token-shaped data.

### Slice 6 — Provision, shadow, enable, and rollback (4–6h)

**Files to touch:** `deploy.sh`; `.env.example`; `docker-compose.yml`; `deploy/stack.yml`; `deploy/k8s.yml`;
`README.md`; startup/config tests and deployment smoke script.

- Provision a private quarantine repository and three least-privilege GitHub App installation principals:
  canonical read, quarantine candidate write, and canonical promotion write. Installation tokens are minted by the
  runner and are not static identity proof. This is a human/operator action; never
  place token values in source, logs, memory, or the run API.
- Emit all variables through `deploy.sh` because it replaces the host `.env`. Validate exact opt-ins and their
  dependency order, allowlisted repository slugs, pairwise-distinct installation/principal ids and repository scopes,
  and filesystem ownership at startup.
- First deploy with all flags off and the direct write path absent. Then set governance V2 to `1` with both write
  flags `0` and run shadow validation over adversarial/safe fixtures. Enable candidate writes next; enable promotion
  only after a reviewed canary. Rollback keeps governance V2 at `1`, sets candidate/promotion writes to `0`, disables
  their mutation endpoints, and retains audit/snapshot data; direct canonical worker writes remain deleted.

**Machine-checkable DoD:** config tests reject unset/default/equal principal identities, invalid flag dependencies,
overbroad/wrong-repo App installations, and non-allowlisted slugs; rendered
Compose/Swarm/Kubernetes configs contain secret references but no values; the end-to-end procedure below passes and
rollback leaves the canary provenance queryable.

## 5. Cross-repo impact assessment

| Impact zone | Assessment | Mitigation / alert |
|---|---|---|
| `minion-agent-memory` canonical store | **Direct unavoidable external-repo impact.** Promotion adds reviewed files under existing `MINION/factory/`; readers consume a pinned commit. | Separate read/promote principals, conditional writes, collision-safe paths, immutable receipts, no schema change to operator topics. Alert and stop on SHA races. |
| New quarantine repository | **Direct provisioning impact.** It is deliberately outside canonical memory so a candidate credential cannot poison reads. | Private repo, GitHub App scoped only to it, no worker read path, retention policy documented; repo creation remains human/operator-gated. |
| Roadmap M0–M7 controls | **Normative activation prerequisite.** Memory governance is M8 and consumes controller-owned evidence, durable HITL, containment, and rollback. | S6 refuses activation until the deployed control/version manifest records the required predecessors; `FACTORY_AUTOMERGE` remains `0` for the canary. |
| Capability separation | **Hard prerequisite.** Current shared `FACTORY_GH_TOKEN` cannot satisfy credential isolation. | Do not enable S3/S4 writes until `2026-08-17-factory-capability-separation` supplies distinct runner-owned, repo-scoped principals. Startup fails closed. |
| Worker containment | **Hard prerequisite at rollout.** A broad worker that can inspect runner credentials defeats separation. | Candidate/promotion tokens never enter worker args, env, mounts, logs, or output; run containment regression tests before enablement. |
| Durable state/outbox and HITL | **Shared authority/evidence dependency.** Promotion must survive restart and approval must prove a human actor without inventing a parallel auth model. | Reuse the landed transactional outbox, append-only event conventions, revision-bound decision receipt, and server-derived actor identity; migration/restart tests cover the integration. |
| Gateway protocol / shared packages | None. | No frame, event, or `@minion-stack/shared` change. |
| Hub/site shared DB or auth | None. | Factory SQLite-only additive migration; no hub/site schema, auth, or UI change. |
| Minion Base UI | No required code. | Run API is additive and availability-typed; any later board visualization requires a separate UI spec and design governance. |
| Existing memory hooks/sync | Read compatibility impact plus one narrowed policy replacement. | Preserve canonical layout and interactive Claude/Codex hooks; replace only the cloud-sync spec's factory no-write statement with this reviewed lane. Alert if canonical checkout cannot resolve an exact commit. |
| Concurrent factory runs | Behavior changes from shared mutable bulk mirror to per-run snapshots. | Atomic materialization, bounded disk use, and cleanup only after the configured requeue window; a missing retained artifact makes requeue fail closed. Concurrency/isolation fixtures prove this. |

## 6. Out of scope

- unified retrieval ranking, embeddings quality, relevance scoring, or replacing the existing three-tier search;
- claiming or statistically estimating that memory caused an implementation outcome;
- allowing agents to author or promote operator-policy/★★★ entries;
- retroactively trusting, rescanning, or promoting historical `MINION/factory/**` notes;
- a Minion Base review UI, notification workflow, or public memory browser;
- general GitHub capability separation, worker container isolation, egress/seccomp, or secret-manager selection beyond
  consuming their approved interfaces;
- B2/claude-mem backup scheduling, canonical interactive-session write governance, general canonical-memory
  retention/compaction beyond the minimum run-snapshot/quarantine/audit retention required above, or
  cross-project memory taxonomy changes;
- automatic promotion, including low-risk or scanner-green promotion. Every candidate requires human review.

## 7. End-to-end verification

Run after all slices are deployed with automerge still disabled:

1. Start two canary runs while canonical memory advances between their starts. Confirm each run records a different
   resolved commit when appropriate, each stage/requeue retains its own original overall/component hashes, neither
   worker can address a snapshot filesystem path, and neither can mutate the other's markdown or SQLite snapshot.
2. Retrieve one operator topic, one `MINION/factory/` observation, and one SQLite result. Confirm events contain only
   hashes/metadata, prompts show all three trust labels, and ★★★ in the observation is explicitly non-binding.
3. Submit safe, failed-run, unreviewed-SHA, secret-bearing, oversized, encoded-injection, stale-evidence, and duplicate
   candidates. Only the safe reviewed candidate reaches the quarantine repository; none reaches canonical memory.
   Confirm the worker environment/argv/mounts/output contain no memory credential and a retry returns the same
   candidate rather than creating another.
4. Reject one safe candidate and approve another by exact blob SHA and scanner profile. Confirm rejection is terminal.
   Move or replace the quarantine branch path after approval and confirm promotion still fetches the approved Git blob
   object; make the blob endpoint return mismatched bytes and confirm fail-closed terminal failure. In a clean case,
   confirm one deterministic canonical file plus one immutable promotion receipt after repeated retries/restarts.
   Advance the scanner profile before promotion and confirm the old approval cannot write canonical memory.
5. Query the run API and database. Reconstruct snapshot -> retrieval -> citation -> validation -> human decision ->
   canonical commit without memory bodies or query text. Confirm the API says retrieved/cited, never “memory caused
   success.”
6. Keep `FACTORY_MEMORY_GOVERNANCE_V2=1`, set candidate-write and promotion flags to `0`, restart, and verify new
   submissions/promotions are refused while prior audit evidence and pinned reads remain available. Separately verify
   startup rejects promotion without candidate writes and that no flag combination restores direct `MEMORY_NOTE.md`
   writes.

Acceptance requires all focused tests, TypeScript, `bash -n` checks, startup config tests, and this deployed canary
to pass. Security-tagged implementation PRs and the final enablement remain human-gated.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
PRIORITY: highest-value open security item. S1 shipped (snapshot pinning, 7 columns, requeue refusal). S2 half-shipped — read adapter exists but no transport, so V2 runs see NO memory at all (read.ts:27). S3 not started — the unreviewed canonical memory PUT with the shared token is still live at agent/run.sh:62-66 (the D4 hole). S4-S6 absent.
