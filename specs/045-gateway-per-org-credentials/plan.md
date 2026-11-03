# Implementation Plan: Gateway per-org credentials (045)

**Spec**: [spec.md](./spec.md) · **Design**: [design.md](./design.md) (HOW, anchors, risks)

## Constitution check
- **Spec Kit first.** Done.
- **Security tag.** The owner approves and merges.
- **Hub tests never hit prod.** Unset `SUPABASE_DB_URL`/`DATABASE_URL`.
- **Gateway gate.** `pnpm vitest run test/ci/` plus targeted tests; never the full suite.
- **Inert merges.** Every slice except A0 and the A2 plugin-toggle fix merges with no behaviour change (design §4).
- **Open ends.** Each gets a `TODO(handoff)` plus the follow-up proposal.

## Slices

| Slice | Repo · base · branch | Depends on | Gates |
|---|---|---|---|
| A0 | site · `dev` · `fix/members-no-gateway-token` (**PR #39**) | — | `bun run check`, `bun run test` |
| A1 | gateway · `DEV` · `feat/045-gateway-jwt-audience` | lands with or before #363 (043 S4) | targeted vitest + `test/ci/`, `pnpm check`, `pnpm tsgo` (known `baml_client` noise) |
| A2 | hub · `master` · `feat/045-gateway-jwt-issuance` | 043 S1 (#618) for the stack only | targeted vitest, `bun run check`, route-contract counts (2 routes deleted) |
| A3 | hub · `master` · `feat/045-gateway-jwt-client` | A2 | targeted vitest (fake timers), `bun run check`, `lint:design`/`lint:tokens` if UI is touched, route-contract counts (`/terminal` deleted) |
| A4 | hub · `master` · `chore/045-remove-shared-token-endpoint` | A1 deployed, launch step 5 | as A3 |

## Key files
- **Gateway:**
  - `src/gateway/auth/auth-jwt.ts`, `src/gateway/server/ws-jwt-auth.ts`, `src/gateway/server/ws-connection/message-handler.ts` (JWT-only admission);
  - `src/gateway/server-methods/auth-refresh.ts` and `server.impl.ts` (refresh registration);
  - `src/gateway/server/ws-types.ts` (`jwtExp`), the revocation module (`users/token-revocation.ts` plus the `hub.token.revoked` handler);
  - `src/config/types.gateway.ts`, `src/config/zod-schema.ts`, the help/labels files;
  - `packages/plugin-ui-bridge/src/index.ts`.
- **Hub:**
  - `src/server/services/gateway-jwt.service.ts` and `src/routes/api/gateway/jwt/+server.ts`;
  - `organization-provision.service.ts` (`mintOrgGatewayJwt`);
  - `src/routes/api/plugins/[id]/toggle/+server.ts`;
  - delete `src/routes/api/device-identity/sign/` and `src/server/services/device-identity.service.ts`;
  - `src/lib/services/gateway.svelte.ts`, `src/lib/state/features/hosts.svelte.ts`;
  - plugin bridge: `src/lib/plugins/{bridge-host.ts,bridge-protocol.ts,PluginIframe.svelte,PluginControlCenter.svelte}`, `src/routes/(app)/settings/plugins/+page.svelte`;
  - delete `src/routes/(app)/terminal/`;
  - `src/routes/api/servers/[id]/token/+server.ts`.
- **Launch tool:** `minion_hub/scripts/qa/gateway-jwt-probe.ts`, which mints server-side; the owner runs it.

## Test strategy
Design §6 maps each invariant to its tests. Gateway expiry and refresh use fake timers. The hub client tests the refresh timer, cutover and the connect-frame snapshot with the flag unset.
