# Contract — `POST /api/gateway/actions/dispatch` (hub)

Auth: the existing bridge auth — `Authorization: Bearer <gateway server token>` plus
`?agentId=personal-<uuid>`, resolved by `resolveAssistantPrincipal` (`src/server/auth/assistant-principal.ts`).
Optional `?orgId=` narrows only; an org the user is not a member of is rejected (existing behavior).
When the agent names no org, the principal resolver MUST use the user's active org rather than
`organization_members` row 0 (FR-012; today's defect per `E-rbac-parity.md`).

## Request

```jsonc
{
  "route": "/api/pos/shifts/open",   // concrete pathname, params substituted
  "method": "POST",                  // POST | PUT | PATCH | DELETE
  "body": { "openingFloat": 200 },   // passed through verbatim
  "confirm": true                    // false ⇒ preview, nothing mutated
}
```

## Responses

| HTTP | `status` | When |
|---|---|---|
| 200 | `applied` | route returned 2xx; `result` is the route's body (as the route masks it) |
| 200 | `preview` | `confirm !== true` |
| 403 | `refused_permission` | principal lacks the capability, at the central guard or the route's own gate |
| 422 | `refused_not_dispatchable` | not in the manifest / unmapped capability / excluded / bad route string / read method |
| route's own | `refused_validation` | route returned 4xx other than 403 |
| route's own | — | route returned 5xx; never rewritten as success |

## Invariants the slice must prove

1. **Equal-or-stricter.** For every manifest `(route, method)` and every persona, the dispatch
   decision equals the decision the same human gets calling the same route from the hub UI.
2. **Fail closed.** Unlisted route, excluded route, unmapped capability, GET, malformed route
   string, missing `agentId` → no mutation, `422`/`403`, never `500`.
3. **One authorization source.** The required capability is `apiWriteCapability(route, method)`
   and nothing in the request can influence it.
4. **No new external entry point.** The principal handoff is in-process only (ALS, research R1);
   a request arriving from outside the process cannot assume a principal.
5. **Pipeline intact.** The inner request runs `hooks.server.ts`'s module-availability guard,
   route-access guard and central write guard; `bypassGate` stays `false`.
6. **Attribution.** Every `applied` outcome has an audit trail entry naming the human with the
   agent marker.
