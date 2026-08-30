---
id: 2026-08-17-gateway-client-error-hook-consumer-adoption
title: "Adopt the GatewayClient onEventError hook in hub, site and paperclip (S3 consumer handoff)"
status: in-spec
created: 2026-08-17
updated: 2026-08-29
spawned_spec: 2026-08-19-gateway-client-error-hook-consumer-adoption-spec
repos: [minion_hub, minion_site, paperclip-minion]
tags: [logic, docs]
value: 3
effort: S
source: 2026-08-17-pkg-gateway-client-onevent-errors-spec
source_trust: trusted-automation
risk_class: low
priority: medium
owner: factory
---

# Adopt the `onEventError` hook in the three `@minion-stack/shared` consumers

Filed by `2026-08-17-pkg-gateway-client-onevent-errors-spec` §2 S3, which requires **one**
proposal covering all three consumers of the shared `GatewayClient`. This is the deliverable
that is not a file in the package: the code change ships in `@minion-stack/shared`, but the
decision each consumer has to make lives in each consumer's own repo.

**Scope amended 2026-08-20 (by `2026-08-19-gateway-client-lifecycle-swallows-handoff-spec` Slice 2).**
S2 has now been implemented in `packages/shared`, so the *same* pending minor release carries three
lifecycle-error hooks, not one: `onEventError`, `onReconnectError` and `onSocketError`. This
proposal therefore covers all three — a consumer that bumps gets all three defaults at once, and
splitting the decision across two adoption passes would mean bumping twice for one release. The
title above still names only `onEventError` because the frontmatter `id`/`title` are indexed
machine state; read it as "the `GatewayClient` lifecycle-error hooks".

> ⚠️ **Artifact tension still open, re-checked 2026-08-29.** The spawned spec
> `2026-08-19-gateway-client-error-hook-consumer-adoption-spec` (approved, pass 2) still scopes
> itself to `onEventError` only and states that S2, if it shipped, would be "a **second**, separate
> consumer-adoption pass, not an amendment to this one." S2 did ship, in the same unpublished
> release, and the later spec `2026-08-19-gateway-client-lifecycle-swallows-handoff-spec` §2 Slice 2
> directs this proposal be amended in place instead. A 2026-08-29 attempt to widen that spec in place
> as its pass 3 was reverted on re-review: the pass-2 review sidecar only approved the one-hook
> contract, so widening it needs its own independent pass-3 review before it is implementation-eligible,
> not a same-day metadata-repair edit. Reconcile before starting consumer work: either get that
> widened pass reviewed and approved, or file the sibling hooks as a second, separate adoption pass
> and cross-link it here.
>
> ⛔ **Also blocked on the release itself, re-verified 2026-08-29.** `main` carries no pending
> changesets (only `.changeset/README.md` + `config.json`) while `dev` holds 13, npm's newest
> `@minion-stack/shared` is `0.10.0` (published 2026-08-13), and the newest "Version Packages" PR is
> **#18** (merged 2026-08-13) — none has opened since the S1 merge (#29, 2026-08-19) that carried
> `.changeset/gateway-client-event-error-hook.md`. So DELTA step 1 below ("wait for the release to
> actually publish") is unsatisfied and no consumer may bump regardless of how the tension above is
> resolved.
> The missing `minion-meta` dev→main promotion is filed separately as
> `proposals/2026-08-29-meta-shared-release-promotion-stalled.md`.

## AS-IS

`@minion-stack/shared@0.9.0` (the version on npm at the time of writing) silently discarded any
error thrown or rejected by a consumer's `onEvent` handler — the empty `catch` this spec's S1
removed. Consumers therefore see nothing when their own event handler is buggy, which is the
defect the parent proposal opened with.

It also discarded, in the same file, every failed auto-reconnect attempt and the value carried by
the socket's `error` event — the two sibling swallows S2 closed. A consumer on `0.9.0` sees nothing
when the gateway is unreachable across reconnects, and nothing when the transport errors.

The pending minor release (this branch's `.changeset/gateway-client-event-error-hook.md`) changes
that: with no hook supplied, the client emits a `console.error` — naming the failing event for
`onEventError`, naming the failed reconnect attempt for `onReconnectError`, and naming the socket
error for `onSocketError`. **Every consumer that bumps without acting gets new console output it
did not have before, from all three sites.** The reconnect site is the loudest of the three: there
is no dedupe in the library (a decision made on the record in
`2026-08-17-pkg-gateway-client-onevent-errors-spec` §4 ⚠️ A2), so a gateway down for an hour prints
roughly 240 lines.

**Per-consumer recon (spec §S0, ⚠️ A1).** None of the three consumer repos is checked out in this
workspace, so all three answers are **"unverified — repo absent"**:

| Consumer | `onEvent` handler shape / own try-catch | `@minion-stack/shared` pin |
|---|---|---|
| `minion_hub` — `src/lib/services/gateway.svelte.ts` | unverified — repo absent | unverified — repo absent |
| `minion_site` — `src/lib/services/member-gateway.svelte.ts` | unverified — repo absent | unverified — repo absent |
| `paperclip-minion` — `minion_gateway` adapter (`./node` subpath) | unverified — repo absent | unverified — repo absent |

An unchecked consumer is an unknown, not a zero: whoever picks this up must re-run the spec's §S0
`rg` block in a workspace where the repos exist and record the real answers here before deciding.
The same recon pass must also record whether each consumer already has a reconnect/transport error
surface of its own, since that is what `onReconnectError` and `onSocketError` would feed.

## TO-BE

Each of the three consumers has, on the record, either (i) wired the hook into its own error
sink, or (ii) explicitly accepted the `console.error` default — **once per hook, for all three of
`onEventError`, `onReconnectError` and `onSocketError`** — and is running a released version of
`@minion-stack/shared` that contains them. A consumer may mix postures (for example: wire
`onEventError`, accept the default for `onSocketError`); what is not acceptable is silence about a
hook.

Invariants that must not change: no consumer starts logging event payloads (the fallback names the
event only — a consumer that logs the whole frame is choosing to log payload content); no consumer
awaits or reorders `onEvent` dispatch; no consumer uses `onSocketError` to drive lifecycle control
flow (`close` owns reconnect, pending-flush and hello-rejection — a consumer that reconnects from
the error hook double-drives it); no protocol or reconnect-timing changes.

## DELTA

1. Wait for the release to actually publish. Publishing is **two merges to main** (the feature PR
   carrying the changeset opens the automated "Version Packages" PR; merging that publishes to
   npm). Do not bump any consumer before the second merge lands.
2. In each consumer repo: bump `@minion-stack/shared` to the published minor. That one bump
   delivers all three hooks — there is no partial adoption at the package level.
3. In each consumer repo: decide and implement, **for each of the three hooks**, one of —
   - pass the hook into the repo's existing error sink; for `minion_site` the obvious wiring
     target is `reportGatewayError`, named by
     `2026-08-17-site-member-gateway-swallowed-errors-spec` §S1 — that spec's §4 ⚠️ A1 is also the
     origin of the reconnect handoff, so `onReconnectError` is the hook it was waiting for; or
   - accept the `console.error` default, and say so in the PR description so the new console output
     is not later reported as a regression. For `onReconnectError` specifically, state the expected
     volume (no dedupe; ~one line per attempt, ~every 15s at the backoff cap) so an accepted default
     is an informed one.
4. Record the outcome per consumer and per hook (which option, which PR) and close this proposal.

## Definition of done

- The recon table above is filled in with real values (no remaining "unverified — repo absent").
- All three consumers are on a published `@minion-stack/shared` that exports `onEventError`,
  `onReconnectError` and `onSocketError`.
- For each consumer, a linked PR shows — for each of the three hooks — either the wiring or an
  explicit written acceptance of the `console.error` default. Nine decisions total (3 consumers ×
  3 hooks), none implicit.
- No consumer drives reconnect or close behavior from `onSocketError`.

## Out of scope

- Everything the parent spec's §5 excludes (event replay, awaiting `onEvent`, retry/backoff policy
  changes, the malformed-JSON discard, typed error classes, dedupe/throttling in the library,
  remote telemetry).
- Implementing S2 itself. The `onReconnectError` / `onSocketError` package code is carried by
  `2026-08-19-gateway-client-lifecycle-swallows-handoff-spec` and is already implemented in
  `packages/shared`; this proposal owns only the consumer-side decisions those hooks create.
- Editing `packages/shared` itself — S1 and S2 are done, and this proposal changes no meta-repo
  code.
