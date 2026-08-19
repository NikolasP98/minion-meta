---
id: 2026-08-17-gateway-client-error-hook-consumer-adoption
title: "Adopt the GatewayClient onEventError hook in hub, site and paperclip (S3 consumer handoff)"
status: draft
created: 2026-08-17
updated: 2026-08-17
repos: [minion_hub, minion_site, paperclip-minion]
tags: [logic, docs]
value: 3
effort: S
source: 2026-08-17-pkg-gateway-client-onevent-errors-spec
---

# Adopt the `onEventError` hook in the three `@minion-stack/shared` consumers

Filed by `2026-08-17-pkg-gateway-client-onevent-errors-spec` §2 S3, which requires **one**
proposal covering all three consumers of the shared `GatewayClient`. This is the deliverable
that is not a file in the package: the code change ships in `@minion-stack/shared`, but the
decision each consumer has to make lives in each consumer's own repo.

## AS-IS

`@minion-stack/shared@0.9.0` (the version on npm at the time of writing) silently discarded any
error thrown or rejected by a consumer's `onEvent` handler — the empty `catch` this spec's S1
removed. Consumers therefore see nothing when their own event handler is buggy, which is the
defect the parent proposal opened with.

The pending minor release (this branch's `.changeset/gateway-client-event-error-hook.md`) changes
that: with no `onEventError` supplied, the client emits a `console.error` naming the failing
event. **Every consumer that bumps without acting gets new console output it did not have before.**

**Per-consumer recon (spec §S0, ⚠️ A1).** None of the three consumer repos is checked out in this
workspace, so all three answers are **"unverified — repo absent"**:

| Consumer | `onEvent` handler shape / own try-catch | `@minion-stack/shared` pin |
|---|---|---|
| `minion_hub` — `src/lib/services/gateway.svelte.ts` | unverified — repo absent | unverified — repo absent |
| `minion_site` — `src/lib/services/member-gateway.svelte.ts` | unverified — repo absent | unverified — repo absent |
| `paperclip-minion` — `minion_gateway` adapter (`./node` subpath) | unverified — repo absent | unverified — repo absent |

An unchecked consumer is an unknown, not a zero: whoever picks this up must re-run the spec's §S0
`rg` block in a workspace where the repos exist and record the real answers here before deciding.

## TO-BE

Each of the three consumers has, on the record, either (i) wired `onEventError` into its own error
sink, or (ii) explicitly accepted the `console.error` default — and is running a released version
of `@minion-stack/shared` that contains the hook.

Invariants that must not change: no consumer starts logging event payloads (the fallback names the
event only — a consumer that logs the whole frame is choosing to log payload content); no consumer
awaits or reorders `onEvent` dispatch; no protocol or reconnect-timing behavior changes.

## DELTA

1. Wait for the release to actually publish. Publishing is **two merges to main** (the feature PR
   carrying the changeset opens the automated "Version Packages" PR; merging that publishes to
   npm). Do not bump any consumer before the second merge lands.
2. In each consumer repo: bump `@minion-stack/shared` to the published minor.
3. In each consumer repo: decide and implement one of —
   - pass `onEventError` into the repo's existing error sink; for `minion_site` the obvious wiring
     target is `reportGatewayError`, named by
     `2026-08-17-site-member-gateway-swallowed-errors-spec` §S1; or
   - accept the `console.error` default, and say so in the PR description so the new console output
     is not later reported as a regression.
4. Record the outcome per consumer (which option, which PR) and close this proposal.

## Definition of done

- The recon table above is filled in with real values (no remaining "unverified — repo absent").
- All three consumers are on a published `@minion-stack/shared` that exports `onEventError`.
- For each consumer, a linked PR shows either the `onEventError` wiring or an explicit written
  acceptance of the `console.error` default.

## Out of scope

- Everything the parent spec's §5 excludes (event replay, awaiting `onEvent`, retry/backoff policy
  changes, the malformed-JSON discard, typed error classes, dedupe/throttling in the library,
  remote telemetry).
- S2, the two sibling lifecycle swallows (`onReconnectError` / `onSocketError`) — carried by
  `2026-08-17-gateway-client-lifecycle-swallows-handoff`. If S2 ships later it adds two more hooks
  the same consumers may want to pass; that is that proposal's release note, not this one's.
- Editing `packages/shared` itself — S1 is done, and this proposal changes no meta-repo code.
