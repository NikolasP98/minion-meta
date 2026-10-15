# Data model — Generic Agent Action Dispatcher

No database table is added, altered or dropped. Everything below is either a code-level
structure or an existing row that gains a value. (Relevant because hub schema is **not**
reproducible from the repo and `drizzle-kit push` is forbidden — a migration-free feature is a
feature with no migration risk.)

---

## 1. `DispatchManifestEntry` (code, hub)

The single source of truth for what the agent may write. Lives next to the route contract
(`src/lib/routes/`) so it is covered by the same gates, and is serialised to the gateway.

| Field | Type | Rule |
|---|---|---|
| `pattern` | string | A hub API route pattern, SvelteKit form (`/api/pos/tickets/[id]/void`). MUST exist on disk. MUST NOT start with `/api/gateway` or `/api/internal`. |
| `methods` | `('POST'\|'PUT'\|'PATCH'\|'DELETE')[]` | Non-empty. Each MUST be exported by that route's `+server.ts`. |
| `effect` | string | One line, imperative, user-facing — this is what the model reads. Non-empty. |
| `fields` | `{ name, type, required, note? }[]` | The body the route needs. Hand-authored; the residual per-route cost. |
| `capability` | derived, not stored | Resolved at runtime by `apiWriteCapability(pattern, method)`. MUST be non-null or the entry is invalid (FR-003). |
| `destructive` | boolean | True for anything that voids, refunds, deletes or moves money. Raises the confirmation bar and (if the owner chooses R4's option c) the write ceiling. |
| `params` | `string[]` | Path parameter names taken from `pattern`; each MUST be supplied by the caller and MUST match `/^[\w-]+$/`. |

**Invariants** (enforced by the repository gate, D5/FR-020):
- Every write `(route, method)` pair on disk is in exactly one of: `manifest`, `exclusions`.
- Every manifest `pattern` resolves to a file on disk, and every listed method is exported there.
- Every manifest `(pattern, method)` has a non-null `apiWriteCapability`.
- No `pattern` under `/api/gateway` or `/api/internal` (R1 recursion / machine channels).

## 2. `DispatchExclusion` (code, hub)

| Field | Type | Rule |
|---|---|---|
| `pattern` | string | As above. |
| `methods` | string[] | `['*']` allowed. |
| `reason` | enum | `machine-only` \| `anonymous` \| `platform-admin` \| `unmapped-capability` \| `dedicated-tool` \| `principle` |
| `note` | string | Required when `reason = 'principle'` (the four of R4: org-config, builder, pulse, gateway). |

## 3. `DispatchRequest` (wire, gateway → hub)

`POST /api/gateway/actions/dispatch?agentId=…[&orgId=…]`

| Field | Type | Rule |
|---|---|---|
| `route` | string | Concrete pathname (params already substituted). MUST match exactly one manifest pattern after parameterisation. Rejected if it contains `..`, `//`, `\`, an authority, or any percent-encoded separator (FR-006). |
| `method` | string | MUST be in the entry's `methods`; GET/HEAD always refused (FR-005). |
| `body` | object | Passed through verbatim; the route validates it. Never inspected for authorization (FR-004). |
| `confirm` | boolean | Required. `false` ⇒ preview only, nothing mutated (FR-015). |

## 4. `DispatchOutcome` (wire, hub → gateway)

Discriminated on `status`, so the model can distinguish the five cases the spec requires
(FR-002, FR-016) instead of string-matching a message.

| `status` | Carries | Meaning |
|---|---|---|
| `applied` | `result` (the route's own response body, masked as the route masks it), `actor` | The write happened. |
| `preview` | `effect`, `route`, `method`, `body` | `confirm` was false. Nothing changed. |
| `refused_permission` | `module`, `action`, `message` | 403 — the agent MUST say the user's role is the cause. |
| `refused_not_dispatchable` | `route`, `method`, `reason` | Not in the manifest, or unmapped capability. **Never** phrased as a permission problem (the RENIEC lesson: a generic failure where a 403 was meant is a product defect, and so is the inverse). |
| `refused_validation` | the route's status + its error body | The route rejected the body. |

A route failure that is neither 403 nor a 4xx validation error propagates as the route's own
status; the dispatcher never converts a 5xx into a success.

## 5. `FormDef` (code, hub, in-app assistant) — one added field

| Field | Change |
|---|---|
| `write` | **new**: `{ module: Module; action: PermAction }` — the capability the form's submit needs. 8 rows to fill (`src/lib/assistant/catalog.ts:360`). Used by FR-024's filter, replacing `canViewPath`-only. |

## 6. `FormBinding` (code, hub) — one added optional method

| Field | Change |
|---|---|
| `submit?` | **new, optional**: `() => Promise<{ ok: boolean; message?: string; recordId?: string }>` — the page's existing submit handler. Optional so the 8 existing call sites keep compiling and opt in one at a time. |

## 7. Existing rows that gain a value

- Audit/activity rows written by dispatched routes carry the `agentActor()` stamp
  (`"<name> (via agent)"`, `_shared/action-auth.ts:38-50`) instead of a bare profile id — no
  schema change, a different value in the same column (FR-014, closes `E-S9` for dispatched
  writes only).

## 8. Nothing else

No new table, no migration, no `stk_bins`/ledger-style materialised value, no Drizzle schema
edit. If the plan ever acquires one, it also acquires the production-data rules of Constitution V
and should be re-reviewed.
