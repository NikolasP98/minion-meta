---
id: 2026-08-20-cli-registry-package-manager-none
title: "CLI subproject registry cannot project repo-policy packageManager 'none'"
status: done
created: 2026-08-20
updated: 2026-08-20
repos: [minion-meta]
tags: [logic]
value: 3
effort: S
source: handoff-2026-08-18-agent-instruction-parity-and-repo-policy-spec-slice-2
source_trust: trusted-automation
risk_class: low
priority: medium
owner: factory
---

# CLI subproject registry cannot project repo-policy packageManager 'none'

## Resolution (2026-08-20)

Delivered as part of Slice 2 rather than deferred: `'none'` is now accepted by
`SubprojectRegistryEntry.packageManager` and `minion.schema.json`, `minion.json` declares
`plugins.packageManager: "none"`, `minion doctor` reports `ok (no package manager)` instead of
probing a binary, `minion link` is a no-op for such a row, and the parity checker compares
`packageManager` exactly for all six CLI rows with no exemption. The record below is the original
statement of the problem.

## Problem

`repo-policy.yaml` models "this repository has no package manager" as `packageManager: 'none'`
(`minion_plugins` is the only such row today — Slice 0 evidence found no root `package.json` or
lockfile there). The CLI registry cannot express that: `SubprojectRegistryEntry.packageManager` in
`packages/env/src/types.ts:30` and the enum in `packages/cli/minion.schema.json` both accept only
`pnpm | bun | npm | yarn`, and the field is required.

## AS-IS

`minion.json` declares `"plugins": { "packageManager": "npm", ... , "commands": {} }` — an invented
manager for a repository that has none. `minion doctor` consequently probes for an `npm` binary on
behalf of a subproject that never runs one, and `minion list` prints `npm` as if it were policy.

The Slice 2 parity checker (`scripts/check-agent-instructions.mjs`) therefore skips the
`packageManager` comparison for `none` rows and asserts only the weaker invariant that such a row
declares no runnable command. The exemption is marked `TODO(handoff)` at that exact site. Every
other projected field (path, remote, branch, commands) is compared exactly.

## TO-BE

`none` is a first-class value end to end: the env types and `minion.schema.json` accept it, `minion
doctor` reports "no package manager declared" instead of probing a binary, and the parity checker
compares `packageManager` exactly for all six CLI rows with no exemption.

## DELTA

1. Add `'none'` to `SubprojectRegistryEntry.packageManager` and to the `minion.schema.json` enum.
2. Set `minion.json` `plugins.packageManager` to `none`; drop the checker's `none` exemption and its
   `TODO(handoff)` comment so the field is compared like every other projection.
3. Teach `doctor`/`list`/`link` to treat `none` as "nothing to probe" rather than a missing binary.
4. Extend `packages/cli` tests for a `none` row, and keep the existing "a `none` row declares no
   runnable command" assertion.

## Definition of done

`pnpm run repo-policy:validate` and `pnpm run repo-policy:test` pass with the exemption removed;
`minion doctor` reports no missing-binary finding for `plugins`; `@minion-stack/cli` and
`@minion-stack/env` tests pass.

## Out of scope

Adding a package manager to `minion_plugins`, changing any other registry row, and the wider
instruction-parity slices (S3–S8) of
`specs/2026-08-18-agent-instruction-parity-and-repo-policy-spec.md`.
