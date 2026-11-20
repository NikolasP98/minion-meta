# Implementation Plan: slice S5 — hub MCP endpoint for sandbox pages

**Spec**: [spec.md](spec.md) · **Repo**: `minion_hub` · **PR base**: `master` · **Branch**: `feat/136-sandbox-mcp`

## Approach

One stateless route, one small protocol module, one migration. No new dependency: the protocol is
hand-rolled JSON-RPC, as the gateway's `/mcp` is. Every tool calls the existing sandbox service.

| Piece | Where | Pattern to copy |
|---|---|---|
| Migration | `supabase/migrations/<ts>_api_key_scopes_sandbox_writer.sql`: `org_api_keys.scopes text[] not null default '{}'` with a check that each value is in `('sandbox')`; `sandbox_elements.written_by_key uuid` (plain uuid, the key outlives nothing it references) | `20261116100000_org_api_keys.sql`; run `bun scripts/qa/check-migration-seed-pairing.ts` and satisfy it |
| Key scopes | `org-api-keys.service.ts`: `createKey` takes `scopes`, `listKeys`/`verifyKey` return them; Drizzle schema column; `src/lib/types/api-keys.ts`; `/api/settings/api-keys` POST accepts `scopes`; `ApiKeysSection.svelte` gets one checkbox and a badge | existing key code; `doors/caller.ts` stays untouched |
| Protocol | `src/server/mcp/protocol.ts` (pure): parse/validate JSON-RPC, `initialize` (protocolVersion `2025-06-18`, serverInfo `minion-hub`), `ping`, `tools/list`, `tools/call`, `notifications/*` → 202; error codes -32700/-32600/-32601/-32602 | gateway `src/gateway/mcp/protocol.ts` for shape only |
| Tools | `src/server/mcp/sandbox-tools.ts`: five tools with JSON Schemas; handlers take `{ ctx: CoreCtx, keyId }` | `src/lib/sandbox/tools.ts` for argument names |
| Route | `src/routes/api/mcp/+server.ts`: POST only; Bearer `mk_` key → `verifyKey` → scope check → rate limit (`checkSharedRateLimit('mcp-key:<id>', …)`, 120/min) → `touchKey` → dispatch | `src/server/doors/caller.ts` |
| Service | `sandbox.service.ts`: `listPages(ctx)`; `upsertElement`/insert accept an optional `writtenByKey`; a `datasetCatalog()` that returns every dataset's schema without a user (schemas are not data) | existing functions |
| Access | the route authenticates itself: add it wherever key-authenticated door routes are allow-listed (hooks + `route-access-registry.ts`), and to every route-contract count the tests name | memory: route contract counts |

## Decisions

- **Key ctx**: `CoreCtx { db, tenantId: key.orgId, profileId: undefined }`. Elements written by a key have `created_by` null and `written_by_key` set. The library page (`LIBRARY_PAGE`) is refused by the tools.
- **Page names**: `^[a-z][a-z0-9-]{0,31}$`, default `default`.
- **No query tool** (FR-008). `sandbox_datasets` returns ids, labels, columns and types only.
- **Tool results**: MCP `content: [{ type: 'text', text: JSON }]`; tool failures are `isError: true` with a plain sentence, not JSON-RPC errors.
- **Scopes are immutable** after creation (no PATCH).

## Tests

- `protocol.test.ts`: each method, each error code, notification handling.
- `sandbox-tools.test.ts` (mock-db pattern used by `org-api-keys` tests): each tool's argument validation; library page refused; bad page name refused.
- Route test (`src/routes/api/mcp/server.test.ts`, pattern `src/routes/api/sandbox/server.test.ts`): no key 401; malformed 401; revoked 401; no scope 403 naming the scope; over limit 429; happy path write returns id and passes `writtenByKey`.
- Key service tests: scopes round-trip; default empty; invalid scope rejected.
- Existing door tests unchanged and green.

## Rollout

1. PR reviewed and merged by the owner (security-tagged).
2. Migration applied to prod before the deploy that reads the columns (additive, safe either order for old code).
3. Owner creates a scoped key for FACES; connect with
   `claude mcp add --transport http minion-hub https://hub.minion-ai.org/api/mcp --header "Authorization: Bearer <key>"`.

## Risks

- A scoped key leak lets someone edit an org's sandbox pages; mitigations in the spec (no rows, no outbound network from elements, revoke).
- `TODO(handoff)`: block tools after hub #642; gateway proxy after spec 005.
