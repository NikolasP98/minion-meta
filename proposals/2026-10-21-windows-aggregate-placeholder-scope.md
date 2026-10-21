---
id: 2026-10-21-windows-aggregate-placeholder-scope
title: Scope full Windows placeholder rejection to its own matrix
status: draft
created: 2026-10-21
updated: 2026-10-21
repos: [minion]
tags: [infra, test]
source: windows-342-complete-shard-aggregate-failure
---

# Scope full Windows placeholder rejection to its own matrix

## AS-IS

Gateway #342 source `ab18426b3fc682d6c2c1b37c75411510d8bd81d3`, CI `39676361188` attempt 1, passed native infrastructure, all ten focused ordinals and both full Windows shards. The eight complete report groups contain 13,254 passed assertions, 203 pending and zero failed assertions. Original artifact ZIPs and the current corrected TQ-016 artifact CLI independently prove exact source/run/attempt binding. Nevertheless required aggregate job `119503820582` failed before artifact validation with `full Windows matrix did not expand`.

The verifier searches every job name for `${{ matrix.partition }}`. The actual offending job is the intentionally skipped unrelated Linux matrix placeholder `checks (${{ matrix.runtime }}, ${{ matrix.task }}, ${{ matrix.partition }})`, job `119488822820`. Both real full Windows jobs exist exactly once and succeeded. Existing fixtures test the full Windows placeholder but omit this real mixed-matrix API shape. Receipt: `audits/2026-10-18-assistant-capability-repair/windows-ab18426-full-shards-aggregate-failure.json`.

## TO-BE

An unresolved placeholder in the full Windows job family must fail. A skipped unrelated matrix placeholder must not veto evidence for two actual successful full Windows shards. Retain exact job names, unique IDs, run/attempt/source checks, pagination completeness, successful completion, native proof, ten fresh 74-assertion ordinals, unchanged clocks and final merged DEV qualification.

## DELTA

Scope the unresolved-placeholder condition in `scripts/ci/require-full-windows-shards.mjs` to the full Windows job family. Add the actual mixed-matrix response as a failing-before/passing-after fixture. Preserve rejection of literal full Windows placeholders and of missing, failed or duplicate real shards even when unrelated placeholders are present. No workflow, product runtime, identity, permissions or timing changes.

## Lifecycle and release boundary

This is an implementation scope correction within the existing approved complete-full-Windows contract, not a new qualification policy or authority change. The existing two-pass-approved kernel containment spec and qualification contract remain binding. Independent Standards and Spec reviews, focused and repository checks, native PR proof and normal integration precede a fresh complete #342 run. Existing conditional merge/release authorization persists without a new approval gate. The current run remains failed; no skipped aggregate, forced status, unchanged retry or cross-attempt success is used. Production remains unchanged. This proposal stays open until fresh complete qualification exercises the corrected required aggregate.

## Reviewed correction

Gateway [#348](https://github.com/NikolasP98/minion-ai/pull/348), head `6b34c1e5360d3a0d786e18390bc2baf3b59484f7`, tree `1209d4f8b0d948c54d874b8e58b720ad71199a9e`, changes exactly the helper and its tests. The actual saved API payload fails before and passes after the scope correction; deleting either actual shard still fails. Fifteen focused and 46 combined helper tests pass. Full repository check completed with zero errors, 57 existing warnings and both generators after producing the fresh clone's required BAML client. Independent Standards and Spec reviews passed helper SHA-256 `18ad0a8786e58da2640bb046e5f7dc200248c09d808122369f08c9d32ae89050` and test SHA-256 `ccf48185fdad3445b6562c31d2bbb047e8a5dced5a30d6d8a539876c98168d86`; the commit hook preserved those bytes. Fresh CI `39682003226` is running. No source merge or production change has occurred for this correction.

## Native proof and integration

CI `39682003226` passed every applicable check. Root independently verified all 17 native cases in artifact `12384962009` against the live source/run/attempt, synthetic merge parents/tree and current helper hashes. Normal integration merged #348 at DEV `f95ef46b43f3f0c5337f6b7ac1992e9a113efcf3`; merged tree `1209d4f8b0d948c54d874b8e58b720ad71199a9e` exactly equals reviewed and CI-qualified source. Receipt: `audits/2026-10-18-assistant-capability-repair/windows-aggregate-scope-native-qualification.json`. The scope correction changes no qualification policy or authority, so the existing repair authorization applies. Fresh complete #342 and final integrated DEV qualification remain required.
