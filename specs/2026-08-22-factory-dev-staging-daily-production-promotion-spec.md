---
id: 2026-08-22-factory-dev-staging-daily-production-promotion-spec
title: Factory release train — dev staging candidates and daily production promotion
stage: spec
status: review
pass: 1
created: 2026-08-22
updated: 2026-08-28
repos: [minion-factory]
proposal: 2026-08-22-factory-dev-staging-daily-production-promotion
verdict: pending
type: infra
relationship: supersedes
related: [2026-08-18-factory-release-rollback-spec, 2026-08-22-factory-lineage-orchestrator-instance-spec, 2026-08-22-ci-compute-savings-bun-test-roadmap]
tags: [data, infra, logic, security, test]
---

# Factory release train — dev staging candidates and daily production promotion

## 0. Product

Factory releases become a build-once promotion train:

```text
feature PR -> dev -> immutable daily candidate C -> isolated staging
           -> deterministic tests -> one acceptance agent per feature
           -> independent verifier -> production drain/backup/deploy/smoke
           -> fast-forward main to exact C
```

The train gives `dev` and `main` different meanings. `dev` is the integration branch and source of
candidate snapshots. `main` is the auditable record of the last production-smoke-approved source
SHA. Production runs immutable runner and agent image digests, not a host rebuild of whichever branch
moved most recently.

If approved, this spec will supersede
[`2026-08-18-factory-release-rollback-spec`](2026-08-18-factory-release-rollback-spec.md).
The old spec's staging/canary exclusion, floating local image build, snapshot-only database recovery,
and direct five-minute `main` self-update will no longer be release authority. Its useful requirements—
fail-closed gating, health verification, SQLite integrity checks, bounded retention, exact failure
reporting, and rollback—remain mandatory here.

The durable controller, scoped-worker, capability, outbox, and provider-origin rules in
[`2026-08-22-factory-lineage-orchestrator-instance-spec`](2026-08-22-factory-lineage-orchestrator-instance-spec.md)
remain prerequisites. The compute-savings work in
[`2026-08-22-ci-compute-savings-bun-test-roadmap`](../proposals/2026-08-22-ci-compute-savings-bun-test-roadmap.md)
may optimize a test lane only after proving equivalent discovery and failure detection. It may not
remove or downgrade any release acceptance contract.

## 1. Authority, terms, and non-negotiable invariants

### 1.1 Terms

| Term | Meaning |
|---|---|
| `P` | Full source SHA in the last trusted production release receipt. Before a production mutation, `main` and the live production manifest must both resolve to `P`. |
| `C` | Full `dev` SHA captured atomically by the daily snapshot event. `C` never follows later branch movement. |
| `D` | A later `dev` head observed after `C` was captured. `D` is not part of the in-flight release. |
| candidate manifest | Canonical, content-addressed record binding `P`, `C`, the complete range ledger, contracts, CI evidence, runner digest, agent digest, platform, and policy versions. |
| production receipt | Controller-observed record of exact deployed manifest/digests, DB backup/restore evidence, smoke evidence, and source SHA. |
| acceptance contract | Repository-owned declaration for one feature/change in `P..C`; it selects allowlisted IDs and contains no executable text. |

### 1.2 Invariants

1. Feature PRs target `dev`. No feature PR or direct human push updates `main`.
2. One accepted candidate has exactly one `P`, one `C`, one candidate-manifest digest, one runner
   digest, and one agent digest.
3. CI builds runner and agent once for the accepted candidate. Staging and production pull the same
   registry digests. Retagging may add a human-readable alias, but aliases are never deployment input
   or identity evidence.
4. Production is never deployed when its recorded `P` is not an ancestor of `C`.
5. Every commit/PR in `P..C` is classified. Every feature has exactly one accepted contract and one
   feature acceptance-agent verdict. An explicitly exempt non-feature change still has a reviewed
   classification contract and required deterministic test IDs.
6. Contracts and agents select registry IDs only. A contract, PR body, model output, or API request
   cannot supply shell, argv, Docker flags, host paths, environment names, or credentials.
7. The independent verifier's resolved provider origin has a different reviewed
   `independence_group` from the orchestrator, implementer, and feature acceptance agents whose work
   it verifies. A different model name or aggregator route does not establish independence.
8. Staging and production share no Docker socket, writable volume, database, secret set, or private
   service network. Acceptance agents receive staging-scoped typed tools only.
9. Drain and startup hold prevent admitted production work from writing after the backup boundary and
   before production smoke passes. A timeout or unverifiable hold fails closed.
10. `main` moves from exact `P` to exact `C` only after production smoke. The update is
    compare-and-swap and fast-forward only; no force push, merge commit, rebuild, or content rewrite.
11. Every state transition and external effect is idempotent and reconciled from remote truth after a
    crash. Agent prose is never completion evidence.

## 2. AS-IS — verified inputs and known unknowns

1. The currently approved rollback spec records `/opt/factory/scripts/self-update.sh` as a
   five-minute cron path that
   fetches `main`, resets the production checkout, builds implicit `:latest` runner/agent images, and
   restarts the production runner. The same spec records the desired CI, SQLite, health, and image
   rollback protections, but excludes staging/canary and automatic DB restore.
2. The 2026-08-18 repository-policy evidence records `minion-factory` with `main` as development,
   default, release, and PR base; no `dev` branch role; no required check; and no enforceable ruleset
   observed. Its REST ruleset/protection surfaces returned plan-related `403` for the private personal
   repository. That evidence must be refreshed before implementation because branch and plan state
   can change.
3. The lineage spec defines durable effects, exact candidate SHAs, scoped workers, hibernation, and
   provider-origin independence, but does not define a daily build-once release train.
4. The exact daily Lima time, staging host, drain deadline, and provider-origin independence mapping
   are intentionally undecided. Implementers must not invent them.

## 3. TO-BE — end-to-end release behavior

### 3.1 Candidate snapshot and skip/ancestry gates

At the configured daily `America/Lima` schedule, the controller:

1. acquires the singleton release-train lease;
2. resolves `refs/heads/dev` once and stores full SHA `C` plus the remote observation receipt;
3. reads the last trusted production receipt to resolve `P`, the previous runner/agent digests, and
   the previous DB compatibility metadata;
4. if production already has a trusted, healthy receipt for exact `C` and the same candidate-manifest
   digest, skips deployment and reconciles only any pending post-smoke `main` fast-forward;
5. otherwise requires `P` to be an ancestor of `C`, `main` to equal `P`, and no other active candidate;
6. computes the complete ordered `P..C` range ledger; and
7. seals the candidate identity. Later movement of `dev` cannot mutate it.

An absent production receipt, non-ancestor range, changed `main`, ambiguous live digest, or untrusted
"already deployed" claim moves the train to `attention-required`. It does not guess a baseline or
rebuild production.

### 3.2 Complete `P..C` range ledger

Branch policy requires linear `dev` history and one squash commit per merged PR after activation.
For each commit in `git rev-list --reverse P..C`, the controller resolves exactly one merged PR and
records PR number, source/head SHA, merge SHA, author, contract path, contract blob SHA, and change
class. Zero or multiple associated PRs is a hard ambiguity.

Each PR supplies exactly one new or updated contract under the new path
`release/acceptance-contracts/<feature-id>.yaml`. The controller rejects:

- a feature PR without a contract;
- duplicate `feature_id` or `source_pr` ownership;
- a contract changed outside its owning PR without an explicit supersession relation;
- an unknown test/profile/scenario ID;
- executable fields such as `command`, `script`, `shell`, `argv`, Docker flags, or host paths; or
- a feature whose acceptance criteria are not represented by deterministic test IDs and an
  acceptance-agent profile/scenario set.

Allowed non-feature classes are fixed in the schema. A docs, policy, CI, or operational-only PR may
use a reviewed exemption, but the exemption still states affected surfaces, deterministic test IDs,
and why a feature acceptance agent is not applicable. Feature classification can never use that
exemption.

### 3.3 Build once and candidate identity

The exact-`C` CI workflow performs source checks and then builds the runner and agent in one release
candidate run. It publishes immutable registry objects and emits a canonical manifest containing:

- schema version, candidate id, `P`, `C`, repository id, and snapshot timestamp;
- range-ledger digest and ordered contract blob digests;
- workflow identity, run id/attempt, exact workflow blob SHA, and required-check receipts;
- pinned toolchain, lockfile, Dockerfile/context hashes, target platform, and builder identity;
- runner image index digest and selected platform manifest/config digests;
- agent image index digest and selected platform manifest/config digests;
- deterministic test-registry digest, acceptance-profile registry digest, smoke-registry digest;
- migration/DB compatibility declaration; and
- the canonical manifest SHA-256.

The first complete, validated artifact set accepted for `(repo, C, build-input-hash)` is immutable.
A retry may reconcile an interrupted upload, but cannot replace an accepted digest set. A different
digest for the same accepted key is an ambiguity requiring operator disposition. Staging and
production deploy only `image@sha256:...` references from this exact manifest.

### 3.4 Isolated staging gate

The controller deploys the manifest to the selected isolated staging environment while staging is in
startup hold. Staging runs on a separately provisioned host or VM with its own kernel and
administrative boundary, daemon/socket, network, volumes, database, service identity, registry pull
credential, application secrets, and endpoint. A second Docker daemon on the production host is not
sufficient isolation. Production secrets/data are unavailable there. The staging deploy worker,
acceptance agents, verifier, and production deploy worker do not share a Docker socket.

The staging gate runs in this order:

1. verify pulled runner/agent digests against the manifest;
2. prepare a staging-only database/fixture and apply candidate migrations;
3. start candidate services under startup hold;
4. run all candidate deterministic test IDs using the controller-owned allowlist;
5. run one fresh, feature-scoped acceptance agent per feature contract;
6. run the independent verifier against the exact evidence set and staging candidate; and
7. release staging hold only for any explicitly required final observation, then return it to a
   clean held or stopped state.

Each feature agent receives only its immutable contract, candidate manifest digest, staging endpoint,
staging-scoped identity, allowed typed tools/scenario IDs, and bounded evidence refs. It has no shell,
Docker socket, GitHub credential, production endpoint, production secret, or another feature's
private transcript. Its structured result is stamped with contract blob SHA, `C`, manifest digest,
resolved provider origin, profile, scenario IDs, timestamps, and artifact hashes.

The verifier is a fresh run from a different reviewed independence group. It checks range
completeness, deterministic results, each feature verdict, exact staging digests, migration evidence,
and required observables. It cannot waive a red/missing result or deploy.

### 3.5 Production drain, backup, deploy, and smoke

After a one-time human-approved activation and cutover policy exists, every eligible daily candidate
advances automatically from complete staging verification into production. Eligibility requires the
candidate and every item in `P..C` to satisfy the pinned risk/merge policy, all required human review
for security, data, migration, and other high-risk changes to have occurred before merge to `dev`, and
every staging gate in this spec to be green. Human action remains required for spec approval, initial
cutover, break-glass, cancellation, and any attention or rollback-recovery state; it is not a routine
per-candidate production gate.

The controller:

1. revalidates the candidate manifest, staging receipts, production receipt `P`, `main == P`, and
   `P` ancestor of `C`;
2. places production intake and schedulers in drain mode, rejects or queues new write-producing work,
   and waits for active work according to the operator-approved drain deadline;
3. enters startup hold and proves no admitted workload can begin;
4. uses SQLite's online backup API to create a backup tied to candidate id and `P`, then records file
   size, `PRAGMA quick_check`, SHA-256, schema/user version, and durable path;
5. pulls the exact runner/agent digests already accepted in staging and verifies local manifest
   resolution before stopping the old services;
6. records whether migration or candidate DB mutation begins, starts the exact candidate under hold,
   and reconciles service/image identity from Docker/runtime inspection;
7. runs allowlisted post-deploy smoke IDs against the production endpoint and verifies the production
   receipt fields; and
8. only on green smoke releases startup hold and drain, records production success, then requests the
   compare-and-swap fast-forward of `main` from exact `P` to exact `C`.

If `main` changes before the final compare-and-swap, production remains on healthy `C`, the train
enters `attention-required`, and no force push occurs. A restart reconciles the already-green
production receipt and retries only the pending fast-forward after an operator resolves branch
truth. The next candidate cannot start until this split state is closed.

### 3.6 Rollback semantics

The prior production receipt is the rollback source. Floating tags and locally rebuilt images are
invalid rollback inputs.

- If failure occurs before candidate DB mutation and the live DB schema/hash evidence remains at the
  predeploy boundary, redeploy exact prior runner/agent digests and leave the DB intact.
- If migration/candidate DB mutation began, or DB compatibility cannot be proved, stop candidate
  services while hold remains active, restore the exact verified predeploy SQLite backup through an
  atomic replacement procedure, handle WAL/SHM files according to the tested runbook, run
  `PRAGMA quick_check`, then start exact prior digests.
- Run rollback smoke before releasing hold/drain. Keep `main` at `P` and record the candidate failed.
- If image rollback, DB restore, integrity verification, or rollback smoke fails, keep intake held,
  mark `rollback-attention-required`, and alert the operator. Never start a new candidate or claim
  recovery.

Release-train control state is outside the application restore domain. Leases, candidates, manifests,
events, effects, receipts, and the `legacy-disabled` sentinel live in an independently mounted control
database such as `/opt/factory/release-state/release-train.db`, not `/data/factory.db`. A candidate
application-DB restore must never rewind the release ledger. After rollback and controller restart,
the terminal candidate and every confirmed effect remain visible and no effect is repeated.

The drain/hold boundary is what makes DB restoration safe: no accepted production writes may occur
between the backup and either successful candidate release or completed rollback. The implementation
must test every write ingress, not only the runner queue.

### 3.7 Artifact, evidence, and backup retention

Garbage collection is reference-aware and fail closed. It may not delete a manifest, runner/agent
digest, backup, contract, test artifact, or evidence object referenced by live production, its current
rollback source, a nonterminal candidate, or any `attention-required`/`rollback-attention-required`
state. Missing or unreadable current/rollback artifacts block production admission before drain.

After protected references are accounted for, retain immutable manifests, image digests, and evidence
for the newest 20 completed releases and for at least 90 days, whichever retains more. Retain the
newest 20 completed-release application-DB backups after excluding backups still protected by a live
reference; protected backups are not pruned merely to meet the count. A successful GC pass records
the full protected set, deletion candidates, registry/storage receipts, and post-delete reachability.
Tests prove referenced objects are never proposed or accepted for deletion.

## 4. Contract and allowlist schemas

### 4.1 Feature acceptance contract

New contracts validate against a versioned schema. Required logical fields are:

```yaml
schemaVersion: 1
featureId: stable-feature-id
sourcePr: 123
changeClass: feature
acceptanceCriteria:
  - id: AC-1
    observable: bounded human-readable outcome
deterministicTestIds:
  - factory.unit
acceptanceAgentProfileId: factory.feature-default-v1
acceptanceScenarioIds:
  - feature-id.happy-path
productionSmokeIds:
  - factory.production.health
dbCompatibility: migration-or-data-write-declaration
```

This is a schema example, not authority for these sample IDs. An implementation may activate only
IDs that exist in the reviewed registries at `C`. The schema rejects executable text and unknown
fields by default.

### 4.2 Test and profile registries

The new `release/acceptance-tests.yaml` is controller-owned and reviewed. Each test ID maps to a
fixed argv array, cwd enum, timeout, resource profile, network policy, fixture profile, and expected
artifact schema. Execution uses direct process spawn with `shell: false`; the controller never joins
strings or invokes `sh -c`, `bash -c`, `eval`, or command substitution.

The new `release/acceptance-agent-profiles.yaml` and `release/smoke-tests.yaml` use the same pattern:
stable IDs resolve to fixed typed capabilities/scenarios. Contract authors choose IDs only. A registry
change is itself in `P..C`, passes deterministic security fixtures, and is bound into the candidate
manifest before use.

## 5. Durable promotion state machine

One `release_candidates` row and append-only `release_events`/`release_effects` records in the
independently mounted release-control database are authoritative. At most one nonterminal candidate
exists per repository/environment pair. The control database is backed up and recovered separately;
application rollback cannot restore or replace it.

```text
scheduled
  -> snapshotted
  -> range-validated
  -> artifacts-accepted
  -> staging-deploying
  -> staging-testing
  -> staging-verified
  -> production-admission-ready
  -> production-draining
  -> production-backed-up
  -> production-deploying
  -> production-smoke
  -> production-verified
  -> main-fast-forwarding
  -> completed
```

Terminal/attention branches are `skipped-current`, `rejected`, `rolled-back`,
`attention-required`, and `rollback-attention-required`. Planned cancellation before production is
`canceled`; after any production mutation, cancellation must execute the rollback decision table.

Every transition uses compare-and-swap on current state, candidate id, `P`, `C`, manifest digest,
and plan revision. Every external effect has a stable idempotency key and records `prepared`,
`attempted`, remote receipt, and `confirmed`. On restart the controller asks remote truth first:
registry digests, staging/prod runtime identities, hold/drain state, backup hashes, smoke receipts,
and GitHub ref SHA. It never repeats an effect merely because local confirmation was interrupted.

## 6. Behavior when `dev` advances during testing

If `dev` moves from `C` to `D` after snapshot:

1. continue testing exact `C`; do not rebuild, rebase, append contracts, or silently widen `P..C`;
2. expose `D` as `next_dev_sha` telemetry only;
3. leave commits in `C..D` for the next daily candidate;
4. reject any evidence stamped with `D` or with a contract/registry blob not in `C`;
5. if a verified safety blocker in `D` supersedes `C`, require an explicit cancel decision. Cancel
   before production, then create a new candidate from a fresh snapshot; never mutate the existing
   candidate id; and
6. after successful `C` promotion, fast-forward `main` only to `C`, not current `dev`/`D`.

Only one candidate may be in a production-capable state. A newer snapshot cannot overtake an older
candidate or share its staging evidence.

## 7. Branch, ruleset, and actor requirements

### 7.1 `dev`

- Create `dev` from the trusted `main`/production baseline at activation.
- Make `dev` the repository default at activation. Keep `main` solely as the release-record ref.
- Make feature branches open PRs to `dev`; require linear history and one squash commit per PR.
- Block direct pushes, force pushes, deletion, and administrator bypass except a documented
  break-glass principal whose use alerts and invalidates active candidates.
- Require the exact CI source checks, contract-schema/range checks, deterministic tests appropriate
  to PR scope, and review policy. Record required check name plus GitHub App id; names alone are
  ambiguous.

### 7.2 `main`

- Keep `main` as the release-record branch; it is not the default development/PR target.
- Prevent feature PRs from merging into or updating `main`; an enforcement app closes or quarantines
  mis-targeted PRs and records the actor. Opening a PR against `main` is not itself a ref mutation and
  is not claimed as remotely impossible.
- Reject merge commits, force pushes, deletions, and human direct pushes.
- Allow only the scoped promotion principal to compare-and-swap `P -> C` after a controller-owned
  production-smoke receipt. The principal cannot choose another source/target repository or SHA.
- Require the promotion receipt/check bound to exact `C`; GitHub branch state is an audit record, not
  proof that production is healthy.

### 7.3 Activation blocker: remote enforcement is currently unavailable

The current evidence says the private personal `NikolasP98/minion-factory` policy APIs return `403`
without an eligible plan, and no equivalent enforced ruleset was observed. Therefore this train must
remain dark: no automated production admission and no claim that branch policy is active.

Activation requires either an eligible GitHub plan that supports the required private-repository
rulesets or a separately approved, remotely enforceable alternative with equivalent no-bypass
properties. After that change, run the read-only remote policy verifier and record branch heads,
ruleset ids/enforcement, bypass actors, required `{name, appId}` checks, merge settings, and negative
push/force/delete tests. A local hook, README rule, or controller check alone is not equivalent.

## 8. Secrets, staging, and Docker boundaries

1. Build CI receives registry push authority only for immutable candidate namespaces and no
   production deployment/DB credential.
2. Staging deploy receives staging-only registry pull, host, service, and test credentials. It cannot
   resolve production hosts or secrets.
3. At `production-admission-ready`, the controller issues a candidate-bound production capability
   for exact manifest/digests and the allowed drain/hold/backup/deploy/smoke/rollback operations. It
   remains valid only through that candidate's terminal or recovery path, is revoked after confirmed
   completion/recovery, has no registry push capability, and cannot rebuild.
4. Feature agents and the verifier receive short-lived staging-scoped typed credentials. They do not
   receive GitHub, registry, SSH, Docker, database-file, or production credentials.
5. Staging runs on a separately provisioned host or VM with a separate kernel and administrative
   boundary from production. A second daemon on the production host does not satisfy this rule.
   Neither daemon socket is mounted into Factory agent/orchestrator/test containers. A narrowly
   scoped host-side deploy adapter owns each daemon and accepts only candidate-manifest operations.
6. Logs/manifests/events contain secret identifiers and redacted provenance, never secret values,
   auth files, raw environment dumps, or private DB contents.

## 9. Safe bridge from five-minute `main` self-update

The bridge is staged and reversible before the first production train, without allowing two deploy
authorities:

1. Land the release-train code dark on `main` using the current guarded path. Default mode remains
   `legacy-main`; no scheduler or staging/prod effect is admitted.
2. Add a root-owned, atomically written mode record outside the source tree and `.env` rewrite path.
   `self-update.sh`, `deploy.sh`, `setup.sh`, Compose entry points, the runner's agent-image resolver,
   and the new promoter all consult it. Every source, image, DB, or service mutation acquires the same
   host release lock. Every deploy/setup synchronization explicitly excludes and preserves
   `/opt/factory/release-state/` (control DB, mode record, lock, receipts) and the application-backup
   directory before and after cutover; `--delete` may never traverse either path.
3. Provision staging and scoped credentials, create `dev` from exact production/main `P`, and run the
   train in shadow. Shadow may snapshot, validate contracts, and compare digests, but cannot deploy.
4. Resolve all activation blockers and perform one operator-observed no-production staging canary.
5. During a controlled cutover under the shared lock, atomically switch the mode record to `train`.
   In `train` mode, no legacy entry point builds floating images or deploys arbitrary source.
   `self-update.sh` only reconciles the local source checkout to a completed promotion receipt and
   reports drift. Other entry points refuse production mutation unless given an approved manifest
   whose runner and agent references are exact `image@sha256:...` digests. The queue rejects a
   floating `FACTORY_AGENT_IMAGE`.
6. Run one human-authorized activation promotion. After its smoke and `main` fast-forward succeed,
   write a durable `legacy-disabled` sentinel. From then on, disabling train admission stops new
   releases but never falls back to branch-polling builds. Eligible daily candidates subsequently
   promote automatically; recovery uses exact retained manifests and the operator runbook.
7. Remove the old cron entry only after at least one full interval proves the observer has no deploy
   authority and the replacement scheduler is monitored. Keep the bridge script as a fail-closed
   drift checker until a later cleanup proposal removes it.

A crash during cutover is reconciled from the mode record, shared lock, durable candidate state, and
remote receipts. At no point may both the legacy updater and train own deployment.

## 10. DELTA traceability

| Delta | Transition | Slice | Proof |
|---|---|---|---|
| D1 | `main`-only feature flow becomes governed `dev` integration plus release-record `main`. | S1, S7 | Remote policy snapshot and negative actor tests. |
| D2 | Unclassified moving branch work becomes immutable `P`, `C`, and complete contract-bound range ledger. | S1 | Range/contract fixtures, ancestry and moving-head tests. |
| D3 | Repeated host builds become one CI artifact set and exact manifest/digest identity. | S2 | Registry/manifest tests and staging/prod digest receipts. |
| D4 | No staging becomes isolated staging deterministic, per-feature agent, and independent verification gates. | S3, S4 | Boundary tests and exact-evidence verifier fixtures. |
| D5 | Best-effort restart becomes drain/hold/backup/deploy/smoke with exact image and conditional DB rollback. | S5 | Crash matrix, DB mutation decision table, rollback smoke. |
| D6 | Five-minute `main` deployment becomes a single-authority bridge and daily scheduler. | S6 | Lock/mode race tests and one observed cutover. |
| D7 | Production-first source movement becomes post-smoke fast-forward of `main` to exact `C`. | S5 | Before-smoke refusal, CAS mismatch, and success receipts. |

## 11. Implementation slices and order

### Slice 0 — Refresh authority and production baseline (minion-factory, 2–4h)

**Topics:** `data`, `infra`, `security`, `test`

Read current `minion-factory` root instructions, branch heads, workflows, merge settings, policy
surfaces, `scripts/self-update.sh`, deploy/setup scripts, Compose/image definitions, DB/WAL handling,
write ingresses, `runner/src/repos.ts`, `runner/src/repos.test.ts`, `runner/src/queue.ts`,
`playbooks/minion-factory.md`, `.github/workflows/ci.yml`, the effective mounted `/data/repos.json`,
runner hold/drain behavior, and production receipts. Record the exact `P`, live image digests, DB
path/schema version, cron invocation, host capabilities, current Factory PR base, and every
contradiction with this spec. Do not mutate GitHub/runtime in recon.

**DoD:** evidence is SHA/time anchored; unknowns remain blockers; the ruleset-plan `403` is reproduced
or replaced by verified current evidence; no current behavior is inferred from this spec.

### Slice 1 — Branch/range policy and contract registries (minion-factory, 6–8h)

**Topics:** `logic`, `security`, `infra`, `test`

**Files:** new `release/acceptance-contract.schema.json`, `release/acceptance-tests.yaml`,
`release/acceptance-agent-profiles.yaml`, `release/smoke-tests.yaml`; new range/contract validators
under `runner/src/release-train/`; `runner/src/repos.ts`; `runner/src/repos.test.ts`;
`playbooks/minion-factory.md`; `.github/workflows/ci.yml`; mounted-registry migration/inspection;
focused tests; repo-policy consumer updates.

Implement canonical `P..C` enumeration, one-PR/one-squash mapping, contract validation, exemption
rules, test/profile ID resolution, executable-field rejection, and ancestry/main preconditions. Land
branch config only after remote enforcement is available. At activation, migrate the built-in and
mounted Factory repository base to `dev`, change the GitHub default branch to `dev`, and fail closed
if `/data/repos.json` still routes Factory work to `main`.

**DoD:** fixtures cover empty range, non-ancestor, missing/duplicate PR, missing/duplicate contract,
unknown ID, inline shell fields, exempt non-feature, feature exemption refusal, and `dev` moving after
snapshot. Remote negative branch tests pass before activation, and one Factory-generated fixture PR
proves `base == dev`.

### Slice 2 — Build-once artifact and manifest pipeline (minion-factory, 6–8h)

**Topics:** `infra`, `security`, `logic`, `test`

**Files:** new `.github/workflows/release-candidate.yml`; new canonical manifest schema and builder
under `runner/src/release-train/`; registry/provenance tests.

Build runner and agent once, publish immutable digests, canonicalize the candidate manifest, and
make artifact acceptance idempotent. Reject floating tags, mismatched platform digests, changed build
inputs, and a second accepted digest set for the same candidate key.

**DoD:** seeded source/context changes alter identity; workflow retry reconciles without replacement;
staging/prod deploy adapters accept only exact manifest digests; action/workflow lint and focused
tests pass.

### Slice 3 — Isolated staging deploy and deterministic tests (minion-factory, 6–8h)

**Topics:** `data`, `infra`, `security`, `test`

**Files:** staging environment/deploy adapter; release-train state/effect integration; deterministic
test executor; boundary and crash tests; operator staging runbook.

Add startup hold, exact-digest deployment, staging-only DB/migration setup, allowlisted test execution
with `shell: false`, evidence hashing, cleanup, and remote reconciliation. The selected staging host
must satisfy §8 before this slice can activate.

**DoD:** no production hostname/secret/socket is reachable from staging; unknown IDs and shell-like
payloads fail before spawn; restart does not redeploy or rerun confirmed effects; exact digests and
all deterministic reports match the manifest.

### Slice 4 — Per-feature acceptance agents and independent verifier (minion-factory, 6–8h)

**Topics:** `logic`, `security`, `test`

**Files:** acceptance-agent scheduler, typed tool/profile adapters, verifier policy, result schemas,
provider-origin mapping consumer, focused adversarial tests.

Run one fresh bounded agent per feature contract, stamp all evidence, then run one independent
verifier over the complete candidate. Keep transcript/private artifacts bounded and outside later
prompts. No agent gets shell, Docker, GitHub, or production authority.

**DoD:** missing/red/stale feature evidence blocks; same-independence-group verifier blocks; aggregator
substitution cannot fake independence; evidence from another `C`, manifest, contract blob, or staging
digest blocks; all feature criteria are covered exactly once or explicitly many-to-one without loss.

### Slice 5 — Production state machine, drain/hold, backup, rollback, and `main` CAS (minion-factory, 8h)

**Topics:** `data`, `logic`, `infra`, `security`, `test`

**Files:** independently mounted release-control DB/schema; production deploy/hold/drain/backup/smoke
adapters; rollback decision table; retention/GC policy; monitor events; focused unit/integration tests;
operator runbook.

Implement §5, all production write-ingress holds, verified SQLite backup/restore, exact prior/candidate
digest deployment, smoke, rollback, and post-smoke compare-and-swap `main` update. Bind every effect
to candidate id, `P`, `C`, manifest digest, environment, and idempotency key.

**DoD:** crash injection before/after each effect cannot duplicate or skip it; drain timeout and
backup-integrity failure mutate nothing further; DB restore occurs exactly when required; rollback
smoke controls release of hold; application-DB restore cannot rewind release state; restart after
rollback repeats no effect; referenced artifacts survive GC; `main` cannot move before prod smoke or
to a SHA other than `C`.

### Slice 6 — Five-minute updater bridge and dark rollout (minion-factory, 6–8h)

**Topics:** `infra`, `security`, `logic`, `test`

**Files:** `scripts/self-update.sh`; `deploy.sh`; `setup.sh`; `docker-compose.yml`;
`runner/src/queue.ts`; scheduler/service definitions; durable mode/lock integration;
deployment/setup preservation; bridge tests and runbook.

Implement §9 with one shared release lock, atomic mode record, exact-opt-in shadow/admission flags,
observer-only train mode, and irreversible `legacy-disabled` sentinel after first success. Ensure every
deploy/setup/Compose/queue path preserves the mode record, accepts only approved exact digests after
cutover, and cannot re-enable legacy behavior accidentally.

**DoD:** race fixtures prove one deploy authority; malformed/missing mode fails closed after cutover;
legacy mode remains behaviorally unchanged before cutover; train mode performs no build/deploy; flag
rollback stops admission without restoring the legacy build path; direct legacy script invocation
cannot rebuild or replace production; floating `FACTORY_AGENT_IMAGE` is rejected.
Fixture syncs before and after cutover prove the control DB, mode/lock/receipts, and protected backups
remain byte-identical outside every rsync/delete domain.

### Slice 7 — Ruleset activation and operator-observed release (minion-factory, 4–6h)

**Topics:** `data`, `security`, `infra`, `test`

Resolve the five open decisions, clear the eligible-plan/enforcement blocker, record the remote
policy snapshot, run shadow and one isolated staging canary, perform controlled bridge cutover, then
run one human-authorized activation candidate through production and `main` fast-forward. Prove the
next eligible scheduled candidate enters production automatically after all staging gates pass.

**DoD:** every row in §12 has evidence; exact `C`/manifest/runner/agent digests match CI, staging,
production, and receipt; prod backup/hold/drain/smoke evidence is retained; `main == C` only after
smoke; the old updater has no deploy authority.

## 12. Complete acceptance matrix

| ID | Scenario | Required result/evidence |
|---|---|---|
| RT-001 | Daily schedule fires | One lease and one immutable `C`; event records `America/Lima` and resolved UTC time. |
| RT-002 | Production receipt already equals `C` | No build or deploy; reconcile only a receipt-backed pending `main` fast-forward, then `skipped-current`/complete. |
| RT-003 | `P` is not ancestor of `C` | `attention-required`; no contract execution, build, staging, or production mutation. |
| RT-004 | `main != P` at snapshot/predeploy | Fail closed; no force update and no production mutation. |
| RT-005 | `dev` advances `C -> D` mid-test | All evidence remains bound to `C`; `D` waits for the next train; final `main` target is `C`. |
| RT-006 | Verified safety blocker arrives on `D` | Explicit cancellation creates a new candidate; existing candidate identity/history is immutable. |
| RT-007 | Empty `P..C` | Skip without build/deploy; event is idempotent. |
| RT-008 | Commit has zero/multiple associated PRs | Range validation rejects as ambiguous. |
| RT-009 | Feature PR lacks/duplicates contract | Candidate rejects before build. |
| RT-010 | Non-feature exemption is valid | Reviewed classification and deterministic IDs are retained; no feature-agent requirement is waived for a feature. |
| RT-011 | Feature claims non-feature exemption | Schema/policy rejects. |
| RT-012 | Contract names unknown ID/profile/scenario | Reject before any process or agent starts. |
| RT-013 | Contract contains command/script/shell/argv/path | Reject unknown/executable field; no shell is invoked. |
| RT-014 | Allowlisted deterministic execution | Exact registry argv runs with `shell: false`; result and artifacts are hash-bound to manifest. |
| RT-015 | CI accepts artifact set | One immutable runner digest, agent digest, and candidate-manifest digest are recorded for `C`. |
| RT-016 | Build retry after accepted artifacts | Reconcile existing digests; do not replace/rebuild accepted identity. |
| RT-017 | Same candidate key yields different digest | `attention-required`; neither digest reaches staging. |
| RT-018 | Staging pulls floating tag or wrong platform digest | Deploy refuses before service start. |
| RT-019 | Staging boundary probe | No production secret/data/network/socket is readable; no Docker socket is mounted into agents/verifier. |
| RT-020 | Deterministic staging test fails/missing | Production admission is unavailable. |
| RT-021 | One feature acceptance agent fails/missing/stale | Candidate rejects; other agents cannot waive it. |
| RT-022 | Feature evidence is from wrong contract/`C`/manifest/digest | Verifier rejects. |
| RT-023 | Verifier resolves to same independence group | Verifier admission rejects before turn; aggregator/model rename does not change result. |
| RT-024 | Independent verifier passes complete evidence | Staging receipt names every range item, contract, test, agent result, and exact digest. |
| RT-025 | Production drain completes | No active/admitted write-producing work crosses backup boundary; receipt records counts/times. |
| RT-026 | Drain deadline expires | No backup/deploy begins; hold/drain disposition follows the approved decision and fails closed. |
| RT-027 | Startup hold cannot be proved | No candidate service receives work; production deployment stops/rolls back as state requires. |
| RT-028 | SQLite backup succeeds | Nonempty file, `quick_check=ok`, SHA-256, schema/user version, `P`, and candidate id recorded before mutation. |
| RT-029 | Backup missing/corrupt/unverifiable | No production image or DB mutation. |
| RT-030 | Production deploy | Runtime inspection equals the exact staging-approved runner/agent digests and manifest. |
| RT-031 | Crash after remote deploy before local confirm | Restart reconciles runtime identity and records one deploy effect; no redeploy. |
| RT-032 | Smoke passes | Production receipt is confirmed, hold/drain release, then and only then `main` CAS is eligible. |
| RT-033 | Smoke fails before DB mutation | Exact prior images return; DB stays at proved boundary; rollback smoke controls release. |
| RT-034 | Smoke/deploy fails after DB mutation | Exact backup restores atomically, integrity passes, exact prior images start, rollback smoke passes. |
| RT-035 | Rollback or DB integrity/smoke fails | Keep hold/drain, mark `rollback-attention-required`, alert, and admit no next candidate. |
| RT-036 | Attempt to move `main` before smoke or to non-`C` | Promotion principal/controller rejects. |
| RT-037 | `main` CAS races after healthy prod | No force push; healthy `C` remains live; split state blocks next train pending operator reconciliation. |
| RT-038 | Crash after `main` accepted CAS | Restart observes `main == C`, records the one effect, and completes without another write. |
| RT-039 | Ruleset/protection API returns plan `403` | Train remains dark; documentation/controller checks do not count as remote enforcement. |
| RT-040 | Direct push/force/delete or feature PR aimed at `main` | Ref mutations are denied; a mis-targeted PR is closed/quarantined and recorded without moving `main`; break-glass use alerts and invalidates active candidates. |
| RT-041 | Legacy updater and promoter race | Shared lock/mode yields exactly one authority; after cutover the updater performs no mutation. |
| RT-042 | Train admission disabled after first success | New releases stop; exact-receipt recovery remains; legacy branch-build path stays disabled. |
| RT-043 | Secret/log adversarial fixture | No secret value, auth path, DB content, or private agent transcript enters manifest/events/logs. |
| RT-044 | Candidate re-execution after any terminal state | Stable idempotency key returns recorded terminal evidence; no external effect repeats. |
| RT-045 | Application DB restores, then controller restarts | Separate control DB retains terminal candidate/effects; no candidate is re-admitted and no effect repeats. |
| RT-046 | Legacy deploy/setup/Compose path invoked after cutover | It refuses floating build/deploy; only an approved manifest with exact digests can mutate production. |
| RT-047 | Factory creates a post-activation fixture PR | GitHub default, built-in registry, mounted registry, and generated PR all resolve base `dev`; `main` targeting is refused. |
| RT-048 | GC sees a referenced or missing rollback artifact | Referenced objects are retained; a missing/unreadable rollback object blocks production admission. |
| RT-049 | Second eligible scheduled candidate after activation | Complete staging evidence transitions automatically to `production-admission-ready` and production; no routine human approval is requested. |
| RT-050 | Deploy/setup sync runs before and after cutover | Control DB, mode/lock/receipts, and protected application backups remain byte-identical and reachable outside every `--delete` domain. |

## 13. Open decisions and activation blockers

| Item | Owner decision/evidence required | Default before decision |
|---|---|---|
| Daily Lima time | Choose one wall-clock time in `America/Lima`; record scheduler expression and UTC resolution tests. | Scheduler disabled. |
| Staging host | Name the separate host/VM and prove hostname, kernel, ownership, routing, secret, volume, and socket boundaries from §8. | Staging deploy disabled. |
| Drain deadline | Set maximum wait and disposition for still-active work; prove timeout fixture. | Production deploy disabled. |
| Provider independence mapping | Review exact upstream provider origins and assign `independence_group` values; include aggregator resolution behavior. | Agent/verifier admission disabled. |
| Private-repo ruleset eligibility | Obtain an eligible plan or approve an equivalent remotely enforceable control; verify all §7 requirements and bypass actors. | Entire production train dark. |

These unresolved values are intentionally recorded in the matching
[`2026-08-22-factory-dev-staging-daily-production-promotion`](../proposals/2026-08-22-factory-dev-staging-daily-production-promotion.md)
proposal. There is no implementation code site in this documentation change, so no in-code handoff
marker is added.

## 14. Expected implementation files

These are target paths in `minion-factory`; Slice 0 must reconcile them with current code before the
first implementation PR:

| Path | Purpose |
|---|---|
| `release/acceptance-contract.schema.json` | Closed schema; rejects executable/unknown fields. |
| `release/acceptance-contracts/*.yaml` | Per-change contracts committed through `dev` PRs. |
| `release/acceptance-tests.yaml` | Deterministic test ID allowlist. |
| `release/acceptance-agent-profiles.yaml` | Typed per-feature agent profile/scenario allowlist. |
| `release/smoke-tests.yaml` | Staging/production/rollback smoke ID allowlist. |
| `.github/workflows/release-candidate.yml` | Exact-`C` source checks, one runner/agent build, immutable publish, and manifest output. |
| `runner/src/release-train/` | Range, contracts, manifest, state, deploy, verification, and reconciliation modules. |
| `runner/src/release-train/control-db.ts` | Independently mounted control ledger outside application DB rollback. |
| `runner/src/repos.ts`, `runner/src/repos.test.ts`, `playbooks/minion-factory.md` | Route generated Factory work to `dev`; validate built-in and mounted registry authority. |
| `runner/src/queue.ts` | Reject floating agent images after cutover. |
| `scripts/self-update.sh` | Shared lock/mode bridge, then observer-only behavior. |
| `deploy.sh`, `setup.sh`, `docker-compose.yml` | Refuse legacy rebuild/deploy authority after cutover; consume approved exact digests only. |
| `docs/release-train-runbook.md` | Activation, drain, DB restore, rollback, split-state reconciliation, and break-glass procedures. |

## 15. Out of scope

- Choosing an unevidenced daily time, staging host, drain deadline, or provider mapping.
- Allowing feature contracts, agents, or API callers to execute inline shell.
- Treating staging as production or copying production data/secrets into staging.
- Sharing a Docker socket between environments or with model/test containers.
- Building, rebuilding, or changing image identity on staging or production.
- Promoting current `dev` instead of the snapshotted `C`.
- Force-updating `main`, merging `dev` into `main`, or moving `main` before production smoke.
- Using a model/aggregator label as provider-independence proof.
- Falling back to five-minute branch builds after the first successful train.
- Weakening tests under the compute-savings roadmap without its required equivalence evidence.

## 16. End-to-end verification

Run with scoped test credentials and disposable environments first. Production steps require the
resolved decisions, remote branch enforcement, and one-time explicit activation authorization.

1. Refresh Slice 0 evidence and prove the train remains dark while ruleset/protection enforcement is
   inaccessible or incomplete.
2. Create a fixture `P`, merge at least two feature PRs plus one valid non-feature PR into `dev`, and
   snapshot `C`. Advance `dev` to `D` while staging runs. Prove the candidate remains exact `C` and
   the complete range ledger maps every `P..C` commit to one PR/contract.
3. Prove unknown IDs and all executable contract fields fail before process spawn. Run the selected
   allowlisted tests and verify direct argv execution with `shell: false`.
4. Accept one CI artifact set. Record candidate-manifest, runner, and agent digests. Reconcile an
   interrupted workflow and prove no accepted digest changes.
5. Deploy exact digests to isolated staging. Run all deterministic IDs, one agent per feature, and a
   provider-independent verifier. Prove wrong `C`, manifest, contract blob, image digest, and provider
   group each fail closed.
6. Crash/restart at every state/effect boundary from staging deploy through verification. Confirm no
   confirmed effect repeats and no newer `dev` evidence enters the candidate.
7. On a disposable production fixture, exercise drain timeout, hold failure, corrupt backup, failure
   before DB mutation, failure after migration/write, exact image rollback, exact DB restore,
   rollback-integrity failure, and rollback-smoke failure. Restore the application DB, restart the
   controller, and prove the separate control ledger still suppresses every effect. Match RT-025
   through RT-035 and RT-045.
8. In the operator-approved release, record `P`, `C`, range/contracts, CI run, manifest digest,
   staging/prod image digests, staging evidence, provider origins/groups, drain evidence, backup
   path/hash/check, production smoke, and production receipt.
9. Before smoke, prove `main` cannot move. After smoke, compare-and-swap `main` from exact `P` to
   exact `C`; then reconcile a simulated lost confirmation without a second update.
10. Complete the bridge: prove the old five-minute path and promoter cannot race, switch to train
    mode, write `legacy-disabled` only after the first success, and verify every legacy deploy path
    refuses floating builds. Prove deploy/setup sync preserves the control state and backups
    byte-for-byte. Disable admission and prove it never restores branch-build deployment.
11. Run the next eligible scheduled candidate without a per-candidate human action and retain the
    automatic `staging-verified -> production-admission-ready` transition and production receipt.

**Ship gate:** all RT-001–RT-050 rows have retained evidence; the five open values are operator
approved; remote ruleset/protection enforcement is verified; exact manifest/digest identity matches
CI, staging, production, and receipts; rollback drills pass; and `main` moves to `C` only after the
production smoke receipt.

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
Largely shipped: promote-dev-daily.yml (event-driven on green dev CI, cron demoted to recovery) + 19 scripts/promotion/* + runbook. Remaining scope: §9 Slice 6 (retire/subordinate the main self-update poller — today it replays already-verified SHAs, which is safe) and Slice 7 (ruleset activation).
