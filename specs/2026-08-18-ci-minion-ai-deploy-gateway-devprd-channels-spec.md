---
id: 2026-08-18-ci-minion-ai-deploy-gateway-devprd-channels-spec
title: CI deploy gateway DEV/PRD channels — serialize and retry Swarm contention
stage: spec
status: draft
pass: 1
created: 2026-08-18
updated: 2026-08-18
proposal: ci-minion-ai-deploy-gateway-devprd-channels
verdict: pending
repos: [minion]
relationship: extends
related: [2026-07-19-build-channel-dev-prd-pipeline, 2026-07-13-runtime-aware-fleet-image-updates, 2026-07-13-minion-gateway-swarm-cutover]
---

# CI deploy gateway DEV/PRD channels — serialize and retry Swarm contention

## 0. Product

The proposal reports:

> **Root cause:** Another Swarm fleet update is already running; `update-controller.sh`
> enforces mutual exclusion and exits with code 4.

> **Definition of done:** the workflow's latest completed run on `main` is green, or
> the workflow is deliberately removed/disabled with rationale.

The workflow is still the intended production delivery path, so this spec recommends fixing it,
not retiring it. A valid release must wait a bounded amount of time for the production controller,
then either deploy the exact `:prd` artifact or fail with an actionable contention diagnostic. It
must not weaken the host mutex, overlap two single-writer gateway replacements, silently accept a
failed SSH command, or change which branch/tag reaches DEV or PRD.

## 1. Relationship recommendation

**Recommended classification: `extends`.** The relationship is advisory; a resolver or human owns
any lifecycle changes to the related artifacts.

- `2026-07-19-build-channel-dev-prd-pipeline` — extends its dual-channel CI work by making the
  existing `main` → PRD leg tolerate transient controller contention; it does not add or remap a
  channel.
- `2026-07-13-runtime-aware-fleet-image-updates` — extends the shipped external-image controller
  integration at its documented `flock` contention boundary without changing the controller's
  rollout semantics.
- `2026-07-13-minion-gateway-swarm-cutover` — preserves its one-active-writer, stop-first, immutable
  digest, sequential rollout, and rollback invariants while changing only CI orchestration.

The index search also found the older gateway update design/plan/runbook and fleet-orchestration
specs. They describe superseded package/systemd or broader fleet behavior rather than the current
DEV/PRD workflow failure, so they are not relationship targets for this narrowly scoped fix.

## 2. AS-IS → TO-BE → DELTA

### 2.1 AS-IS — verified current behavior

1. Proposal run `32089416217`, job `Deploy to prd-netcup`, step `Update Swarm fleet to immutable
   prd digest`, invokes the production host through SSH with:

   ```text
   MINION_SWARM_STATE_DIR=/opt/minion-swarm
   MINION_SWARM_SOURCE_IMAGE=ghcr.io/nikolasp98/minion-ai:prd
   /opt/minion-swarm/update-controller.sh update
   ```

   The controller printed `another fleet update is already running` and returned exit code `4`;
   the job failed before producing a successful artifact-identity summary. The captured run log in
   the proposal is the current-run evidence.
2. The deployed controller contract is `deploy/swarm/update-controller.sh
   <resolve|status|update>` and uses `flock` to serialize sequential, stop-first service updates.
   It resolves a mutable channel tag to an immutable digest and records structured status. These
   behaviors are anchored in `2026-07-13-runtime-aware-fleet-image-updates.md` §§5–6 and
   `2026-07-13-minion-gateway-swarm-cutover.md` §§Workload model/Reliability controls.
3. The established release mapping is `DEV` → `:dev` and `main` → `:prd`; the `prd` branch does not
   deploy. This is a hard operational constraint from
   `/memory/MINION/netcup-gateway-swarm-deploy.md` ("2026-07-19 release run") and the target state in
   `2026-07-19-build-channel-dev-prd-pipeline.md` WP-B.
4. Existing specifications identify `.github/workflows/deploy-production.yml` as the workflow that
   deploys the `main` production channel. The target `minion` checkout is absent from this planning
   workspace, so the implementer must resolve the failing run's `path` and `head_sha` through the
   GitHub Actions API before editing. If run `32089416217` does not identify that exact file at the
   expected `main` revision, Slice 0 stops and updates the implementation evidence; it must not
   guess a replacement path.
5. The current step treats controller contention as an immediate terminal failure. No evidence in
   the proposal shows a bounded retry, wait message, or job-level channel concurrency guard.
6. Test execution must stay narrow: `/memory/MINION/gw-no-full-test-suite.md` says the full gateway
   suite crashes the box; `/memory/MINION/test-suite-recon-2026-08-10.md` establishes
   `pnpm vitest run test/ci/` as the safe gateway gate. This workflow-only change does not justify a
   full product suite.

### 2.2 TO-BE — target behavior and invariants

1. Deploy runs for the same repository and channel are serialized in GitHub Actions with a stable
   channel-specific concurrency group and `cancel-in-progress: false`. A newer production release
   must not cancel an active production rollout.
2. The PRD Swarm step retries **only** controller exit code `4`, using a documented fixed interval
   and a total timeout bounded below the job timeout. Attempt count, elapsed wait, and the terminal
   reason are visible in the log and step summary.
3. Exit code `0` proceeds to validate the controller JSON and requires
   `.lastUpdate.state` to be `completed` or `current`. Any nonzero code other than `4`, malformed
   JSON, terminal controller state, SSH error, or timeout fails the job without being hidden by
   `tee` or another pipeline process.
4. Every retry invokes the same host, state directory, controller path, source image, and deploy
   target as the original step. CI does not inspect or delete the host lock, run two updates in
   parallel, alter `update-controller.sh`, or bypass its rollback and health checks.
5. Branch/channel invariants remain byte-for-byte in intent: `DEV` deploys `:dev`, `main` deploys
   `:prd`, and `prd` deploys nothing. The production Swarm services remain pinned to the resolved
   immutable digest and stay one replica/one active writer with stop-first sequencing.
6. Scope remains one target-repository workflow file. No gateway protocol, channel-extension,
   shared-package, Hub, Site, Paperclip, database, host script, server registry, credential, or
   production target change is permitted.
7. The latest completed run of the named workflow on `main` is green after the change. If the
   bounded wait expires because a genuinely stuck controller owns the lock, the run may remain red
   but must state the timeout and direct the operator to the controller status; that is safe failure
   behavior, not completion of this proposal's DoD.

### 2.3 DELTA — traceable transitions

| # | Transition | Slice | Proving test/evidence |
|---|---|---|---|
| D1 | Resolve the exact workflow file/revision and capture the existing branch, image, target, controller, shell, and timeout contract before editing. | S0 | GitHub API/run metadata plus the machine-readable baseline assertions in S0 all pass. |
| D2 | Serialize deploy runs per channel without cancelling the active run. | S1 | Static YAML assertion finds a channel-specific `concurrency.group` and literal `cancel-in-progress: false`; `actionlint` passes. |
| D3 | Replace fail-fast-on-4 with a bounded retry loop that preserves the SSH exit code across output capture and retries no other failure. | S1 | Deterministic shell harness returns success for `4,4,0`, immediate failure for `255`, and timeout failure for repeated `4`; `shellcheck`/`actionlint` pass. |
| D4 | Preserve the exact DEV/PRD mapping and production target/controller arguments. | S1 | Before/after semantic assertions compare branch filters, image tags, host/server selector, state directory, and controller path; only orchestration keys/block differ. |
| D5 | Validate successful controller JSON and emit contention/result evidence without accepting malformed or terminal output. | S1 | Harness fixtures cover `current`, `completed`, malformed JSON, and a terminal non-success state; only the first two return zero. |
| D6 | Prove the repaired production path on `main`. | S2 | Latest completed named workflow run for `main` is green; job summary records attempts and immutable artifact identity; live service inspection matches the resolved digest and remains 1/1 healthy. |

## 3. Approach — vertical slices

Each slice is sized for a junior developer working approximately 4–8 focused hours. S0 is a gate
inside S1's timebox, not authorization for a separate exploratory change.

### Slice 0 — Freeze the live workflow contract and red-state evidence

**Goal:** turn the proposal's diagnosis into a reproducible, file-anchored baseline before changing
production CI.

**Exact files to touch:** none.

**Work:**

1. Read run `32089416217` through the GitHub Actions API/CLI and record `workflow_id`, workflow
   `path`, `head_branch`, `head_sha`, conclusion, failed job/step, and exit code. Check out/read the
   file at that exact SHA without switching the shared worktree.
2. Confirm the expected file is `.github/workflows/deploy-production.yml`. If the run names another
   path, use the run-reported path as S1's sole file and record the discrepancy in the PR; do not
   touch both.
3. Machine-assert the current main/DEV triggers, `:prd`/`:dev` values, `prd-netcup` selector, SSH
   target, `/opt/minion-swarm` state directory, `/opt/minion-swarm/update-controller.sh update`, job
   timeout, and any existing workflow/job concurrency. Record the exact values in the PR body.
4. Confirm exit `4` is still the controller's documented busy result at the deployed revision. Do
   not edit or deploy the host script. If the meaning is ambiguous or changed, stop for human review.
5. Choose named constants in the workflow shell for retry interval and maximum attempts so their
   product is positive and less than the remaining job timeout. Recommended starting policy:
   30-second interval, 20 attempts (at most 10 minutes); adjust only from observed normal rollout
   duration and document the arithmetic.

**Machine-checkable definition of done:** a saved PR comment/body contains all run identity fields
and baseline values; a read-only assertion command exits `0` for every invariant above; the failing
log proves controller exit `4`; and S1 has exactly one resolved workflow path. No file changed.

### Slice 1 — Make the workflow contention-safe

**Goal:** allow transiently busy production infrastructure to drain safely while retaining honest
failure behavior.

**Exact file to touch:** `.github/workflows/deploy-production.yml`, unless S0's run metadata proves a
different single workflow path, in which case that one path replaces it.

**Work:**

1. Add workflow/job concurrency scoped to repository plus resolved channel/branch. Use
   `cancel-in-progress: false`; do not combine DEV and PRD into one global queue when the current
   workflow handles both.
2. In the existing Swarm update step, run SSH under Bash with explicit exit capture. If output is
   piped through `tee`, capture the SSH command's status (for example Bash `PIPESTATUS[0]`) before
   any other command. Never use a pipeline whose last command can turn a failed deploy green; this
   follows `/memory/MINION/MEMORY.md`'s "piped gates lie" constraint.
3. On exit `4`, log `busy`, attempt number, elapsed/remaining wait, then sleep and retry within the
   fixed bound. On `0`, stop retrying. On every other code, fail immediately and include the code
   without printing secrets or the remote environment.
4. Write each attempt to a separate temporary output or atomically replace the final status file so
   a previous busy/error response cannot be mistaken for the successful controller JSON.
5. After `0`, retain or strengthen the existing `jq -e` acceptance rule: only `completed` or
   `current` passes. Append attempts, wait duration, target/revision/version, and sanitized service
   state to `$GITHUB_STEP_SUMMARY`.
6. Keep the current branch filters, target matrix/selector, credentials, host, image tag, state
   directory, controller command, artifact validation, and downstream health checks unchanged.
7. Exercise the shell block with a deterministic local fake `ssh` placed first on `PATH` (or an
   equivalent isolated harness) for sequences `4,4,0`, `255`, and all-`4`, with sleep stubbed to zero.
   Feed success/malformed/terminal JSON fixtures through the exact validation expression. This is
   test execution only; do not commit a harness or fixture.

**Machine-checkable definition of done:**

- `actionlint <resolved-workflow-path>` exits `0`.
- `shellcheck` on the extracted Bash step exits `0` with no new suppression.
- The fake-command cases produce respectively: three calls and exit `0`; one call and exit `255`;
  exactly the configured maximum calls and nonzero timeout exit.
- JSON fixtures for `current` and `completed` pass; malformed JSON and any other state fail.
- A semantic before/after check proves the branch/tag map and remote target/controller arguments are
  unchanged.
- The target-repository diff contains exactly the one workflow file and no secret value.

### Slice 2 — End-to-end production verification

**Goal:** prove the change fixes the reported red workflow without weakening deployment truth.

**Exact files to touch:** none. This slice produces GitHub run/PR evidence only.

**Work:**

1. After human approval and merge, observe the naturally triggered `main` workflow, or rerun the
   failed run if GitHub associates the rerun with the corrected workflow revision. Do not push an
   empty commit and do not retag or change a deploy target merely to manufacture a run.
2. Verify the latest completed run of the named workflow on `main` is `success`, the
   `Deploy to prd-netcup` job is green, and the summary contains retry count plus immutable artifact
   identity. If contention occurs, verify it waited and later succeeded. If none occurs, the local
   deterministic harness remains the retry-path proof.
3. Read controller status and Swarm service state after the run: `.lastUpdate.state` is `current` or
   `completed`; target is an immutable `repo@sha256:...`; every controlled service reports that
   digest and `1/1`; no rollback is active. Perform existing HTTP/WS health checks without changing
   state.
4. Link the successful run and paste the sanitized status evidence into the PR/spec handoff. Keep
   the infra-tagged merge human-gated.

**Machine-checkable definition of done:** GitHub reports the latest completed workflow run on
`main` as `success`; the named PRD job is successful; controller JSON passes the existing `jq -e`
rule; all controlled services are `1/1` on the summarized immutable digest; HTTP and WebSocket
probes pass; and the repository diff remains one workflow file.

## 4. Cross-repo impact assessment

| Surface | Impact | Mitigation / alert |
|---|---|---|
| `minion` (`NikolasP98/minion-ai`) | One deployment workflow changes its scheduling and busy handling. | Human approval and merge remain mandatory because this is production infra; S0 freezes all target and channel values; S1 limits the diff to one workflow. |
| Netcup Swarm/controller | No code or configuration change. CI may wait and invoke the same controller again after exit `4`. | The controller's `flock` remains authoritative; bounded retry never removes/bypasses the lock; only exit `4` is retried; post-run digest, replica, rollback, HTTP, and WS checks are required. |
| DEV gateway on protopi | Scheduling may share workflow structure, but its plain-Docker target and `:dev` artifact must not change. | Channel-specific concurrency and semantic before/after assertions prevent PRD contention logic from remapping DEV or sending it through the Swarm controller. |
| `@minion-stack/shared`, `minion_hub`, `minion_site`, `paperclip-minion` | None: no gateway frame, event, handshake, client, UI, adapter, auth, or database contract changes. | Explicit no-diff assertion for these repos; no cross-project protocol rollout is needed under the AGENTS.md impact table. |
| Gateway channel extensions | None: deployment channel means release lane, not Telegram/WhatsApp/etc. extension behavior. | Do not touch `extensions/` or `src/channels/`; post-deploy WS/channel health is observation only. |
| GitHub runner capacity | Same-channel runs may queue for up to the configured workflow bound instead of failing immediately. | Use channel-specific groups, keep `cancel-in-progress: false`, expose wait duration, and keep the total retry window below job timeout. This is the unavoidable intended operational impact. |

## 5. Explicit out of scope

- Editing `deploy/swarm/update-controller.sh`, its lock implementation, state directory, or host
  installation.
- Removing, stealing, inspecting internals of, or force-unlocking a live controller lock.
- Changing deployment hosts, server-registry entries, SSH users/keys, environments, secrets,
  approval rules, Docker credentials, image repository, or service names.
- Changing the branch/tag contract: `DEV` → `:dev`, `main` → `:prd`, and no deploy from `prd`.
- Retiring/disabling the workflow; the evidence supports a transient orchestration race and the
  workflow remains the intended delivery path.
- Adding a second gateway replica, changing stop-first order, weakening health/rollback gates, or
  introducing start-first/parallel org-service updates.
- Product code, gateway protocol, channel extensions, Hub/Site/Paperclip code, shared packages,
  database/schema changes, UI work, or deployment dashboards.
- General cleanup of other CI failures, dead server entries, full-suite test debt, or unrelated
  workflow refactors.
- Reproducing contention by holding the production lock or deliberately overlapping a state-changing
  deployment. Deterministic local fakes prove the retry branch safely.

## 6. End-to-end verification

Run the following as an evidence checklist from a clean target-repository checkout after S1 and
again, where applicable, after the human-gated merge. Resolve `WORKFLOW_PATH` from S0 rather than
assuming it if the run metadata differs.

```bash
# Static and deterministic checks (pre-merge)
actionlint "$WORKFLOW_PATH"
shellcheck /tmp/minion-deploy-swarm-step.sh
./tmp-or-equivalent-retry-harness 4,4,0 --expect-calls 3 --expect-exit 0
./tmp-or-equivalent-retry-harness 255 --expect-calls 1 --expect-exit 255
./tmp-or-equivalent-retry-harness 4,4,4 --max-attempts 3 --expect-calls 3 --expect-nonzero
jq -e '.lastUpdate.state == "completed" or .lastUpdate.state == "current"' fixture-current.json
jq -e '.lastUpdate.state == "completed" or .lastUpdate.state == "current"' fixture-completed.json
! jq -e '.lastUpdate.state == "completed" or .lastUpdate.state == "current"' fixture-failed.json

# Post-merge read-only evidence; substitute the run-reported workflow name/id.
gh run list --branch main --workflow "$WORKFLOW_PATH" --status completed --limit 1 \
  --json databaseId,headSha,conclusion,url
gh run view "$RUN_ID" --json jobs,conclusion,url
ssh -o LogLevel=ERROR -p 22 niko@152.53.91.108 \
  'sudo env MINION_SWARM_STATE_DIR=/opt/minion-swarm /opt/minion-swarm/update-controller.sh status' \
  | tee /tmp/minion-swarm-status.json
jq -e '.lastUpdate.state == "completed" or .lastUpdate.state == "current"' \
  /tmp/minion-swarm-status.json
```

Then use the established non-mutating production probes to require: both controlled services `1/1`,
their image specs equal the summary's immutable digest, public HTTP health succeeds, and a real
WebSocket upgrade/connect succeeds. Record the workflow URL, commit SHA, attempt count, wait time,
digest, service convergence, and probe results. Do not include secrets, full environments, gateway
tokens, or the ephemeral status file in the repository.

The proposal is satisfied only when that evidence shows the latest completed named workflow run on
`main` green. A clean no-contention run plus the deterministic retry harness is sufficient; causing
production contention is neither required nor allowed.
