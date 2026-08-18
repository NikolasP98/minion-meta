---
id: 2026-08-18-factory-orchestration-round7-spec
title: Typed execution graph — repo fan-out, slice continuation, scenario profiles, relationship resolution
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
repos: [minion-factory, minion-meta]
proposal: 2026-08-18-factory-orchestration-round7
verdict: pending
relationship: depends-on
related: [2026-08-18-factory-topic-capability-manifest-spec, 2026-08-18-factory-durable-state-outbox-spec, 2026-08-18-factory-workitem-handoff-schema-spec, 2026-08-18-factory-orchestration-tests-spec, 2026-08-18-sdlc-transformation-roadmap]
---

# Typed execution graph — repo fan-out, slice continuation, scenario profiles, relationship resolution

## 0. Product — problem in the proposal's words

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
| `2026-08-18-factory-topic-capability-manifest-spec` | Direct prerequisite: it owns the immutable execution manifest and currently reserves `profile: none`; this spec adds profile and graph selection to that contract. |
| `2026-08-18-factory-durable-state-outbox-spec` | Direct prerequisite: graph advancement and meta projections must use guarded transitions plus transactional outbox delivery, not `postFinish()` best-effort side effects. |
| `2026-08-18-factory-workitem-handoff-schema-spec` | Its Slice 3 intentionally refuses multi-repo auto-dispatch until explicit per-slice routing exists; this spec replaces that temporary refusal after preserving its pinned-spec and trust invariants. |
| `2026-08-18-factory-orchestration-tests-spec` | Extends the first-party Node test harness; this spec adds graph/profile/resolver suites rather than inventing a second test runner. |
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

Before Slice 2 starts, implementation must verify on current `main` that the following prerequisites
are implemented, tested, and enabled in shadow or production form: immutable manifest revisions from
the topic/capability spec; guarded lifecycle events and transactional outbox from durable-state;
commit-pinned spec snapshots from WorkItem handoff; and the first-party Node test harness. A missing
prerequisite blocks the consuming slice. Do not recreate a reduced local substitute.

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

1. Every automatically executable spec contains a fenced `factory-execution` JSON block with
   `schemaVersion`, stable node ids, explicit `repo`, `slice`, `dependsOn`, `profile`, and
   machine-checkable `acceptance` commands/evidence. Nodes form a directed acyclic graph. A node may
   own only one repository; cross-repo work is separate ship units.
2. Approval resolves that graph against the commit-pinned spec and the immutable topic policy,
   persists an execution plus all nodes/edges in one transaction, selects a versioned scenario
   profile for each node, and writes outbox jobs for every newly ready root. Array order, object key
   order, and repeated sweeps do not change the graph hash or create duplicate runs.
3. A run carries `execution_id`, `node_id`, `slice_id`, `profile_id`, and the exact manifest/spec
   revision. Dispatch refuses when the run repo differs from the node repo or registry policy.
4. A node becomes complete only from controller-observed proof: its PR is merged at the attested
   head and all profile/manifest-required evidence is satisfied. A passed or ready PR alone is not
   completion. Completion is idempotent and append-only.
5. Completing a node level-triggers all newly ready dependents. An integration join is an explicit
   node (`kind: integration`) which becomes runnable only after every declared dependency completes;
   it performs contract/E2E verification in its declared repo and cannot be inferred from “all PRs
   exist.” Failed, canceled, closed-unmerged, or stale-head predecessors never unlock it.
6. Spec frontmatter projects `completed_slices: [...]` only after durable completion. Because the
   flat parser permits string arrays, entries are stable node ids, not ambiguous display numbers.
   Projection failure leaves the DB authoritative and a retryable outbox job; it never rolls back a
   real merged node or advances another node early.
7. Profiles are versioned immutable data with exactly these initial ids:
   `single-repo-low-risk@1`, `ui-flow@1`, `cross-repo-contract@1`,
   `database-migration@1`, `security-auth@1`, `incident-fix@1`. The manifest selects a profile from
   effective topics, graph shape, and declared intent using deterministic precedence. A node may
   request a stricter compatible profile but may never downgrade the derived one. Unknown,
   incompatible, or ambiguous selection fails closed.
8. Profiles constrain existing mechanisms—required stages/evidence, provider independence, review
   strictness, budgets, merge eligibility, and operator verification. They do not grant credentials
   or bypass human gates. `database-migration` and `security-auth` always retain approval and merge
   gates. `ui-flow` may require browser evidence only after the separate browser stage is available;
   until then it is non-merge-eligible, not silently downgraded.
9. Relationship resolution is deterministic and recommend-only by default. `extends`, `depends-on`,
   `conflicts-with`, `already-satisfied`, and unsafe `merges-drafts`/`supersedes` become immutable
   lineage records plus a human-decision item. Automatic consolidation is allowed only when both
   source artifacts are drafts, neither has active/nonterminal executions or open implementation
   PRs, all acceptance criteria are preserved by stable fingerprints, and the output is a new draft
   sent through a fresh two-pass review. Sources are not retired or mutated by the resolver.
10. All new graph transitions use the durable-state guarded transition/event/outbox APIs. Repeated
    boot/sweep/webhook delivery is safe. `FACTORY_GRAPH_V2` and `FACTORY_RELATIONSHIP_RESOLVER_V1`
    are exact opt-ins; unset/typo means off. Existing single-run behavior remains available during
    shadow comparison, and `FACTORY_AUTOMERGE=0` remains unchanged.

### 3.3 DELTA — transitions, slices, and proof

| # | Transition | Slice | Proving test/evidence |
|---|---|---|---|
| D1 | Human prose slices gain a validated, canonical `factory-execution` DAG contract. | S1 | `execution-graph.test.mjs`: valid single/cross-repo graphs; duplicate ids, cycles, unknown repos/profiles, missing acceptance, and repo-less nodes reject with file+node. |
| D2 | Approved pinned specs resolve into durable execution/node/edge records with stable hashes. | S2 | `execution.test.ts`: reordered equivalent JSON hashes identically; transaction rollback leaves zero partial rows; repeated resolve returns the same execution. |
| D3 | First-recognized-repo dispatch becomes one run per ready graph node, each bound to its explicit repo/slice/profile. | S3 | `graph-dispatch.test.ts`: two roots in different repos create two correct runs; alias/registry mismatch and repo mismatch create zero runs plus a typed failure event. |
| D4 | Linear “S1 only” becomes merge-observed, level-triggered continuation and all-dependency integration joins. | S4 | `graph-advance.test.ts`: passed/ready/closed-unmerged/stale-head do not advance; merged+attested advances once; N-of-N join waits until N; replay creates no duplicate. |
| D5 | One generic stage recipe becomes deterministic, versioned scenario-profile selection and enforcement. | S5 | `profiles.test.ts`: table cases for all six profiles, precedence, no downgrade, unknown version, security/data human gates, and unavailable browser evidence fail closed. |
| D6 | DB node completion projects stable `completed_slices` ids into spec frontmatter without making markdown authoritative. | S6 | `graph-projection.test.ts`: CAS conflict/outage retries; DB completion remains; duplicate projection is byte-stable; unrelated frontmatter is preserved. |
| D7 | Passive relationship metadata gains safe-boundary resolution, lineage, and fresh-review consolidation. | S7 | `relationship-resolver.test.ts`: every unsafe predicate yields lineage+human decision and no mutation; safe pair creates one criterion-preserving draft and one review request; replay is idempotent. |
| D8 | The complete multi-repo flow is observable, flag-gated, reversible, and verified end to end. | S8 | Fixture E2E plus operator deployment verification in §7: graph hash, two repo runs, merge-triggered continuation, join, projection, and safe/unsafe resolver cases. |

## 4. Approach — vertical implementation slices

Each slice is one repository-scoped ship unit sized for approximately 4–8 focused hours. A slice may
not edit files assigned to another slice/repository. `logic` slices use red-state tests first.

### Slice 1 — Authoring and validation contract (minion-meta, 4–6h)

**Files to touch:** `specs/TEMPLATE.md`; `scripts/spec-index.mjs`; new
`scripts/execution-graph.mjs`; new `scripts/execution-graph.test.mjs`; `package.json` only if needed
to expose the focused test command.

- Specify one fenced `factory-execution` JSON block. Required node fields are
  `{id, kind, repo, slice, dependsOn, profile, acceptance}`; `kind` is `work|integration`;
  `acceptance` is a non-empty array of controller-verifiable commands/evidence ids.
- Canonicalize keys and set-like arrays for hashing, but preserve dependency semantics. Validate
  stable ids, unique ids, known repo ids/profile ids, dependency existence, acyclicity, and at least
  one integration node when graph roots span multiple repositories.
- Add optional flat `completed_slices: [...]` to the template as a controller-owned projection;
  authors and agents must not set it to claim completion.
- Grandfather existing specs without a graph. New/updated specs requesting automatic graph dispatch
  must have one; legacy specs continue on the old path while `FACTORY_GRAPH_V2` is off.

**Machine-checkable DoD:** `node scripts/execution-graph.test.mjs` and
`node scripts/spec-index.mjs` pass; negative fixtures for every D1 rejection produce non-zero exit
and identify the source file/node; no `index.json` is hand-edited.

### Slice 2 — Durable graph model and pinned resolution (minion-factory, 6–8h)

**Files to touch:** new `runner/src/execution.ts`; new `runner/src/execution.test.ts`;
`runner/src/db.ts`; `runner/src/github.ts`; `runner/src/queue.ts` only at the approved-spec entry
adapter.

- Add additive tables `executions`, `execution_nodes`, and `execution_edges`, with unique keys on
  `(spec_sha, graph_hash)` and `(execution_id, node_id)`. Store the pinned spec hash, manifest
  revision/hash, profile version, node state, and timestamps. Use the durable event/outbox tables for
  transition delivery rather than adding a second queue.
- Parse only the pinned spec snapshot. Resolve repository ids through the actual `REPOS` registry
  and its canonical alias API supplied by the repo-policy work; do not treat `REPO_ALIASES` as the
  registry (`/memory/MINION/factory/2026-08-18-ac227e10.md`).
- In one transaction, validate/canonicalize/hash the graph, persist nodes/edges, emit
  `execution.created`, and enqueue ready-root outbox work. Persist no partial graph on error.

**Machine-checkable DoD:** focused Node tests prove D2 including fresh-DB DDL, upgrade DDL,
rollback, stable hash, replay idempotency, missing prerequisite refusal, and pinned-spec immutability;
`npm test` and `npm run typecheck` pass in `runner/`.

### Slice 3 — Repo-node fan-out and dispatch guard (minion-factory, 4–6h)

**Files to touch:** `runner/src/queue.ts`; new `runner/src/graph-dispatch.ts`; new
`runner/src/graph-dispatch.test.ts`; `runner/src/db.ts` Run fields; `runner/src/index.ts` response
projection if run details expose the fields.

- Add nullable `execution_id`, `node_id`, `slice_id`, and `profile_id` to runs and every insert/requeue
  path. Retries inherit exactly the same binding.
- Consume ready-node outbox jobs to create one run per node. The task names only that node/slice;
  never “Slice 1” by convention. Atomically claim the node and insert/dedupe the run.
- Immediately reject node repo vs run repo vs registered checkout mismatch and emit a typed alert.
  This is the first-attempt guard required by memories `60a08042` and `39c3a54c`.

**Machine-checkable DoD:** D3 tests cover parallel roots, sequential roots, alias normalization,
mounted repo registry, unmapped repo, mismatched repo, duplicate delivery, and requeue inheritance.
No test may assert only log text; it must assert rows/events and zero wrong-repo inserts.

### Slice 4 — Merge-observed continuation and integration join (minion-factory, 6–8h)

**Files to touch:** new `runner/src/graph-advance.ts`; new
`runner/src/graph-advance.test.ts`; `runner/src/queue.ts`; `runner/src/automerge.ts`; the landed
post-merge webhook/reconciler adapter if available, otherwise the durable outbox reconciler owned by
the prerequisite spec.

- Observe merged PR state through the existing authenticated GitHub adapter and bind it to run repo,
  PR, attested head, node, and execution. Never accept agent result JSON as merge proof.
- Guard `ready|running → completed` with compare-and-set semantics, append the event, and enqueue
  dependent evaluation in the same transaction. A dependent is ready iff all declared predecessors
  are completed.
- Make periodic reconciliation level-triggered so missed webhooks heal. Integration nodes use the
  same dispatcher but carry their own explicit acceptance contract.

**Machine-checkable DoD:** all D4 table cases pass under duplicate and out-of-order events; a crash
between transition and delivery is repaired from the outbox; no `postFinish()` best-effort callback
is the sole advancement path.

### Slice 5 — Versioned scenario profiles (minion-factory, 4–6h)

**Files to touch:** new `runner/src/profiles.ts`; new `runner/src/profiles.test.ts`;
`runner/src/manifest.ts` from the prerequisite; `runner/src/queue.ts`; `agent/run.sh` only to consume
runner-resolved stage/budget inputs (no policy literals in shell); `runner/README.md`.

- Define the six immutable `@1` profiles as typed policy data. Each names compatible node kinds,
  topic/graph selectors, required stages/evidence, provider-independence requirement, bounded
  budgets, human gates, and merge eligibility.
- Selection precedence is: security/auth → database migration → incident fix → cross-repo contract
  → UI flow → single-repo low risk. Combine equal matches conservatively or reject ambiguity.
- Replace the manifest's `profile: none` placeholder with selected id/version and hash it into the
  immutable revision. Later policy versions coexist; they never reinterpret active executions.

**Machine-checkable DoD:** D5 table-driven tests pass for every profile and overlap; grep shows no
duplicated profile policy in `agent/run.sh`; an unavailable required capability/evidence prevents
dispatch or merge rather than choosing a weaker profile.

### Slice 6 — Completion projection (minion-factory, 4–6h)

**Files to touch:** new `runner/src/graph-projection.ts`; new
`runner/src/graph-projection.test.ts`; `runner/src/github.ts`; the landed outbox handler registry;
`runner/src/lifecycle.ts` only to expose/read projection status.

- On `node.completed`, enqueue an idempotent projection job that fetches the pinned/current artifact,
  updates only `completed_slices`, preserves unrelated fields/body, validates the result, and PUTs
  with GitHub SHA compare-and-set.
- Projection contains the sorted union of completed stable node ids. A conflict refetches and
  recomputes; validation failure dead-letters and alerts. DB node state remains authoritative.

**Machine-checkable DoD:** D6 tests prove byte-stable replay, CAS repair, validation failure,
outage retry, concurrent completions, and preservation of unrelated frontmatter. Typecheck and the
full runner test suite pass.

### Slice 7 — Safe-boundary relationship resolver (minion-factory, 6–8h)

**Files to touch:** new `runner/src/relationship-resolver.ts`; new
`runner/src/relationship-resolver.test.ts`; `runner/src/db.ts`; `runner/src/github.ts`;
`runner/src/lifecycle.ts`; `agent/spec.sh` only to invoke the existing fresh two-pass review for a
new consolidated draft.

- Add immutable `artifact_lineage` and `relationship_decisions` records keyed by source revisions
  and resolver version. Normalize/sort related ids before evaluation.
- For every relationship, record lineage. Only `merges-drafts` and `supersedes` may become a
  consolidation candidate, and only if both artifacts are still drafts at the compared revisions,
  neither has nonterminal runs/open implementation PRs, and canonical acceptance fingerprints from
  both are a subset of the candidate.
- Create a **new** draft candidate with both parents and a criterion mapping. Do not mutate either
  source. Queue fresh pass 1 + independent pass 2 review; only a later human/resolver lifecycle
  decision may retire/supersede sources.
- Any failed predicate, conflict, non-draft, lost criterion, unsupported relationship, or ambiguous
  ancestry records `human-decision-required` and creates one idempotent decision item.

**Machine-checkable DoD:** D7 matrix tests prove safe and every unsafe boundary, criterion multiset
preservation, active-run/PR checks, source immutability, deterministic ids, and replay idempotency.

### Slice 8 — Shadow rollout and end-to-end graph verification (minion-factory, 4–6h)

**Files to touch:** new `runner/src/execution.e2e.test.ts`; `.env.example`; `setup.sh`;
`deploy.sh`; `docker-compose.yml`; `runner/README.md`.

- Add exact-opt-in `FACTORY_GRAPH_V2=0` and `FACTORY_RELATIONSHIP_RESOLVER_V1=0` defaults everywhere
  configuration is generated. Preserve existing secrets/env during deploy; `deploy.sh` rewrites the
  box env wholesale, so both flags must be carried explicitly.
- In shadow mode, resolve graphs/profiles and record comparison events without dispatching. Require
  zero wrong-repo, downgrade, lost-criterion, and duplicate-advance findings before enabling graph
  dispatch. Relationship mutation remains off; only lineage/decision records are observed.
- Add operational counters for executions/nodes by state, oldest ready age, outbox retry/dead-letter,
  profile selection, repo mismatch, join wait, and resolver outcomes.

**Machine-checkable DoD:** D8 fixture E2E passes; configuration grep finds both flags in every env
generator; unset, `true`, and typo values are off; runner tests/typecheck pass. Live deployment steps
remain operator evidence because factory dev containers have neither Docker nor SSH
(`/memory/MINION/factory/2026-08-17-c5f12e0e.md`).

## 5. Cross-repo impact assessment and ordering

| Impact zone | Impact | Mitigation / alert |
|---|---|---|
| `minion-meta` spec schema/index validation | New machine-readable body contract and controller-owned `completed_slices`. | Land S1 first; grandfather legacy specs; never hand-edit indexes; factory fetches commit-pinned content. |
| Factory manifest/topic policy | Profiles extend the manifest owned by the prerequisite spec. | Topic/manifest spec lands first; replace only its documented `profile: none` extension point; preserve monotonic risk/evidence. |
| Durable state/outbox | Graph advancement, projections, and resolver writes require its transition/outbox APIs. | No parallel queue/event tables; block S2/S4/S6/S7 until prerequisite contracts are present. |
| Repo policy/checkout | Fan-out can target every registered repo. | Resolve through the canonical registry, one repo per node, and fail before insertion on mismatch. No gateway/shared protocol or product-repo code changes are authorized. |
| Pull requests and merge policy | Merge becomes node-completion evidence and can unlock downstream work. | Bind repo+PR+head+attestation; `FACTORY_AUTOMERGE=0` remains; security/data/auth/migration retain human merge. |
| Meta concurrent writers | Completion and resolver projections write shared markdown/index surfaces. | Transactional outbox, GitHub SHA CAS, refetch/recompute, stable idempotency keys; DB remains truth. |
| Browser verification | `ui-flow@1` may require a stage not yet shipped. | Explicit alert: the profile is non-merge-eligible until browser-verification and containment land; never run Chrome in broad-credential workers. |
| Database migration | Additive SQLite schema and durable graph state. | Fresh/upgrade DDL tests, transactions, unique constraints, feature flags, no destructive migration. |
| UI (`minion-base`) | New graph state could later be rendered on the board. | Explicitly no UI work in this spec. Existing run/spec APIs remain backward compatible; a separate proposal/spec owns visualization. |

Required landing order is S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8. S5 may be developed
alongside S4 only after S2's manifest/DB contract is stable, but it must land before graph dispatch is
enabled. Each repository receives its own PR; do not combine minion-meta and minion-factory changes.

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
selected profile and immutable manifest hash; simulate a meta CAS conflict and prove
`completed_slices` converges; then evaluate one safe and one unsafe relationship and prove the safe
case creates a new reviewed-draft request while the unsafe case creates only lineage/human-decision
records. The fixture must also prove flags other than exact `1` perform no dispatch/mutation.

### 7.2 Operator deployment verification

After all prerequisite and slice PRs are merged and deployed, with automerge still disabled:

1. Enable `FACTORY_GRAPH_V2=1` in shadow mode for one reconcile interval. Record graph/profile hashes,
   predicted repo routes, and zero mismatch/downgrade/duplicate findings.
2. Approve a disposable spec targeting two harmless fixture repositories. Confirm the DB contains
   one execution and explicit nodes/edges, and only ready roots create runs in their declared repos.
3. Merge the first fixture PR manually. Confirm the matching node completes once, the spec projects
   its stable id in `completed_slices`, and only newly ready dependents queue.
4. Merge remaining work PRs manually. Confirm the integration node waits for all dependencies, runs
   its declared E2E acceptance, and completes the execution without a second manual dispatch.
5. Enable `FACTORY_RELATIONSHIP_RESOLVER_V1=1` for fixture drafts only. Confirm a safe
   `merges-drafts` pair produces a new draft and fresh two-pass review while both sources remain
   unchanged. Add an active run to one source and confirm the same request produces lineage plus one
   human-decision item and no consolidated artifact.
6. Restart the runner between node completion and outbox delivery. Confirm recovery delivers the
   projection/continuation once. Turn both flags back to `0`; confirm existing run/list/lifecycle
   behavior is unchanged.

Acceptance evidence is the focused/full test output, execution/node/event/outbox rows, exact PR and
attested head ids, projected frontmatter diff, profile/manifest hashes, resolver decision records,
and the operator's shadow comparison. Screenshots or agent-written “done” text are not substitutes.
