---
id: 2026-08-31-factory-supervised-release-defense-in-depth-spec
title: Factory supervised release defense in depth
stage: spec
status: draft
pass: 1
created: 2026-08-31
updated: 2026-08-31
proposal: 2026-08-28-factory-supervised-release-defense-in-depth
verdict: pending
repos: [minion-factory]
relationship: extends
related: [2026-08-22-factory-dev-staging-daily-production-promotion-spec, 2026-08-23-factory-deployment-recovery-controller, 2026-08-18-factory-release-rollback-spec]
tags: [data, infra, permissions, security, test]
type: infra
---

# Factory supervised release defense in depth

## 0. Product

The approved proposal states the remaining problem:

> The supervised exact-candidate release controller can make every supported repository path fail
> closed, but the production SSH principal still has a general shell and Docker authority. A hostile
> or compromised operator session could bypass repository-level marker and ledger checks. The current
> controller also needs a documented, executable recovery when the trusted controller itself is too
> broken to promote its repair without advancing production `main` ahead of the live marker.
>
> GitHub artifacts retain the agent manifest, receipt, and closed deployment record, but they are not
> an external transparency log. Finally, deterministic rollback preflight is covered without a full
> production rollback-and-forward drill.

This spec closes those gaps without changing the canonical release manifest, agent receipt, or closed
deployment-record schemas. Normal and recovery releases remain supervised exact-candidate releases.
Production `main` remains a record of verified runtime state, never an optimistic controller-update
channel.

## 1. Relationship recommendation

Recommended classification: `extends`.

- `2026-08-22-factory-dev-staging-daily-production-promotion-spec` — extends its exact-candidate,
  marker, ledger, GitHub Deployment, and rollback path with a least-authority host boundary and durable
  witness; none of its release identities or gates are replaced.
- `2026-08-23-factory-deployment-recovery-controller` — shares the deployment-controller trust
  boundary, but this spec adds controller-code recovery and production-principal confinement rather
  than changing recovery-intent semantics.
- `2026-08-18-factory-release-rollback-spec` — retains its fail-closed health, backup, and rollback
  safety requirements through the newer release train; the existing release-train spec already
  recommends superseding its moving-ref deployment design.

The resolver or a human decides lifecycle changes to those artifacts. This spec does not merge,
retire, supersede, or edit them.

## 2. AS-IS → TO-BE → DELTA

### 2.1 AS-IS — verified current behavior

The following anchors were read from `minion-factory` `dev` on 2026-08-31. The implementer must repeat
the recon against the slice branch before editing because this release surface is actively changing.

1. `.github/workflows/promote-dev-daily.yml:84-87` resolves `main` and requires the checked-out trusted
   controller SHA to equal it. This correctly prevents an unreviewed workflow from becoming release
   authority, but it provides no executable path when the controller on `main` is itself broken.
2. `.github/workflows/promote-dev-daily.yml:159-175` installs one production SSH key and uses it to
   execute an arbitrary remote shell command that reads `.deploy-marker`. The same workflow later
   uses the general principal for `mktemp`, `scp`, `chmod`, preflight, deploy, verification, and
   cleanup (`:474-518` and later production steps).
3. The explicit `TODO(handoff)` at `.github/workflows/promote-dev-daily.yml:360-362` records the exact
   remaining gap: replace the general production SSH principal with a forced-command principal and
   make marker/state root-owned.
4. `scripts/promotion/deploy-exact.sh:49-280` holds the promotion lock, validates the live marker and
   release records, snapshots SQLite/environment state, invokes Docker, seals release state, and
   verifies the exact candidate. It is already the closed production mutation seam.
5. `scripts/promotion/write-marker.sh:25-44` centralizes supported marker writes, but writes through
   the caller's filesystem authority. `scripts/promotion/rollback-previous.sh:15-68` likewise performs
   rollback with the caller's direct Docker, tree, environment, state, and marker authority.
6. `.github/workflows/promote-dev-daily.yml:317-354` seals and uploads the canonical manifest, receipt,
   and deployment record as a 90-day Actions artifact. `build-deployment-record.mjs:15-44` binds their
   SHA-256 identities and exact candidate, but no receipt outside the production host and normal
   Actions artifact retention witnesses that binding.
7. The runbook documents deterministic rollback and state-only reconciliation, but it explicitly
   requires operator-reviewed database-write reconciliation and contains no automated disposable
   rollback-and-forward drill that proves the complete source/image/marker/ledger/environment/data
   sequence.
8. The proposal's GitHub ruleset/deployment-protection availability is a known unknown. The existing
   release-train spec records an earlier private-repository ruleset/protection query returning a
   plan-related `403`; current repository and plan state must be measured, not assumed.

Memory constraints that shape this design:

- `/memory/MINION/MEMORY.md` records `FACTORY_AUTOMERGE=0` as a hard operating constraint and says
  Factory changes remain `humanMergeOnly`; this security/data-tagged work therefore keeps human gates
  at approval and merge.
- `/memory/MINION/factory-moving-origin-strategy-implementation.md` records that the board supervisor
  owns retries and cancel-and-replaces runs. The drill and activation steps consume one bound release
  run and must not create competing manual pipeline runs.
- `/memory/MINION/factory-failed-runs-rootcause-2026-08-28.md` records that an empty
  `requiredChecks` list weakens evidence and that shell pipelines can mask a failing exit code. Tests
  below require non-empty checks and capture command exit status without `| tail`-style gates.

The read-only observation search returned no release-specific observation that adds a stronger
constraint than these repository and memory anchors.

### 2.2 TO-BE — target behavior and invariants

The public production seam is a versioned forced-command protocol, `factory-production-release-v1`.
Its request is a closed discriminated union:

```text
identity
release <request-id> <payload-sha256> <payload-bytes>
verify <candidate-sha> <run-id> <attempt>
reconcile <live-sha> <previous-sha> <request-id> <payload-sha256> <payload-bytes>
rollback <expected-live-sha> <request-id>
```

The SSH daemon supplies the operation through `SSH_ORIGINAL_COMMAND`. `release` and `reconcile`
receive one bounded archive on standard input. The root-owned dispatcher rejects every unknown verb,
extra field, malformed identifier, oversized input, duplicate/conflicting `request-id`, symlink,
device, path traversal, unlisted archive member, digest mismatch, and `scp`/SFTP server command. It
never evaluates a string or invokes a shell with candidate-controlled text. It maps each valid verb to
one repository-owned argv array and records a root-owned receipt before returning.

Required invariants:

1. The production deploy key cannot obtain a TTY or shell, start `scp`/SFTP, choose an executable,
   choose Docker arguments, or write any host path except by a validated protocol operation.
2. `.deploy-marker`, `.promotion-state`, release archives, and forced-command receipts are owned by
   `root:factory-release`, are not writable by the SSH principal or runner, and mutate only while the
   dispatcher holds the existing promotion lock. The runner retains only the reads/mounts proved
   necessary by current startup and recovery tests.
3. A separate read-only identity key can execute only `identity`; it cannot invoke any mutation.
   Normal production identity resolution no longer uses the deploy key.
4. The stable recovery workflow is loaded from the protected default branch, requires the
   `controller-recovery` environment approval, and accepts two independently bound SHAs:
   `recoveryControllerSha` (reviewed controller code) and `candidateSha` (runtime candidate). It proves
   `live marker -> candidate`, hosted CI and boundary checks for the candidate, and reviewed CI for the
   controller. The existing manifest's `controllerSha` binds the former while `baseSha` and
   `candidateSha` bind the actual live transition. It never moves `main` before production verification.
5. Every successful normal or recovery release produces a `factory-release-witness-v1` statement
   containing repository, GitHub Deployment id/environment, workflow run/attempt, controller/base/
   candidate SHAs, production ledger digest, and the three canonical artifact digests. A GitHub
   artifact attestation stores the signed statement outside normal Actions artifact retention. The
   production job fails before `main` compare-and-swap unless the attestation can be fetched and
   verified against the exact candidate and GitHub OIDC issuer. Canonical artifact schemas remain
   byte-for-byte unchanged.
6. A controlled disposable-host drill proves refusal of a moved image tag and stale ledger, exact
   rollback to the sealed prior release, explicit reconciliation of a post-release disposable SQLite
   write, then a supervised forward release. It proves `main == marker == tree == runningSha` only
   after the final runtime verification.
7. Repository policy is measured through GitHub APIs. Enforceable ruleset/deployment protection is
   configured when the API supports it. If the platform cannot enforce a required transition, the
   checked-in audit names the exact unavailable control and activation remains blocked unless a human
   records an equivalent server-side control; workflow-only checks are not represented as server-side
   enforcement.
8. Existing exact-candidate manifests, receipts, deployment records, release-verifier semantics,
   candidate gates, recovery intents, SQLite backup behavior, and `FACTORY_AUTODEPLOY` kill switch
   remain unchanged except for transport and added witness binding.

### 2.3 DELTA — transitions, slices, and proof

| # | Transition | Slice | Proving test/evidence |
|---|---|---|---|
| D1 | General production SSH execution becomes a closed forced-command protocol with separate read and mutation identities. | Slice 1 | Protocol fixture rejects shell, TTY, `scp`, SFTP, arbitrary Docker, malformed frames, traversal, and duplicate conflicts; accepted fixtures emit exact argv. |
| D2 | Marker/state/release records become root-owned and writable only inside the serialized dispatcher. | Slice 2 | Disposable-host ownership test plus negative writes as deploy and runner users; release/rollback happy paths still verify. |
| D3 | A protected controller-recovery path binds controller identity separately from live base and candidate without optimistic `main`. | Slice 3 | Bare-repository recovery fixture starts `controller != marker`, deploys one exact descendant, and asserts branch stays at marker until runtime proof. |
| D4 | Each successful release gains an externally verifiable signed witness over canonical artifacts, Deployment, and production ledger. | Slice 4 | Tamper matrix plus real attestation verification; workflow test proves compare-and-swap is after verified witness. |
| D5 | Rollback safety advances from component preflight to a complete disposable rollback-and-forward drill including a database write. | Slice 5 | One executable drill report with exact identities and negative moved-tag/stale-ledger cases. |
| D6 | GitHub branch/environment transition controls are measured and enforced where available, with activation blocked on an unmitigated server-side gap. | Slice 6 | API audit fixture and repository evidence JSON; CI detects policy drift. |

Every slice below maps to at least one DELTA row. No implementation outside these transitions is
authorized.

## 3. Approach — vertical implementation slices

### Slice 1 — Close the production SSH protocol (6–8 focused hours)

**Topics:** `infra`, `permissions`, `security`, `test`

Create the forced-command dispatcher and make both local callers and the workflow speak its closed
protocol. Keep the current deployment scripts as internal implementations; they are no longer
directly selectable over SSH.

**Files to touch:**

- `.github/workflows/promote-dev-daily.yml`
- `scripts/promotion/factory-production-command.sh` (new)
- `scripts/promotion/production-transport.sh` (new)
- `scripts/promotion/install-production-principals.sh` (new)
- `test/promotion/forced-command.test.sh` (new)
- `test/promotion/workflow-security.test.mjs`
- `test/promotion/shell.test.sh`
- `docs/runbooks/daily-dev-production-promotion.md`

Implementation requirements:

- Install distinct `factory-release-read` and `factory-release-deploy` principals/authorized keys
  with `restrict`, `command=...`, no PTY, no forwarding, and no user-chosen subsystem.
- Parse `SSH_ORIGINAL_COMMAND` by an exact token grammar. Do not use `eval`, `sh -c`, interpolated
  command strings, or environment-selected executable paths.
- Stream a bounded allowlisted archive for `release`/`reconcile`; do not restore general `scp` as a
  convenience. Validate the archive before any durable mutation.
- Make `request-id` idempotent: an identical replay returns the stored receipt; the same id with a
  different digest fails closed.
- Change `production_identity` to the read principal and `promote_deploy` to the deploy principal.
  Remove every arbitrary remote command and all direct `scp` calls from the workflow.

**Definition of done (machine-checkable):**

```bash
bash test/promotion/forced-command.test.sh
node --test test/promotion/workflow-security.test.mjs
bash test/promotion/shell.test.sh
shellcheck scripts/promotion/factory-production-command.sh scripts/promotion/production-transport.sh scripts/promotion/install-production-principals.sh
bash -n scripts/promotion/factory-production-command.sh scripts/promotion/production-transport.sh scripts/promotion/install-production-principals.sh
```

The fixture must exercise every negative operation named in D1, assert no mutation occurred, and
assert that accepted requests dispatch exactly one fixed argv. Static tests must fail if `scp`, an
unrestricted `ssh ... '<command>'`, or the old shared production-key secret returns.

### Slice 2 — Enforce root-owned release state (4–6 focused hours)

**Topics:** `infra`, `permissions`, `security`, `test`

Move production release mutation behind a root-owned installation and prove the least access needed
by the deploy principal and runner. Preserve the current promotion lock and centralized marker writer.

**Files to touch:**

- `scripts/promotion/install-production-principals.sh`
- `scripts/promotion/factory-production-command.sh`
- `scripts/promotion/deploy-exact.sh`
- `scripts/promotion/write-marker.sh`
- `scripts/promotion/rollback-previous.sh`
- `scripts/promotion/reconcile-live-release-state.sh`
- `scripts/promotion/host-preflight.sh`
- `test/promotion/release-ownership.test.sh` (new)
- `test/promotion/release-path-static.test.mjs`
- `docs/runbooks/daily-dev-production-promotion.md`

Implementation requirements:

- Install dispatcher and internal release executables root-owned and non-writable by both SSH
  principals and containers. Normalize existing marker/state ownership in an explicit, repeatable
  migration that first verifies current ledger/marker/runtime identity.
- Keep `.promotion.lock` as the common serialization boundary. The dispatcher, not the SSH user,
  opens the lock and executes mutation operations.
- Grant read access through the `factory-release` group only where tests prove it is needed. Neither
  deploy principal nor runner may write marker, state, receipts, archive, backup pointers, or installed
  controller executables.
- Make permission or ownership drift a host-preflight failure before backup, Docker, tree, or marker
  mutation.

**Definition of done (machine-checkable):**

```bash
bash test/promotion/release-ownership.test.sh
node --test test/promotion/release-path-static.test.mjs
bash test/promotion/shell.test.sh
```

The disposable-host test must run negative writes as both service users, run one exact release and
rollback through the forced protocol, and assert numeric uid/gid/mode for every protected path. It
must also kill the dispatcher at each durable mutation boundary and prove replay converges or fails
closed without a split marker/ledger/runtime claim.

### Slice 3 — Add protected controller recovery (6–8 focused hours)

**Topics:** `infra`, `logic`, `security`, `test`

Add a stable, human-gated recovery workflow that can load a reviewed controller repair without using
production `main` as the controller-code transport. Reuse all deterministic candidate, supervisor,
deployment, and verification gates.

**Files to touch:**

- `.github/workflows/recover-production-controller.yml` (new)
- `.github/workflows/promote-dev-daily.yml`
- `scripts/promotion/resolve-recovery-controller.mjs` (new)
- `scripts/promotion/build-release-manifest.mjs`
- `scripts/promotion/build-deployment-record.mjs`
- `test/promotion/controller-recovery.test.mjs` (new)
- `test/promotion/workflow-security.test.mjs`
- `docs/runbooks/daily-dev-production-promotion.md`

Implementation requirements:

- Require manual dispatch, the `controller-recovery` protected environment, an exact reviewed
  `recoveryControllerSha`, exact `candidateSha`, and exact live marker. The stable workflow definition
  comes from protected `main`; only repository-owned controller files are loaded from the reviewed
  controller SHA.
- Require hosted CI for both identities and the existing boundary check whenever either relevant diff
  touches a boundary-owned path. Required checks remain non-empty.
- Keep `controllerSha`, `baseSha`, and `candidateSha` distinct through existing validators. Do not
  replace the canonical schemas; adjust validation only if it currently assumes controller equals
  candidate.
- Reuse the forced-command deploy boundary. Permit `main` compare-and-swap only after Deployment,
  witness, marker, tree, runtime, and ledger all verify the candidate.

**Definition of done (machine-checkable):**

```bash
node --test test/promotion/controller-recovery.test.mjs test/promotion/workflow-security.test.mjs
bash test/promotion/shell.test.sh
```

The bare-repository fixture must start with `controllerSha != live marker`, use one descendant
candidate, prove `main` remains the live SHA through every pre-verification checkpoint and injected
crash, then finish with `main == marker == tree == runningSha == candidateSha`. Negative fixtures
cover unreviewed controller, non-descendant candidate, moved marker, empty checks, and controller code
attempting to change candidate identity.

### Slice 4 — Witness every successful release outside artifact retention (5–7 focused hours)

**Topics:** `infra`, `security`, `test`

Add a signed witness statement without changing any canonical artifact. Use GitHub artifact
attestations backed by GitHub OIDC as the external verification surface; the production host is not a
signer and stores only the verified witness identity with its ledger.

**Files to touch:**

- `.github/workflows/promote-dev-daily.yml`
- `.github/workflows/recover-production-controller.yml`
- `scripts/promotion/build-release-witness.mjs` (new)
- `scripts/promotion/verify-release-witness.mjs` (new)
- `scripts/promotion/deploy-exact.sh`
- `scripts/promotion/validate-release-ledger.sh`
- `test/promotion/release-witness.test.mjs` (new)
- `test/promotion/workflow-security.test.mjs`
- `docs/runbooks/daily-dev-production-promotion.md`

Implementation requirements:

- Build `factory-release-witness-v1` only after the successful exact-candidate GitHub Deployment
  exists and the production ledger digest is read back through the forced-command verify operation.
- Request only the workflow permissions needed for OIDC/attestation in the witness step. Use a
  commit-pinned official attestation action or the documented GitHub API; never expose signing keys to
  production or candidate code.
- Fetch and cryptographically verify the attestation before `promote-main.sh`. Store its immutable
  attestation id/digest in root-owned release state and the workflow summary.
- Fail closed on unavailable attestation service, subject mismatch, issuer/repository mismatch,
  Deployment mismatch, ledger mismatch, or any canonical-artifact digest mismatch.

**Definition of done (machine-checkable):**

```bash
node --test test/promotion/release-witness.test.mjs test/promotion/workflow-security.test.mjs
bash test/promotion/shell.test.sh
gh attestation verify release-witness.json --repo NikolasP98/minion-factory
```

The unit tamper matrix changes each bound field independently and must fail. The integration evidence
must name a real attestation id, candidate SHA, Deployment id, and production-ledger digest, and remain
verifiable after deleting the corresponding test Actions artifact. If the repository plan does not
support private-repository attestations, Slice 4 is blocked: do not substitute a mutable release asset
or declare the requirement satisfied.

### Slice 5 — Execute the disposable rollback-and-forward drill (6–8 focused hours)

**Topics:** `data`, `infra`, `security`, `test`

Build one hermetic drill around the real forced-command dispatcher and release scripts. The target is
a disposable VM/host fixture with its own Docker daemon, repository, marker/state tree, SQLite file,
and GitHub test repository or bare-ref adapter. It must never point at production.

**Files to touch:**

- `scripts/promotion/drill-rollback-forward.sh` (new)
- `test/promotion/fixtures/disposable-release-host.sh` (new)
- `test/promotion/rollback-forward-drill.test.sh` (new)
- `.github/workflows/promotion-slice-ci.yml`
- `docs/runbooks/daily-dev-production-promotion.md`

Implementation requirements:

- Seal release A, promote exact release B, insert a uniquely identified disposable SQLite write, and
  record image digest/source SHA/marker/ledger/environment/database evidence at every boundary.
- First move a human-readable image tag and prove rollback refuses it. Restore the sealed digest,
  stale the ledger, and prove rollback refuses again. Restore exact ledger truth and roll back to A.
- Stop for an explicit reconciliation decision. The drill's reviewed fixture chooses discard or
  replay for its one disposable write and records the decision and resulting row invariant; production
  database restore remains manual and out of scope.
- Run a supervised forward release of B and finish only after witness and all five identities agree.

**Definition of done (machine-checkable):**

```bash
bash test/promotion/rollback-forward-drill.test.sh
test -s test-results/promotion/rollback-forward-report.json
node -e "const r=require('./test-results/promotion/rollback-forward-report.json'); if (!(r.movedTagRefused && r.staleLedgerRefused && r.rollbackVerified && r.dataReconciled && r.forwardVerified)) process.exit(1)"
```

The report must include exact image digests, controller/base/candidate/source/marker/tree/running SHAs,
ledger and witness digests, environment hashes, database backup hash, disposable-write id, chosen
reconciliation, and each command exit code. Generated reports remain CI artifacts and are not
committed.

### Slice 6 — Enforce and continuously audit server-side transition policy (4–6 focused hours)

**Topics:** `infra`, `permissions`, `security`, `test`

Measure the current GitHub policy surface, apply supported protections, and make drift visible. This
slice evaluates rather than assumes plan capabilities.

**Files to touch:**

- `scripts/promotion/audit-github-release-policy.mjs` (new)
- `config/github-release-policy.json` (new)
- `test/promotion/github-release-policy.test.mjs` (new)
- `.github/workflows/promotion-slice-ci.yml`
- `docs/runbooks/daily-dev-production-promotion.md`

Implementation requirements:

- Declare the allowed policy: feature merges target `dev`; only the production/recovery controller
  identities may update `main`; `main` requires fast-forward/CAS semantics and required checks;
  production and controller-recovery environments keep required reviewers; no candidate job can
  approve its own deployment.
- Read rulesets, branch protection, environments, and Actions workflow permissions through GitHub
  APIs. Emit a deterministic redacted JSON result distinguishing `enforced`, `unsupported`,
  `unauthorized`, `missing`, and `drifted`—never collapse `403` into absent.
- Apply policy only through an operator-reviewed command. The CI path is read-only and fails when an
  enforceable control drifts.
- When a required control is unsupported, write the exact API response class and equivalent
  server-side mitigation into the audit result. Keep `FACTORY_AUTODEPLOY=0` until every required row
  is `enforced`; a workflow assertion alone is not an equivalent mitigation.

**Definition of done (machine-checkable):**

```bash
node --test test/promotion/github-release-policy.test.mjs
node scripts/promotion/audit-github-release-policy.mjs --check config/github-release-policy.json
npm test
npm run typecheck
```

Attach the redacted live audit JSON to the PR. CI fixtures cover enforceable success, plan `403`,
missing environment reviewer, wrong actor, widened Actions permissions, and ruleset drift.

## 4. Cross-repo impact assessment

| Impact zone | Assessment | Mitigation or alert |
|---|---|---|
| Gateway protocol / `@minion-stack/shared` consumers | None. This is a Factory-to-production SSH protocol, not the Minion gateway WebSocket protocol. | Do not modify `packages/shared/`, `minion/`, hub, site, or Paperclip. |
| Database schema/migrations | No application schema change. The drill writes only to a disposable SQLite database; production reconciliation stays operator-reviewed. | Tag is `data`, so approval and merge remain human-gated. Never point the drill at `/opt/factory/data/factory.db`. |
| Auth and credentials | Unavoidable: one broad SSH identity becomes separate read, deploy, and recovery identities; workflow OIDC attestation authority is added. | Rotate rather than reuse the old key; verify old-key revocation; pin known hosts; keep secrets scoped to their jobs/environments. |
| Deployment and runtime | Unavoidable: production ownership, SSH forced command, artifact transport, marker/state mutation, rollback, and `main` promotion change. | Activate only after disposable forced-command, crash, recovery, attestation, and rollback-forward proofs pass. Keep `FACTORY_AUTODEPLOY=0` during migration. |
| Generated artifacts | Adds witness statements and drill/audit reports; canonical manifest, receipt, and deployment record stay unchanged. | Validate closed schemas; upload generated reports as CI evidence only; never hand-edit indexes. |
| `minion-meta` lifecycle | This spec/proposal pair is planning state only; no runtime meta code is required. | The implementation PR targets `minion-factory` only. Factory lifecycle automation updates indexes later under its normal authority. |

## 5. Explicit out-of-scope

- Allowing model output, an operator shell, or a recovery workflow to waive a deterministic release
  gate.
- Automatically restoring or reconciling the production database. The disposable drill automates
  only test data with a predeclared reconciliation decision.
- Replacing or adding fields to the canonical release manifest, agent receipt, or closed deployment
  record formats.
- Redesigning the release-verifier agent, candidate-test selection, recovery-intent state machine,
  Factory runner queue, or Minion gateway protocol.
- General production host hardening unrelated to the release principals and protected release paths.
- Treating a workflow check, mutable GitHub Release asset, ordinary Actions artifact, floating image
  tag, or production-host copy as the external append-only witness.
- Enabling automatic merge. `FACTORY_AUTOMERGE=0` and `humanMergeOnly` remain in force.

## 6. End-to-end verification and activation

Run the slices' narrow tests first, then execute the complete gate without piping away an exit code:

```bash
set +e
npm test
test_rc=$?
npm run typecheck
typecheck_rc=$?
bash test/promotion/shell.test.sh
shell_rc=$?
set -e
test "$test_rc" -eq 0
test "$typecheck_rc" -eq 0
test "$shell_rc" -eq 0
```

With `FACTORY_AUTODEPLOY=0`, provision disposable principals and run the complete disposable
rollback-and-forward drill. Verify the signed witness independently, run the read-only GitHub policy
audit, and retain the drill report plus live attestation/policy evidence for human review.

Activation is a separate human-gated change:

1. Verify the current production marker, tree, `runningSha`, ledger, environment, and database backup.
2. Install the root-owned dispatcher and separate principals; test old-key revocation and every
   negative forced-command case against production without invoking a mutation.
3. Run `identity` and `verify` through their distinct keys. Confirm the runner can read only its
   required state and cannot write any protected path.
4. Execute one normal exact-descendant supervised release through the forced command. Require a
   successful GitHub Deployment, verified witness, sealed host ledger, and
   `main == marker == tree == runningSha`.
5. Execute the protected controller-recovery fixture against the disposable target, not production.
6. Confirm the live GitHub policy audit has no unsupported, unauthorized, missing, or drifted required
   row. Only then may a human set `FACTORY_AUTODEPLOY=1`.

Final acceptance requires all proposal outcomes: no general-shell/upload/Docker/marker authority for
the production key; controller repair with separate controller/live identities; an independently
verifiable witness matching GitHub Deployment and production ledger; the complete rollback-and-
forward drill; and CI regression coverage for allowlist, ownership, identity separation, and witness
binding.
