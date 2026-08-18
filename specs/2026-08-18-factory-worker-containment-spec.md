---
id: 2026-08-18-factory-worker-containment-spec
title: Factory worker containment — credential-free repo commands and isolated read-only review
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
proposal: 2026-08-17-factory-worker-containment
verdict: pending
repos: [minion-factory]
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

Relevant but not merged into this relationship: `2026-08-17-factory-capability-separation` owns short-lived,
per-run GitHub credentials; this spec is independently useful because review receives no GitHub credential and
repo-controlled commands receive no factory/model/GitHub credentials at all. The capability work may later replace
the trusted checkout preparer's shared token without changing these boundaries. The roadmap orders this after
`2026-08-18-factory-topic-capability-manifest-spec`; implementation must consume its runner-owned manifest if that
spec has landed, but containment must not wait on agents to self-declare risk.

## 1. AS-IS

Verified against `NikolasP98/minion-factory@main` through the GitHub contents API on 2026-08-18. Re-read HEAD before
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

Known constraint from `/memory/MINION/minion-factory-agent-pipeline.md`: reviewers propose and the applier
re-verifies; the reviewer must never become an applier. The same memory records that `deploy.sh` rewrites the box
`.env` wholesale, so every new containment flag or image reference required at runtime must be emitted by
`deploy.sh`, not hand-added on the host. `/memory/MINION/sdlc-board-triage-and-phase-gates.md` is stricter: prompts
are not security boundaries, reviewers are technically read-only, the controller owns truth, and automerge stays
disabled through M0-M7. Those are hard invariants here.

## 2. TO-BE

The runner owns an explicit phase plan and launches separate, narrowly configured containers. The minimum phases
for a dev run are trusted checkout preparation, credential-free repository command(s), develop, credential-free
self-test, and isolated review. A phase receives only the mounts, network mode, credentials, and entrypoint named
by runner code; arbitrary agent output cannot add Docker arguments.

### Target invariants

1. **Trusted source binding.** The runner records the PR repository, branch, and exact candidate SHA after develop
   push. A trusted checkout-preparation container fetches that SHA without executing repository code, verifies
   `git rev-parse HEAD` equals it, removes git credentials/config capable of pushing, and hands the runner an
   immutable review input. The runner, not the reviewer, stamps the reviewed SHA.
2. **Credential-free repo code.** Every invocation of a repository-controlled `setup` or `selfTest` command runs
   in a separate phase container with an explicit environment allowlist. It has no `GH_TOKEN`, factory bearer,
   Claude/Anthropic credential, Codex auth mount, SSH agent/socket, cloud-memory write path, or Docker socket.
   `env -u` inside the broad worker is not sufficient. Setup may write only the per-run workspace/cache mounts it
   needs; self-test may use that workspace but must not receive a network credential. Network defaults to `none` for
   self-test; a repo registry field may opt setup into network because dependency installation requires it. Such an
   opt-in changes connectivity, never the credential allowlist.
3. **Physically read-only review.** Review runs in a new container, never the develop container. The exact checkout
   is mounted read-only; the container root filesystem is read-only; only `/tmp`, a per-run harness home if needed,
   and `/out` are writable tmpfs/binds. Review gets the chosen model credential but no GitHub credential, no Codex
   auth mount that persists across runs, no Docker socket, and no writable developer workspace. It cannot push even
   if repository instructions request it. `/out/REVIEW.md` is the only accepted product.
4. **Fail-closed evidence.** Review PASS is accepted only when the review process exits zero, its first non-empty
   line is exactly `VERDICT: PASS`, the runner-prepared input hash/SHA still matches, and the PR head still equals
   that SHA. Missing output, conflicting verdicts, crashes, input drift, write attempts, or head movement leave the
   PR draft and produce no review attestation. The runner persists/logs phase policy and exit reason so the boundary
   is observable.
5. **Immutable runtime inputs.** Both Dockerfiles use approved Node base image digests. Agent global CLIs/Bun keep
   exact versions and build-time assertions from `2026-08-17-factory-agent-cli-unpinned-spec`; runner dependencies
   use `npm ci`, startup invokes the installed `tsx` path directly, and deployed agent/runner image references are
   immutable digests. A build writes a non-secret toolchain/base manifest that CI compares with expected pins.
6. **Compatibility.** API request/response shapes, run status values, draft-PR-first visibility, provider
   independence/degradation rules, test-loop bounds, review-fix behavior, human merge gate, memory read-only mounts
   for develop, and existing resource/time limits remain unchanged unless a slice explicitly replaces their
   implementation. Review findings still feed a separate develop fix phase; review never edits.
7. **No false socket claim.** The runner retains the host Docker socket only because rootless Docker/socket proxy is
   out of scope. Documentation and tests state that this is a trusted-controller boundary, not tenant isolation.

## 3. DELTA

1. Replace shared `baseDockerArgs()` with typed, deny-by-default phase policies and a tested launch-plan renderer
   (→ Slice 1; proves: `T-POLICY-ALLOWLIST`, `T-NO-SECRET-ARGV`, `T-UNKNOWN-PHASE`).
2. Move setup and every self-test/review-fix self-test into credential-free phase containers over a per-run
   workspace, with explicit network and writable-mount policies (→ Slice 2; proves: `T-SETUP-SECRET-PROBE`,
   `T-SELFTEST-SECRET-PROBE`, `T-NO-AUTH-MOUNTS`, `T-SELFTEST-NETWORK`).
3. Split review from develop; runner prepares and verifies a read-only checkout of the pushed candidate SHA and
   accepts only runner-bound PASS evidence (→ Slice 3; proves: `T-REVIEW-COMMIT`, `T-REVIEW-STAGE`,
   `T-REVIEW-PUSH`, `T-REVIEW-CRASH`, `T-REVIEW-SHA-RACE`).
4. Pin base images, runner startup/toolchain, and deployed image identities without undoing the existing agent CLI
   parser-contract pin work (→ Slice 4; proves: `T-IMAGE-PINS`, `T-TOOLCHAIN-MANIFEST`, `T-DIGEST-DEPLOY`).
5. Exercise the full develop→credential-free test→isolated review path against an adversarial fixture and verify
   draft/attestation behavior end to end (→ Slice 5; proves: `T-E2E-CONTAINMENT`).

## 4. Approach — vertical slices

Implement behind `FACTORY_CONTAINMENT_V2=0` initially. The flag may select the legacy path only in local/staging
verification; production rollout requires an explicit `1`. It must not enable automerge. Each slice is a safe,
reviewable PR and is sized for approximately 4-8 focused hours.

### Slice 1 — phase-policy kernel and launch-plan tests (4-6h)

**Goal:** make container authority machine-readable and deny-by-default before changing live execution.

**Files:**

- `runner/src/containers.ts` (new)
- `runner/src/containers.test.ts` (new)
- `runner/src/queue.ts`
- `runner/src/repos.ts`
- `runner/src/db.ts` (only if a phase-plan/evidence column is required; additive migration in the existing bootstrap)
- `runner/package.json`

Define a closed `WorkerPhase` union and pure `buildContainerPlan()` returning argv plus a redacted observable plan.
Policies enumerate environment names, mounts with `ro|rw`, network mode, root-filesystem mode, tmpfs, user,
resource limits, image digest, and entrypoint. Reject unknown phases and unknown repo network modes. Never build a
shell command string and never log secret values. Keep `spawn('docker', argv)`.

Separate secret sources by purpose: checkout/develop GitHub access, model access, and no-secret repo-command phases.
The phase kernel must make it impossible for `setup`/`selfTest`/`review` to inherit the common broad args by omission.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='phase policy|container plan'
npm run typecheck
```

Tests must assert exact env-name and mount sets for every phase, redact sentinel secret values from serialized plans,
reject an invented phase, and fail if `GH_TOKEN`, model credentials, Codex auth, Docker socket, or a writable checkout
is added to setup/self-test/review policy contrary to §2.

### Slice 2 — credential-free setup and self-test workers (6-8h)

**Goal:** repository commands execute where factory, model, and GitHub credentials do not exist.

**Files:**

- `runner/src/queue.ts`
- `runner/src/containers.ts`
- `runner/src/containers.test.ts`
- `runner/src/repos.ts`
- `agent/run.sh`
- `agent/phase-command.sh` (new)
- `agent/Dockerfile`
- `runner/src/containment.integration.test.ts` (new)

Create the per-run workspace as a runner-managed mount. Develop retains clone/push/model authority but delegates the
registered setup and all self-test invocations to `phase-command.sh` through the runner phase executor. Do not use
`docker` from inside the agent container. If the current single-process control flow cannot pause and ask the runner,
split `run.sh` into phase entrypoints with runner-owned continuation state; do not add a Docker socket to workers.

The command worker uses `/bin/bash -c -- "$REGISTERED_COMMAND"` only for commands loaded from trusted `REPOS`, never
request input. Its environment begins empty (`--env-file` is forbidden) and receives a minimal fixed allowlist such
as `HOME`, `PATH`, `CI`, locale, and repo-declared non-secret build variables. Setup can use network; self-test uses
`--network none` by default. Dependency caches are per-run or read-only; no host package-manager credential files.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='credential-free|phase command'
npm run typecheck
cd ..
bash -n agent/run.sh agent/phase-command.sh
```

The integration fixture's setup and self-test print every environment name, inspect known auth paths, attempt reads of
sentinel-mounted credentials, inspect mounts, and attempt Docker access. Both commands must complete with no sentinel
value/path/socket visible. A self-test network probe must fail while a setup dependency-network probe succeeds.

### Slice 3 — exact-SHA, read-only review worker (6-8h)

**Goal:** a reviewer can report findings but cannot change the candidate or publish anything.

**Files:**

- `runner/src/queue.ts`
- `runner/src/containers.ts`
- `runner/src/containers.test.ts`
- `runner/src/review.ts` (new)
- `runner/src/review.test.ts` (new)
- `agent/run.sh`
- `agent/review.sh` (new)
- `agent/Dockerfile`

After a green self-test and push, the runner resolves the PR head through GitHub, records it as `candidateSha`, and
uses a trusted non-repo-code checkout preparer to fetch exactly that commit. The preparer may receive the current
GitHub token until capability separation lands, but it must have a fixed entrypoint and must never execute checkout
content. It removes remote credentials and writes a runner-owned manifest containing repo, SHA, and a deterministic
tracked-tree hash. The review container receives that checkout as `:ro`, has `--read-only`, and has no GitHub env,
git credential/helper config, persistent Codex auth mount, SSH mount, or Docker socket. Give harnesses a per-run
ephemeral auth home when required; destroy it after review.

Move prompt/verdict parsing to `agent/review.sh`, but keep acceptance in `runner/src/review.ts`. The runner compares
the prepared manifest before/after, checks the live PR head, then records `reviewed_sha=candidateSha`; it never accepts
a reviewer-supplied SHA. A FAIL may enqueue the existing develop fix phase. A crash or write denial is a failed
review, never evidence.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test -- --test-name-pattern='review containment|review evidence'
npm run typecheck
cd ..
bash -n agent/review.sh agent/run.sh
```

Adversarial tests run reviewers that attempt, separately: modify+stage a tracked file; create a commit; push the
candidate branch; write an untracked file; alter `.git`; and exit/crash after writing `VERDICT: PASS`. Every mutation
must fail or remain outside the checkout, the remote/head/tree hash must be unchanged, and no PASS attestation may
exist for a crashed or head-raced review. Include a clean PASS control.

### Slice 4 — immutable image and toolchain supply chain (4-6h)

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
- `README.md`

Pin both `FROM` references by digest while retaining a readable tag comment. Preserve or reapply the exact Bun,
Claude Code, Codex, and pnpm pins plus `/etc/factory-toolchain.json` assertions required by
`2026-08-17-factory-agent-cli-unpinned-spec`; if main still lacks them at implementation time, land/reconcile that
approved work first rather than choosing fresh `latest` values here. Replace `CMD ["npx", "tsx", ...]` with the
lockfile-installed binary path. Build images once, capture their content digests, and pass immutable
`FACTORY_AGENT_IMAGE`/runner image references through compose/deploy manifests. `deploy.sh`, `setup.sh`, and
`self-update.sh` must verify expected digest and refuse a tag-only containment rollout.

Digest updates are deliberate dependency changes: update Dockerfile/manifests, rebuild, run all containment tests,
record old/new digests and upstream release notes in the PR. Do not pull mutable tags at worker launch.

**Definition of done (machine-checkable):**

```bash
bash scripts/verify-image-pins.sh
docker build --pull -t factory-agent-proof -f agent/Dockerfile .
docker build --pull -t factory-runner-proof -f runner/Dockerfile .
docker run --rm --entrypoint sh factory-agent-proof -c 'test -r /etc/factory-toolchain.json'
docker run --rm --entrypoint sh factory-runner-proof -c 'test -x /app/node_modules/.bin/tsx'
```

The pin verifier fails on tag-only `FROM`, unversioned global installs/Bun, `npx` startup, or a tag-only production
worker image reference. Two clean builds must report the same declared toolchain versions; image content digests may
differ across architecture/build metadata, so equality is required only for the deployed platform under the same
BuildKit/provenance settings.

### Slice 5 — adversarial end-to-end containment and rollout (6-8h)

**Goal:** prove the boundaries in the actual runner lifecycle and make production activation reversible.

**Files:**

- `runner/src/containment.e2e.test.ts` (new)
- `runner/src/queue.ts`
- `docker-compose.yml`
- `deploy.sh`
- `setup.sh`
- `README.md`
- `playbooks/minion-factory.md`

Add a local fixture repository and fake GitHub/model adapters so CI can run without real credentials or pushes. The
fixture must attempt credential theft from setup/self-test and the committed/staged/pushed/crashed review cases from
the proposal. Assert phase events, candidate/reviewed SHA binding, remote immutability, result status, and draft/ready
decision. Then run one real low-stakes canary with `FACTORY_CONTAINMENT_V2=1`, automerge still `0`, and manually
inspect the redacted phase plans plus PR evidence before making the flag default-on.

**Definition of done (machine-checkable):**

```bash
cd runner
npm test
npm run typecheck
cd ..
bash -n agent/*.sh deploy.sh setup.sh scripts/*.sh
bash scripts/verify-image-pins.sh
```

The E2E suite must fail if any forbidden sentinel is observable, if review can mutate/push, if a crash emits an
attestation, or if reviewed SHA differs from the exact PR head. The canary evidence records run id, candidate SHA,
reviewed SHA, image digests, phase-policy summaries, and confirmation that the PR remained human-gated.

## 5. Cross-repo impact assessment

| Surface | Impact | Mitigation / alert |
|---|---|---|
| `minion-factory` runner/API | Internal execution changes; public request/response schema need not change | Keep existing run states/API compatible; add only optional evidence fields. Feature-flag rollout and canary before default-on. |
| Target repos (`minion`, hub, site, base, meta) | Their registered setup/self-test commands run without credentials and self-test network defaults off | Recon every `REPOS` command before activation. If a test genuinely needs network, add a narrowly documented repo policy; never add credentials to make it green. Alert owners where offline tests are currently impossible. |
| `minion-meta` topic manifest | Roadmap orders containment after manifest; manifest may select required review evidence | Consume runner-owned manifest when present. Do not edit meta taxonomy/indexes in this implementation and do not trust agent-authored tags. |
| Capability separation | Later per-run tokens improve the trusted checkout/develop phases | Keep checkout credential injection behind one interface so the token source can change without weakening setup/test/review isolation. |
| Gateway protocol / shared packages / DB / auth / UI | No frame, shared-package, shared DB, auth, or UI change | Cross-Project Impact Zones therefore require no hub/site/paperclip changes. Any discovered protocol/UI need is a new proposal, not scope expansion. |
| Deployment | Runner remains Docker-socket privileged; image references and flag must survive deployment | `deploy.sh` must emit them because it rewrites `.env` wholesale. Keep automerge off. Explicitly document residual host-root trust. |

Unavoidable alert: repositories whose tests download fixtures, contact hosted databases, or invoke cloud CLIs will
fail under the default self-test network/credential policy. That is evidence of an undeclared test dependency, not a
reason to reintroduce shared secrets. The implementation PR must list every exception before production activation.

## 6. Explicit out of scope

- Rootless Docker, a Docker socket proxy, user namespaces, seccomp/AppArmor policy, or replacing sibling containers
  with Kubernetes Jobs. The runner remains a trusted host-root-equivalent controller.
- GitHub App installation-token issuance, per-run revocation, target/meta/memory credential separation, or deriving
  actor identity from credentials; `2026-08-17-factory-capability-separation` owns that work.
- General egress allowlisting/browser isolation; browser verification remains blocked on containment and has its own
  proposal/spec path.
- Changing target-repo tests merely to tolerate containment, adding secrets to tests, or enabling network globally.
- Changes to gateway protocol, shared packages, hub/site UI, shared database, authentication, memory governance, or
  automerge eligibility.
- Removing the human approval or merge gates.

## 7. End-to-end verification

On a Docker host, with production credentials replaced by unique sentinels and a disposable private Git remote:

1. Build both images and run `scripts/verify-image-pins.sh`; record base/toolchain/deployed image digests.
2. Run the entire runner unit/integration/E2E suite. Confirm the adversarial fixture covers setup/self-test secret
   probes plus review modify, stage, commit, push, untracked-write, `.git` write, crash, and concurrent-head movement.
3. Queue a containment-v2 canary. Verify the draft PR appears before develop, setup completes with allowed network
   but no credential, self-test completes under its declared network policy with no credential, and develop pushes
   exactly one candidate SHA.
4. Verify the runner-prepared review manifest names that candidate SHA; inspect the live review container and confirm
   checkout/root filesystem read-only, no GitHub/Docker/SSH credential surfaces, no persistent Codex home, and only
   the documented writable paths.
5. Run a clean PASS review and confirm `candidate_sha == reviewed_sha == live PR head`; then repeat with crash and
   pushed-head-race fixtures and confirm reviewed SHA is absent and the PR remains draft.
6. Confirm `FACTORY_AUTOMERGE=0`, have a human review/merge or close the canary PR, restart the runner, and verify
   phase/evidence state remains observable and no review auth/workspace persists.

This spec is complete only when those checks pass without weakening the earlier CLI parser-contract pins or the
human merge gate.
