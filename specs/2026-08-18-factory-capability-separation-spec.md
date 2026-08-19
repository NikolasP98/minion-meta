---
id: 2026-08-18-factory-capability-separation-spec
title: Factory capability separation — purpose-separated GitHub Apps, run-bound grants, and server-derived actors
stage: spec
status: approved
pass: 2
created: 2026-08-18
updated: 2026-08-19
proposal: 2026-08-17-factory-capability-separation
verdict: approved
repos: [minion-factory, minion-base]
tags: [security, infra]
relationship: extends
related: [2026-08-18-factory-topic-capability-manifest-spec, 2026-08-18-factory-durable-state-outbox-spec, 2026-08-18-factory-worker-containment-spec, 2026-08-18-factory-memory-governance-spec, 2026-08-18-factory-m0-safety-foundation-spec, 2026-08-18-base-kanban-possibly-shipped-surface-spec, 2026-08-18-sdlc-transformation-roadmap]
type: infra
---

# Factory capability separation — purpose-separated GitHub Apps, run-bound grants, and server-derived actors

## 0. Product

From approved proposal `2026-08-17-factory-capability-separation`, verbatim:

> Today one broad `FACTORY_GH_TOKEN` reaches every agent container and can write target repos, meta lifecycle state,
> AND memory write-backs; lifecycle endpoints accept a caller-supplied `by` behind a shared bearer.
>
> **Definition of done:** runs receive short-lived credentials (GitHub App installation tokens or equivalent) scoped
> to one repository/branch/action set; separate credentials for (a) target-code pushes, (b) meta lifecycle commits,
> (c) memory candidate uploads; `by` derived server-side from the authenticating principal, never caller-supplied.

The security outcome is that compromise of one run or one purpose-specific integration cannot reuse a factory-wide
PAT to mutate unrelated repositories or impersonate another authenticated principal. This is M4 identity work. It
retains the human merge gate and does not claim that a GitHub installation token alone is branch-scoped: GitHub narrows installation
tokens by repository and permission, while the factory must enforce the branch and action subset in its trusted
publisher. GitHub's token endpoint returns the token, expiry, permissions, and selected repositories, and accepts
repository and permission narrowing ([GitHub installation-token documentation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)).

### Relationship recommendation

**Recommendation: `extends`.** The proposal is not already satisfied: purpose-specific API bearers exist, but one
broad GitHub token still spans all GitHub effects and admin lifecycle calls can still record caller text as `by`.

- `2026-08-18-factory-topic-capability-manifest-spec` — extends its immutable, runner-owned execution manifest with
  a separately resolved capability-grant envelope. The manifest hash binds the grant to approved work, but topics,
  changed paths, and agent output can only narrow or trigger denial; they never select a principal or expand authority.
- `2026-08-18-factory-durable-state-outbox-spec` — prerequisite M2 evidence/state work. Its current pass-2 verdict is
  `changes_requested`; this spec may be approved as the M4 contract, but implementation must wait for that spec or an
  approved equivalent to land and must reuse its event/outbox/idempotency conventions rather than make parallel
  authority tables.
- `2026-08-18-factory-worker-containment-spec` — supplies the identity/publisher boundary that containment later
  consumes. This spec moves raw GitHub credentials out of agent containers; containment separately makes setup,
  self-test, and review physically isolated/read-only and must not reintroduce credentials.
- `2026-08-18-factory-memory-governance-spec` — separates memory-candidate upload identity and records provenance;
  this spec provisions the candidate-only principal and closed quarantine publisher, while M8 owns candidate schema,
  scanners, activation, human review, and canonical promotion. The candidate principal targets the separate private
  quarantine repository, never `minion-agent-memory`.
- `2026-08-18-factory-m0-safety-foundation-spec` — preserves its trusted-check `{name, appId}` matching and CI. The
  new GitHub App identities are additional expected identities, not a reason to match checks by name alone.
- `2026-08-18-base-kanban-possibly-shipped-surface-spec` — overlaps the lifecycle route and currently specifies a
  caller-supplied `by`. Whichever lands second must preserve its revision-bound disposition fields and canonical
  response while removing `by`; its minion-base caller must authenticate as a registered, lifecycle-only service
  principal instead of writing minion-meta directly.
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
8. `NikolasP98/minion-base@main` commit `ccc5db78cd7f07ee832ab5cfe04c3b78ad01c4e9` has a second meta-write path:
   `src/lib/server/meta-write.ts` uses `env.GITHUB_TOKEN` to PUT proposal/spec markdown and index files directly,
   while `src/routes/api/meta/status/+server.ts` calls that helper before asking the factory to queue work. Therefore
   moving only `runner/src/lifecycle.ts` to the meta App would not make the meta principal exclusive or make the
   dashboard actor derivable from factory authentication. `src/lib/server/github.ts` also uses the token for reads,
   so cutover must preserve required private-repository reads with a read-only credential or runner API rather than
   silently breaking the board.
9. The broad PAT has two non-worker consumers omitted by the proposal shorthand: `scripts/train.sh:14` exports it as
   `GH_TOKEN` to compare branches and open cross-repo promotion PRs, while `scripts/self-update.sh:12-15,40` uses it
   for factory Git fetch/CI reads and direct minion-meta issue creation. `runner/src/index.ts:393-418` also uses the
   PAT directly for monitor issues. Revoking the PAT without replacing these paths would break the train,
   self-update, and monitor intake; leaving it for them would make the no-fallback proof false.

Hard constraints shaping this spec:

- `/memory/MINION/sdlc-board-triage-and-phase-gates.md` and
  `/memory/MINION/MEMORY.md` require the controller to own truth, prompts not to serve as security boundaries,
  reviewers to be technically read-only, and `FACTORY_AUTOMERGE=0` through M0-M7.
- `/memory/MINION/minion-factory-agent-pipeline.md` records both that `deploy.sh` rewrites `.env` wholesale and that
  concurrent meta writers require push/rebase/retry handling. Purpose separation must preserve that convergence
  behavior without sharing credentials.
- `/memory/MINION/projects-github-repo-link-and-factory-gates.md` requires decisions to exist first in native GitHub
  state and treats a handle from another id-space as requiring its own ownership proof. A run id alone therefore
  cannot authorize an arbitrary repo, branch, PR, or memory-candidate id. Routing minion-base mutations through the
  meta publisher must retain commit/blob CAS and return the committed projection; a successful UI-only or
  factory-DB-only decision is not acceptable.
- The read-only observations query for `factory AND (credential OR token OR GitHub OR lifecycle)` returned no
  factory-specific observation that adds a stronger constraint; the three memory files above are the governing
  operator evidence.

## 2. TO-BE

The runner-owned trusted publisher boundary is the only holder of write-capable GitHub App private keys and
installation tokens for target, meta, and memory-candidate effects. At queue time the controller resolves one
immutable `CapabilityGrantEnvelope` from the
approved execution-manifest hash, run kind, and a versioned runner/repo capability policy. Untrusted agent and
repository processes receive no raw GitHub credential. They write candidate artifacts and effect requests to
runner-owned, run-bound channels; a trusted publisher validates each request against the applicable purpose binding,
independently resolves current GitHub state, mints a just-in-time installation token narrowed to one repository and
the minimum permissions for that operation, performs the exact effect, and persists a redacted receipt. Read-only
GitHub credentials outside the runner are permitted only where documented and mechanically unable to perform these
writes.

### Target invariants

1. **Three write principals.** Configure separate GitHub Apps/installations—or equivalently separate non-overlapping
   workload identities—for `target-publisher`, `meta-lifecycle`, and `memory-candidate`. Their private keys, app ids,
   and installation ids are distinct and controller/publisher-only. A startup validator rejects missing production configuration,
   known placeholder values, equal app/installation identities, repository selection outside each purpose's
   allowlist, or installation permissions broader than that purpose's declared maximum. There is no production
   fallback to `FACTORY_GH_TOKEN` after cutover. Purpose maxima are explicit: target uses `metadata:read`,
   `contents:write`, `pull_requests:write`, `issues:write`, `checks:read`, and the conditional `workflows:write`
   described in invariant 4; meta uses `metadata:read`, `contents:write`, and `issues:write`; memory-candidate uses
   `metadata:read` and `contents:write`. Any additional permission is a startup/preflight failure.
2. **One immutable envelope per run or trusted system operation.** Before spawn/effect, persist a canonical
   `{version, subject, authorityHash, policyVersion, issuedAt, expiresAt, bindings[]}` envelope and its SHA-256, where
   `subject` is exactly `{kind:'run',runId,manifestHash}` or
   `{kind:'system',operationId,operationDefinitionHash}` and `authorityHash` equals the applicable subject hash.
   System subjects are limited to enumerated controller operations such as the configured promotion train and cannot
   execute worker actions.
   Each binding is `{purpose, principalId, repositoryId, repository, branchExact, baseRef, actions, permissions,
   pathPolicy}`; only purposes used by that run are present. `branchExact` is derived as
   `factory/<run-id>-<validated-slug>` or an already persisted resume branch whose ownership is proved from the
   parent run, repository id, and PR head. The resolver is a closed controller policy keyed by run kind, operation,
   and repo registry—not a request body, topic, changed path, or model field. Those inputs may only narrow the grant
   or cause denial. Repo id, numeric GitHub repository id, PR repo/head ref, and run ownership must all agree.
   Unknown repo, purpose, action, permission, policy version, or manifest version fails before execution. A retry is
   a new run/envelope that inherits or monotonically narrows its parent; it never widens authority from request input.
3. **No raw credential in workers.** Remove `GH_TOKEN`, PAT-bearing clone URLs, App JWTs, installation tokens, SSH
   agents, and credential helpers from agent containers. Harnesses cannot read or mint credentials. Runner logs,
   Docker argv, DB rows, result JSON, PR bodies, and error messages contain no secret. Tokens live only in memory or
   mode-0600 ephemeral publisher files, are minted immediately before one bounded operation, and are deleted after it.
4. **Trusted branch/action enforcement.** The target publisher accepts a closed action union: prepare exact run
   branch/draft PR; fetch the bound base/candidate objects without executing repository code; push an expected
   candidate SHA with force disabled; read PR/reviews/checks; post a run-owned comment; mark that same PR ready after
   gates. It rejects arbitrary GitHub URLs, repo names, refs, refspecs,
   force/deletion pushes, base changes, workflow/admin/secrets/releases actions, and PRs not bound to the run.
   Before and after a write it checks numeric repo id, exact head ref, base ref, PR number/owner, and expected old/new
   SHA, with explicit absent-old-ref semantics for first creation. GitHub branch protection is defense in depth, not
   the primary policy boundary. The App's normal maximum is metadata read, contents write, pull requests write,
   issues write, and only the read permissions needed by existing check/status gates. Because GitHub separately
   requires Workflows permission to edit `.github/workflows/**`, a token receives `workflows:write` only when the
   immutable binding permits workflow-file changes and the runner-observed candidate actually contains one; the
   publisher still exposes no workflow-administration action. The promotion train is a separate system action using
   exact registry-owned `{repositoryId, headRef, baseRef}` pairs; it may compare those refs and create one draft PR,
   but cannot push, merge, change either ref, or accept repo/ref input from the cron process
   ([GitHub App permissions documentation](https://docs.github.com/en/enterprise-cloud@latest/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app)).
5. **Purpose isolation.** Meta lifecycle effects use only the meta principal and configured meta repository. Commit
   operations use only its configured branch and an exact path allowlist derived from the typed
   `transition|spec-pass|reconcile|chat-proposal` operation; monitor intake may create/update only a deduplicated issue
   with the fixed factory-owned label and cannot commit files. Memory upload uses only the
   candidate principal, only the separate private quarantine repository, only
   `<run-id>/<candidate-id>.json` as established by the memory-governance spec, and create-only conditional semantics.
   This spec supplies only a closed publisher that accepts runner-validated bytes plus runner-owned ids; production
   candidate ingestion remains disabled until memory governance supplies its schema, scanners, provenance, and
   successful-reviewed-run checks. The candidate principal has no access to canonical `minion-agent-memory`.
   Neither purpose identity can target code repos; the target publisher cannot write meta or quarantine memory.
6. **Server-derived actors.** Authentication returns a typed `AuthPrincipal` such as
   `{kind:'operator', credentialId:'admin-v1'}`, `{kind:'service', credentialId:'base-dashboard-v1'}`, or
   `{kind:'run', runId, grantHash}`. Each credential id has a closed route/action allowlist; minion-base receives a
   lifecycle-only service bearer, not the admin bearer. Lifecycle APIs do not accept `by`; their exact request schema
   preserves any landed `status|disposition`, reason, and revision/CAS fields and rejects every unknown field. Commit
   audit text and structured events derive `actor` only from `AuthPrincipal`. Human display names, if later needed,
   come from a separately verified identity provider and never from request JSON. A service principal represents the
   authenticated service, not an unverified claim about the human behind it.
7. **Lease and evidence discipline.** Installation tokens are minted with requested repository/permissions and their
   returned repository, permissions, and expiry are verified before use. An already expired/near-expiry token is
   discarded; 401/403 causes at most one fresh-token retry if the operation is idempotent. Every attempt records
   principal, grant hash, action, numeric repo id, branch/path, request id, expected/result SHA, status, and GitHub
   response id with token values redacted. Effects use deterministic idempotency keys and the landed M2
   outbox/evidence spine; no parallel authority tables are introduced.
8. **Compatibility and rollout.** Existing route capability allowlists, spec hash checks, provider independence,
   draft-PR-first behavior, bounded test/review loops, check `{name,appId}` gates, API response shapes, and human merge
   gate remain. minion-base lifecycle mutations retain revision-bound GitHub CAS and consume the publisher's
   canonical committed response; its remaining GitHub reads use a mechanically read-only credential or runner API.
   `FACTORY_AUTOMERGE` stays `0`. A staging-only compatibility flag may compare old and new reads, but no worker gets
   both old and new credentials and production enablement deletes/ignores every legacy write-token path.

## 3. DELTA

1. Replace the process-global GitHub helper with typed principals, purpose-specific App configuration, token minting,
   grant persistence, and fail-closed startup/config validation (→ Slice 1; proves `T-APP-CONFIG`, `T-TOKEN-SCOPE`,
   `T-GRANT-HASH`, `T-NO-PAT-FALLBACK`).
2. Move target Git operations and PR effects behind a runner-owned, exact-repo/branch/action publisher and remove raw
   GitHub credentials from agent execution (→ Slice 2; proves `T-TARGET-ALLOW`, `T-BRANCH-DENY`, `T-PR-OWNERSHIP`,
   `T-NO-WORKER-TOKEN`, `T-NO-FORCE`).
3. Route meta transitions/spec publishing through the meta principal and derive lifecycle actors only from
   authentication (→ Slice 3; proves `T-META-PATHS`, `T-BY-REJECTED`, `T-ACTOR-AUDIT`, `T-CROSS-PURPOSE-DENY`).
4. Move minion-base lifecycle writes behind a lifecycle-only authenticated service principal while preserving
   revision CAS/canonical responses, and reduce its remaining GitHub access to read-only (→ Slice 4; proves
   `T-BASE-NO-META-WRITE`, `T-BASE-ACTOR`, `T-LIFECYCLE-CAS`).
5. Remove direct memory write-back and expose only a dormant, create-only quarantine publisher for the later
   memory-governance validator (→ Slice 5; proves `T-MEMORY-PATH`, `T-MEMORY-CREATE-ONLY`,
   `T-MEMORY-DORMANT`, `T-CROSS-PURPOSE-DENY`).
6. Deploy without shared/broad write tokens and prove an adversarial run or lifecycle caller cannot cross repo,
   branch, action, purpose, or identity boundaries (→ Slice 6; proves `T-E2E-CAPABILITY-SEPARATION`).

## 4. Approach — vertical slices

Each slice is approximately 4-8 focused hours and lands as a separately reviewable, single-repository PR. The
approved M0-M3 manifest/evidence prerequisites must be landed before Slice 1; “if present” is not sufficient for M4.
Before editing shared files, the implementer reconciles current HEAD with those specs rather than creating duplicate
schemas, auth registries, event tables, outboxes, or GitHub clients. Every named `T-*` control is an exact top-level
test name; each slice's CI runs the full runner suite plus the focused pattern and retains output showing every named
control executed (zero missing/skipped controls), so a pattern that matches nothing cannot count as evidence.

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
installation id, and token expiry—not keys or tokens. Persist one canonical envelope with distinct purpose bindings,
not one ambiguous `principal` field or separate mutable grant rows. Pin a run envelope to the M3 manifest hash and
repo registry's numeric GitHub id; pin a system envelope to its versioned fixed operation definition. Fail closed if
M3/M2 are not yet landed rather than accepting request-authored topics/capabilities or inventing parallel evidence.
Register `base-dashboard-v1` as lifecycle-only and `train-v1` only for the fixed promotion operation; neither service
credential receives admin routes.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-APP-CONFIG|T-TOKEN-SCOPE|T-GRANT-HASH|T-NO-PAT-FALLBACK'
npm test
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
- `scripts/train.sh`
- `runner/Dockerfile`
- `docker-compose.yml`

Prepare the exact branch and draft PR in trusted runner code, then let the worker modify only a run workspace. The
publisher accepts a runner-produced candidate commit/bundle plus expected old SHA; it validates commit ancestry and
changed paths, pushes without force, re-reads the ref, and performs PR effects. If the current architecture cannot
make that boundary robust in one process, use a fixed-entrypoint publisher container whose only input is the signed
grant and candidate artifact; never expose its token to the harness container. Do not implement review isolation or
credential-free setup/self-test here—that remains the worker-containment spec—but the shared worker must already be
GitHub-credential-free. Replace `train.sh`'s GitHub CLI/PAT path with a call authenticated as a `train-v1` service
principal to the publisher's fixed registry-owned promotion operation; the script may choose only “run configured
train now,” not repositories or refs.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-TARGET-ALLOW|T-BRANCH-DENY|T-PR-OWNERSHIP|T-NO-WORKER-TOKEN|T-NO-FORCE|T-TRAIN-FIXED-REFS'
npm test
npx tsc --noEmit
cd ..
bash -n agent/*.sh
```

The launch-plan test rejects `GH_TOKEN`, PAT/App variables, auth mounts, and credential helpers. Adversarial fixtures
attempt another repo, sibling branch, tag deletion, force push, base change, and foreign PR number; none reaches the
mock GitHub transport. Train fixtures attempt request-supplied repo/head/base and merge/push actions; all fail before
transport, while the exact configured pair can create one draft PR.

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
- `agent/chat.sh`

Change `transition()` to require `AuthPrincipal`, not `by: string`. Reject `by` at the HTTP schema boundary even for
admin callers. The meta publisher takes a typed operation (`transition`, `spec-pass`, `reconcile`, `chat-proposal`,
or `monitor-issue`) and computes exact allowed paths/issue fields, expected blob SHAs, commit message, and
server-derived actor. Exact commit path sets include the applicable markdown/review sidecar plus only the derived
indexes that operation regenerates; no generic caller-supplied path is accepted. Preserve UTF-8-safe GitHub contents
handling and the existing rebase/retry convergence rule for concurrent meta writers; a retry must revalidate every
expected SHA/path and remain idempotent. `runner/src/index.ts` monitor intake uses the meta client rather than a raw
token.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-META-PATHS|T-BY-REJECTED|T-ACTOR-AUDIT|T-CROSS-PURPOSE-DENY'
npm test
npx tsc --noEmit
```

Tests prove `by` yields 400, two different authenticated credentials produce their registered server actors, a
spec-pass cannot edit an unrelated meta path, chat cannot edit specs, monitor intake cannot commit content, and
target/memory clients cannot call meta operations.

### Slice 4 — minion-base lifecycle cutover and scoped caller identity (4-6h)

**Files to touch (minion-base only):**

- `src/lib/server/meta-write.ts` (remove direct mutation or reduce to response helpers)
- `src/lib/server/factory.ts`
- `src/routes/api/meta/status/+server.ts`
- the existing server tests for these modules
- deployment/env documentation for the server-only lifecycle bearer and read-only GitHub access

Configure minion-base with Slice 3's lifecycle-only `base-dashboard-v1` server bearer. Route proposal/spec status and
any landed possibly-shipped dispositions through the factory
lifecycle endpoint with the reviewed blob revision; the meta publisher performs the GitHub CAS and returns the
canonical committed projection/index-sync result. Remove minion-base's Contents-API PUT path. Preserve its private
repository reads using a read-only credential or an equivalent factory read endpoint, and prove that credential
cannot write contents, issues, PRs, or refs. Do not add or change UI in this slice.

**Definition of done (machine-checkable):**

```bash
cd <minion-base checkout>
bun test --test-name-pattern='T-BASE-NO-META-WRITE|T-BASE-ACTOR|T-LIFECYCLE-CAS'
bun test
bun run check
```

Tests prove a revision mismatch returns 409/no GitHub call, success renders the registered service actor and returns
the committed projection, `by` is never sent, the bearer never reaches browser/page data/logs, and no production
minion-base module can issue a GitHub write with its remaining read credential. If the repository's actual package
scripts differ at implementation-time recon, use its documented equivalents and record the exact commands in the PR.

### Slice 5 — dormant quarantined memory publisher (4-6h)

**Files to touch:**

- `runner/src/memory/candidate-publisher.ts` (new; purpose-bound transport only)
- `runner/src/memory/candidate-publisher.test.ts` (new)
- `runner/src/queue.ts`
- `runner/src/github.ts`
- `runner/src/db.ts`
- `agent/run.sh`

Delete the direct `MEMORY_NOTE.md` upload and do not replace it with agent-authored markdown ingestion. Expose a
runner-internal publisher accepting only runner-validated JSON bytes plus runner-owned run/candidate ids and targeting
the configured private quarantine repo at `<run-id>/<candidate-id>.json`. Existing content succeeds only when its blob
hash matches exactly; overwrite/delete/rename and canonical-memory targets fail. The memory-governance spec owns the
only production caller, schema, validation/scanning, run eligibility, durable state, HITL, and promotion; until that
contract lands, production startup/health reports the publisher dormant and no run output can invoke it.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='T-MEMORY-PATH|T-MEMORY-CREATE-ONLY|T-MEMORY-DORMANT|T-CROSS-PURPOSE-DENY'
npm test
npx tsc --noEmit
cd ..
! rg -n 'gh api.*minion-agent-memory|FACTORY_GH_TOKEN|GH_TOKEN=' agent runner/src/queue.ts
```

### Slice 6 — deployment cutover and adversarial end-to-end proof (6-8h)

**Files to touch:**

- `deploy.sh`
- `setup.sh`
- `.env.example`
- `docker-compose.yml`
- `deploy/stack.yml`
- `deploy/k8s.yml`
- `scripts/self-update.sh`
- `scripts/smoke-capabilities.sh` (new)
- `runner/src/capabilities.e2e.test.ts` (new)
- `README.md`
- `runner/README.md`

Provision three separately installed/configured Apps with documented minimum permissions. `deploy.sh` must carry all
new settings through its wholesale rewrite, copy private keys as mode 0600 controller/publisher-only files, and remove
`FACTORY_GH_TOKEN` plus PAT-bearing clone URLs. Configuration names one app id, private-key file, installation id,
allowed repository ids/slugs, and maximum permission map per purpose; target repo entries also carry their numeric
GitHub id and any workflow-file-write policy. Add separate strong scoped bearers for the base lifecycle caller and
promotion train. Add a preflight that asks GitHub for each app/installation/repository, compares actual installation
selection/maximum permissions and a freshly narrowed token response to the expected maps, and prints only
ids/slugs/fingerprints. Change self-update to a read-only factory-repo credential for fetch/CI reads and the scoped
monitor endpoint for issue filing; it receives no GitHub write credential. Canary with automerge off; revoke the old
PAT only after the full proof is green. Rollback means disable queue intake/writes and restore the prior release for
diagnosis—not re-expose the shared PAT to workers or host scripts.

**Definition of done (machine-checkable):**

```bash
./scripts/smoke-capabilities.sh --fixture adversarial --automerge 0
cd runner
npm test -- --test-name-pattern='T-E2E-CAPABILITY-SEPARATION'
npm test
cd ..
! rg -n 'FACTORY_GH_TOKEN=|GITHUB_PAT=|GH_TOKEN=' deploy.sh setup.sh .env.example docker-compose.yml deploy/stack.yml deploy/k8s.yml scripts agent runner/src/queue.ts --glob '!*.test.ts'
```

The smoke run creates and updates only its exact factory branch/PR; attempts to write another target branch, meta
with the target identity, canonical memory with the candidate identity, caller-selected train refs, and a lifecycle
request containing `by` all fail. A minion-base fixture can transition only through its lifecycle scope and a
self-update fixture can only read its configured factory ref/file monitor input. Receipts show three distinct write
principals plus distinct scoped service actors and no secrets. The target PR stays draft until existing gates pass.

## 5. Cross-repo impact assessment

| Surface | Impact | Mitigation / alert |
|---|---|---|
| Target repositories registered in `runner/src/repos.ts` / `repos.json` | App installation and numeric repo id are required; factory branches/PRs are written by a new App actor. | Install only the target-publisher App on each allowlisted repo, grant exact permissions, add its App identity to branch/ruleset policy, and canary one repo before expansion. No target-repo source edit is required by this spec. |
| Promotion train across target repositories | `scripts/train.sh` currently needs the PAT to compare configured source/base branches and open PRs. | Route one fixed registry-owned train operation through the target publisher under `train-v1`; it can create a draft PR but cannot push/merge or accept repo/ref input. |
| `minion-meta` | Lifecycle/spec/chat/reconcile commits and monitor issues change authoring principal, but artifact schema and indexes do not change. | Install only the meta App; restrict publisher paths/issue fields and expected SHAs. Preserve concurrent-writer retry and native GitHub commit audit. Alert: rulesets may need the new App actor authorized operationally. |
| Private memory-quarantine repository | A candidate-only App and create-only JSON namespace are provisioned before M8 activation. | Coordinate `<run-id>/<candidate-id>.json` with `2026-08-18-factory-memory-governance-spec`; do not install the candidate App on canonical `minion-agent-memory`. Repo creation/access is a human-gated provisioning step. |
| `minion-agent-memory` | No candidate write impact in M4; it remains canonical and inaccessible to the candidate App. | M8 owns a separate canonical promotion principal and reviewed promotion. A canonical write by any M4 principal is a failing adversarial test. |
| `minion-base` | Current status mutations bypass factory auth and write minion-meta directly with `GITHUB_TOKEN`; lifecycle `by` becomes invalid. | Slice 4 routes mutations through a lifecycle-only service principal, preserves revision CAS/canonical responses, and leaves only mechanically read-only GitHub access. No UI change. Reconcile with the approved possibly-shipped spec if it lands first. |
| Other lifecycle API callers | Unknown fields including `by` become 400 and server actor labels become credential-registry ids. | Inventory callers before strict cutover; issue a distinct least-route bearer where attribution matters. Do not share the admin bearer with services. Log rejected field names only, never body values. |
| Self-update and monitor intake | `scripts/self-update.sh` and monitor issue creation currently depend on the shared PAT. | Self-update uses read-only factory-repo access and calls scoped monitor intake; monitor issue writes use the meta publisher. Regression tests prove no host-script write token remains. |
| Worker containment | Later phase policies consume the no-worker-token contract. | Make credential absence a shared regression test. Containment may further reduce mounts/processes but cannot broaden any grant. |
| Gateway protocol, shared DB, hub/site auth, UI | No protocol/schema/UI change. | Per the Cross-Project Impact Zones table, no fan-out to `@minion-stack/shared`, hub, site, paperclip, or gateway is required. If implementation discovers a public API contract change beyond the lifecycle auth/body/response changes specified here, stop and amend/re-review this spec. |

## 6. Explicit out of scope

- Seccomp, general egress filtering, rootless Docker, Docker socket proxying, and host isolation.
- Full review-container/read-only-checkout and credential-free setup/self-test containment (worker-containment spec).
- Topic taxonomy and risk calculation (topic-capability-manifest spec). This spec owns only the closed mapping from
  trusted run/system operations and repo policy to a capability envelope; no topic or agent field selects authority.
- Memory scanning, human approval, canonical promotion, retention, and calibration (memory-governance spec).
- Browser stages, multi-repo DAGs, release signing/provenance, application-deployment credentials, and product-release
  canary/rollback policy. The factory credential cutover's own fail-closed canary and rollback are in scope.
- GitHub user OAuth, display-name impersonation resolution, or changing the minion-base UI.
- Enabling automerge or bypassing human approval/merge gates.

## 7. End-to-end verification

1. In staging with `FACTORY_AUTOMERGE=0`, run the configuration preflight and retain its redacted evidence: three
   distinct App principals, expected installation/repository ids, exact permission maps, and no PAT fallback.
2. Queue a dev run for one allowlisted fixture repo. Verify its persisted grant binds the approved manifest hash,
   numeric repo id, exact factory branch, purpose bindings, closed action set, and expiry; inspect the worker launch
   plan and `/proc` fixture to prove no GitHub secret or credential helper is present.
3. Let the worker produce a candidate. Verify the target publisher creates/updates only the bound branch and draft
   PR, records expected/result SHAs, rejects foreign repo/branch/PR/force-push requests, and leaves existing
   readiness/check gates intact.
4. Execute one authenticated lifecycle transition without `by`; verify the meta commit/event actor equals the
   credential registry principal. Repeat with `by` and verify 400 with no GitHub write. Through a minion-base fixture,
   verify revision CAS, the `base-dashboard-v1` actor, canonical committed response, and absence of direct meta PUTs.
5. Invoke the dormant quarantine publisher with one runner-validated JSON fixture. Verify a create-only candidate
   appears at `<run-id>/<candidate-id>.json` in the separate private repository using the candidate App actor;
   overwrite and canonical-memory attempts fail. Verify ordinary run output cannot invoke this publisher before M8.
6. Expire/revoke each installation token in turn. Verify bounded remint for an idempotent operation, fail-closed
   behavior for a non-idempotent ambiguity, durable redacted receipts, and no cross-purpose fallback.
7. Trigger the configured promotion-train fixture and self-update fixture. Verify the train can only compare its
   fixed pair/create a draft PR, while self-update can read only its configured factory source and can file only via
   scoped monitor intake.
8. Run the full runner and minion-base CI/typecheck/shell gates plus `T-E2E-CAPABILITY-SEPARATION`; then search
   deployment, runner, agent, and host-script sources/config for legacy PAT/`GH_TOKEN` injection. Keep the old PAT
   revoked and the PR draft for human review.

## 8. Rollout and rollback

After the M0-M3 prerequisites land, land Slices 1-5 dark behind `FACTORY_CAPABILITY_V2=0` only for staging comparison;
the flag may select code paths but must never place old and new credentials in one worker or host script. Slice 6
enables `1` in staging, proves the adversarial suite, then enables production while intake is drained and automerge
remains off. Candidate publishing remains dormant until the independent M8 write flag and validator exist. After
verification, revoke the shared PAT, rotate minion-base to read-only GitHub access, and make missing App/scoped-bearer
configuration a startup failure. If production regresses, stop new intake and all GitHub writes, preserve
grant/effect evidence, and roll back the release while keeping write paths disabled; restoring broad worker/host
credentials or minion-base direct meta writes is not an acceptable rollback.
