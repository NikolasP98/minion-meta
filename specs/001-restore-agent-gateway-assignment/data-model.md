# Phase 1 — Data Model: Restore Agent Gateway Assignment

**There is no schema change.** Every column this feature needs already exists. This document is the state machine and the invariants over them, which is the part that was never written down and the reason the defect was possible.

## Entities (existing)

### Personal agent — `personal_agents` (Supabase Postgres)

| Field | Type | Role in this feature |
|---|---|---|
| `id` | text PK | — |
| `profile_id` | uuid, **unique**, → `profiles.id` ON DELETE CASCADE | the owner. Unique ⇒ **one personal agent per user**, which is why `gateway_id` can hold only one gateway (spec A11). |
| `agent_id` | text | the identifier the gateway sends as `?agentId=`. Matched case-insensitively by the resolver. |
| `gateway_id` | uuid, **nullable**, → `gateway.id` **ON DELETE SET NULL** | **the field this feature is about.** NULL on all 11 production rows. The `SET NULL` is why an assignment can silently disappear later (spec Q7). |
| `provisioning_status` | enum `pending \| provisioning \| active \| error` | the resolver demands `active`. The retry path runs only while it is `pending` or `error` (`shouldRetryAgent`), which is why FR-005a holds the agent back rather than marking it ready. |
| `provisioning_error` | text | carries the reason a row is unassigned (FR-005). |
| `retry_count`, `last_retry_at` | int / timestamptz | the existing backoff, reused unchanged. Max 5 retries. |
| `updated_at` | timestamptz | the only other column this feature writes. |

Anchor: `packages/db/src/pg/schema/personal-agents.ts`.

### Gateway — `gateway`

| Field | Type | Role |
|---|---|---|
| `id` | uuid PK | the value stored on the agent. |
| `org_id` | uuid, **nullable** (soft ref to organizations) | the organization that owns the gateway. Nullable during the Turso→Supabase cutover bake, so a gateway with no organization exists and must not be picked by an organization-scoped query. |
| `legacy_server_id` | text, **not unique** | the old Turso id. The resolver resolves the incoming server token through this *before* looking at the agent, precisely because it is not unique. |
| `url`, `token_ciphertext`, `token_iv` | text | the credential the creation call uses. |
| `channel` | text, **not in the drizzle table definition** | read as `coalesce(to_jsonb(gateway) ->> 'channel', 'prd')`. Deliberately not a drizzle column: adding it would put `gateway.channel` into every consumer's select and 500 them until the migration landed everywhere (this happened to /finances on 2026-07-19). **Any new query in this feature must read channel the same way.** |

Anchors: `packages/db/src/pg/schema/gateway.ts`; `src/server/services/gateway.pg.service.ts:53-98`.

### Organization membership — `organization_members`

Read-only here. Determines whether an agent is assignable at all (INV-3) and is re-read by the resolver on every request, which is why an assignment is not by itself authority.

## The assignment state machine (new — this is the contribution)

```
                    ┌──────────────────────────────────────────────┐
                    │                                              │
  (user first load) │                                              │
         │          ▼                                              │
         │   [no row]                                              │
         │      │ provision: resolve gateway for (profile, org, prd)
         │      ├── resolved ──► [row: pending, gateway_id=G] ──► create agent on G
         │      │                                                  │ ok
         │      │                                                  ▼
         │      │                                        [row: active, gateway_id=G]  ← the only
         │      │                                                  │                    serviceable
         │      │                                                  │                    state
         │      └── not resolved ─► [row: pending, gateway_id=NULL, error=reason]
         │                                 │                       │
         │                      next page load retries ────────────┘
         │                                 │
         │                      retry budget spent
         │                                 ▼
         │                      [row: pending/error, NULL]  ──► owner runs the tool ──┐
         │                                                                            │
         └────────────────────────────────────────────────────────────────────────────┘

  [row: active, gateway_id=G] ── gateway G deleted (ON DELETE SET NULL) ──►
        [row: active, gateway_id=NULL]   ← silently refused; NOT self-healing
                                           (shouldRetryAgent is false for active)
                                           repair = owner runs the tool   (spec Q7)
```

**The state the 11 production rows are in** is not on this diagram as a reachable path any more: `active` + `gateway_id = NULL` + never-attempted assignment. It is reachable today only because provisioning coerced `''` to NULL and marked the agent ready anyway. FR-005a removes that transition; the tool clears the existing instances.

## Invariants (restated as checkable conditions)

| # | Condition | Checked by |
|---|---|---|
| INV-1 | every `active` agent whose owner is a member of an organization with an eligible gateway has `gateway_id` non-NULL and pointing at a gateway of that organization | the tool, after applying (FR-011); a scoped query in quickstart |
| INV-2 | across any run, no row's `profile_id`, `agent_id`, `provisioning_status` or owning organization changed; only `gateway_id` (NULL→value) and `updated_at` were written | the tool, before/after comparison |
| INV-3 | an agent whose owner has no membership, or whose organization has no eligible gateway, has `gateway_id` NULL and is refused | resolver test (negative, already pinned) + the tool's skip report |
| INV-4 | no agent is reachable from a gateway of an organization its owner is not a member of | the resolver's existing equality check + membership re-read; not re-implemented |
| INV-5 | an agent's stored `gateway_id` is the gateway it was created on | provisioner test with an organization whose gateway ≠ the platform default (the case A15 makes invisible) |

## Validation rules applied on write

- `gateway_id` is written only when it was resolved in the same operation that created the agent (FR-002a). Never computed from a different rule afterwards.
- An empty or missing organization input is refused with a named error, never coerced to NULL (FR-004) — the exact line that caused this.
- The write is idempotent: the existing insert already uses `onConflictDoNothing` on the unique `profile_id`, and the assignment update is conditioned on `gateway_id IS NULL` (FR-006, FR-012). Both are safe under the concurrent page loads the `(app)` layout generates.
- The tool never widens: its update predicate is `gateway_id IS NULL AND <owner is a member of the target gateway's organization>`.
