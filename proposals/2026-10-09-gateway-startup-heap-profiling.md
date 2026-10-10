---
id: 2026-10-09-gateway-startup-heap-profiling
title: Gateway startup heap phase profiling
status: draft
findings: [GW-028]
created: 2026-10-09
updated: 2026-10-09
repos: [minion]
owners:
  - gateway
tags: [infra]
---

# Gateway startup heap phase profiling

## AS-IS at proposal start

The DEV gateway image built from `56535668b31ad40f3afce29e46f048c8c592009d` exceeded its former V8 heap allowance during configured startup. A bounded operational override restored the same immutable image, but current telemetry cannot assign the startup peak to a phase or prove which import path contributes.

Running an old reader against production state is prohibited because legacy delivery entries could be replayed. The operational repair therefore has no safe old/new configured-startup A/B proof. This proposal tracks the source-level profiling follow-up without publishing host receipts.

## TO-BE

Provide a provider-free startup benchmark that reports memory after each stable gateway initialization phase:

1. entry-point import;
2. config parsing and validation;
3. plugin and channel registry construction;
4. agent/session/runtime registry construction;
5. server initialization without listeners;
6. delivery queue scan using generated V1-held and V2 fixtures;
7. post-GC idle after a bounded settling interval.

The harness must use generated state only, disable network/provider calls structurally, and emit machine-readable heap, RSS, external, and array-buffer measurements with the source SHA and bundle identity. It must fail if a phase exceeds an approved absolute budget or grows beyond an approved baseline tolerance.

## DELTA

- Add phase checkpoints behind a test-only observer injected into gateway startup. Production startup behavior and logging remain unchanged when no observer is supplied.
- Add generated delivery fixtures covering empty state, 51 held legacy entries, and representative V2 pending/uncertain entries. Assert zero provider calls and unchanged held-fixture bytes/metadata.
- Run the harness under the production Node major version and container memory ceiling in CI or a dedicated performance job.
- Record bundle/chunk sizes so static import growth and configured runtime growth can be separated.
- Use at least three runs per revision and compare medians. Keep raw samples as CI artifacts.
- Revisit the 1024 MiB heap setting only after the configured startup peak and post-settle headroom are measured. Any reduction requires a clean-start and recovery-fixture pass under the proposed ceiling.

## Acceptance gates

- No network namespace access, provider credentials, production volumes, or real queue/session files.
- Each phase has a named memory checkpoint and deterministic fixture identity.
- The benchmark detects an intentionally retained allocation introduced in one startup phase.
- The recovery fixture proves held legacy entries remain byte- and metadata-identical with zero provider calls.
- CI publishes the source SHA, container image identity, raw samples, and budget verdict.

## Production comparison boundary

Production resource limits require separate workload and peak qualification. Do not copy the DEV override or impose a hard limit from long-lived container measurements. The scoped safe delivery release does not change production memory limits.
