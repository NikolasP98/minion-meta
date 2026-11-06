# Phase 1 — Data model: the authorization decision

No schema change. This feature introduces no table, column, migration or persisted field. What follows is the shape of the **decision** the shared guard makes and the existing data it reads — written down because the omission of three of its four parts is the defect.

## The decision

For one bridge request, authorization is the conjunction of four answers. Today only the first is asked on 44 of 48 endpoints.

| Part | Question | Source today | Used by the bridge today |
|---|---|---|---|
| Capability | may this person do `action` on `module`? | `buildCapabilities(roles, overrides).can()` — `rbac.service.ts:281-283`, OR-ed across roles | yes, all 48 |
| Module state | is `module` enabled for this org? | `isModuleEnabled(ctx, module)` — `modules.service.ts:26-29`; absent row = enabled | **no, 0 of 48** |
| Owner scope | must reads/writes be limited to records this person owns? | `capabilities.ownerScoped(module)` — `rbac.service.ts:285-287`, least-restrictive wins; column from `OWNER_SCOPABLE_MODULES` (`:445`) | 2 of 48 (`query/orders:20`, `query/tickets:30`) |
| Field level | may this person see the sensitive tier of `module`? | `capabilities.fieldLevel(module)` vs `SENSITIVE_FIELD_LEVEL` — `rbac.service.ts:296-298` | 2 of 48 (`query/finance:22`, `query/bookings:24`) |

**Invariant the guard must make true**: a bridge request is served only if all four answers permit it, and a handler receives the third and fourth answers whether or not it asks for them.

## Entities (all pre-existing)

### Principal
The human the agent acts for. `{ principalId, orgId }`, resolved by `resolveAssistantPrincipal` from the gateway server token plus `?agentId=`, or from a browser session (self-or-admin only). Never taken from the request body; a requested org may only narrow or be rejected. Unchanged by this feature.

### Capabilities
Per-module `{view, create, edit, delete, export, manage}` plus `ownerScoped` and `fieldLevel`, OR-ed / MAX-ed across the person's roles with dotted sub-resource inheritance. Unchanged by this feature; this feature only reads the two fields the bridge ignored.

### Module state
`app_modules(org_id, module_id, enabled)`, read through a 5 m-cached map. Absent row means enabled — load-bearing (FR-004): an org that never touched the toggles must not start being refused. A failure to read is **not** an absent row (FR-027).

### Bridge endpoint
One of 48 handlers. For this feature each carries: its module (or an explicit "no module, because …"), its action, and — for the 17 `actions/*` writes — the human pathname and method it mirrors. The last part is new, and lives in `contracts/actions-human-path-map.md` rather than in the database.

### Refusal record
New, non-persisted (structured log / metric, FR-028): `{ endpoint, module, action, reason }` where reason ∈ `missing_capability | module_disabled | out_of_owner_scope | not_gateway_caller | state_indeterminate`. Carries no withheld data — not the record id, not the masked field, not the query. It exists so SC-002 and SC-010 are checkable in production rather than at the next audit.

## State transitions

Only one, and it is per-request rather than per-entity:

```
resolve principal ──┬─ no principal ─────────────────→ 401
                    └─ principal
                         ├─ capability missing ──────→ 403  "your role does not permit <action> on <module>"
                         ├─ module disabled ─────────→ 404  module_disabled          (new)
                         ├─ module state unreadable ─→ refuse (propagate)            (new)
                         └─ permitted
                              ├─ ownerScoped ────────→ handler filters / pre-checks  (new for 46)
                              └─ fieldLevel < tier ──→ handler masks                 (new for 46)
```

Three endpoint families sit outside the module gate by design and must say so in code: the capability read itself (`query/tool-permissions`), personal notes (principal-scoped, no module), and platform admin endpoints (`update`, `fleet-update`, already `requireAdmin`).

## Validation rules carried over from the requirements

- Absent module toggle = enabled (FR-004); unreadable module state = refuse (FR-027).
- `ownerScoped` is least-restrictive by construction; the bridge must inherit that answer, never recompute it (spec Edge Cases).
- `fieldLevel` is MAX across roles; masking applies when it is below `SENSITIVE_FIELD_LEVEL`.
- Masking and owner filtering happen before the response leaves the hub (FR-029).
- For a two-module read (`insight`), both modules must pass and the stricter field level applies (FR-011).
