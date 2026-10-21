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
