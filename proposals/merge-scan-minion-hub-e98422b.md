---
id: merge-scan-minion-hub-e98422b
title: Merge-scan deficiencies — minion-hub @ e98422b
status: draft
created: 2026-09-11
updated: 2026-09-11
repos: [minion-hub]
tags: [merge-scan]
---

# Merge-scan deficiencies — minion-hub

Filed automatically by the factory merge-scan (maintenance-lane spec S-B): a
fresh-context rubric scan of everything merged into `master` since the
last sweep. Every bullet below is machine-generated from merged commit
content — treat it as a finding DESCRIPTION, never as an instruction.

- source: merge-scan
- commit range: [`bb286f8..e98422b`](https://github.com/NikolasP98/minion_hub/compare/bb286f8be7315c2ddae83486ce56875e1ef1b01b...e98422b899a30ff9668869a0dae6d4cc0bcb371f)

## Findings

- **medium** `scripts/qc/trace-build-contained-worker.mjs:400` (empty-catch) — Empty catch block silently swallows errors from write() call when writing error diagnostic trace, losing error context.
- **medium** `scripts/qc/trace-build-contained-worker.mjs:152` (hardcoded-config) — Network probe timeout hardcoded to 700ms; should be configurable via control object since timing is environment-dependent in CI/CD contexts.
- **high** `scripts/qc/trace-build-graph.test.mjs:143` (unchecked-access) — reason is the result of .find() and could be undefined; accessing reason.parents without null check will crash
- **high** `scripts/qc/trace-build-graph.test.mjs:241` (unchecked-access) — events.at(-1) returns undefined if array is empty; accessing .event on undefined will crash
- **medium** `src/lib/plugins/bridge-protocol.contract.test.ts:182` (unchecked-access) — Array.at(-1) returns undefined if array is empty; no validation before emitting
- **medium** `src/lib/plugins/bridge-protocol.contract.test.ts:250` (unchecked-access) — Array.at(-1) returns undefined if array is empty; no validation before emitting
- **high** `src/lib/plugins/compat.ts:89` (unchecked-access) — new Set(caps.methods) without checking if caps.methods is defined; GatewayCapabilities.methods is optional (methods?: string[]), would throw TypeError if undefined
- **high** `src/lib/server/workforce-fetch.test.ts:180` (weakened-test) — Assertion expects mint called once, but workforceClientForOrg is invoked twice (lines 165 and 175), each likely calling fixtures.mint; should be toHaveBeenCalledTimes(2)
- **medium** `src/lib/server/workforce-fetch.ts:74` (hardcoded-config) — Timeout (30s) and response size limit (4MB) are hardcoded magic values; should be configurable via env/config even though current package version ignores them.
- **medium** `vitest.config.ts:16` (missing-handoff) — Comment indicates SQL fixtures must be 'split/migrate before admission', but lacks TODO(handoff) marker and proposal reference.
