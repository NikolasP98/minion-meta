# Shared client independent review

Reviewed 2026-10-22 from isolated meta checkout `/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion-meta` (base `ce62073904c0a725ebb9e2591473e57873e79c4f`). Read-only reviewer; no shared edits.

## Standards

PASS, no blockers found. `beginRequest` is additive. Existing async `request` delegates to it and retains Promise-based rejection. Method, serialization and payload validation precede dispatch. Pending-request cleanup still clears timers and registry entries after send exceptions. Socket-send exceptions remain asynchronous because a transport may accept the frame before throwing. Existing handshake and pending-request paths continue through the same implementation.

## Spec A02

PASS for the shared seam. Unopened/closing readyState, cyclic payload and announced byte payload limit throw synchronously before a Promise is returned or any send occurs. After entering socket send, an accepted-then-throw outcome rejects the returned Promise with SEND_FAILED and does not imply safe replay or remote acceptance. Tests cover all four behaviors and legacy request rejection compatibility. Shared code alone does not prove Hub transcript restoration, cancellation, acceptance or runtime rollout.

## Evidence identity

- `packages/shared/src/gateway/client.ts` SHA-256 `b8fb8f640a6f9467bbc763079ffa79dc1a3e3dee4acd9b1ffce1016a425c0d13`.
- `packages/shared/src/gateway/client.test.ts` SHA-256 `99fdd091876b2ef7d5455ac9e56912aa95429b1e3bbcc0a543ee348b3143a0cb`.
- Local archive `/home/nikolas/.cache/codex-implementation/2026-10-22-agent-harness-wave1-7k23gajh/minion-stack-shared-0.9.0.tgz` SHA-256 `e6e69bb92fd1200a5fb67816e5d800398d3d7c0784a4d11cd98df7c62eb7a8bd`. Direct archive inspection confirms `dist/gateway/client.js` includes `beginRequest` and async `request` delegation. This is an unpublished local source-built 0.9.0 artifact; see `shared-artifact.json`.
- `pnpm --filter @minion-stack/shared test -- src/gateway/client.test.ts`: package script ran all 12 files, 392 tests; all passed. Raw output: `factory/shared-independent-review.log`.

## Consumer and rollout limits

Read-only source scan of current Site/Paperclip checkouts found existing Promise-based usage: Site `src/lib/services/member-gateway.svelte.ts:119` returns `client.request`; Paperclip `packages/adapters/minion-drone/src/server/runtime.ts:188` awaits `request`, and openclaw-gateway reexports the shared Node client. No consumer uses a synchronous throw from existing `request`. This is source compatibility inspection, not installed-artifact or deployed proof. Site declares shared `^0.9.0`; Paperclip adapters declare `^0.3.0`; those older Paperclip ranges will not automatically adopt 0.9.0. Hub currently declares a distinct 0.9.1 readiness artifact. Compatible release/adoption and consumer runtime verification remain required before rollout. No publish, merge, deployment or paid call was performed.
