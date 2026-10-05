# @minion-stack/shared

Shared gateway protocol types, WebSocket client and utilities for the Minion platform. Ships as ESM with `.d.ts` declarations only (no CommonJS, no bundling).

## Entry points

| Specifier | What | Runtime |
|---|---|---|
| `@minion-stack/shared` | Gateway protocol/types, utils, brain-vector, prompt sections (re-exported) | Browser-safe (no `ws` import) |
| `@minion-stack/shared/gateway` | `GatewayClient`, protocol/frame types, connect-params, traceparent | Browser-safe |
| `@minion-stack/shared/utils` | Session-key, uuid, text helpers | Browser-safe |
| `@minion-stack/shared/node` | `createNodeGatewayClient(...)` — Node `ws`-backed wrapper around `GatewayClient` | Node only |
| `@minion-stack/shared/brain-vector` | Brain-vector contract + crypto helpers | Browser-safe |

The root, `./gateway`, `./utils` and `./brain-vector` entries never import `ws` and are safe in hub/site browser bundles. `./node` is the **only** entry that imports `ws`; it is for Node consumers (e.g. the paperclip-minion adapter).

## Optional `ws` peer

`ws` is an optional peer dependency. Consumers that only use the browser-safe entries above do not need it installed. Consumers that import `@minion-stack/shared/node` must install `ws` themselves — resolution fails with Node's own missing-peer error if it is absent, and `createNodeGatewayClient(...)` works once it is present (construction only; it does not open a socket by itself).

## Commands

- `pnpm build` — clean, production-only emission (`scripts/build.mjs` + `tsconfig.build.json`): JS + `.d.ts` for `src/**/*` excluding `*.test.ts`, no source maps, no incremental/composite reuse. Refuses to run if the resolved `dist` path or an ancestor is a symlink/junction or an unexpected type.
- `pnpm test` — the package's Vitest suite (all ten `*.test.ts` files, including a live-`WebSocketServer` test under `src/node/`).
- `pnpm typecheck` — `tsc --noEmit` against the full source graph, tests included. This is also what `prepublishOnly` runs, so a broken publish cannot re-emit test output.

## Request failures and retries

`GatewayError` preserves `source`, `code`, `details`, `retryable` and
`retryAfterMs`, and adds `dispatch` as transport evidence:

- `not-sent`: a local disconnected, invalid-request or oversized-request rejection.
- `unknown`: a timeout, disconnect or send exception. A transport can accept a
  frame and then throw, so a send exception does not prove that a write failed.
- `responded`: a server error response. This does not itself prove business rollback.

`canRetry(error, { idempotent })` never retries automatically. For a
non-idempotent request it allows only a local `NOT_CONNECTED` rejection;
invalid input must be corrected and an uncertain write must be reconciled.
Classify failures by their typed fields rather than matching English messages.

The readiness compatibility archive is built with
`node scripts/pack-shared-error-readiness.mjs <readiness.1.tgz> <fresh-output-directory>`
from the meta-repo root. It verifies the pinned baseline, applies the reviewed
client patch, runs the compatibility/error suites, and records source and archive
hashes. It is a local consumer qualification artifact, not an npm release.

## Debugging limits

This build omits both JS and declaration source maps. There is no shipped `.ts` source and no embedded `sourcesContent` — stepping into original TypeScript source from a consumer is not supported. What you get is declaration-driven type navigation (`.d.ts`) and ordinary compiled-JS debugging (breakpoints/stack traces resolve to the shipped `.js`, not the original source lines).

## Release status

TODO(handoff): license text/attribution for this package is unresolved — `license: "MIT"` is metadata only; no LICENSE/NOTICE file is shipped or verified at the repo or package root. This build repair does not close that gate. See `proposals/2026-09-08-platform-qc-remediation.md` for the tracked packaging/license proposal; do not treat a locally built archive as a releasable artifact until that gate closes.
