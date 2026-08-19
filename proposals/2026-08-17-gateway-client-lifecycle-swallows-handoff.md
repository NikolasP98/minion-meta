---
id: 2026-08-17-gateway-client-lifecycle-swallows-handoff
title: "GatewayClient: report the reconnect-failure and socket-error swallows (S2 of the onEvent-errors spec)"
status: approved
created: 2026-08-17
updated: 2026-08-17
repos: [minion-meta]
tags: [logic, test]
value: 3
effort: M
source: 2026-08-17-pkg-gateway-client-onevent-errors-spec
---

# GatewayClient: report the reconnect-failure and socket-error swallows

## Problem

`2026-08-17-pkg-gateway-client-onevent-errors-spec` (approved, pass 2) scoped its work into three
slices. This run implemented Slice 0 (recon) and Slice 1 (`onEventError` — the `:263` consumer
`onEvent` swallow) only, per this run's harness instructions to stop after Slice 1. Slice 2 —
the two sibling lifecycle swallows the spec's own §4 ⚠️ A1 (in the sibling
`2026-08-17-site-member-gateway-swallowed-errors-spec`) formally handed to this proposal by id —
was **not** implemented in this run:

- `packages/shared/src/gateway/client.ts` (reconnect swallow, currently at the
  `void this.connect().catch(() => {})` inside `scheduleReconnect()`) — every failed reconnect
  attempt is discarded silently.
- `packages/shared/src/gateway/client.ts` (socket `error` swallow, currently at the
  `on('error', () => { /* close handler fires next */ })` listener in `wireEvents()`) — the
  runtime-supplied socket error value (an `Error` under Node `ws`, typically an `Event` in
  browsers) is discarded instead of reported.

Both sites now carry a `TODO(handoff):` comment pointing at this proposal, per AGENTS.md's
open-items ledger.

## Definition of done

Implement Slice 2 exactly as specified in
`2026-08-17-pkg-gateway-client-onevent-errors-spec.md` §2 "S2 — The two sibling lifecycle swallows
the site spec handed over" (full `Do:` list, red-state-first tests, and the machine-checkable DoD
block in that section), reusing Slice 1's `reportEventError`-style never-throw reporter shape
rather than inventing a second one. In short: add `onReconnectError?: (err, { delayMs }) => void`
and `onSocketError?: (err: unknown) => void`, both defaulting to `console.error`; add the missing
`generation` fence to the `on('error')` listener; leave the backoff curve, `closed` guard, and
`onReconnectScheduled` untouched. Remove both `TODO(handoff):` comments as part of the fix.

Then continue with the spec's Slice 3 (changeset + JSDoc + the hub/site/paperclip consumer-adoption
proposal) — S1 must not ship to a published release without S3, per the spec's explicit "Do not
merge S1 without S3."

## Out of scope

Everything the parent spec's §5 already excludes (event replay, awaiting `onEvent`, retry/backoff
policy changes, the malformed-JSON discard, typed error classes, editing `minion_hub` /
`minion_site` / `paperclip-minion` / `minion/`, dedupe/throttling in the library, remote telemetry).
