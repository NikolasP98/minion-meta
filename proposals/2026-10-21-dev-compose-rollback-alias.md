---
id: 2026-10-21-dev-compose-rollback-alias
title: Repair DEV Compose rollback image aliases
status: draft
created: 2026-10-21
updated: 2026-10-21
repos: [minion]
tags: [infra]
source: assistant-capability-production-adoption-2026-10-21
---

# Repair DEV Compose rollback image aliases

The DEV GHCR/Compose deployment can succeed while failing to retain its rollback alias. This proposal records the observed defect for a separate specification and implementation. It does not authorize changes to the active production release.

## AS-IS: observed behavior

Gateway source at [3db71f43](https://github.com/NikolasP98/minion-ai/commit/3db71f43e221c7621187571aca579b3d7ba85ea4) contains three linked sites in `.github/workflows/deploy-production.yml`:

- [Line 64](https://github.com/NikolasP98/minion-ai/blob/3db71f43e221c7621187571aca579b3d7ba85ea4/.github/workflows/deploy-production.yml#L64) assigns `IMAGE_NAME` from `github.repository`, retaining mixed-case owner spelling.
- [Line 450](https://github.com/NikolasP98/minion-ai/blob/3db71f43e221c7621187571aca579b3d7ba85ea4/.github/workflows/deploy-production.yml#L450) tags the current image with this repository name and suppresses failure with `|| true`.
- [Line 779](https://github.com/NikolasP98/minion-ai/blob/3db71f43e221c7621187571aca579b3d7ba85ea4/.github/workflows/deploy-production.yml#L779) constructs the same invalid reference for rollback lookup. The subsequent image inspection can therefore fail to find a usable alias.

In [DEV deployment run 39543796081, job 119039898232](https://github.com/NikolasP98/minion-ai/actions/runs/39543796081/job/119039898232), at `2026-10-21T04:34:44Z`, Docker rejected `ghcr.io/NikolasP98/minion-ai:dev-rollback-protopi` because the repository name must be lowercase. The job then pulled the selected lowercase immutable release reference and completed successfully. The successful deployment does not prove that this attempt created its rollback alias. No rollback attempt or production Swarm alias failure was observed in this evidence.

## TO-BE: desired behavior and invariants

The GHCR/Compose rollback producer and consumer use one valid, canonical lowercase repository reference. If a prior running image exists, the workflow verifies that its alias identifies that image. Alias creation failure produces an explicit recovery-readiness outcome instead of silently implying that rollback is available. The specification must decide whether that failure stops deployment before replacement or permits deployment with an explicit degraded recovery state.

Preserve immutable manifest selection for forward deployment. Preserve `resolve_delivery_floor_image` and `delivery_floor_compose_replace`, including the refusal to restore an incompatible image. A first deployment with no prior image must report that rollback is unavailable without inventing an alias. Local-build aliases retain their existing behavior unless separately specified.

## DELTA: implementation and verification plan

1. Specify a shared repository-normalization contract for GHCR/Compose alias creation and lookup. Test a mixed-case owner such as `NikolasP98/minion-ai` and an already lowercase repository; both paths must resolve the same valid alias.
2. Replace silent alias-tag failure with the chosen explicit outcome. Inject a failing `docker tag` and assert that recovery readiness is not reported as successful. Verify the success path by inspecting the alias image ID against the previous container image ID.
3. Test rollback lookup using the producer's alias. Retain tests proving incompatible images are rejected by the delivery floor and compatible images are restored by immutable ID.
4. Cover no previous container/image and the local-build branch. Assert that no alias is fabricated and local-build semantics remain intact.
5. Exercise the GHCR/Compose workflow on an isolated DEV fixture with mixed-case repository metadata. Record both deployment result and rollback-readiness result; require separate evidence for an actual rollback rehearsal.

The follow-up implementation requires a reviewed spec, focused workflow tests, the repository's declared checks, independent review, and a separately approved merge. The present ledger patch adds comments only; executable workflow content remains unchanged.

## Scope and release boundary

The observed defect is in the DEV GHCR/Compose path. Current production Swarm rollout and reconciliation are separate paths and remain outside this proposal's implementation scope. The workflow is reusable: the specification must enumerate all callers of the affected Compose path before changing behavior. Do not infer production impact or alter Swarm recovery from this DEV evidence.

No production commands, recovery attempts, credentials, release-candidate edits, or deployment changes are part of this ledger task. The active approved release stays frozen while the follow-up is drafted.

## Completion criteria

Close this proposal only after the shared alias contract, explicit failure handling, and recovery safeguards pass the tests above and a DEV fixture demonstrates the intended behavior. A comment-only PR or successful forward deployment alone does not resolve the defect.
