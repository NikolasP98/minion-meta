# Contract — the dispatch manifest (hub-served, gateway-consumed)

## Read

Served through the existing catalog read rather than a new endpoint (research R6):
`GET /api/gateway/query/sdk-catalog?agentId=…` gains a `writes` section.

```jsonc
{
  "writes": {
    "hash": "sha256:…",              // changes when any row changes; lets the gateway cache
    "rows": [
      {
        "pattern": "/api/pos/shifts/open",
        "methods": ["POST"],
        "params": [],
        "effect": "Open a POS shift for the current user so sales can be rung up.",
        "fields": [{ "name": "openingFloat", "type": "number", "required": false }],
        "capability": { "module": "pos", "action": "edit" },
        "destructive": false
      }
    ]
  }
}
```

Rows MUST be filtered to the calling principal's capabilities, so the model is never shown a
write it cannot perform (the lesson of `E-O4`: offering on view and failing on submit).

## Gateway tool

One tool, fixed parameters, so a new hub row needs no gateway release (SC-003):

```jsonc
{
  "name": "hub_action",
  "parameters": {
    "route":   "string  — the hub route path, from the writes catalog",
    "method":  "POST|PUT|PATCH|DELETE",
    "body":    "object  — the route's fields, from the catalog row",
    "confirm": "boolean — restate the exact effect and get the user's agreement first"
  }
}
```

Reuses `CONFIRM_FIELD` and `hubPost` from `src/agents/tools/hub/hub-common.ts` verbatim.
`module_action`'s 17-string allowlist is deleted once its 17 endpoints are manifest rows
(FR-022); its `meta.mcpExport` must NOT be copied onto `hub_action` until slice S5 gives
`/mcp` per-user identity (synthesis D-G3).

## Repository gate (FR-020, the artifact that keeps the manifest honest)

A test in the hub, in the shape of the existing route-contract counts test
(`src/lib/routes/route-design-contracts.test.ts:83`):

1. Enumerate `src/routes/api/**/+server.ts`, collect exported write methods, drop
   `api/gateway` + `api/internal` → the pair set (364 today).
2. Assert every pair is in `manifest` ∪ `exclusions`, exactly once.
3. Assert every manifest pattern exists on disk and exports its listed methods.
4. Assert every manifest pair has a non-null `apiWriteCapability`.
5. Assert the counts: manifest rows + exclusions = the enumerated total, so adding a route
   reddens the gate (the frozen-inventory convention this repo already relies on).
