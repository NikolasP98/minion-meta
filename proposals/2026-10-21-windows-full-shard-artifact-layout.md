---
id: 2026-10-21-windows-full-shard-artifact-layout
title: Read full Windows shard identity from its actual artifact directory
status: draft
created: 2026-10-21
updated: 2026-10-21
repos: [minion]
tags: [infra, test]
source: windows-342-real-artifact-verification
---

# Read full Windows shard identity from its actual artifact directory

## AS-IS

Gateway #342 source `71e8b2dcb748bce3970c78c5b3f6cbb4f71937ea`, CI `39669098214` attempt 1, passed native infrastructure and ten fresh invocations with exactly 74 passed assertions each. Full shard 2 passed all four groups. Full shard 1 failed seven heartbeat assertions in one unit file and never ran its gateway group. The aggregate gate stopped at that prerequisite, before artifact validation. This run remains failed and cannot qualify release.

Independent real-artifact inspection also found a latent consumer/producer mismatch. `.github/workflows/ci.yml` uploads both the runner's `vitest-reports` directory and its sibling `vitest-slowest.md`. Artifact ZIP `12380718950` therefore contains `vitest-reports/source-identity.json`, but `validateDownloadedEvidence` expects `source-identity.json` directly inside each downloaded shard artifact. The old helper, replayed against untouched receipts, rejects `1-of-2 identity is missing or malformed`. Existing fixtures modeled a flat layout and missed this producer boundary. Receipt: `audits/2026-10-18-assistant-capability-repair/windows-342-full-shards-failure.json`.

## TO-BE

Read each shard's identity only from its canonical `vitest-reports/source-identity.json`. Preserve exact source/base/synthetic merge/tree/run/attempt checks, both successful full shards, all ten clean ordinals, 74 assertions per ordinal and unchanged clocks. A flat-only file, missing canonical file or wrong nested identity must fail even when another valid-looking file exists nearby. There is no recursive search or fallback to a different packaging layout.

## DELTA

Change one path expression in `scripts/ci/tq016-windows-qualification.mjs`. Update its existing fixture to reproduce the real nested directory and sibling summary, and add flat-only and valid-flat-decoy negative checks while retaining existing identity mutations. The actual-layout fixture failed before the correction; 43 helper contracts pass afterward. No workflow producer, timeout, native containment, source identity or product runtime changes are proposed.

## Lifecycle and release boundary

This corrects the artifact-consumer implementation of the existing two-pass-approved kernel containment specification section C. Independent Standards and Spec implementation reviews passed. Full repository check and native infrastructure PR CI precede normal integration. This literal artifact-path correction is a trivial implementation repair under the existing owner-authorized repair/release sequence; it changes no approved qualification policy or authority, so it creates no additional approval gate. The earlier kernel-policy human merge requirement was fulfilled by the owner merging #345/#346. The existing conditional #342 merge and production approvals persist; this newly discovered infrastructure correction does not waive product qualification. After merge, refresh #342, address its independently diagnosed heartbeat test failure and require fresh complete qualification plus final integrated DEV qualification. Historical artifacts remain immutable and failed; no cross-attempt success is assembled. No production Gateway/FACES mutation occurred.

## Prepared correction

Gateway [#347](https://github.com/NikolasP98/minion-ai/pull/347), head `7342e171e63ea6a2f5902cfb7f7c9c5e996d90d9`, tree `8fadca6f7edae10aafb2784a4abb4b436cae2f95`, changes exactly the verifier and its tests. Independent Standards and Spec reviews passed. Local verification passed 43 helper contracts and 69 workflow/diagnostic assertions; full repository check passed with zero errors, 57 existing warnings and both generators. Native PR CI remains pending.

## Integration proof

CI `39675104942` passed all applicable checks, including 17 real Windows contracts and required Linux artifact verification. Root independently reverified downloaded receipt `12382285767`. Normal authorized integration merged #347 at `8ca6fd7f4710acb18faddb3f76ae00594ce6d451`, tree `8fadca6f7edae10aafb2784a4abb4b436cae2f95`, identical to reviewed source. Fresh #342 product qualification and final DEV qualification remain pending; this proposal stays open until those checks exercise the corrected aggregate path end to end.
