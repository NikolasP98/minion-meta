---
id: 2026-08-18-factory-capability-separation-spec
title: Factory capability separation — per-run GitHub App identities and server-derived actors
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-factory-capability-separation
verdict: pending
repos: [minion-factory]
relationship: extends
related: [2026-08-18-factory-topic-capability-manifest-spec, 2026-08-18-factory-worker-containment-spec, 2026-08-18-factory-memory-governance-spec, 2026-08-18-factory-m0-safety-foundation-spec, 2026-08-18-sdlc-transformation-roadmap]
type: infra
---

# Factory capability separation — per-run GitHub App identities and server-derived actors

## 0. Product

From approved proposal `2026-08-17-factory-capability-separation`, verbatim:

> Today one broad `FACTORY_GH_TOKEN` reaches every agent container and can write target repos, meta lifecycle state,
> AND memory write-backs; lifecycle endpoints accept a caller-supplied `by` behind a shared bearer.
>
> **Definition of done:** runs receive short-lived credentials (GitHub App installation tokens or equivalent) scoped
> to one repository/branch/action set; separate credentials for (a) target-code pushes, (b) meta lifecycle commits,
> (c) memory candidate uploads; `by` derived server-side from the authenticating principal, never caller-supplied.

The security outcome is that compromise of one run or one purpose-specific integration cannot reuse a factory-wide
PAT to mutate unrelated repositories or impersonate an operator. This is M4 identity work. It retains the human
merge gate and does not claim that a GitHub installation token alone is branch-scoped: GitHub narrows installation
tokens by repository and permission, while the factory must enforce the branch and action subset in its trusted
publisher. GitHub's token endpoint returns the token, expiry, permissions, and selected repositories, and accepts
repository and permission narrowing ([GitHub installation-token documentation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)).

### Relationship recommendation

**Recommendation: `extends`.** The proposal is not already satisfied: purpose-specific API bearers exist, but one
broad GitHub token still spans all GitHub effects and admin lifecycle calls can still record caller text as `by`.

- `2026-08-18-factory-topic-capability-manifest-spec` — extends its immutable, runner-owned execution manifest with
  a resolved capability grant. Topics and agent output remain inputs to policy and can never grant authority.
- `2026-08-18-factory-worker-containment-spec` — supplies the identity/publisher boundary that containment later
  consumes. This spec moves raw GitHub credentials out of agent containers; containment separately makes setup,
  self-test, and review physically isolated/read-only and must not reintroduce credentials.
- `2026-08-18-factory-memory-governance-spec` — separates memory-candidate upload identity and records provenance;
  canonical memory promotion remains that spec's human-gated, separately credentialed responsibility.
- `2026-08-18-factory-m0-safety-foundation-spec` — preserves its trusted-check `{name, appId}` matching and CI. The
  new GitHub App identities are additional expected identities, not a reason to match checks by name alone.
- `2026-08-18-sdlc-transformation-roadmap` — this is the capability-separation part of M4 and depends on M0-M3's
  controller-owned manifest/evidence spine. It must land before worker containment in the roadmap order.

## 1. AS-IS

Verified against `NikolasP98/minion-factory@main` commit
`a45b225b476db9efffd481dff6bd962be457b549` on 2026-08-18 through the GitHub contents API. Re-read HEAD and the
repository's own instructions before implementation; line numbers are anchors, not immutable coordinates.

1. `deploy.sh:35-52` writes one long-lived `FACTORY_GH_TOKEN=$GH_PAT` into `/opt/factory/.env`. The same PAT is also
   embedded in the authenticated URL used to clone the persistent meta checkout at `deploy.sh:67`. Because
   `deploy.sh` rewrites the environment wholesale, any replacement App configuration omitted there disappears on
   the next deploy.
2. `runner/src/queue.ts:48-75` builds common Docker arguments for every spec, reconcile, and dev worker and passes
   the broad token as `GH_TOKEN` at line 61. `agent/run.sh` then uses it for target cloning/pushing/PR changes and,
   at lines 21-29, direct writes to `NikolasP98/minion-agent-memory`. Spec/reconcile scripts use the same worker
   credential for minion-meta. The runtime cannot attribute an effect to a purpose-specific principal.
3. `runner/src/github.ts:1-38` closes over the same process-wide token for every REST request. A duplicate helper in
   `runner/src/index.ts:158-170` also reads `FACTORY_GH_TOKEN` directly. Callers cannot state or prove which
   capability is required, and tests cannot assert least privilege at the request boundary.
4. `runner/src/index.ts:55-90` already performs constant-time matching for distinct admin, hook, and unstick bearer
   values and derives `res.locals.capability` server-side. This is useful partial capability separation and must be
   preserved. However, `/lifecycle/:kind/:id` destructures `by` from the request at line 182 and, for any admin
   bearer, persists the caller-supplied string at lines 189-193. The audit actor is therefore not an authenticated
   principal.
5. `runner/src/lifecycle.ts:35-116` accepts `by: string` and inserts it into meta commit messages and logs. It has no
   typed principal carrying credential id/type, GitHub App slug/installation, or request origin.
6. `runner/src/db.ts` records no credential grant, token lease, authenticated actor, or GitHub effect receipt. A
   restart or audit cannot prove which repository/permissions/branch/actions a run was granted, when the lease
   expired, or which principal performed an effect.
7. GitHub App installation tokens can be narrowed to selected repositories and permissions, but the documented
   token contract has no per-branch selector. HTTP Git access requires Contents permission
   ([GitHub App permissions documentation](https://docs.github.com/en/enterprise-cloud@latest/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app)). Exposing a raw write token to an
   untrusted harness and merely asking it to use `factory/<run-id>-...` would not satisfy branch/action scoping.

Hard constraints shaping this spec:

- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` and
  `/memory/MINION/MEMORY.md` require the controller to own truth, prompts not to serve as security boundaries,
  reviewers to be technically read-only, and `FACTORY_AUTOMERGE=0` through M0-M7.
- `/memory/MINION/minion-factory-agent-pipeline.md` records both that `deploy.sh` rewrites `.env` wholesale and that
  concurrent meta writers require push/rebase/retry handling. Purpose separation must preserve that convergence
  behavior without sharing credentials.
- `/memory/MINION/projects-github-repo-link-and-factory-gates.md` requires decisions to exist first in native GitHub
  state and treats a handle from another id-space as requiring its own ownership proof. A run id alone therefore
  cannot authorize an arbitrary repo, branch, PR, or memory-candidate id.
- The read-only observations query for `factory AND (credential OR token OR GitHub OR lifecycle)` returned no
  factory-specific observation that adds a stronger constraint; the three memory files above are the governing
  operator evidence.

## 2. TO-BE

The runner is the only holder of GitHub App private keys and installation tokens. At queue time it resolves a
runner-owned, immutable `CapabilityGrant` from the approved execution manifest and repo registry. Untrusted agent
and repository processes receive no raw GitHub credential. They write candidate artifacts and effect requests to
runner-owned, run-bound channels; a trusted publisher validates each request against the grant, independently
resolves current GitHub state, mints a just-in-time installation token narrowed to one repository and the minimum
permissions, performs the exact effect, and persists a redacted receipt.

### Target invariants

1. **Three cryptographic principals.** Configure separate GitHub Apps/installations—or equivalently separate
   non-overlapping workload identities—for `target-publisher`, `meta-lifecycle`, and `memory-candidate`. Their private
   keys, app ids, and installation ids are distinct and runner-only. A startup validator rejects missing production
   configuration, known placeholder values, equal app/installation identities, or permissions broader than the
   declared purpose. There is no production fallback to `FACTORY_GH_TOKEN` after cutover.
2. **One immutable grant per run.** Before spawn, persist `{version, runId, repoId, repositoryId, repository,
   branchExact, baseRef, actions, permissions, principal, issuedAt, expiresAt, manifestHash}` plus a canonical hash.
   `branchExact` is derived as `factory/<run-id>-<validated-slug>` or an already persisted resume branch owned by
   that run. Repo id, numeric GitHub repository id, PR repo/head ref, and run ownership must all agree. Unknown repo,
   action, permission, or manifest version fails before execution. Retries inherit or monotonically narrow the
   parent grant; they never widen it from request input.
3. **No raw credential in workers.** Remove `GH_TOKEN`, PAT-bearing clone URLs, App JWTs, installation tokens, SSH
   agents, and credential helpers from agent containers. Harnesses cannot read or mint credentials. Runner logs,
   Docker argv, DB rows, result JSON, PR bodies, and error messages contain no secret. Tokens live only in memory or
   mode-0600 ephemeral runner files, are minted immediately before one bounded operation, and are deleted after it.
4. **Trusted branch/action enforcement.** The target publisher accepts a closed action union: prepare exact run
   branch/draft PR; push an expected candidate SHA with force disabled; read PR/reviews/checks; post a run-owned
   comment; mark that same PR ready after gates. It rejects arbitrary GitHub URLs, repo names, refs, refspecs,
   force/deletion pushes, base changes, workflow/admin/secrets/releases actions, and PRs not bound to the run.
   Before and after a write it checks numeric repo id, exact head ref, base ref, PR number/owner, and expected old/new
   SHA. GitHub branch protection is defense in depth, not the primary policy boundary.
5. **Purpose isolation.** Meta lifecycle effects use only the meta principal, only the configured meta repository and
   branch, and an exact path allowlist derived from the transition/spec operation. Memory upload uses only the
   candidate principal, only the memory repository, only `MINION/factory/candidates/<run-id>/<candidate-sha>.md`
   (or the final path established by the landed memory-governance spec), and create-only semantics. Neither identity
   can target code repos; the target publisher cannot write meta or memory.
6. **Server-derived actors.** Authentication returns a typed `AuthPrincipal` such as
   `{kind:'operator', credentialId:'admin-v1'}`, `{kind:'service', credentialId:'hook-v1'}`, or
   `{kind:'run', runId, grantHash}`. Lifecycle APIs do not accept `by`; unknown body fields are rejected. Commit
   audit text and structured events derive `actor` only from `AuthPrincipal`. Human display names, if later needed,
   come from a separately verified identity provider and never request JSON.
7. **Lease and evidence discipline.** Installation tokens are minted with requested repository/permissions and their
   returned repository, permissions, and expiry are verified before use. An already expired/near-expiry token is
   discarded; 401/403 causes at most one fresh-token retry if the operation is idempotent. Every attempt records
   principal, grant hash, action, numeric repo id, branch/path, request id, expected/result SHA, status, and GitHub
   response id with token values redacted. Effects use deterministic idempotency keys and the durable outbox/evidence
   spine if landed; no parallel authority tables are introduced.
8. **Compatibility and rollout.** Existing route capability allowlists, spec hash checks, provider independence,
   draft-PR-first behavior, bounded test/review loops, check `{name,appId}` gates, API response shapes, and human merge
   gate remain. `FACTORY_AUTOMERGE` stays `0`. A staging-only compatibility flag may compare old and new reads, but
   no worker gets both old and new credentials and production enablement deletes/ignores the PAT path.

## 3. DELTA

1. Replace the process-global GitHub helper with typed principals, purpose-specific App configuration, token minting,
   grant persistence, and fail-closed startup/config validation (→ Slice 1; proves `T-APP-CONFIG`, `T-TOKEN-SCOPE`,
   `T-GRANT-HASH`, `T-NO-PAT-FALLBACK`).
2. Move target Git operations and PR effects behind a runner-owned, exact-repo/branch/action publisher and remove raw
   GitHub credentials from agent execution (→ Slice 2; proves `T-TARGET-ALLOW`, `T-BRANCH-DENY`, `T-PR-OWNERSHIP`,
   `T-NO-WORKER-TOKEN`, `T-NO-FORCE`).
3. Route meta transitions/spec publishing through the meta principal and derive lifecycle actors only from
   authentication (→ Slice 3; proves `T-META-PATHS`, `T-BY-REJECTED`, `T-ACTOR-AUDIT`, `T-CROSS-PURPOSE-DENY`).
4. Route memory notes into governed, create-only candidate uploads using the memory-candidate principal; remove the
   direct `gh api` write from `agent/run.sh` (→ Slice 4; proves `T-MEMORY-PATH`, `T-MEMORY-CREATE-ONLY`,
   `T-MEMORY-FAIL-SOFT`, `T-CROSS-PURPOSE-DENY`).
5. Deploy without the shared PAT and prove an adversarial run cannot cross repo, branch, action, purpose, or identity
   boundaries (→ Slice 5; proves `T-E2E-CAPABILITY-SEPARATION`).

## 4. Approach — vertical slices

Each slice is approximately 4-8 focused hours and lands as a separately reviewable PR. Slices consume the M0-M3
manifest/evidence primitives if present; before editing shared files, the implementer reconciles current HEAD with
those approved specs rather than creating duplicate schemas or GitHub clients.

### Slice 1 — identity kernel, token minter, and immutable grants (6-8h)

**Files to touch:**

- `runner/src/auth.ts` (new; typed `AuthPrincipal`, constant-time credential registry)
- `runner/src/github-app.ts` (new; App JWT and installation-token mint/verification)
- `runner/src/capabilities.ts` (new; closed purposes/actions and grant resolver)
- `runner/src/github.ts` (replace global token with an injected purpose-bound client)
- `runner/src/db.ts` (additive grant/effect evidence, or adapters to the landed evidence spine)
- `runner/src/auth.test.ts` (new)
- `runner/src/github-app.test.ts` (new)
- `runner/src/capabilities.test.ts` (new)
- `runner/src/index.ts`
- `runner/package.json`, `runner/package-lock.json`
- `runner/README.md`

Use a clock and HTTP transport injected in tests. The mint request must name exactly one repository id/name and a
purpose permission map; verify the response does not widen either. Persist private-key fingerprints, app slug/id,
installation id, and token expiry—not keys or tokens. Pin the grant to the M3 manifest hash and repo registry's
numeric GitHub id. Fail closed if M3 is not yet landed rather than accepting request-authored topics/capabilities.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-APP-CONFIG|T-TOKEN-SCOPE|T-GRANT-HASH|T-NO-PAT-FALLBACK'
npx tsc --noEmit
```

Fixtures prove an overbroad response, wrong repository id, equal purpose identities, expired lease, unknown action,
or missing manifest hash is rejected and no serialized object contains a sentinel private key/token.

### Slice 2 — target publisher and credential-free worker contract (6-8h)

**Files to touch:**

- `runner/src/target-publisher.ts` (new)
- `runner/src/target-publisher.test.ts` (new)
- `runner/src/queue.ts`
- `runner/src/repos.ts`
- `runner/src/db.ts`
- `runner/src/github.ts`
- `agent/run.sh`
- `agent/spec.sh`
- `agent/reconcile.sh`
- `agent/chat.sh`
- `runner/Dockerfile`
- `docker-compose.yml`

Prepare the exact branch and draft PR in trusted runner code, then let the worker modify only a run workspace. The
publisher accepts a runner-produced candidate commit/bundle plus expected old SHA; it validates commit ancestry and
changed paths, pushes without force, re-reads the ref, and performs PR effects. If the current architecture cannot
make that boundary robust in one process, use a fixed-entrypoint publisher container whose only input is the signed
grant and candidate artifact; never expose its token to the harness container. Do not implement review isolation or
credential-free setup/self-test here—that remains the worker-containment spec—but the shared worker must already be
GitHub-credential-free.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-TARGET-ALLOW|T-BRANCH-DENY|T-PR-OWNERSHIP|T-NO-WORKER-TOKEN|T-NO-FORCE'
npx tsc --noEmit
cd ..
bash -n agent/*.sh
```

The launch-plan test rejects `GH_TOKEN`, PAT/App variables, auth mounts, and credential helpers. Adversarial fixtures
attempt another repo, sibling branch, tag deletion, force push, base change, and foreign PR number; none reaches the
mock GitHub transport.

### Slice 3 — meta lifecycle identity and exact-path publishing (4-6h)

**Files to touch:**

- `runner/src/lifecycle.ts`
- `runner/src/index.ts`
- `runner/src/github.ts`
- `runner/src/meta-publisher.ts` (new)
- `runner/src/lifecycle.test.ts`
- `runner/src/meta-publisher.test.ts` (new)
- `agent/spec.sh`
- `agent/reconcile.sh`

Change `transition()` to require `AuthPrincipal`, not `by: string`. Reject `by` at the HTTP schema boundary even for
admin callers. The meta publisher takes a typed operation (`transition`, `spec-pass`, `reconcile`) and computes exact
allowed paths, expected blob SHAs, commit message, and server-derived actor. Preserve UTF-8-safe GitHub contents
handling and the existing rebase/retry convergence rule for concurrent meta writers; a retry must revalidate every
expected SHA/path and remain idempotent.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-META-PATHS|T-BY-REJECTED|T-ACTOR-AUDIT|T-CROSS-PURPOSE-DENY'
npx tsc --noEmit
```

Tests prove `by` yields 400, two different authenticated credentials produce their registered server actors, a
spec-pass cannot edit an unrelated meta path, and target/memory clients cannot call meta operations.

### Slice 4 — quarantined memory candidate identity (4-6h)

**Files to touch:**

- `runner/src/memory-candidates.ts` (new, or extend the landed memory-governance module)
- `runner/src/memory-candidates.test.ts` (new)
- `runner/src/queue.ts`
- `runner/src/github.ts`
- `runner/src/db.ts`
- `agent/run.sh`

The agent may emit a bounded `MEMORY_NOTE.md` candidate only. After validating regular-file type, UTF-8, size,
provenance, run ownership, and candidate SHA, the runner uses the memory identity to create one immutable candidate
path. Existing content at that path succeeds only if its blob hash matches exactly; overwrite/delete/rename fails.
Scanner, HITL review, and canonical promotion remain owned by the memory-governance spec. Candidate upload remains
fail-soft for the development result but emits a durable failed effect for later retry; it never falls back to target
or meta credentials.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-MEMORY-PATH|T-MEMORY-CREATE-ONLY|T-MEMORY-FAIL-SOFT|T-CROSS-PURPOSE-DENY'
npx tsc --noEmit
cd ..
! rg -n 'gh api.*minion-agent-memory|FACTORY_GH_TOKEN|GH_TOKEN=' agent runner/src/queue.ts
```

### Slice 5 — deployment cutover and adversarial end-to-end proof (6-8h)

**Files to touch:**

- `deploy.sh`
- `setup.sh`
- `.env.example`
- `docker-compose.yml`
- `deploy/stack.yml`
- `deploy/k8s.yml`
- `scripts/smoke-capabilities.sh` (new)
- `runner/src/capabilities.e2e.test.ts` (new)
- `README.md`
- `runner/README.md`

Provision three separately installed/configured Apps with documented minimum permissions. `deploy.sh` must carry all
new settings through its wholesale rewrite, copy private keys as mode 0600 runner-only files, and remove
`FACTORY_GH_TOKEN` plus PAT-bearing clone URLs. Add a preflight that asks GitHub for each installation/repository,
compares actual permissions to the expected exact map, and prints only ids/slugs/fingerprints. Canary with automerge
off; revoke the old PAT only after the full proof is green. Rollback means disable queue intake and restore the prior
release for diagnosis—not re-expose the shared PAT to workers.

**Definition of done (machine-checkable):**

```bash
./scripts/smoke-capabilities.sh --fixture adversarial --automerge 0
cd runner
npm test -- --test-name-pattern='T-E2E-CAPABILITY-SEPARATION'
cd ..
! rg -n 'FACTORY_GH_TOKEN|GITHUB_PAT|GH_TOKEN=' deploy.sh setup.sh .env.example docker-compose.yml deploy/stack.yml deploy/k8s.yml runner agent
```

The smoke run creates and updates only its exact factory branch/PR; attempts to write another target branch, meta
with the target identity, canonical memory with the candidate identity, and a lifecycle request containing `by` all
fail. Receipts show three distinct principals and no secrets. The target PR stays draft until existing gates pass.

## 5. Cross-repo impact assessment

| Surface | Impact | Mitigation / alert |
|---|---|---|
| Target repositories registered in `runner/src/repos.ts` / `repos.json` | App installation and numeric repo id are required; factory branches/PRs are written by a new App actor. | Install only the target-publisher App on each allowlisted repo, grant exact permissions, add its App identity to branch/ruleset policy, and canary one repo before expansion. No target-repo source edit is required by this spec. |
| `minion-meta` | Lifecycle/spec commits change authoring principal, but artifact schema and indexes do not change. | Install only the meta App; restrict publisher paths and expected SHAs. Preserve concurrent-writer retry and native GitHub commit audit. Alert: rulesets/required checks may need the new App actor authorized operationally. |
| `minion-agent-memory` | Candidate writes move to a separate App and quarantined path. | Coordinate the exact candidate path/schema with `2026-08-18-factory-memory-governance-spec`; canonical promotion identity remains separate. Alert: do not grant candidate App write access to canonical `MINION/factory/*.md`. |
| minion-base / hub callers | Lifecycle `by` becomes invalid and server actor labels may change. | Existing callers should omit `by`; response shape stays. During canary, log rejected unknown body keys with no body values. If a caller currently sends `by`, update that caller under a separate scoped implementation change before strict cutover. |
| Worker containment | Later phase policies consume the no-worker-token contract. | Make credential absence a shared regression test. Containment may further reduce mounts/processes but cannot broaden any grant. |
| Gateway protocol, shared DB, hub/site auth, UI | No protocol/schema/UI change. | Per the Cross-Project Impact Zones table, no fan-out to `@minion-stack/shared`, hub, site, paperclip, or gateway is required. If implementation discovers a public API contract change beyond rejecting `by`, stop and amend/re-review this spec. |

## 6. Explicit out of scope

- Seccomp, general egress filtering, rootless Docker, Docker socket proxying, and host isolation.
- Full review-container/read-only-checkout and credential-free setup/self-test containment (worker-containment spec).
- Topic taxonomy, risk calculation, or capability selection policy (topic-capability-manifest spec); this spec only
  enforces the already resolved grant.
- Memory scanning, human approval, canonical promotion, retention, and calibration (memory-governance spec).
- Browser stages, multi-repo DAGs, release signing/provenance, deployment credentials, canary/rollback behavior.
- GitHub user OAuth, display-name impersonation resolution, or changing the minion-base UI.
- Enabling automerge or bypassing human approval/merge gates.

## 7. End-to-end verification

1. In staging with `FACTORY_AUTOMERGE=0`, run the configuration preflight and retain its redacted evidence: three
   distinct App principals, expected installation/repository ids, exact permission maps, and no PAT fallback.
2. Queue a dev run for one allowlisted fixture repo. Verify its persisted grant binds the approved manifest hash,
   numeric repo id, exact factory branch, closed action set, and expiry; inspect the worker launch plan and `/proc`
   fixture to prove no GitHub secret or credential helper is present.
3. Let the worker produce a candidate. Verify the target publisher creates/updates only the bound branch and draft
   PR, records expected/result SHAs, rejects foreign repo/branch/PR/force-push requests, and leaves existing
   readiness/check gates intact.
4. Execute one authenticated lifecycle transition without `by`; verify the meta commit/event actor equals the
   credential registry principal. Repeat with `by` and verify 400 with no GitHub write.
5. Emit one valid memory note. Verify a create-only quarantined candidate appears under the run-bound path using the
   memory App actor; overwrite and canonical-path attempts fail without changing the dev result.
6. Expire/revoke each installation token in turn. Verify bounded remint for an idempotent operation, fail-closed
   behavior for a non-idempotent ambiguity, durable redacted receipts, and no cross-purpose fallback.
7. Run the full runner CI/typecheck/shell gates plus `T-E2E-CAPABILITY-SEPARATION`; then search deployment, runner,
   and agent sources/config for legacy PAT/`GH_TOKEN` injection. Keep the old PAT revoked and the PR draft for human
   review.

## 8. Rollout and rollback

Land Slices 1-4 dark behind `FACTORY_CAPABILITY_V2=0` only for staging comparison; the flag may select code paths but
must never place old and new credentials in one worker. Slice 5 enables `1` in staging, proves the adversarial suite,
then enables production while intake is drained and automerge remains off. After verification, revoke the shared PAT
and make missing App configuration a startup failure. If production regresses, stop new intake, preserve grant/effect
evidence, and roll back the release while keeping GitHub writes disabled; restoring broad worker credentials is not
an acceptable rollback.
