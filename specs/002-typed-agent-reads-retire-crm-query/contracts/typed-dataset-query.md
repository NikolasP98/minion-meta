# Contract: Typed dataset query endpoint

Follows the existing `GET /api/gateway/query/<domain>` family's contract exactly (see
`query/pos`, `query/stock`, `query/finance` for the live precedent); this file states the
additions this feature requires of any *new* dataset built under that family.

## Request

```
GET /api/gateway/query/<domain>?agentId=personal-<uuid>[&orgId=<org>]&mode=<dataset-id>[&version=<n>][&<dataset-specific params>]
Authorization: Bearer <gateway↔hub server token>   (existing, unchanged)
```

- `agentId`, `orgId`: existing contract, unchanged (see data-model.md).
- `mode`: required. One of the domain's published `TypedDataset.id` values.
- `version`: optional, defaults to the dataset's current version.
- Dataset-specific params: declared and validated per dataset; MUST NOT be interpolated into a
  SQL string — bound as query parameters against the dataset's fixed template only (FR-010).

## Response: 200 OK (allowed)

```json
{
  "mode": "<dataset-id>",
  "rows": [ { "...": "..." } ],
  "rowCount": 0,
  "truncated": false
}
```

- `rows`: sensitive fields per `TypedDataset.sensitiveFields` are masked/omitted when
  `capabilities.fieldLevel(module) < SENSITIVE_FIELD_LEVEL` (FR-004).
- `rowCount` ≤ the dataset's `rowLimit`.
- `truncated: true` when the underlying result was capped at the query level (FR-006/FR-007).
  `truncated: false` on a complete result, including zero rows.

## Response: 403 Forbidden (refused — capability, module, or cross-org)

```json
{ "error": "Your role does not permit 'view' on finance." }
```

Matches `requireAssistantCapability`'s existing error shape (`action-auth.ts`). A module-disabled
org or a cross-org attempt MUST also resolve to a 403 with a message naming the reason, not a
500/timeout, and MUST be refused before the dataset's query template executes (FR-005, FR-008).

## Response: 410 Gone (refused — deprecated version)

```json
{ "error": "deprecated", "supersededBy": "<dataset-id>@<new-version>" }
```

(FR-009; spec Edge Cases.) Exact status code (410 vs. 400 vs. 200-with-error-field) is an
implementation choice for `/speckit-tasks`/implementation to pin down against this workspace's
existing error-shape conventions — the requirement is that it is structured and distinct from
"empty result," not which HTTP status carries it.

## Response: 400 Bad Request (unknown `mode`)

```json
{ "error": "unknown mode '<value>'" }
```

Matches the existing fallback in `query/pos`/`query/finance` for an unrecognized `mode`.

## Non-contract (explicitly out of scope for this endpoint family)

- No request field may ever be concatenated into a SQL statement string. (FR-010)
- No request field may set or imply a session-local/connection-local variable the query template
  then trusts. (FR-010)
- This contract does not reintroduce `POST /api/gateway/query` (raw SQL) in any form — that route
  stays the static `503 ASSISTANT_SQL_DISABLED` response. (FR-011)

## Gateway tool contract (minion repo)

```
tool: "<domain>_query"   (e.g. "analytics_query", or a new mode added to an existing *_query tool per R3)
params: { mode: string, version?: string, ...dataset-specific }
→ calls GET /api/gateway/query/<domain> with the above params, same bridge pattern as
  finance_query/bookings_query/tickets_query/orders_query/projects_query/stock_query.
```

- MUST be present in `TOOL_ORDER` (`minion-tools.ts`) and have a passing
  `TOOL_REGISTRY ⊆ TOOL_ORDER` test (extends the S0c pattern). (FR-001, FR-015)
- `crm_query` and its `.meta.ts` file MUST NOT exist in the registry after this change. (FR-001)
- The hub's per-turn envelope (`assistant-context.ts`) MUST name this tool where it used to name
  `crm_query`, not merely delete the old sentence. (FR-002)
