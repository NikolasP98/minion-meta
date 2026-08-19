---
spec: 2026-08-18-factory-worker-containment-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

- Set `status: approved`, `pass: 2`, `updated: 2026-08-18`, and `verdict: approved` because every defect was mechanically resolvable without a product decision.
- Added `type` and security/infra/deps/test/logic tags, including matching per-slice topics, so the spec is compatible with the related topic-policy validator and remains human-gated as security work.
- Anchored AS-IS to reviewed factory main SHA `a45b225b476db9efffd481dff6bd962be457b549` so implementation can detect baseline drift.
- Corrected prerequisite ordering to require M0-M3, durable evidence, topic policy, and capability separation before containment rollout, matching the normative roadmap instead of treating capability separation as optional later work.
- Added the current review-owned GitHub comment/readiness effects to AS-IS because removing `GH_TOKEN` without moving those effects would break the lifecycle.
- Added the missing lack of durable phase state and runner-owned candidate SHA to AS-IS because the proposed multi-container lifecycle cannot be restart-safe while trusting agent `result.json`.
- Made phase planning and evidence durable and added a restart failpoint test because the roadmap requires restart-safe/idempotent stages and controller-owned truth.
- Added a trusted workspace/branch/draft-PR preparation phase and adversarial prep test because credential-free setup otherwise had no checkout to run against before develop.
- Defined review-fix sequencing as develop → credential-free self-test → new candidate → new checkout → new review so a fix cannot reuse stale review evidence.
- Bound review input to runner-recorded base/candidate SHAs and a Git tree OID, with hooks/submodules/filters and ambient Git config disabled, so “does not execute repo code” is verifiable.
- Required the review diff and acceptance gate to use/recheck the recorded base SHA as well as candidate SHA so a base-branch advance cannot silently change the reviewed diff.
- Narrowed “credential-free repo code” to runner-invoked registered commands and documented credentialed develop as a residual boundary, avoiding an overbroad security claim the design cannot satisfy.
- Added cross-phase smuggling controls/tests for Git hooks, credential helpers, PATH shims, and self-test mutations because stripping credentials during a command is insufficient if its artifacts execute during a later credentialed push.
- Defined closed `none|bridge` setup/self-test network fields, fail-closed defaults, and explicit migration of existing setup entries so network behavior is neither implicit nor contradictory.
- Added `repos.example.json` to the phase-policy slice because changing `RepoDef` network/env policy without updating the mounted-registry contract would leave external configurations ambiguous.
- Required literal validated repo command variables and rejection of reserved credential names/process-env interpolation so the environment allowlist cannot reintroduce secrets through registry configuration.
- Required command workers to start through `env -i`, with sanitized per-run/read-only caches and no host package-manager config, making “credential-free” testable beyond deleting a few variables.
- Replaced the public-network setup probe with an isolated local fixture server so the network-mode test is deterministic.
- Corrected the Slice 1 policy test that previously forbade all review model credentials despite the invariant requiring the selected review credential.
- Required secret values to stay out of Docker argv as well as logs/serialized plans because the current `-e NAME=value` form exposes secrets in the process argument list.
- Required review to run non-root with one selected provider credential, a dedicated checkout/output directory, and ephemeral auth state so it cannot inherit broad develop mounts or corrupt prior runner output.
- Defined review networking as non-host bridge access for the model API and explicitly retained egress allowlisting as out of scope, removing an unspecified network-policy gap.
- Added no-follow, same-descriptor `REVIEW.md` ingestion checks (regular file, valid UTF-8, ≤1 MiB) because a writable host bind otherwise permits symlink races or unbounded input.
- Moved verdict parsing, actual-provider/degradation decisions, GitHub comments, readiness transitions, and reviewed-SHA stamping to the runner so the reviewer never self-attests or needs GitHub authority.
- Added missing conflicting-verdict, invalid-output, same-provider fallback, runner-only GitHub-effects, and FAIL→fix→new-candidate tests so existing fail-closed/provider rules survive the split.
- Clarified that physical read-only mounts prevent mutation while suppressed write errors are not inherently detectable, removing an unverifiable “any write attempt” acceptance condition.
- Added the fixed checkout-preparer script to the Slice 3 file list and shell-syntax gate so the named trusted entrypoint is an actual deliverable.
- Replaced the unportable local-image-ID idea with configurable registry `name@sha256` references for every production runtime, matching Docker Compose's documented image grammar without hardcoding a registry provider.
- Added `FACTORY_RUNNER_IMAGE`, `.env.example`, pull-policy checks, and a tag-rejection negative test so both deployed images—not only workers—are provably immutable.
- Added a disposable pinned local-registry integration mode so publishing/resolving/rendering exact image digests is machine-checkable without production registry credentials.
- Defined and verified an agent base/toolchain manifest plus runner base/lockfile manifest so the claimed build evidence exists in both images.
- Removed cross-build digest equality as a requirement while retaining declared-toolchain equality and build-once promotion, because architecture/provenance can legitimately change image digests.
- Made `FACTORY_CONTAINMENT_V2` exact-opt-in and required production config to persist literal `1` after canary instead of the contradictory “make default-on” wording.
- Expanded the impact table for SQLite/evidence state, mounted repo registries, the CLI-pin collision, capability prerequisites, and all deploy paths so every touched authority has an owner and test.
- Added explicit residual scope for repo code voluntarily executed by develop so containment does not overstate protection while preserving the approved proposal's registered-command boundary.
- Expanded end-to-end verification for immutable-image rejection, malformed/degraded review, fix-round rebinding, phase-boundary restarts, ephemeral cleanup, and explicit production activation.
- Cited `/memory/MINION/sdlc-board-triage-and-phase-gates.md` for controller-owned truth/read-only reviewers/automerge-off and `/memory/MINION/minion-factory-agent-pipeline.md` for reviewer/applier separation and wholesale `.env` deployment behavior because those hard constraints shaped the corrections.

## Human flags

None.
