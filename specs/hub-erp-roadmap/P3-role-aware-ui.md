# P3 — Role-aware UI + custom roles + multi-role

**Repo:** minion_hub (`dev`). Svelte 5 runes only; every new user-facing string = paraglide key in BOTH `en` and `es`, then `bun run i18n:compile`.
**Goal:** the UI reflects what the user's role permits — no 403-after-click; admins can create custom roles and assign multiple roles.

## Context (verified in audit)
- Server enforcement is complete (layout view-gate, hooks write-gate, ownerFilter, masking). This phase is presentation truth, not security — the server remains the enforcement point.
- Permissions already reach the client: layout resolves capabilities → `capsToLegacyPermissions` → `page.data.permissions`; `canClient(...)` filters nav (Sidebar.svelte:42–56, sections.ts).
- RBAC engine: `src/server/services/rbac.service.ts` — modules×actions (view/create/edit/delete/export/manage), 5 system roles in `permission_roles` catalog, org overrides in `permission_rules`, multi-role via `member_roles` (backend supports; UI shows primary only).
- Roles admin UI: `/settings/roles` (+page.server.ts + `RbacRolesSection.svelte`) — per-module ladder None/View/Edit/Full/Custom, if_owner + field_level toggles.

## W1 — action-aware client gate + button sweep

1. **Recon first:** read `capsToLegacyPermissions` and `canClient`. If the legacy strings only carry `module:view`, extend the SAME pipe to also emit `module:create|edit|delete|export|manage` pairs (server-side, one function) — do not build a second permission transport. Then add a tiny client helper `canAct(module, action)` beside `canClient` that consults those strings.
2. **Sweep** (hide vs disable policy: `delete`/`manage` affordances are HIDDEN; `create`/`edit`/`export` affordances render DISABLED with a tooltip `m.no_permission()` — "You don't have permission for this" / "No tienes permiso para esto"):
   - CRM: contact detail edit/delete (`(app)/crm/[contactId]/+page.svelte` ~lines 258–260), list-page bulk actions, EditableGrid cell editing (pass a `readonly` prop when `!canAct('crm','edit')`), CSV/XLSX export buttons → `export`.
   - Sales: order status-change controls → `sales,edit`.
   - Support: issue status/assign/comment composer → `support,edit`; create button → `support,create`.
   - Projects/work: task create/assign/status → `projects,*`.
   - Finances: product edit/deactivate, source config, manual sync trigger → `finance,edit` (sync trigger: `finance,manage` if that's what the API gate uses — match `apiWriteCapability`'s mapping exactly; read it, don't guess).
   - Scheduling: booking create/cancel/reschedule, event-type/resource editors → `scheduling,*`.
   Rule: for every button you gate, find the API call it triggers and mirror the exact (module, action) that `apiWriteCapability` (hooks.server.ts) enforces for that path — the client gate and server gate must read the same matrix.
3. EditableGrid: single `readonly` prop threaded from callers — do not fork the component.
4. Tests: component-level tests are NOT required for the sweep (it's presentation); add one vitest for the extended `capsToLegacyPermissions` mapping.

## W2 — custom roles (duplicate-as-custom)

1. Recon: `permission_roles` catalog shape (key, name, rank, is_system?), how `resolveCapabilities` treats unknown role keys (audit says the engine resolves arbitrary keys — verify).
2. API: `POST /api/roles` (gate: `users,manage` via `requireOrgCapability`) — body `{sourceRoleKey, name}` → insert catalog row `key: 'custom-<slug>'`, rank = source rank, `is_system:false`, org-scoped if the catalog is org-scoped (verify — if the catalog is global, add org_id via a migration-free approach ONLY if a column already exists; if a migration would be needed, STOP and report back to orchestrator instead of migrating).
3. Copy the source role's effective permission matrix into `permission_rules` overrides for the new role (so it starts as a clone, then the existing per-module ladder UI edits it).
4. UI: "Duplicate as custom role" kebab item per role card in `RbacRolesSection.svelte` + name dialog; custom roles get a badge and a delete action (delete blocked while any `member_roles` row references it — check server-side, disable client-side with count).
5. `DELETE /api/roles/[key]` with the same gate + in-use guard.

## W3 — multi-role assignment UI

1. Recon: `member_roles` schema + `setMemberRole` in rbac.service (currently single-role set? verify) and `/api/users/[id]/member-role`.
2. Extend to add/remove individual role rows (`addMemberRole`/`removeMemberRole` service fns if missing; keep `setMemberRole` for backward compat).
3. UI: member row in `/settings/team` (or wherever `RbacRolesSection`/members list lives — find it) shows ALL roles as chips with a multi-select popover (Zag.js is already the headless-UI lib — reuse an existing multiselect pattern from the codebase if one exists; otherwise simplest checkbox list). Guard: cannot remove the last owner's owner role (server-side check + disabled chip).
4. Capabilities already resolve as MAX across roles (verified) — no engine change.

## Sequencing
W1, W2, W3 are file-disjoint enough to run as 3 parallel agents (W1 = components/pages + one server fn; W2 = roles API/UI; W3 = member UI + service). If W2's catalog turns out to need a migration, that agent reports back instead of proceeding.
Verify: `bun run check`, `bun run test`, `bun run i18n:compile` (commit includes generated paraglide output per repo convention — check how previous i18n commits handled generated files and match).
