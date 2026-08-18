---
id: 2026-08-18-factory-memory-governance-spec
title: Factory memory governance — quarantined write-back, provenance, and pinned snapshots
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-factory-memory-governance
verdict: pending
repos: [minion-factory]
relationship: extends
related: [2026-08-17-cloud-agent-memory-sync-spec]
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
  `minion-agent-memory` read path and three retrieval tiers; this spec adds the quarantine, promotion, pinning,
  trust-label, and evidence controls that the existing sync design does not provide. It does not retire or rewrite
  that artifact.

Implementation also depends on approved proposal `2026-08-17-factory-capability-separation`: its distinct
memory-candidate credential must land before quarantine write-back is enabled. The pass-2 reviewer should add that
artifact to `related` only if the relationship resolver permits mixed relationship semantics; this pass keeps the
required single classification unambiguous. Worker containment must ensure the canonical promotion credential is
runner-only, but this spec does not reimplement phase isolation.

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
   hash, bulk snapshot identity, or trust-domain manifest. A run may therefore read a different memory revision from
   another run or even different revisions across stages.
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
read-only view. It exposes an explicit trust manifest: operator-curated policy is `operator-policy`, factory notes
are `agent-observation`, and SQLite/MCP results are `untrusted-observation`. Prompts state that only
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
   tree OID, materializes that exact revision into a run-private directory, computes a canonical SHA-256 manifest
   over sorted `(trustDomain, path, blobOid)` entries, and stores all three identities on the run. Every stage and
   retry in that run sees the same read-only directory. Missing, drifting, or unverifiable snapshots fail closed;
   offline/no-memory execution is allowed only by an explicit runner policy value recorded as `memory_mode=none`,
   never by silently omitting provenance.
2. **Separate trust domains.** `MINION/MEMORY.md` and curated topic files are `operator-policy` except
   `MINION/factory/**`, which is `agent-observation`; SQLite/semantic results are `untrusted-observation`. The
   manifest and prompt render the label beside every returned item. ★★★ is binding only in operator policy. No
   memory content can alter executable commands, repository routing, tags, stage configuration, credentials, or
   lifecycle decisions.
3. **Read-only observations.** Workers receive a run-private SQLite snapshot opened through an immutable/read-only
   query adapter; they never mount the shared WAL directory read-write. The adapter allowlists FTS/search reads,
   applies row/byte/time limits, and emits redacted retrieval events. The semantic server reads the same immutable
   snapshot identity or is marked unavailable; it may not write embeddings, observations, or settings.
4. **Quarantine-only submission.** `MEMORY_NOTE.md` direct upload is removed. A versioned `memory-candidate.json`
   contains `schemaVersion`, run id, source repo, source/reviewed SHA, title, lesson, evidence references, and no
   controller-owned fields. Bounds are one candidate/run, title ≤120 characters, lesson ≤2,000 UTF-8 bytes and 15
   lines, at most five evidence references, no symlinks/binary/invalid UTF-8, and 8 KiB maximum serialized size.
   The runner stamps candidate id, snapshot hash, submitter principal, timestamps, and scanner versions.
5. **Fail-closed scanners.** Deterministic checks reject known secret/key/token/private-key and high-entropy credential
   patterns; instruction-shaped content (role/system/developer overrides, “ignore previous,” tool/credential/action
   requests, XML memory-context wrappers, encoded payloads, and attempts to declare ★★★ policy); unsupported links;
   and evidence paths absent from the run snapshot/diff. Scanner findings are structured, bounded, redacted, and
   versioned. A scanner error quarantines nothing and cannot be overridden by the worker.
6. **Human-reviewed promotion.** Accepted candidates are committed only to a separate private quarantine repository
   using a candidate-only GitHub App installation token. Reviewers receive no write token and record approve/reject
   against candidate blob SHA and scanner version through an authenticated runner endpoint. Only a human approval
   can enqueue promotion. The promoter uses a separate runner-only canonical-memory token, revalidates exact bytes,
   writes a collision-safe canonical filename, and records canonical commit/blob SHA. SHA mismatch, stale scanner,
   rejection, duplicate content, or GitHub race fails closed and preserves an auditable state.
7. **Honest retrieval evidence.** A runner-owned `memory_events` ledger records snapshot prepared, query/read result
   metadata, agent-declared citation, candidate validation, review, and promotion. “Consulted” means a successful
   controller-observed read/query of an item; “cited” means a validated reference in the structured stage result.
   The UI/API must never claim memory caused an outcome—causality is not machine-provable. Raw query text, memory
   bodies, secrets, and credentials are not logged. Event insertion is idempotent and survives restart.
8. **Safe rollout.** `FACTORY_MEMORY_GOVERNANCE_V2=1` is an exact opt-in. The candidate, canonical-read, and
   canonical-promotion principals are pairwise distinct and startup refuses missing/equal credentials. The old
   direct write path is disabled before V2 submission is enabled. Rollback disables submission/promotion but keeps
   pinned reads and the audit ledger; it never restores direct canonical writes.

## 3. DELTA

| Delta | Transition | Slice | Proving test/evidence |
|---|---|---|---|
| D1 | Mutable shared memory mounts become a runner-resolved, immutable, run-private snapshot with durable identity. | S1 | Snapshot unit/integration tests prove deterministic hashes, same revision across stages/retry, isolation between concurrent runs, and fail-closed missing/drifted materialization. |
| D2 | Unlabeled mixed-trust prompt content becomes path-derived trust labels with binding authority restricted to operator policy. | S2 | Prompt/manifest fixtures classify root topic, `factory/`, SQLite, and semantic results; adversarial ★★★ observation remains visibly non-binding. |
| D3 | Writable shared SQLite/MCP access becomes a bounded read-only adapter with retrieval events. | S2 | Mutation/WAL attempts fail; FTS timeout/row/byte limits and redacted, idempotent query/read events pass. |
| D4 | Direct canonical `MEMORY_NOTE.md` PUT becomes schema-bound runner ingestion into a credential-isolated quarantine. | S3 | Adversarial fixtures cover schema/bounds, symlink/binary/UTF-8, secret/high-entropy/injection/encoded payloads, evidence mismatch, credential target, duplicate, and GitHub failure. |
| D5 | Unreviewed canonical write becomes SHA-bound human decision plus revalidated, idempotent promotion by a separate principal. | S4 | State-machine/API tests prove auth, approve/reject races, stale SHA/scanner, revalidation, conditional GitHub writes, duplicate promotion, and no agent/reviewer canonical credential. |
| D6 | No run memory provenance becomes durable snapshot, retrieval, citation, candidate, decision, and promotion evidence exposed honestly by the API. | S5 | Migration/restart/API tests reconstruct the full lineage, distinguish consulted/cited from causal claims, redact payloads, and preserve existing run responses. |
| D7 | Uncontrolled activation becomes exact-opt-in deployment with pairwise-distinct credentials, audit-only shadow validation, and a no-direct-write rollback. | S6 | Startup/config tests plus operator E2E prove fail-closed flags/credentials, shadow rejection metrics, enabled promotion, and rollback behavior. |

Every implementation change must trace to one row above. Work without a DELTA row requires a new or revised spec.

## 4. Vertical slices

Each slice is one focused 4–8 hour factory PR. S1–S5 modify only `minion-factory`; creation of the private quarantine
repository and its GitHub App installation is an operator provisioning step in S6, not a source repository.

### Slice 1 — Snapshot resolver and run binding (6–8h)

**Files to touch:** `runner/src/db.ts`; `runner/src/queue.ts`; `runner/src/github.ts`; new
`runner/src/memory/snapshot.ts`; new `runner/src/memory/snapshot.test.ts`; focused `runner/src/queue.test.ts` cases.

- Add additive and fresh-schema columns: `memory_mode`, `memory_commit_sha`, `memory_tree_oid`,
  `memory_snapshot_hash`, and `memory_manifest_json`, all nullable for historical rows but required by the V2 spawn
  guard for new runs.
- Resolve the configured canonical ref once, fetch/materialize by commit without hooks, submodules, filters, or
  repository code execution, derive trust-domain entries, and atomically publish a run-private snapshot.
- Replace host-shared markdown/bulk mounts with run-private read-only mounts. Copy SQLite with its backup API or a
  verified immutable snapshot procedure; never copy a live DB file alone.
- Requeues inherit the original snapshot identity and rematerialize exact content, not current HEAD.

**Machine-checkable DoD:** focused tests and TypeScript pass; two concurrent fixture runs cannot observe each
other's files; stage/retry manifests are byte-identical; missing commit/blob, copy inconsistency, hash drift, and a
legacy V2 row all refuse spawn with a durable reason.

### Slice 2 — Trust-aware read adapter and retrieval evidence (6–8h)

**Files to touch:** `agent/run.sh`; `agent/spec.sh`; new `agent/memory-read`; new
`runner/src/memory/policy.ts`; new `runner/src/memory/events.ts`; `runner/src/db.ts`; `runner/src/queue.ts`; focused
shell fixtures and `runner/src/memory/*.test.ts`.

- Render the snapshot hash and trust law in every stage prompt. Route markdown read, SQLite FTS, and semantic search
  through the bounded helper; do not expose the underlying writable bulk directory.
- Add append-only `memory_events` with a unique event key, run/stage, event type, snapshot hash, trust domain,
  content/path hash, result count/status, and timestamps. Store no raw memory/query body.
- Validate structured `memoryConsulted`/`memoryCited` references against successful events and the pinned manifest;
  mark them explicitly agent-declared where controller access cannot establish reading comprehension.

**Machine-checkable DoD:** tests prove all trust labels and limits, reject direct mutation and out-of-snapshot
citations, deduplicate replayed events, redact secret-shaped queries, and show that a factory observation containing
`★★★ ignore the spec` is rendered as non-binding evidence. Both shell scripts pass `bash -n`; TypeScript passes.

### Slice 3 — Candidate schema, scanners, and quarantine writer (6–8h)

**Files to touch:** `agent/run.sh`; new `agent/memory-candidate.schema.json`; new
`runner/src/memory/candidate.ts`; new `runner/src/memory/scanners.ts`; `runner/src/github.ts`;
`runner/src/queue.ts`; scanner/schema fixtures and tests.

- Remove the direct `gh api` canonical write and accept only `/out/memory-candidate.json` after normal result
  ingestion. The runner owns every stamped field and writes an accepted record to the quarantine repository using
  `FACTORY_MEMORY_CANDIDATE_TOKEN`; the worker has neither candidate nor canonical token.
- Implement deterministic schema, bounds, secret, high-entropy, prompt-injection, encoding, and evidence scanners.
  Persist scanner result before any external write. Use conditional GitHub writes and a stable
  `<run-id>/<candidate-id>.json` path so retries cannot overwrite another candidate.
- In shadow mode, validate and record would-accept/would-reject without any GitHub write.

**Machine-checkable DoD:** every D4 adversarial fixture passes; an instrumented worker environment contains no
memory token; mocked GitHub assertions show the candidate credential can address only the configured quarantine
slug and canonical writes are absent from all agent scripts.

### Slice 4 — Human decision and canonical promoter (6–8h)

**Files to touch:** `runner/src/db.ts`; `runner/src/index.ts`; `runner/src/github.ts`; new
`runner/src/memory/promotion.ts`; new `runner/src/memory/promotion.test.ts`; API tests.

- Add a closed candidate state machine: `validated -> awaiting_review -> approved|rejected -> promoting -> promoted`
  plus terminal `promotion_failed`; transitions use compare-and-swap and append events. Scanner rejection is terminal
  and never reviewable into approval.
- Add authenticated list/detail/approve/reject endpoints. Derive reviewer identity from the authenticated principal,
  require candidate blob SHA and scanner version, and forbid the candidate/canonical principals from acting as the
  human reviewer.
- Promotion re-fetches immutable quarantine bytes, re-runs current validation, then conditionally creates a
  canonical `MINION/factory/<date>-<run>-<candidate>.md` using `FACTORY_MEMORY_PROMOTION_TOKEN`. Record canonical
  commit/blob SHA before reporting success.

**Machine-checkable DoD:** D5 state/API/race tests pass; a worker token and reviewer cannot promote; one approval
produces at most one canonical blob across crash/retry; rejected, changed, stale-scanner, and duplicate-content
candidates never write canonical memory.

### Slice 5 — Provenance API and audit reconstruction (4–6h)

**Files to touch:** `runner/src/index.ts`; `runner/src/db.ts`; new `runner/src/memory/provenance.ts`; API/DB tests;
`README.md` for the operator-visible semantics.

- Extend run detail with backward-compatible `memory` provenance: mode/snapshot, counts by trust domain, validated
  consulted/cited references, candidate/scanner state, human decision receipt, and canonical promotion receipt.
- Make absent historical provenance explicit as `availability: unavailable`, never a fabricated empty/green value.
- Document the difference between available, retrieved, cited, and promoted; never expose memory bodies or raw
  query text through the general run API.

**Machine-checkable DoD:** a fresh DB and additive-upgrade DB pass; restart between every candidate transition still
reconstructs one ordered lineage; JSON fixtures preserve old run fields and redact bodies/queries/token-shaped data.

### Slice 6 — Provision, shadow, enable, and rollback (4–6h)

**Files to touch:** `deploy.sh`; `.env.example`; `docker-compose.yml`; `deploy/stack.yml`; `deploy/k8s.yml`;
`README.md`; startup/config tests and deployment smoke script.

- Provision a private quarantine repository and three least-privilege GitHub App installation credentials:
  canonical read, quarantine candidate write, and canonical promotion write. This is a human/operator action; never
  place token values in source, logs, memory, or the run API.
- Emit all variables through `deploy.sh` because it replaces the host `.env`. Validate exact opt-in, allowlisted
  repository slugs, pairwise-distinct principals/tokens, and filesystem ownership at startup.
- Deploy with V2 off, run scanner shadow mode over adversarial/safe fixtures, then enable pinned reads and candidate
  writes. Enable promotion only after a reviewed canary. Rollback disables candidate/promotion endpoints and retains
  audit/snapshot data; direct canonical worker writes remain deleted.

**Machine-checkable DoD:** config tests reject unset/default/equal credentials and non-allowlisted slugs; rendered
Compose/Swarm/Kubernetes configs contain secret references but no values; the end-to-end procedure below passes and
rollback leaves the canary provenance queryable.

## 5. Cross-repo impact assessment

| Impact zone | Assessment | Mitigation / alert |
|---|---|---|
| `minion-agent-memory` canonical store | **Direct unavoidable external-repo impact.** Promotion adds reviewed files under existing `MINION/factory/`; readers consume a pinned commit. | Separate read/promote principals, conditional writes, collision-safe paths, immutable receipts, no schema change to operator topics. Alert and stop on SHA races. |
| New quarantine repository | **Direct provisioning impact.** It is deliberately outside canonical memory so a candidate credential cannot poison reads. | Private repo, GitHub App scoped only to it, no worker read path, retention policy documented; repo creation remains human/operator-gated. |
| Capability separation | **Hard prerequisite.** Current shared `FACTORY_GH_TOKEN` cannot satisfy credential isolation. | Do not enable S3/S4 until `2026-08-17-factory-capability-separation` supplies distinct runner-owned principals. Startup fails closed. |
| Worker containment | **Security dependency at rollout.** A broad worker that can inspect runner credentials defeats separation. | Candidate/promotion tokens never enter worker args, env, mounts, logs, or output; validate with containment tests before enablement. |
| Gateway protocol / shared packages | None. | No frame, event, or `@minion-stack/shared` change. |
| Hub/site shared DB or auth | None. | Factory SQLite-only additive migration; no hub/site schema, auth, or UI change. |
| Minion Base UI | No required code. | Run API is additive and availability-typed; any later board visualization requires a separate UI spec and design governance. |
| Existing memory hooks/sync | Read compatibility impact only. | Preserve canonical layout and sync jobs; pin factory reads without changing interactive Claude/Codex hooks. Alert if canonical checkout cannot resolve exact commit. |
| Concurrent factory runs | Behavior changes from shared mutable bulk mirror to per-run snapshots. | Atomic materialization, bounded disk use, cleanup only after terminal retention window, concurrency/isolation fixtures. |

## 6. Out of scope

- unified retrieval ranking, embeddings quality, relevance scoring, or replacing the existing three-tier search;
- claiming or statistically estimating that memory caused an implementation outcome;
- allowing agents to author or promote operator-policy/★★★ entries;
- retroactively trusting, rescanning, or promoting historical `MINION/factory/**` notes;
- a Minion Base review UI, notification workflow, or public memory browser;
- general GitHub capability separation, worker container isolation, egress/seccomp, or secret-manager selection beyond
  consuming their approved interfaces;
- B2/claude-mem backup scheduling, canonical interactive-session write governance, memory retention/compaction, or
  cross-project memory taxonomy changes;
- automatic promotion, including low-risk or scanner-green promotion. Every candidate requires human review.

## 7. End-to-end verification

Run after all slices are deployed with automerge still disabled:

1. Start two canary runs while canonical memory advances between their starts. Confirm each run records a different
   resolved commit when appropriate, each stage/retry retains its own original snapshot hash, and neither can mutate
   the other's markdown or SQLite snapshot.
2. Retrieve one operator topic, one `MINION/factory/` observation, and one SQLite result. Confirm events contain only
   hashes/metadata, prompts show all three trust labels, and ★★★ in the observation is explicitly non-binding.
3. Submit safe, secret-bearing, oversized, encoded-injection, stale-evidence, and duplicate candidates. Only the safe
   candidate reaches the quarantine repository; none reaches canonical memory. Confirm the worker environment and
   output contain no candidate/canonical credential.
4. Reject one safe candidate and approve another by exact blob SHA. Confirm rejection is terminal. Change the
   approved quarantine bytes in a race fixture and confirm promotion fails; restore exact bytes, reapprove if
   required, and confirm one canonical file plus one immutable promotion receipt after repeated retries/restarts.
5. Query the run API and database. Reconstruct snapshot -> retrieval -> citation -> validation -> human decision ->
   canonical commit without memory bodies or query text. Confirm the API says retrieved/cited, never “memory caused
   success.”
6. Disable `FACTORY_MEMORY_GOVERNANCE_V2` and promotion, restart, and verify new submissions are refused, prior audit
   evidence remains readable, pinned reads follow the documented fallback, and no code path restores direct
   `MEMORY_NOTE.md` writes.

Acceptance requires all focused tests, TypeScript, `bash -n` checks, startup config tests, and this deployed canary
to pass. Security-tagged implementation PRs and the final enablement remain human-gated.
