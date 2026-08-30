---
id: 2026-08-18-factory-orchestration-round7-spec
title: Typed execution graph — repo fan-out, slice continuation, scenario profiles, relationship resolution
stage: spec
status: draft
pass: 2
created: 2026-08-18
updated: 2026-08-28
repos: [minion-factory, minion-meta]
proposal: 2026-08-18-factory-orchestration-round7
verdict: approved
relationship: depends-on
related: [2026-08-18-agent-instruction-parity-and-repo-policy, 2026-08-18-factory-topic-capability-manifest-spec, 2026-08-18-factory-durable-state-outbox-spec, 2026-08-18-factory-workitem-handoff-schema-spec, 2026-08-18-factory-orchestration-tests-spec, 2026-08-17-factory-capability-separation, 2026-08-17-factory-worker-containment, 2026-08-18-factory-browser-verification-stage, 2026-08-18-sdlc-transformation-roadmap]
reconcile_ignore: true
reconcile_ignore_reason: "Cancelled this stale shipment claim: PR #41 is not the typed execution graph. The 2026-08-28 audit found zero graph, profile, or resolver deliverables and returned the spec to draft for redesign on pipeline_instances and phase_requests."
---

# Typed execution graph — repo fan-out, slice continuation, scenario profiles, relationship resolution

## 0. Product

Problem in the proposal's words:

> Today: multi-repo specs map to the FIRST recognized repo only; nothing continues
> after Slice 1; every change takes the same linear path; spec relationships are
> classified (recommend-only, shipped) but nothing resolves them.
>
> **Definition of done:** (1) repo-slice fan-out — a spec declaring N repos
> produces per-repo slice runs with dependency ordering and an integration join;
> (2) slice continuation — a merged Slice N PR level-triggers Slice N+1 (spec
> frontmatter tracks completed slices); (3) versioned scenario profiles
> (single-repo-low-risk, ui-flow, cross-repo-contract, database-migration,
> security-auth, incident-fix) selected by the execution manifest; (4) a
> deterministic relationship RESOLVER: applies merges-drafts/supersedes only
> under the safe boundary (both drafts, no active runs, no acceptance criterion
> lost, fresh review of the consolidated artifact) — everything else becomes a
> lineage link + human decision.

The user-visible outcome is that approval promotes a spec into the correct small ship units, each
unit runs in the repository it actually owns, dependent work waits for proof from its predecessor,
and the system never silently rewrites planning history. The controller and its database remain the
authority; markdown, PRs, labels, and frontmatter are projections.

## 1. Relationship recommendation

**Recommended relationship: `depends-on`.** This proposal is new M5 behavior, but it cannot be
implemented safely until the typed manifest and durable transition/outbox contracts it consumes
are landed. This is a recommendation only; this spec does not merge, retire, supersede, or edit any
related artifact.

| Related id | One-line reason |
|---|---|
| `2026-08-18-agent-instruction-parity-and-repo-policy` | Roadmap M1 prerequisite: the graph resolver must consume one machine-readable repository/alias policy rather than add another hardcoded map. |
| `2026-08-18-factory-topic-capability-manifest-spec` | Direct prerequisite: it owns the immutable execution manifest and currently reserves `profile: none`; this spec adds profile and graph selection to that contract. |
| `2026-08-18-factory-durable-state-outbox-spec` | Direct prerequisite: graph advancement and meta projections must use guarded transitions plus transactional outbox delivery, not `postFinish()` best-effort side effects. |
| `2026-08-18-factory-workitem-handoff-schema-spec` | Its Slice 3 intentionally refuses multi-repo auto-dispatch until explicit per-slice routing exists; this spec replaces that temporary refusal after preserving its pinned-spec and trust invariants. |
| `2026-08-18-factory-orchestration-tests-spec` | Extends the first-party Node test harness; this spec adds graph/profile/resolver suites rather than inventing a second test runner. |
| `2026-08-17-factory-capability-separation` | Roadmap M4 prerequisite: typed node/profile capabilities must remain runner-issued and must not be inferred from task or agent output. |
| `2026-08-17-factory-worker-containment` | Roadmap M4 prerequisite for the command-only integration executor and inherited security prerequisite for browser verification. |
| `2026-08-18-factory-browser-verification-stage` | Conditional prerequisite for dispatching `ui-flow@1`: until its evidence contract is implemented, UI nodes remain non-dispatchable/non-merge-eligible. |
| `2026-08-18-sdlc-transformation-roadmap` | This is the roadmap's M5 DAG/multi-repo milestone and must preserve its M0–M4 gates and `FACTORY_*_V2` rollout discipline. |

Index searches also found the older staged-run and agent-pipeline specs. They establish the linear
stage harness and two human gates, but do not overlap this proposal's graph, continuation, profile,
or resolver DoD, so they are not relationship targets.

## 2. Scope, owners, and dependency gate

**Target repositories:**

- `minion-meta` owns the authoring contract and validation for a machine-readable execution graph
  embedded in each spec body. Frontmatter remains flat as required by `specs/TEMPLATE.md`.
- `minion-factory` owns parsing the validated graph, profile resolution, durable graph state,
  dispatch/continuation, integration joins, and recommend-only relationship resolution/projection.

Before Slice 1 starts, implementation must verify that the M1 machine-readable repository policy and
the minion-meta portions of the topic/capability contract have landed, then reconcile their edits to
`specs/TEMPLATE.md` and `scripts/spec-index.mjs`. Before Slice 2 starts, verify on current `main` that
the complete topic/capability manifest and first-party Node test harness are implemented and tested.
Before Slice 3 starts, additionally verify that guarded lifecycle events plus the transactional
outbox from durable-state and commit-pinned spec snapshots from WorkItem handoff are implemented,
tested, and enabled in shadow or production form, and that roadmap M4 capability separation plus
worker containment are enforced for runner-issued capabilities and command-only workers. A
prerequisite with `changes_requested` is not satisfied. A missing prerequisite blocks the consuming
slice; do not recreate a reduced local substitute. The separate browser-verification stage blocks
only `ui-flow@1` dispatch, not the non-UI profile implementation.

The live factory baseline was inspected on `NikolasP98/minion-factory/main` on 2026-08-18. Exact
line numbers may drift; function/table names below are the stable anchors and must be re-read before
implementation.

## 3. AS-IS → TO-BE → DELTA

### 3.1 AS-IS — verified current behavior

- `runner/src/queue.ts:queueDevForSpec()` reads flat `repos`, maps aliases, and selects the first
  truthy repo with `.find(Boolean)`. It writes one run whose task is hardcoded to “Slice 0 ... and
  Slice 1,” and deduplicates only on `(spec_sha, repo_id)`. There is no slice id, graph node,
  dependency, join, or continuation state.
- `runner/src/queue.ts:postFinish()` calls `queueDevForSpec()` only after a passing spec run. Dev
  completion can auto-fix the same branch, but a merged PR does not level-trigger a later slice.
  The function is explicitly fail-soft and its side effects are not transactional with the run
  transition.
- `runner/src/db.ts` stores one row per run with `repo_id`, `spec_id`, `spec_sha`, tags, PR/head,
  and requeue lineage. It has no execution, node, edge, join, profile, or slice-completion tables.
- `runner/src/lifecycle.ts:specSweep()` promotes an approved spec through
  `queueDevForSpec()`. `transition()` patches one artifact and then best-effort patches its index;
  neither surface knows graph state or resolver decisions.
- `runner/src/automerge.ts:sweep()` evaluates one PR/run at a time. It does not advance a graph.
  `FACTORY_AUTOMERGE` is exact opt-in and currently must remain off through roadmap M7.
- `runner/src/repos.ts` defines repository checkout/self-test/required-check policy. Alias mapping
  in `queue.ts` is not the repo registry; mounted deployments may add repos through the registry.
- `agent/run.sh` executes the same develop → self-test → independent review path for all dev work.
  Stakes affect review strictness, but no versioned scenario profile chooses stages/evidence/budgets.
- `specs/TEMPLATE.md` requires vertical slices and DELTA traceability but has no machine-readable
  node id, repo owner, dependency, join, or acceptance-test fields. `scripts/spec-index.mjs` projects
  frontmatter only.
- Relationship fields are recommend-only planning metadata. No resolver proves both artifacts are
  drafts, checks active runs, compares acceptance criteria, creates a consolidated draft, or requests
  fresh review.
- `/memory/MINION/factory/2026-08-18-60a08042.md` records the concrete failure: a multi-repo spec
  was dispatched to `repos[0]` even though Slice 1 belonged to another repository.
- `/memory/MINION/factory/2026-08-18-39c3a54c.md` records that a slice/repo mismatch must stop on
  the first attempt, not burn repeated review rounds.
- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` makes slice-scoped runs mandatory and fixes
  the roadmap invariant that controller evidence—not agent self-attestation—advances state.

### 3.2 TO-BE — target behavior and invariants

1. Every automatically executable spec contains one fenced `factory-execution` JSON block with
   `schemaVersion` and nodes whose required fields are stable `id`, `kind`, `repo`, `slice`,
   `dependsOn`, and structured `acceptance`; `profile` is an optional request for a stricter
   compatible profile, not the resolved policy. Each `slice` names exactly one prose slice and its
   validator-enforced `**Topics:**` annotation. Nodes form a directed acyclic graph. A node may own
   only one repository; cross-repo work is separate ship units.
2. Approval resolves that graph against the commit-pinned spec, the effective repository registry,
   and the immutable topic-policy snapshot; selects a versioned scenario profile for every node;
   and persists the execution, nodes, edges, resolved profile ids, and ready-root outbox jobs in one
   transaction. Object-key order, node order, and the order of explicitly set-like arrays do not
   change the graph hash; ordered acceptance commands retain their order. Repeated sweeps under the
   same spec, graph, topic-policy, repository-policy, and profile-policy hashes do not create another
   execution or run.
3. A run carries `execution_id`, `node_id`, `slice_id`, `profile_id`, and the exact manifest hash/
   revision, topic-policy hash, repository-policy hash, profile-policy hash, graph hash, and spec
   revision. Retries inherit them unchanged.
   Dispatch refuses when the run repo differs from the node repo or effective registry policy.
4. A `work` node becomes complete only from controller-observed proof: its PR is merged at the
   attested head and all profile/manifest-required evidence is satisfied. An `integration` node is
   controller-executed, creates no implementation PR, and completes only when its ordered acceptance
   commands/evidence pass against the exact completed dependency heads recorded in the execution.
   Any node that must change files is `kind: work`. A passed/ready PR or agent claim alone is never
   completion. The completion event is idempotent, append-only, and terminal.
5. Completing a node level-triggers all newly ready dependents. An integration join is an explicit
   node (`kind: integration`) which becomes runnable only after every declared dependency completes;
   every graph spanning more than one repository has at least one integration node whose transitive
   dependency closure covers every participating repository. It performs contract/E2E verification
   in its declared repo and cannot be inferred from “all PRs exist.” Predecessors with failed or
   canceled attempts, closed-unmerged or stale-head PRs, or `attention-required` state never unlock
   it.
6. Spec frontmatter projects `completed_slices: [...]` only after durable completion. Because the
   flat parser permits string arrays, entries are stable node ids, not ambiguous display numbers.
   Before every write, the projector verifies that the current artifact still contains the same
   canonical graph hash as the execution; a stale or removed graph alerts and dead-letters without
   writing old node ids into a newer spec. Projection failure leaves the DB authoritative and a
   retryable outbox job; it never rolls back a real completion or advances another node early.
7. Profiles are versioned immutable data with exactly these initial ids:
   `single-repo-low-risk@1`, `ui-flow@1`, `cross-repo-contract@1`,
   `database-migration@1`, `security-auth@1`, `incident-fix@1`. The node manifest selects a profile
   from the pinned spec `type`, that slice's effective topics, and graph shape using deterministic
   precedence. A node may request a stricter compatible profile only through the profile table's
   explicit compatibility/override relation; it may never downgrade or replace an incomparable
   derived profile. Unknown, incompatible, or ambiguous selection fails closed.
8. Profiles constrain existing mechanisms—required stages/evidence, provider independence, review
   strictness, budgets, merge eligibility, and operator verification. They do not grant credentials
   or bypass human gates. `database-migration` and `security-auth` always retain approval and merge
   gates; any manifest carrying effective `data` risk also retains both gates regardless of selected
   profile. `ui-flow` requires the separate browser evidence capability; until it is available the
   node is non-dispatchable and non-merge-eligible, not silently downgraded.
9. Relationship resolution is deterministic and recommend-only by default. `extends`, `depends-on`,
   `conflicts-with`, `already-satisfied`, and unsafe `merges-drafts`/`supersedes` become immutable
   lineage records plus a human-decision item. Automatic consolidation is allowed only when both
   source artifacts are drafts, neither has active/nonterminal executions or open implementation
   PRs, and both revisions remain unchanged through the final pre-write recheck. The resolver first
   generates a candidate, then requires a versioned criterion mapping that preserves the complete
   source criterion multiset before it may publish the candidate as a new draft and request fresh
   two-pass review. Sources are never retired or mutated by the resolver.
10. All new graph transitions use the durable-state guarded transition/event/outbox APIs. Repeated
    boot/sweep/webhook delivery is safe. `FACTORY_GRAPH_V2=1` enables resolution/shadow records;
    `FACTORY_GRAPH_DISPATCH_V2=1` additionally admits new graph executions and dispatches nodes.
    `FACTORY_RELATIONSHIP_RESOLVER_V1=1` enables lineage/decision shadow records;
    `FACTORY_RELATIONSHIP_CONSOLIDATION_V1=1` additionally permits safe candidate creation. Every
    flag is an exact opt-in; unset, `0`, `true`, or a typo means off, and the mutation flag has no
    effect unless its shadow flag is also `1`. Turning admission flags off stops new graph/resolver
    mutations but continues durable delivery for already-admitted executions, so rollback cannot
    strand work. Legacy single-repo behavior and WorkItem's fail-loud multi-repo refusal remain
    available during shadow comparison; `FACTORY_AUTOMERGE=0` remains unchanged.

### 3.3 DELTA — transitions, slices, and proof

| # | Transition | Slice | Proving test/evidence |
|---|---|---|---|
| D1 | Human prose slices gain a validated, canonical `factory-execution` DAG contract. | S1 | `execution-graph.test.mjs`: valid single/cross-repo graphs; duplicate ids/slice references, cycles, invalid repo/profile syntax, missing/invalid acceptance, repo-less nodes, and joins without all-repo transitive coverage reject with file+node. Effective-registry membership is deliberately a factory-side test. |
| D2 | Approved pinned specs resolve into durable execution/node/edge records with stable graph+policy hashes. | S3 | `execution.test.ts`: reordered equivalent JSON hashes identically while command order remains significant; transaction rollback leaves zero partial rows; topic/repo/profile-policy hash changes create distinct executions; exact replay returns the same execution. |
| D3 | First-recognized-repo dispatch becomes one run per ready graph node, each bound to its explicit repo/slice/profile/policy. | S4 | `graph-dispatch.test.ts`: two roots in different repos create two correct runs; alias/registry mismatch and repo mismatch create zero runs plus a typed failure event. |
| D4 | Linear “S1 only” becomes merge-observed, level-triggered continuation and all-dependency integration joins. | S5 | `graph-advance.test.ts`: passed/ready/closed-unmerged/stale-head do not advance; merged+attested work advances once; N-of-N controller-run join waits until N and binds dependency heads; replay creates no duplicate. |
| D5 | One generic stage recipe becomes deterministic, versioned scenario-profile selection and enforcement. | S2 | `profiles.test.ts`: table cases for all six profiles, precedence, override compatibility, no downgrade, unknown version, security/data human gates, and unavailable browser evidence fail closed. |
| D6 | DB node completion projects stable `completed_slices` ids into spec frontmatter without making markdown authoritative. | S6 | `graph-projection.test.ts`: CAS conflict/outage retries; DB completion remains; duplicate projection is byte-stable; unrelated frontmatter is preserved; changed/removed graph hash refuses the write and alerts. |
| D7 | Passive relationship metadata gains safe-boundary resolution, lineage, and fresh-review consolidation. | S7 | `relationship-resolver.test.ts`: every unsafe predicate and a source-state race yield lineage+human decision and no published candidate; a safe pair preserves the criterion multiset, creates one draft and one review request; replay is idempotent. |
| D8 | The complete multi-repo flow is observable, separately shadow/mutation-gated, safely disableable, and verified end to end. | S8 | Fixture E2E plus operator deployment verification in §7: graph/policy hashes, two repo runs, merge-triggered continuation, join, stale-projection refusal, and safe/unsafe resolver cases under every flag combination. |

## 4. Approach — vertical implementation slices

Each slice is one repository-scoped ship unit sized for approximately 4–8 focused hours. A slice may
edit only its listed files, must preserve landed changes from earlier slices, and may overlap a file
with a later slice only in the stated landing order. `logic` slices use red-state tests first.

### Slice 1 — Authoring and validation contract (minion-meta, 4–6h)

**Files to touch:** `specs/TEMPLATE.md`; `scripts/spec-index.mjs`; new
`scripts/execution-graph.mjs`; new `scripts/execution-graph.test.mjs`; `package.json` only if needed
to expose the focused test command.

- Specify one fenced `factory-execution` JSON block shaped as
  `{ "schemaVersion": 1, "nodes": [...] }`. Required node fields are
  `{id, kind, repo, slice, dependsOn, acceptance}`; `kind` is `work|integration`; optional `profile`
  is a syntactically valid versioned override request. `acceptance` is a non-empty ordered array of
  discriminated objects: `{type:"command", command, cwd?}` or `{type:"evidence", id}`. `cwd`, when
  present, is a normalized repository-relative path with no absolute or parent traversal. Commands
  run in the node repository through the existing contained self-test mechanism; evidence ids must
  be satisfied from the controller-owned manifest/evidence registry, never agent prose.
- Canonicalize object keys, node order, `dependsOn`, and other explicitly set-like arrays for
  hashing, but preserve acceptance-command order. Validate stable/unique node ids, unique references
  to existing prose slices, repo/profile slug syntax, dependency existence, acyclicity, and—for any
  graph spanning multiple repository ids—at least one integration node whose transitive dependency
  closure covers work from every participating repository. Do not validate repository membership or
  profile existence in minion-meta: mounted `REPOS` and the versioned factory profile table are the
  runtime authorities.
- Add optional flat `completed_slices: [...]` to the template as a controller-owned projection;
  authors and agents must not set it to claim completion.
- Grandfather existing specs without a graph. New/updated specs requesting automatic graph dispatch
  must have one; legacy specs continue on the old path whenever graph dispatch admission is off.

**Machine-checkable DoD:** `node scripts/execution-graph.test.mjs` and
`node scripts/spec-index.mjs` pass; negative fixtures for every D1 rejection produce non-zero exit
and identify the source file/node; no `index.json` is hand-edited.

### Slice 2 — Versioned scenario profiles (minion-factory, 4–6h)

**Files to touch:** new `runner/src/profiles.ts`; new `runner/src/profiles.test.ts`;
`runner/src/manifest.ts` from the prerequisite; `agent/run.sh` only to consume runner-resolved
stage/budget inputs (no policy literals in shell); `runner/README.md`.

- Define the six immutable `@1` profiles as typed policy data. Each names compatible node kinds,
  topic/type/graph selectors, required stages/evidence, provider-independence requirement, positive
  bounded budgets no greater than existing global caps, human gates, merge eligibility, and an
  explicit compatible-override relation. Canonicalize the complete table into `profile_policy_hash`.
  Tests snapshot the complete `@1` records so later edits require a new version.
- Selection precedence is: security/auth → database migration → incident fix → cross-repo contract
  → UI flow → single-repo low risk. The first matching rank wins. Multiple matches at the same rank
  must resolve to the same profile or fail as ambiguous; incomparable override requests fail.
- Replace the manifest's `profile: none` placeholder only in the new node-manifest resolver. Later
  policy versions coexist and never reinterpret active executions. Slice 3 owns persistence and
  Slice 4 owns dispatch enforcement.

**Machine-checkable DoD:** D5 table-driven tests pass for every profile, overlap, and override edge;
grep shows no duplicated profile policy in `agent/run.sh`; property tests prove budgets stay within
global caps and manifest-required gates can only be added; unavailable required capability/evidence
returns a typed non-dispatchable/non-merge-eligible result rather than a weaker profile.

### Slice 3 — Durable graph model and pinned resolution (minion-factory, 6–8h)

**Files to touch:** new `runner/src/execution.ts`; new `runner/src/execution.test.ts`;
`runner/src/db.ts`; `runner/src/github.ts`; `runner/src/queue.ts` only at the approved-spec entry
adapter.

- Add additive tables `executions`, `execution_nodes`, and `execution_edges`, with unique keys on
  `(spec_sha, graph_hash, topic_policy_hash, repo_policy_hash, profile_policy_hash)` and
  `(execution_id, node_id)`. Store the pinned spec hash, graph hash, all three policy hashes,
  manifest revision/hash, resolved profile version, node state, and timestamps. The graph hash is
  computed after resolving aliases through the stored repository-policy snapshot. Node states are
  `waiting|ready|running|attention-required|completed`: dependency-blocked
  nodes start `waiting`; dispatch claims `ready → running`; failed/error/canceled runs move `running
  → attention-required`; only an explicit operator retry may move `attention-required → ready`; and
  `completed` is terminal. Use the durable event/outbox tables for transition delivery rather than
  adding a second queue.
- Parse only the pinned spec snapshot. Resolve repository ids through the actual `REPOS` registry
  and its canonical alias API supplied by the repo-policy work; do not treat `REPO_ALIASES` as the
  registry (`/memory/MINION/factory/2026-08-18-ac227e10.md`).
- In one transaction, validate/canonicalize/hash the graph, resolve every Slice-2 profile, persist
  nodes/edges, emit `execution.created`, and enqueue ready-root outbox work. Persist no partial graph
  or profile selection on error.

**Machine-checkable DoD:** focused Node tests prove D2 including fresh-DB DDL, upgrade DDL,
rollback, stable graph/policy hashes, acceptance-order sensitivity, exact replay idempotency,
effective-registry/profile refusal, legal node transitions, missing prerequisite refusal, and
pinned-spec immutability; `npm test` and `npm run typecheck` pass in `runner/`.

### Slice 4 — Repo-node fan-out and dispatch guard (minion-factory, 4–6h)

**Files to touch:** `runner/src/queue.ts`; new `runner/src/graph-dispatch.ts`; new
`runner/src/graph-dispatch.test.ts`; `runner/src/db.ts` Run fields; `runner/src/index.ts` response
projection if run details expose the fields.

- Add nullable `execution_id`, `node_id`, `slice_id`, `profile_id`, `graph_hash`,
  `topic_policy_hash`, `repo_policy_hash`, and `profile_policy_hash` to runs and every insert/requeue
  path; bind the exact existing manifest revision/hash as well. Add `integration` to the validated
  run-kind/API union. Retries inherit exactly the same binding.
- Consume ready-node outbox jobs. A `work` node creates one dev run whose task names only that
  node/slice, never “Slice 1” by convention. An `integration` node creates a controller acceptance
  run for Slice 5's command-only executor and never starts the coding/PR harness. Atomically claim
  the node and insert/dedupe the correctly typed run.
- Immediately reject node repo vs run repo vs registered checkout mismatch and emit a typed alert.
  This is the first-attempt guard required by memories `60a08042` and `39c3a54c`.

**Machine-checkable DoD:** D3 tests cover parallel roots, sequential roots, alias normalization,
mounted repo registry, unmapped repo, mismatched repo, duplicate delivery, and requeue inheritance.
No test may assert only log text; it must assert rows/events and zero wrong-repo inserts.

### Slice 5 — Merge-observed continuation and integration join (minion-factory, 6–8h)

**Files to touch:** new `runner/src/graph-advance.ts`; new
`runner/src/graph-advance.test.ts`; new `runner/src/integration-runner.ts`; new
`agent/integration.sh`; `agent/Dockerfile`; `runner/src/queue.ts`; `runner/src/automerge.ts`; the
landed post-merge webhook/reconciler adapter if available, otherwise the durable outbox reconciler
owned by the prerequisite spec.

- Observe merged PR state through the existing authenticated GitHub adapter and bind it to run repo,
  PR, attested head, node, and execution. Never accept agent result JSON as merge proof.
- For work nodes, guard `running → completed` only after merge/evidence proof. For integration nodes,
  claim `ready → running`, execute the ordered acceptance contract against recorded dependency heads,
  and guard `running → completed` only after controller-owned results pass. Failed/error/canceled
  attempts move either kind to `attention-required`; no such transition unlocks a dependent. Append
  the event and enqueue dependent evaluation in the same transaction. A dependent is ready iff all
  declared predecessors are completed.
- Make periodic reconciliation level-triggered so missed webhooks heal. Integration nodes use the
  same durable claim/advance path but never invoke the implementation-PR harness. Their commands run
  in a contained, command-only self-test worker at the recorded dependency heads, without a coding
  model or PR-write credential; the controller records exit/evidence results.

**Machine-checkable DoD:** all D4 table cases pass under duplicate and out-of-order events; a crash
between transition and delivery is repaired from the outbox; shell fixtures prove the integration
entrypoint invokes only declared commands, has no model/PR-write credential, and binds recorded
heads; no `postFinish()` best-effort callback is the sole advancement path.

### Slice 6 — Completion projection (minion-factory, 4–6h)

**Files to touch:** new `runner/src/graph-projection.ts`; new
`runner/src/graph-projection.test.ts`; `runner/src/github.ts`; the landed outbox handler registry;
`runner/src/lifecycle.ts` only to expose/read projection status.

- On `node.completed`, enqueue an idempotent projection job that fetches the current artifact,
  verifies its canonical `factory-execution` graph hash matches the execution, updates only
  `completed_slices`, preserves unrelated fields/body, validates the result, and PUTs with GitHub
  SHA compare-and-set. A changed or removed graph dead-letters with a typed alert and no PUT.
- Projection contains the sorted union of completed stable node ids. A conflict refetches and
  recomputes; validation failure dead-letters and alerts. DB node state remains authoritative.

**Machine-checkable DoD:** D6 tests prove byte-stable replay, CAS repair, validation failure,
outage retry, concurrent completions, stale/removed-graph refusal, typed alerting, and preservation
of unrelated frontmatter. Typecheck and the full runner test suite pass.

### Slice 7 — Safe-boundary relationship resolver (minion-factory, 6–8h)

**Files to touch:** new `runner/src/relationship-resolver.ts`; new
`runner/src/relationship-resolver.test.ts`; `runner/src/db.ts`; `runner/src/github.ts`;
`runner/src/lifecycle.ts`; `agent/spec.sh` only to invoke the existing fresh two-pass review for a
new consolidated draft.

- Add immutable `artifact_lineage` and `relationship_decisions` records keyed by source revisions
  and resolver version. Normalize/sort related ids before evaluation. Versioned criterion extraction
  fingerprints every DELTA proof row and every slice-level machine-checkable DoD as a multiset;
  normalization may remove formatting/whitespace but not criterion text, owner slice, or proof id.
- For every relationship, record lineage. Only `merges-drafts` and `supersedes` may become a
  consolidation candidate, and only if both artifacts are still drafts at the compared revisions
  and neither has nonterminal executions or open implementation PRs. Generate the candidate in a
  temporary artifact, map every source criterion fingerprint to candidate criteria, and publish only
  if the complete source multiset is preserved. Re-fetch both source revisions and active run/PR
  state immediately before the conditional create; any race fails closed.
- Create a **new** draft candidate with both parents and the criterion mapping. Do not mutate either
  source. Queue fresh pass 1 + independent pass 2 review; only a later human lifecycle decision may
  retire/supersede sources.
- Any failed predicate, conflict, non-draft, lost criterion, unsupported relationship, or ambiguous
  ancestry records `human-decision-required` and creates one idempotent decision item.

**Machine-checkable DoD:** D7 matrix tests prove safe and every unsafe boundary, criterion multiset
preservation including duplicates, pre-write source/run/PR race refusal, temporary-candidate cleanup,
source immutability, deterministic ids, and replay idempotency.

### Slice 8 — Shadow rollout and end-to-end graph verification (minion-factory, 4–6h)

**Files to touch:** new `runner/src/execution.e2e.test.ts`; `.env.example`; `setup.sh`;
`deploy.sh`; `docker-compose.yml`; `runner/README.md`.

- Add exact-opt-in defaults for `FACTORY_GRAPH_V2=0`, `FACTORY_GRAPH_DISPATCH_V2=0`,
  `FACTORY_RELATIONSHIP_RESOLVER_V1=0`, and `FACTORY_RELATIONSHIP_CONSOLIDATION_V1=0` everywhere
  configuration is generated. Preserve existing secrets/env during deploy; `deploy.sh` rewrites the
  box env wholesale, so all four flags must be carried explicitly
  (`/memory/MINION/minion-factory-agent-pipeline.md`).
- With only the two shadow flags enabled, resolve graphs/profiles and record comparison events without
  admitting executions, dispatching, or creating candidates. Require
  zero wrong-repo, downgrade, lost-criterion, and duplicate-advance findings before enabling graph
  dispatch. Relationship consolidation remains off; only lineage/decision records are observed.
- Add operational counters for executions/nodes by state, oldest ready age, outbox retry/dead-letter,
  profile selection, repo mismatch, join wait, and resolver outcomes.

**Machine-checkable DoD:** D8 fixture E2E passes; configuration grep finds all four flags in every
env generator; the full 16-combination flag table proves mutation requires both its shadow and
mutation flag; unset, `true`, and typo values are off; disabling admission while work is active still
drains already-committed outbox jobs; runner tests/typecheck pass. Live deployment steps remain
operator evidence because factory dev containers have neither Docker nor SSH
(`/memory/MINION/factory/2026-08-17-c5f12e0e.md`).

## 5. Cross-repo impact assessment and ordering

| Impact zone | Impact | Mitigation / alert |
|---|---|---|
| `minion-meta` spec schema/index validation | New machine-readable body contract and controller-owned `completed_slices`. | Land S1 first; grandfather legacy specs; never hand-edit indexes; factory fetches commit-pinned content. |
| Machine-readable repo policy | Meta can validate repo syntax, but only the effective factory registry can validate mounted ids and aliases. | Land M1 first; S1 does syntax validation only; S3/S4 resolve through effective `REPOS`; parity tests include a mounted custom repo. |
| Factory manifest/topic policy | Profiles extend the manifest owned by the prerequisite spec. | Topic/manifest spec lands first; replace only its documented `profile: none` extension point; preserve monotonic risk/evidence. |
| Durable state/outbox | Graph persistence/advancement, projections, and resolver writes require its transition/outbox APIs. | No parallel queue/event tables; block S3–S7 until prerequisite contracts are present. |
| Repo policy/checkout | Fan-out can target every registered repo. | Resolve through the canonical registry, one repo per node, and fail before insertion on mismatch. No gateway/shared protocol or product-repo code changes are authorized. |
| Pull requests and merge policy | Merge becomes work-node completion evidence and can unlock downstream work; integration nodes have no implementation PR. | Bind work repo+PR+head+attestation; bind integration evidence to dependency heads; `FACTORY_AUTOMERGE=0` remains; security/data/auth/migration retain human merge. |
| Meta concurrent writers | Completion and resolver projections write shared markdown/index surfaces. | Transactional outbox, GitHub SHA CAS, refetch/recompute, stable idempotency keys; DB remains truth. |
| Browser verification | `ui-flow@1` requires a stage not yet shipped. | Explicit alert: the node is non-dispatchable/non-merge-eligible until browser-verification and containment land; never run Chrome in broad-credential workers. |
| Runner/agent images | Integration joins add a command-only agent entrypoint and runner dispatch path. | Build and deploy both images; prove the integration container lacks coding-model and PR-write credentials and receives only runner-issued capabilities. |
| Database migration | Additive SQLite schema and durable graph state. | Fresh/upgrade DDL tests, transactions, unique constraints, feature flags, no destructive migration. |
| UI (`minion-base`) | New graph state could later be rendered on the board. | Explicitly no UI work in this spec. Existing run/spec APIs remain backward compatible; a separate proposal/spec owns visualization. |

Required landing order is S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8 after the prerequisite gates in
§2. S6 and S7 may be developed alongside S5 only after S3's manifest/DB contract is stable, but all
must land before mutation flags are enabled. Each repository receives its own PR; do not combine
minion-meta and minion-factory changes.

## 6. Explicitly out of scope

- merging, retiring, superseding, or changing the status of any existing related artifact in this
  planning pass;
- a visual DAG editor, board graph UI, mobile approval UI, or changes to `minion-base`;
- browser container implementation, credentials, egress policy, screenshots, or UI verification
  tooling (owned by the browser-verification proposal and worker-containment prerequisite);
- changing `FACTORY_AUTOMERGE` policy or enabling autonomous merges;
- priority scheduling, dynamic critical-path optimization, speculative execution, or executing two
  nodes that edit the same repository branch concurrently;
- cross-repo atomic merge/rollback. Each PR remains an independent human merge; the graph sequences
  work and verifies integration after merges;
- inferring slice ownership from `repos` order, headings, filenames, or prose;
- destructive SQLite migrations or backfilling historical run rows as completed graph nodes;
- silently selecting a weaker profile when required evidence/capability is unavailable;
- changing gateway frames, shared npm packages, hub/site databases, auth, or product UI.

## 7. End-to-end verification

### 7.1 Automated fixture

Run from `minion-factory/runner/` after S8:

```bash
npm test
npm run typecheck
```

The E2E fixture must create a pinned spec graph with two repository work nodes, one dependent node,
and one integration join; assert two correctly routed root runs; replay the dispatcher; mark one PR
passed/ready and prove no continuation; supply controller-observed merge at attested head and prove
only its dependent advances; complete all dependencies and prove the join queues once; verify the
selected profile and immutable manifest/policy hashes; execute the join acceptance against the exact
dependency heads with no implementation PR; simulate a meta CAS conflict and prove
`completed_slices` converges; change the graph hash and prove projection refuses the stale write;
then evaluate one safe and one unsafe relationship and prove the safe case creates a new
criterion-preserving reviewed-draft request while the unsafe case creates only lineage/
human-decision records. The fixture must prove the complete shadow/mutation flag table and that
values other than exact `1` perform no gated admission, dispatch, or candidate creation.

### 7.2 Operator deployment verification

After all prerequisite and slice PRs are merged and deployed, with automerge still disabled:

1. Set `FACTORY_GRAPH_V2=1` while leaving `FACTORY_GRAPH_DISPATCH_V2=0` for one reconcile interval.
   Record graph/profile/policy hashes, predicted repo routes, and zero mismatch/downgrade/duplicate
   findings; confirm no execution or run is admitted.
2. Set `FACTORY_GRAPH_DISPATCH_V2=1`, then approve a disposable spec targeting two harmless fixture
   repositories. Confirm the DB contains
   one execution and explicit nodes/edges, and only ready roots create runs in their declared repos.
3. Merge the first fixture PR manually. Confirm the matching node completes once, the spec projects
   its stable id in `completed_slices`, and only newly ready dependents queue.
4. Merge remaining work PRs manually. Confirm the integration node waits for all dependencies, runs
   its declared E2E acceptance against their recorded heads without opening an implementation PR,
   and completes the execution without a second manual dispatch.
5. Set `FACTORY_RELATIONSHIP_RESOLVER_V1=1` and leave
   `FACTORY_RELATIONSHIP_CONSOLIDATION_V1=0` for fixture drafts. Confirm lineage/decision shadow rows
   and no candidate. Then set consolidation to `1`; confirm a safe `merges-drafts` pair produces a
   new criterion-preserving draft and fresh two-pass review while both sources remain unchanged. Add
   an active run to one source and confirm the same request produces lineage plus one human-decision
   item and no consolidated artifact.
6. Restart the runner between node completion and outbox delivery. Confirm recovery delivers the
   projection/continuation once. Turn both mutation/admission flags to `0` while leaving shadow flags
   on long enough to confirm no new mutation occurs and already-admitted outbox work still drains;
   then turn all four flags to `0` and confirm legacy single-repo run/list/lifecycle behavior and
   fail-loud legacy multi-repo refusal are unchanged.

Acceptance evidence is the focused/full test output, execution/node/event/outbox rows, exact PR and
attested head ids, projected frontmatter diff, profile/manifest hashes, resolver decision records,
and the operator's shadow comparison. Screenshots or agent-written “done” text are not substitutes.
