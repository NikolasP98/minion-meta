---
id: 2026-08-18-factory-worker-containment-spec
title: Factory worker containment — credential-free repo commands and isolated read-only review
stage: spec
status: approved
pass: 2
next_slice: 5
created: 2026-08-18
updated: 2026-08-28
proposal: 2026-08-17-factory-worker-containment
verdict: approved
repos: [minion-factory]
tags: [security, infra, deps, test, logic]
type: infra
relationship: extends
related: [2026-08-17-factory-agent-cli-unpinned-spec]
---

# Contain factory workers at phase boundaries

## 0. Product

From approved proposal `2026-08-17-factory-worker-containment`, verbatim:

> Today review runs in the same container and working tree as develop (harness-level reset is a mitigation, not
> isolation); repo-controlled setup/selfTest commands execute while shared credentials are in the environment;
> base images and global CLIs are unpinned; the runner's Docker socket is host-root-equivalent.
>
> **Definition of done:** review stage executes in a separate container with a read-only checkout of the exact
> reviewed SHA and no push-capable credential; setup/selfTest run with credentials stripped from the environment
> (or a credential-free phase); agent/runner images pinned by digest with pinned CLI versions; adversarial
> regression tests for committed/staged/pushed/crashed review cases.

This is M4 containment work. It keeps the human merge gate and does not claim that Docker socket possession is
safe. It reduces what untrusted repository code and a reviewer can reach while the separate socket redesign remains
explicitly out of scope.

### Relationship recommendation

- `2026-08-17-factory-agent-cli-unpinned-spec` — **extends**: that spec pins the agent harness toolchain; this spec
  preserves those exact CLI pins and adds digest-pinned base/runtime images, runner toolchain pinning, and phase
  containment. It must not replace or loosen the earlier parser-contract checks.

Normative prerequisites come from `2026-08-18-sdlc-transformation-roadmap`: M0-M3 controls—including
`2026-08-18-factory-topic-capability-manifest-spec` and the durable evidence/state work—land first, and within M4
`2026-08-17-factory-capability-separation` precedes this containment rollout. This spec does not reimplement those
controls: it consumes the runner-owned execution manifest/evidence model and the capability work's per-run
checkout/develop credential interface. Review still receives no GitHub credential, and runner-invoked setup/self-test
commands receive no factory/model/GitHub credential. This follows the roadmap's controller-owns-truth ordering;
containment never trusts agents to self-declare risk or authority.

## 1. AS-IS

Verified against `NikolasP98/minion-factory@main` commit
`a45b225b476db9efffd481dff6bd962be457b549` through the GitHub contents API on 2026-08-18. Re-read HEAD before
implementation; line numbers below are anchors, not immutable coordinates.

1. `runner/src/queue.ts:48-72` builds one common `baseDockerArgs()` for every worker. It passes
   `GH_TOKEN=${FACTORY_GH_TOKEN}`, one Claude credential, a read-write Codex auth mount, and `/out` to the same
   container. `runner/src/queue.ts:129-157` then adds `FACTORY_SETUP` and `FACTORY_SELF_TEST` and starts
   `factory-run.sh`. There is no phase-specific credential or mount policy.
2. `agent/run.sh:107-174` clones, creates and pushes the branch, creates the draft PR, then executes the registered
   setup command via `bash -c "${FACTORY_SETUP}"` while the injected credentials and writable Codex auth remain
   available. `agent/run.sh:279-312` runs develop and then executes `FACTORY_SELF_TEST` in the same credentialed
   process. Removing only environment variables would be insufficient while credential files/mounts and git/gh
   helpers remain reachable.
3. `agent/run.sh:336-470` runs review in the developer's container and writable worktree. It snapshots HEAD, checks
   `git status`, then uses `git reset --hard` and `git clean -fd` if the reviewer wrote. That detects and repairs
   some mutation after the fact; it does not prevent staged changes, commits, pushes, credential reads, or writes
   outside the checkout.
4. `agent/run.sh:468` derives `REVIEWED_SHA` from the mutable local checkout after review. The runner trusts the
   resulting `/out/result.json` (`runner/src/queue.ts:217-224`) rather than independently binding a review result to
   a runner-prepared checkout.
5. `agent/Dockerfile:1` and `runner/Dockerfile:1` use mutable `node:22-bookworm-slim` tags. The agent image also
   installs Bun from an unversioned install URL and globally installs Claude Code, Codex, and pnpm without versions
   at `agent/Dockerfile:15-17` on the currently observed main branch. `runner/Dockerfile:15` starts through
   `npx tsx`, which can consult a mutable registry if the expected binary is absent. `docker-compose.yml` names
   locally built images without immutable digests.
6. `docker-compose.yml:19`, `deploy/stack.yml:17`, and `deploy/k8s.yml:48-53` mount the host Docker socket into the
   runner. Anyone controlling the runner process is effectively host root. This proposal explicitly does not
   redesign that trust boundary.
7. The first-party suite currently has `runner/src/queue.test.ts`, but no adversarial phase-containment suite that
   proves review cannot commit, stage, push, or leave mutations after a crash.
8. Review currently performs GitHub mutations itself: `agent/run.sh:454` posts `REVIEW.md`, and
   `agent/run.sh:555-566` reads the live PR head, marks the PR ready, and posts the gate summary. Removing the review
   container's GitHub credential therefore also requires moving those effects and their retry/evidence handling to
   the runner; merely deleting `GH_TOKEN` would break the lifecycle.
9. `runner/src/db.ts` has no durable phase-attempt record or runner-owned `candidate_sha`; `head_sha` is populated
   from agent-authored `result.json`. Splitting one long worker into several containers without persisted continuation
   state would make restart behavior and reviewed-SHA authority worse, not better.

Known constraint from `/memory/MINION/minion-factory-agent-pipeline.md`: reviewers propose and the applier
re-verifies; the reviewer must never become an applier. The same memory records that `deploy.sh` rewrites the box
`.env` wholesale, so every new containment flag or image reference required at runtime must be emitted by
`deploy.sh`, not hand-added on the host. `/memory/MINION/sdlc-board-triage-and-phase-gates.md` is stricter: prompts
are not security boundaries, reviewers are technically read-only, the controller owns truth, and automerge stays
disabled through M0-M7. Those are hard invariants here.

## 2. TO-BE

The runner owns an explicit, durable phase plan and launches separate, narrowly configured containers. The minimum
phases for a dev run are trusted workspace/branch/draft-PR preparation, credential-free setup, develop,
credential-free self-test, trusted review-checkout preparation, and isolated review. Review-fix rounds repeat develop
→ credential-free self-test → checkout preparation → review against a newly bound candidate SHA. A phase receives
only the mounts, network mode, credentials, and entrypoint named by runner code; arbitrary agent output cannot add
Docker arguments. Completed phase attempts and their evidence are persisted before the runner advances, so a restart
resumes at a safe boundary without replaying GitHub side effects or inventing an attestation.

### Target invariants

1. **Trusted source binding.** After each initial develop or review-fix push, the runner resolves and records the PR
   repository, base ref/base SHA, branch, and exact candidate SHA through its GitHub capability. Credential-free
   self-test runs against a disposable copy of that SHA; after green, the runner rechecks the live head before review.
   A fixed-entrypoint checkout-preparation container fetches that candidate without running hooks, submodules,
   package scripts, or configured clean/smudge filters; it uses an empty home plus disabled system/global Git config,
   verifies `git rev-parse HEAD` equals the candidate, and removes remotes/helpers/config capable of authenticating.
   Its runner-owned manifest records repo, base ref/SHA, candidate SHA, and the candidate tree OID. The runner, not
   the reviewer or `result.json`, stamps the reviewed SHA.
   Before setup, a separate fixed-entrypoint preparer clones the configured base into the per-run writable workspace,
   creates/pushes the factory branch and draft PR, and records those runner-owned effects without executing checkout
   content; setup never depends on a credentialed develop container having already run.
2. **Credential-free registered commands.** Every runner invocation of a registered `setup` or `selfTest` command runs
   in a separate phase container with an explicit environment allowlist. It has no `GH_TOKEN`, factory bearer,
   Claude/Anthropic credential, Codex auth mount, SSH agent/socket, cloud-memory write path, or Docker socket.
   `env -u` inside the broad worker is not sufficient. Setup may write only the per-run workspace/cache mounts it
   needs; self-test may use that workspace but must not receive a network credential. `RepoDef.setupNetwork` and
   `RepoDef.selfTestNetwork` are closed `none|bridge` values, default `none`, and every current network-dependent
   setup is explicitly migrated to `bridge`; self-test stays `none` unless a reviewed repo entry opts into `bridge`.
   `RepoDef.commandEnv?: Record<string,string>` values are literal non-secret values from the runner-owned registry,
   may not use reserved credential names, and may not interpolate `process.env`. A network opt-in changes
   connectivity only, never the credential allowlist. This boundary covers the runner's registered command phases;
   develop remains a broader,
   credentialed agent phase and this spec does not claim that arbitrary repo code the developer chooses to run is
   credential-free. The runner-owned `.git` metadata is not writable in command phases; trusted Git operations use
   fixed binaries/config with an empty hooks path, and no command-phase-created directory enters a later credentialed
   phase's executable search path. Self-test runs on a disposable writable copy of the already-pushed candidate and
   that copy is discarded, so test mutations cannot become the next candidate or plant hooks/helpers for a push.
3. **Physically read-only review.** Review runs in a new non-root container, never the develop container. The dedicated
   exact-SHA checkout is mounted read-only; the container root filesystem is read-only; only `/tmp`, a per-attempt
   harness home, and a dedicated empty `/out` are writable tmpfs/binds. Review gets only the selected model
   credential (or a per-attempt copied Codex auth home), never both providers, and gets no GitHub credential,
   persistent auth mount, SSH mount, Docker socket, developer workspace, or prior runner output directory. Ephemeral
   auth/output state is destroyed after ingestion. Review uses bridge networking only because the selected harness
   must reach its model API; general egress allowlisting remains out of scope and no GitHub credential is present.
   It cannot mutate or push the candidate even if repository instructions request it. `/out/REVIEW.md` is the only
   accepted product; the runner rejects a symlink, non-regular file, a file larger than 1 MiB, or invalid UTF-8 before
   parsing it.
4. **Fail-closed evidence.** Review PASS is accepted only when the review process exits zero, its validated first
   non-empty line is exactly `VERDICT: PASS`, no conflicting verdict line exists, the prepared checkout still matches
   the manifest/tree OID, the live PR head/base SHAs still equal the recorded candidate/base SHAs, and actual
   develop/review providers remain independent. Missing/invalid output, nonzero exit or observed write denial,
   conflicting verdicts, input drift, degraded/same-provider fallback, or head/base movement leaves the PR draft and
   produces no review attestation. Physical
   read-only mounts—not attempt detection—guarantee that an ignored failed write cannot mutate the candidate. The
   runner persists the redacted phase policy, actual provider, exit reason, candidate SHA, and reviewed SHA; it owns
   all GitHub comments/readiness transitions and never accepts those fields from review output.
5. **Immutable runtime inputs.** Both Dockerfiles use approved Node base image digests. Agent global CLIs/Bun keep
   exact versions and build-time assertions from `2026-08-17-factory-agent-cli-unpinned-spec`; runner dependencies
   use `npm ci`, startup invokes the installed `tsx` path directly, and deployed agent/runner image references are
   immutable `registry/repository@sha256:<manifest-digest>` values in Compose, Swarm, and Kubernetes. A bare local
   image ID or tag is not a production reference: Compose's documented image grammar is a named image with optional
   tag or digest, and only the digest form is immutable
   ([Docker Compose services reference](https://docs.docker.com/reference/compose-file/services/#image)). Each build
   writes a non-secret toolchain/base manifest that CI compares with expected pins; deployment publishes and promotes
   one verified manifest digest instead of rebuilding it per phase.
6. **Compatibility.** API request/response shapes (apart from additive optional phase/evidence fields), run status
   values, draft-PR-first visibility, provider independence/degradation rules, test-loop bounds, review-fix behavior,
   human merge gate, memory read-only mounts
   for develop, and existing resource/time limits remain unchanged unless a slice explicitly replaces their
   implementation. Review FAIL still feeds the bounded separate develop-fix phase; after every fix, the runner runs
   the credential-free self-test, pushes, binds a new candidate, and launches a fresh review. Review never edits.
7. **No false socket claim.** The runner retains the host Docker socket only because rootless Docker/socket proxy is
   out of scope. Documentation and tests state that this is a trusted-controller boundary, not tenant isolation.

## 3. DELTA

1. Replace shared `baseDockerArgs()` with typed, deny-by-default phase policies plus durable runner-owned phase
   attempts/evidence and a tested launch-plan renderer (→ Slice 1; proves: `T-POLICY-ALLOWLIST`,
   `T-NO-SECRET-ARGV`, `T-UNKNOWN-PHASE`, `T-PHASE-RESUME`).
2. Prepare the writable branch/PR through a fixed trusted entrypoint, then move setup and every
   self-test/review-fix self-test into credential-free phase containers over that per-run workspace, with explicit
   network and writable-mount policies (→ Slice 2; proves: `T-WORKSPACE-PREP`, `T-SETUP-SECRET-PROBE`,
   `T-SELFTEST-SECRET-PROBE`, `T-NO-AUTH-MOUNTS`, `T-SELFTEST-NETWORK`, `T-PHASE-SMUGGLE`).
3. Split review from develop; runner prepares and verifies a read-only checkout of every pushed candidate SHA,
   securely ingests only `REVIEW.md`, owns provider/GitHub effects, and accepts only runner-bound PASS evidence
   (→ Slice 3; proves: `T-REVIEW-COMMIT`, `T-REVIEW-STAGE`, `T-REVIEW-PUSH`, `T-REVIEW-CRASH`,
   `T-REVIEW-SHA-RACE`, `T-REVIEW-BASE-RACE`, `T-REVIEW-OUTPUT`, `T-REVIEW-DEGRADED`).
4. Pin base images, runner startup/toolchain, and deployed image identities without undoing the existing agent CLI
   parser-contract pin work (→ Slice 4; proves: `T-IMAGE-PINS`, `T-TOOLCHAIN-MANIFEST`, `T-DIGEST-DEPLOY`).
5. Exercise the full develop→credential-free test→isolated review path against an adversarial fixture and verify
   draft/attestation behavior end to end (→ Slice 5; proves: `T-E2E-CONTAINMENT`).

## 4. Approach — vertical slices

Implement behind `FACTORY_CONTAINMENT_V2`, enabled only by the exact value `1`. Unset, `0`, or malformed values select
the legacy path only during local/staging comparison. Completing this spec requires production deployment config to
emit explicit `1` after the canary; the code default does not silently flip. The flag must not enable automerge. Each
slice is a safe, reviewable PR and is sized for approximately 4-8 focused hours.

### Slice 1 — phase-policy kernel and launch-plan tests (4-6h)

**Topics:** `security`, `infra`, `logic`, `test`

**Goal:** make container authority machine-readable and deny-by-default before changing live execution.

**Files:**

- `runner/src/containers.ts` (new)
- `runner/src/containers.test.ts` (new)
- `runner/src/queue.ts`
- `runner/src/repos.ts`
- `repos.example.json`
- `runner/src/db.ts` (additive durable phase-attempt/evidence schema, or the landed evidence-spine tables)
- `runner/package.json`

Define a closed `WorkerPhase` union and pure `buildContainerPlan()` returning argv plus a redacted observable plan.
Policies enumerate environment names, mounts with `ro|rw`, network mode, root-filesystem mode, tmpfs, user,
resource limits, image digest, and entrypoint. Reject unknown phases and unknown repo network modes. Never build a
shell command string and never log secret values. Secret values are supplied through the child process environment
or an ephemeral credential file, never Docker argv; serialized plans contain names/redacted sources only. Keep
`spawn('docker', argv)`.

Separate secret sources by purpose: checkout/develop GitHub access, model access, and no-secret repo-command phases.
The phase kernel must make it impossible for setup/self-test to inherit any credential, or for review to inherit
anything except its selected model credential, by omission. Persist a phase-attempt record before launch and its
exit/evidence before transition; restarting at each between-phase failpoint resumes without duplicating a push,
comment, readiness transition, or attestation. Reuse the landed durable-state/evidence schema instead of creating a
parallel authority if that prerequisite names the storage shape.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='phase policy|container plan'
npm run typecheck
```

Tests must assert exact env-name and mount sets for every phase, prove sentinel values occur in neither argv nor
serialized/logged plans, reject an invented phase/network mode, and fail if any credential/auth/socket is added to
setup/self-test; if GitHub/SSH/Docker, both model providers, persistent auth, or a writable checkout is added to
review; or if the selected review provider credential is absent. A failpoint test restarts the orchestrator between
every adjacent phase and proves exactly-once external effects and no invented review evidence (`T-PHASE-RESUME`).
Exact network modes are asserted: command phases follow validated repo policy, checkout/develop/review use bridge,
and no worker uses host networking.

### Slice 2 — credential-free setup and self-test workers (6-8h)

**Topics:** `security`, `infra`, `logic`, `test`

**Goal:** repository commands execute where factory, model, and GitHub credentials do not exist.

**Files:**

- `runner/src/queue.ts`
- `runner/src/containers.ts`
- `runner/src/containers.test.ts`
- `runner/src/repos.ts`
- `agent/run.sh`
- `agent/prepare-workspace.sh` (new)
- `agent/phase-command.sh` (new)
- `agent/Dockerfile`
- `runner/src/containment.integration.test.ts` (new)

Create the per-run workspace as a runner-managed mount. A fixed `prepare-workspace.sh` uses only the checkout GitHub
capability to clone the registered base, create/push the factory branch and draft PR, and persist the identifiers; it
must not run hooks, submodules, filters, package scripts, or any checkout content. Refactor the remaining
single-process lifecycle into runner-sequenced entrypoints: develop retains branch-push/model authority, while
registered setup and every self-test (including review-fix self-tests) run through `phase-command.sh`. No worker
pauses to control Docker and no worker receives the socket; continuation state belongs to the runner.

Command phases cannot write runner-owned `.git` metadata, change trusted Git configuration, or add paths used by a
later privileged phase. Automatic Git/gh operations use fixed binaries, an isolated config, and an empty hooks path.
After develop commits/pushes through the existing scoped branch capability, self-test receives a disposable writable
copy of that exact pushed tree plus only named dependency/cache mounts; all self-test filesystem changes are deleted
before review or a fix round. Setup outputs cross into develop only through the named dependency/cache mounts and
workspace paths declared by policy, never through Git config/hooks or shell startup files.

The command worker invokes `/usr/bin/env -i` and then `/bin/bash -c -- "$REGISTERED_COMMAND"` only for commands loaded
from runner-owned `REPOS`, never request input. Docker `--env-file` is forbidden. The fixed allowlist contains only
the command, `HOME`, `PATH`, `CI`, locale, and validated literal repo build variables; reserved credential names and
values sourced from runner `process.env` are rejected. Migrate each current repo to an explicit setup network mode;
self-test is `--network none` unless its reviewed registry policy says `bridge`. Dependency caches are per-run or
read-only and sanitized; no host package-manager credential/config files are mounted.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='credential-free|phase command'
npm run typecheck
cd ..
bash -n agent/prepare-workspace.sh agent/run.sh agent/phase-command.sh
```

The integration fixture's setup and self-test print every environment name, inspect known auth paths, attempt reads of
sentinel-mounted credentials, inspect mounts, and attempt Docker access. Both commands must complete with no sentinel
value/path/socket visible. A self-test network probe must fail while an explicitly `bridge` setup reaches a local
fixture server on an isolated test network (never the public internet), making the test deterministic. Add a negative
test for a reserved repo env name and for every review-fix self-test call site. `T-WORKSPACE-PREP` uses a fixture with
malicious hooks/filters/package scripts and proves none execute while the draft PR/branch identifiers are recorded.
`T-PHASE-SMUGGLE` has setup plant hooks, credential helpers, and PATH shims while self-test also writes a tracked
mutation; later trusted pushes run no planted code, the self-test mutation is absent from the candidate, and the
disposable copy is removed.

### Slice 3 — exact-SHA, read-only review worker (6-8h)

**Topics:** `security`, `infra`, `logic`, `test`

**Goal:** a reviewer can report findings but cannot change the candidate or publish anything.

**Files:**

- `runner/src/queue.ts`
- `runner/src/containers.ts`
- `runner/src/containers.test.ts`
- `runner/src/review.ts` (new)
- `runner/src/review.test.ts` (new)
- `runner/src/db.ts`
- `agent/run.sh`
- `agent/prepare-review.sh` (new)
- `agent/review.sh` (new)
- `agent/Dockerfile`

After a green self-test and push, the runner resolves the PR head through GitHub, records it as `candidateSha`, and
uses the capability-separation checkout credential only in a fixed-entrypoint preparer. The preparer uses isolated
Git config/home, disables hooks/submodules/filters, fetches the recorded base and candidate, checks out the candidate,
verifies `HEAD`, worktree cleanliness, and `candidate^{tree}`, then removes auth-capable remote/helper config. It never
executes checkout content. The review container receives that dedicated checkout as `:ro`, has `--read-only`, and has
no GitHub env, git credential/helper config, persistent Codex auth mount, SSH mount, Docker socket, or shared run
output. Give the selected harness a per-attempt auth home when required, and destroy ephemeral auth/output state
after review. The review prompt diffs the recorded `baseSha...candidateSha`; it never relies on a removed
`origin/<base>` remote-tracking name.

Move prompt/rendering to `agent/review.sh`, but keep output validation, verdict parsing, provider independence, and
acceptance in `runner/src/review.ts`. Provider fallback is a fresh runner-launched attempt and the runner records the
actual provider. It opens `REVIEW.md` with no-follow semantics and validates size/type from that same descriptor,
then compares the prepared manifest/worktree
before and after, checks the live PR head and base SHAs, then records `reviewed_sha=candidateSha`; it never accepts a reviewer-supplied
SHA or other `/out` file. The runner posts the review comment and performs readiness transitions through its GitHub
capability. FAIL enqueues at most the existing bounded develop fix round; a fix creates a new candidate and fresh
checkout/review. A nonzero exit, invalid output, degraded provider pairing, or head race is failed review evidence.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='review containment|review evidence'
npm run typecheck
cd ..
bash -n agent/prepare-review.sh agent/review.sh agent/run.sh
```

Adversarial tests run reviewers that attempt, separately: modify+stage a tracked file; create a commit; push the
candidate branch; write an untracked file; alter `.git`; and exit/crash after writing `VERDICT: PASS`. Every checkout
or remote mutation must fail, writable-temp output must remain outside the checkout, and head/tree OIDs must remain
unchanged. No attestation may exist for crash, malformed/conflicting/symlink/oversized output, same-provider fallback,
or head/base race. Include a clean PASS control, a FAIL→fix→new-candidate→PASS control, and assertions that only the
runner posts comments/marks ready.

### Slice 4 — immutable image and toolchain supply chain (4-6h)

**Topics:** `security`, `deps`, `infra`, `test`

**Goal:** rebuild and deployment select reviewed bytes, not moving tags or implicit CLIs.

**Files:**

- `agent/Dockerfile`
- `runner/Dockerfile`
- `runner/package.json`
- `runner/package-lock.json`
- `docker-compose.yml`
- `deploy/stack.yml`
- `deploy/k8s.yml`
- `deploy.sh`
- `setup.sh`
- `scripts/self-update.sh`
- `scripts/verify-image-pins.sh` (new)
- `.env.example`
- `README.md`

Pin both `FROM` references by digest while retaining a readable tag comment. Preserve or reapply the exact Bun,
Claude Code, Codex, and pnpm pins plus `/etc/factory-toolchain.json` assertions required by
`2026-08-17-factory-agent-cli-unpinned-spec`; land/reconcile that approved work first if main still lacks it rather
than choosing fresh `latest` values here. Replace `CMD ["npx", "tsx", ...]` with the lockfile-installed binary path.
Build and publish each image once for a rollout, then capture its registry manifest digest. Pass required immutable
`FACTORY_AGENT_IMAGE` and `FACTORY_RUNNER_IMAGE` `registry/repository@sha256:<digest>` values through all
compose/deploy manifests. The registry/provider is configurable rather than hardcoded; `setup.sh` requires either
pre-published digest references or explicit registry publish configuration. `deploy.sh`, `setup.sh`, and
`self-update.sh` verify the resolved identity and refuse a tag-only/local-ID containment rollout.
Extend the agent toolchain manifest with its base-image identity and add `/etc/factory-runtime.json` to the runner
image with its base identity plus lockfile hash; both are derived from inspected build inputs, never secret values.

Digest updates are deliberate dependency changes: update Dockerfile/manifests, rebuild, run all containment tests,
record old/new digests and upstream release notes in the PR. Do not pull mutable tags at worker launch.

**Definition of done (machine-checkable):**

```bash
bash scripts/verify-image-pins.sh
docker build --pull -t factory-agent-proof -f agent/Dockerfile .
docker build --pull -t factory-runner-proof -f runner/Dockerfile .
docker run --rm --entrypoint sh factory-agent-proof -c 'test -r /etc/factory-toolchain.json'
docker run --rm --entrypoint sh factory-runner-proof -c 'test -r /etc/factory-runtime.json && test -x /app/node_modules/.bin/tsx'
docker build --no-cache --pull -t factory-agent-proof-2 -f agent/Dockerfile .
diff <(docker run --rm --entrypoint cat factory-agent-proof /etc/factory-toolchain.json) \
  <(docker run --rm --entrypoint cat factory-agent-proof-2 /etc/factory-toolchain.json)
bash scripts/verify-image-pins.sh --integration
```

The pin verifier fails on tag-only `FROM`, unversioned global installs/Bun, `npx` startup, or tag-only production
agent/runner references. Two clean builds must report the same declared toolchain versions; cross-build image-digest
equality is not a reproducibility requirement. The rollout records and deploys the identity of one verified build,
and a negative test proves a tag/local-ID value is rejected before Compose, Swarm, or Kubernetes activation. The
integration mode starts an isolated disposable registry from an explicitly pinned test image, publishes both proof
images, resolves their manifest digests, renders every deployment manifest with those refs, and proves the runtime
selects the same digests; it requires no production registry or credentials.

### Slice 5 — adversarial end-to-end containment and rollout (6-8h)

**Topics:** `security`, `infra`, `logic`, `test`

**Goal:** prove the boundaries in the actual runner lifecycle and make production activation reversible.

**Files:**

- `runner/src/containment.e2e.test.ts` (new)
- `runner/src/queue.ts`
- `runner/src/db.ts`
- `runner/src/containers.ts`
- `runner/src/review.ts`
- `docker-compose.yml`
- `deploy.sh`
- `setup.sh`
- `README.md`
- `playbooks/minion-factory.md`

Add a local fixture repository and fake GitHub/model adapters so CI can run without real credentials or pushes. The
fixture must attempt credential theft from setup/self-test and the committed/staged/pushed/crashed review cases from
the proposal. Assert phase events, candidate/reviewed SHA binding, remote immutability, result status, and draft/ready
decision. Then run one real low-stakes canary with `FACTORY_CONTAINMENT_V2=1`, automerge still `0`, and manually
inspect the redacted phase plans plus PR evidence before persisting explicit `1` in production deployment config.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test
npm run typecheck
cd ..
bash -n agent/*.sh deploy.sh setup.sh scripts/*.sh
bash scripts/verify-image-pins.sh
bash scripts/verify-image-pins.sh --integration
```

The E2E suite must fail if any forbidden sentinel is observable, if review can mutate/push, if invalid/degraded/crashed
review emits an attestation, if a fix round reuses an old candidate, if a runner restart duplicates a phase side
effect, or if reviewed SHA differs from the exact PR head. The canary evidence records run id, every phase attempt,
candidate/reviewed SHA, image identities, phase-policy summaries, and confirmation that the PR remained human-gated.

## 5. Cross-repo impact assessment

| Surface | Impact | Mitigation / alert |
|---|---|---|
| `minion-factory` runner/API/SQLite | Internal execution changes plus additive durable phase/evidence records; public request shapes and status values do not change | Reuse the landed evidence spine/outbox where applicable; expose only optional evidence fields. Failpoint tests prove restart-safe continuation. |
| Target repos (`minion`, hub, site, base, meta, factory) | Their registry entries gain explicit setup/self-test network modes and registered commands run without credentials | Recon every built-in and mounted `REPOS` entry before activation. If a test genuinely needs network, add a reviewed `bridge` policy; never add credentials to make it green. Alert owners where offline tests are impossible. |
| `minion-meta` topic/capability manifest | Roadmap orders containment after M3; the manifest selects required review evidence | Consume the landed runner-owned manifest unconditionally. Do not edit meta taxonomy/indexes here and do not trust agent-authored tags. |
| Capability separation | Roadmap orders its per-run GitHub credentials before containment | Consume its checkout/develop capability interface; issuance/revocation remains owned by that work. Review and command phases never receive GitHub capability. |
| Agent CLI pin spec | Containment also edits `agent/Dockerfile` and harness launch paths | Land/reconcile its exact pins, manifest, and parser-contract checks first; do not choose replacement versions here. |
| Gateway protocol / shared packages / DB / auth / UI | No frame, shared-package, shared DB, auth, or UI change | Cross-Project Impact Zones therefore require no hub/site/paperclip changes. Any discovered protocol/UI need is a new proposal, not scope expansion. |
| Deployment | Runner remains Docker-socket privileged; immutable image references, registry publish/pull credentials, and the flag must survive deploy/self-update/setup paths | `deploy.sh` must emit non-secret digest refs because it rewrites `.env` wholesale (hard constraint from `/memory/MINION/minion-factory-agent-pipeline.md`); registry credentials use a separate secret input and are never passed to workers. All runtimes consume registry digests. Keep automerge off and document residual host-root trust. |

Unavoidable alert: repositories whose tests download fixtures, contact hosted databases, or invoke cloud CLIs will
fail under the default self-test network/credential policy. That is evidence of an undeclared test dependency, not a
reason to reintroduce shared secrets. The implementation PR must list every exception before production activation.

## 6. Explicit out of scope

- Rootless Docker, a Docker socket proxy, user namespaces, seccomp/AppArmor policy, or replacing sibling containers
  with Kubernetes Jobs. The runner remains a trusted host-root-equivalent controller.
- GitHub App installation-token issuance, per-run revocation, target/meta/memory credential separation, or deriving
  actor identity from credentials; `2026-08-17-factory-capability-separation` owns that prerequisite. This spec only
  consumes its checkout/develop capability interface.
- General egress allowlisting/browser isolation; browser verification remains blocked on containment and has its own
  proposal/spec path.
- Changing target-repo tests merely to tolerate containment, adding secrets to tests, or enabling network globally.
- Changes to gateway protocol, shared packages, hub/site UI, shared database, authentication, memory governance, or
  automerge eligibility.
- Removing the human approval or merge gates.
- Preventing credential exposure to arbitrary repository code that the credentialed develop agent independently
  chooses to execute. This spec contains the runner's registered setup/self-test paths and review publication
  authority; broader develop sandboxing requires a separate capability/egress design.

## 7. End-to-end verification

On a Docker host, with production credentials replaced by unique sentinels and a disposable private Git remote:

1. Build/publish both images once and run `scripts/verify-image-pins.sh`; record base/toolchain manifests plus the
   deployed registry manifest digests, and prove tag-only/local-ID values are rejected.
2. Run the entire runner unit/integration/E2E suite. Confirm the adversarial fixture covers setup/self-test secret
   probes plus review modify, stage, commit, push, untracked-write, `.git` write, crash, and concurrent-head movement.
3. Queue a containment-v2 canary. Verify the draft PR appears before setup/develop, setup uses its reviewed network mode
   with no credential, self-test completes under its declared network policy with no credential, and develop pushes
   exactly one candidate SHA. The automated network control remains the isolated local fixture from Slice 2.
4. Verify the runner-prepared review manifest names that candidate SHA; inspect the live review container and confirm
   checkout/root filesystem read-only, no GitHub/Docker/SSH credential surfaces, no persistent Codex home, and only
   the documented writable paths.
5. Run a clean independent-provider PASS and confirm `candidate_sha == reviewed_sha == live PR head`; repeat with
   conflicting/symlink output, same-provider fallback, crash, pushed-head-race, and base-advance fixtures and confirm
   reviewed SHA is absent and the PR remains draft. Run FAIL→fix and confirm the re-review binds a new candidate.
6. Restart the runner at each between-phase failpoint and verify durable continuation, no duplicate pushes/comments/
   readiness transitions, and no invented attestation. Confirm review auth/output/workspace is destroyed.
7. Confirm `FACTORY_AUTOMERGE=0`, have a human review/merge or close the canary PR, then persist explicit
   `FACTORY_CONTAINMENT_V2=1` through the real deploy path and verify the restarted runner still reports the same
   phase/evidence history.

This spec is complete only when those checks pass without weakening the earlier CLI parser-contract pins, the
runner-owned manifest/evidence rules, provider independence, or the human merge gate. These constraints follow
`/memory/MINION/sdlc-board-triage-and-phase-gates.md` (controller owns truth; prompts are not security boundaries;
reviewers are technically read-only; automerge stays off through M7) and
`/memory/MINION/minion-factory-agent-pipeline.md` (reviewers propose while the applier re-verifies; deploy rewrites
`.env` wholesale).

## Board audit 2026-08-28

Audited against minion-factory@34a3b21 (4-agent evidence sweep, operator-applied).
Scope narrowed: S1-S3 shipped (PHASE_POLICIES, factory-*.sh entrypoints, credential-free develop, phase_attempts/effects).

Slice 4 shipped through minion-factory PR #145 and supervised production release
`1901ed0699f4a0e23d918392bac8429a09b30758`. Exact-head and post-merge CI proved the static pin verifier, a disposable-registry build/publish/digest-resolution integration, both immutable agent and runner refs across Compose/Swarm/Kubernetes, flattened promotion bundles, rollback digest alignment, ShellCheck, TypeScript, and 967 runner tests. Follow-up PR #146 fixed atomic replacement of stale read-only advisory reports and deployed as
`341fa832e1f2af5d29bb3b3fb0882cc461ec780d` through the same supervised path.

Remaining: S5 canary activation only. Production verification confirmed
`FACTORY_CONTAINMENT_V2=0`; immutable supply-chain rollout does not authorize activation.
