# Phase 1 Data Model: Typed Agent Reads, Retire crm_query

No new database tables or migrations. This feature adds a new *request/response shape* over
existing tables (per R3, likely `fin_invoices`/`fin_invoice_items`/`fin_products`, reusing
`finance.service.ts`'s existing joins) and a server-side *dataset definition* convention. Entities
below are request/response/config shapes, not persisted rows.

## TypedDataset (server-side definition, one per `mode` value within a domain endpoint)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable identifier, e.g. `analytics` domain + `revenue_by_category` mode, or `finance` domain + a new mode alongside `summary`/`series`/`products`/`clients`. Chosen in implementation per R3. |
| `version` | integer or string | Starts at `1`/`v1`. Bumped only on a breaking response-shape change (FR-009); additive fields do not require a bump. |
| `module` | `Module` (existing `rbac.service.ts` union) | The capability module this dataset's data belongs to, e.g. `finance`. Drives FR-005's capability + module-enabled + owner-scope resolution. |
| `action` | `PermAction` (existing union) | The action checked via `capabilities.can(module, action)`, matching the human path's equivalent read (e.g. `view`). |
| `ownerScopable` | boolean | Whether this dataset's rows carry a per-record owner column the human path already owner-scopes (R1). If true, the endpoint applies `capabilities.ownerScoped(module) ? principalId : undefined` as the owner filter (FR-005). |
| `sensitiveFields` | string[] | Field names in the response that the human-facing equivalent view already masks for a low field level (FR-004). Empty array if the dataset has none. |
| `rowLimit` | integer | Hard cap enforced via a SQL `LIMIT` (or equivalent query-level cap) in the dataset's query template (FR-006). Per-dataset, not global (spec Assumption 3). |
| `byteLimit` | integer (bytes, approximate) | Enforced via a bounded column projection (no `SELECT *`, no unbounded text/blob columns) sized so `rowLimit` rows cannot exceed it; not a post-serialization truncation (FR-006). |
| `queryTemplate` | fixed, parameterized query (code, not data) | The one and only query shape for this dataset id/version — never built from caller-supplied SQL fragments or a caller-mutable session variable (FR-010). |

## DatasetQueryRequest (gateway → hub, `GET /api/gateway/query/<domain>?agentId=…&mode=<id>[&version=][&...typed params]`)

| Field | Type | Notes |
|---|---|---|
| `agentId` | string (existing) | `personal-<uuid>` — same trusted-session parameter every other `query/*` endpoint already requires. |
| `orgId` | string, optional (existing) | Honored only when it matches an org the resolved principal belongs to — never trusted blindly (spec Edge Cases); unchanged from today's `query/*` contract. |
| `mode` | string | Selects the `TypedDataset.id` within the domain, matching the existing `mode=` convention (R2). |
| dataset-specific filters | typed, e.g. `from`/`to`/`bucket`/`groupBy` | Declared per dataset; validated server-side; never a raw SQL fragment, never a value that participates in constructing the tenant/owner predicate (that predicate always comes from the resolved principal, per FR-005/FR-010). |

## DatasetQueryResponse

| Field | Type | Notes |
|---|---|---|
| `mode` | string | Echoes the requested dataset id, matching existing `query/*` response convention. |
| `rows` | array of objects | Sensitive fields present in `TypedDataset.sensitiveFields` are omitted/masked per FR-004 before serialization when the caller's field level is below threshold. |
| `rowCount` | integer | Count of rows actually returned (≤ `rowLimit`). |
| `truncated` | boolean | `true` when the underlying result would have exceeded `rowLimit`/`byteLimit` and was capped at the query level (FR-006, FR-007); `false` (not omitted) on a complete result, including a legitimate empty result (spec Edge Cases: zero-row org data ≠ refusal). |
| `error` | string, only on refusal | Structured message naming the missing capability/module/scope, per FR-008 — never a raw exception/stack trace. |

Deprecation (FR-009): a request for a `mode`/`version` pair the server has marked deprecated
returns a structured `{ error: "deprecated", supersededBy: "<id>@<version>" }` rather than silently
answering with the old or new shape (spec Edge Cases).

## PersonaNegativeControl (test fixture, not a runtime entity)

| Field | Type | Notes |
|---|---|---|
| `name` | string | One of: `full-access`, `under-capability`, `module-disabled-org`, `cross-org`. Matches spec FR-014's four personas. |
| `principal` | fixture | A resolved-principal shape (org, profile, capabilities) matching the persona — e.g. `under-capability` has `capabilities.can(module, action) === false` for the dataset under test. |
| `expected` | `"refused"` \| `"allowed"` | `full-access` → `allowed`; the other three → `refused` for every dataset that declares the relevant module/action/ownerScopable. |

This fixture set is run against **every** published `TypedDataset` (FR-014); it is not scoped to
the one day-one dataset only.

## Relationships

```
AssistantPrincipal (existing: org, profileId, capabilities)
        │  resolved by requireAssistantCapability / resolveAssistantPrincipal (unchanged)
        ▼
TypedDataset.module/action/ownerScopable/sensitiveFields
        │  gate check (FR-005) + field decision (FR-004), both off `capabilities`
        ▼
TypedDataset.queryTemplate (fixed, parameterized; FR-010)
        │  bounded by rowLimit/byteLimit (FR-006)
        ▼
DatasetQueryResponse { rows, rowCount, truncated, [error] }
```

No new entity touches `personal_agents`, `resolveGatewayPrincipal`, or any other part of the S0
bridge-restoration slice — this feature is purely inside the already-authenticated request path.
