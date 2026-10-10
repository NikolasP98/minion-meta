---
id: 2026-10-09-gateway-native-formatter-reproducibility
title: Reproduce native formatting during Gateway release qualification
status: approved
findings: [GW-030]
created: 2026-10-09
updated: 2026-10-09
repos: [minion]
tags: [test, infra]
---

# Reproduce native formatting during Gateway release qualification

## AS-IS at qualification start

DEV source `d880c73bd8126b422625770a50dd0fd95d4d3fe6` passes its Linux shards and macOS TypeScript/gateway tests, then macOS job `114098647096` fails SwiftFormat on 116 of 208 files. The workflow installs Homebrew's moving formatter version; this run used 0.63.0. Independent source/history review found 102 failing files unchanged since the earlier mass-formatting baseline. Version 0.59.1 was current near that baseline, but the exact historical executable is not established. It is a candidate to qualify, not evidence of a prior passing run.

The hosted failure is recorded by its repository CI run. The Gateway repository is access-controlled. Production promotion remains held while the correction is qualified.

## Current state

The formatter correction merged to Gateway DEV as `740f` after its 29 hosted success/skip gates completed. This closes the moving-formatter release-gate defect described above; the separate native-formatting coverage proposal remains open.

## TO-BE

CI and local package/Xcode entry points use the same checksum-verified formatter release and assert its actual version. Unrelated Homebrew updates do not silently change formatting policy. All native build/test and release checks remain required.

## DELTA

Implement a narrowly scoped release-gate correction from DEV d880c73b. Qualify the selected formatter against the entire target; if source still fails, determine whether generation or handwritten formatting is responsible and correct the real defect with the same pinned tool. Do not introduce diagnostic exclusions or mix a mass adoption of new formatting rules into this correction. Capture exact tool identity, commands, changed paths and final hosted evidence. A future formatting-policy upgrade must be deliberate and separately reviewed.

This is a release qualification hotfix under the readiness performance-release program. It extends that program's verification boundary; no Gateway protocol or runtime behavior change is intended. Final source and blast-radius review are required before merge.
