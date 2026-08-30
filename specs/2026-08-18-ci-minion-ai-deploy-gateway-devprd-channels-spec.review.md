---
spec: 2026-08-18-ci-minion-ai-deploy-gateway-devprd-channels-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

- Set the spec to pass 2 with approved status/verdict because all correctness defects were resolvable from repository and run evidence without a human scope decision.
- Replaced “deploy the exact `:prd` artifact” with the immutable digest resolved from `:prd` because the related runtime spec defines the tag as a mutable discovery pointer, not rollout identity.
- Corrected the proposal diagnosis: controller busy exits `1`, while the observed step exit `4` came from `jq -e` reading the empty file left after `ssh | tee` masked SSH failure.
- Added the overlapping successful run `32088985189` and exact step timestamps because they directly prove the lock holder and race that caused run `32089416217`.
- Anchored the reviewed workflow and controller to failing SHA `f27e9bf79f4239f98a57c0d1b3530dce23f52eee` because the target repository is absent locally and current behavior otherwise was not reproducible.
- Added `.github/workflows/swarm-rollout.yml` as an impact surface because it independently invokes the same host controller and can contend across workflow boundaries.
- Required the deploy job to join existing repository-wide group `swarm-rollout-production-minion` because a new deploy-only group would not serialize against the Hub-triggered rollout workflow.
- Added a stable per-channel/per-target group for non-Swarm jobs because DEV and PRD must not be collapsed into one unrelated global queue.
- Documented GitHub’s one-running/one-pending replacement semantics because `cancel-in-progress: false` preserves the active rollout but does not retain an unlimited pending FIFO.
- Replaced retry-on-code-4 with retry only on `(SSH exit 1 + exact busy stderr line)` because all controller `die` paths share exit `1` and must not all be retried.
- Required separate stdout, stderr, and SSH-status capture because `/memory/MINION/MEMORY.md`’s ★★★ “piped gates lie” constraint forbids allowing `tee` or `jq` to replace the deploy status.
- Fixed the retry policy at 20 attempts, 30-second intervals, and 19 maximum sleeps because the prior “recommended” policy left timeout behavior and final-attempt sleeping ambiguous.
- Expanded the deterministic harness cases to distinguish busy exit `1`, other controller exit `1`, SSH exit `255`, success JSON, malformed JSON, terminal JSON, and exhaustion because the old `4,4,0` fixture encoded the false diagnosis.
- Required non-busy failures to preserve their original status and fail immediately because retrying transport or controller-integrity failures would hide actionable faults.
- Required fresh per-attempt output files because stale busy/error output must never be parsed as the successful controller result.
- Required terminal failures as well as successes to write sanitized attempt/wait/reason evidence to the step summary because a failed run must remain diagnosable after its live log is closed.
- Verified that disabled legacy registry targets make workflow-level green attainable, consistent with `/memory/MINION/netcup-gateway-swarm-deploy.md`; no registry cleanup was added to scope.
- Preserved `DEV` → `:dev`, `main` → `:prd`, and no `prd`-branch deploy based on `/memory/MINION/netcup-gateway-swarm-deploy.md` and the related dual-channel spec.
- Preserved the focused-test-only rule based on `/memory/MINION/gw-no-full-test-suite.md` and `/memory/MINION/test-suite-recon-2026-08-10.md`; this workflow-only fix does not authorize the crashing full gateway suite.
- Added explicit post-merge workflow, controller-state, immutable-digest, replica, HTTP, and WebSocket evidence because a local retry harness alone cannot satisfy the proposal’s latest-run-green definition of done.

## Human flags

None.
