# Workforce ↔ Gateway Org Bridge — Design

**Date:** 2026-06-14
**Status:** Design — pending approval
**Scope:** `minion_hub` + one Supabase migration. Paperclip server unchanged. The 525-commit upstream paperclip merge is explicitly **out of scope** (deferred to a dedicated effort).

## Problem

`/workforce` (the Paperclip "Kanban" plugin) shows *"No company is currently selected"* even when the FACES SCULPTORS org is active in the hub. The hub has **two independent, unbridged tenancy systems**:

| | Hub org (e.g. FACES SCULPTORS) | Workforce / Paperclip company |
|---|---|---|
| Source of truth | Supabase `organizations` | `workspace_membership` table |
| Selection writes | `active_org` cookie (`/api/active-org`) | `pc_company_id` cookie (`/api/workspaces/select`) |
| Read into | `resolveSupabaseTenant` → `locals.tenantCtx.tenantId` | `paperclipIdentityHandle` → `locals.paperclipIdentity.companyId` |

`workforce/+page.server.ts:9` redirects to `/workforce/welcome` whenever `paperclipIdentity.companyId` is null. Selecting the org sets `active_org` but **nothing maps that org to a Paperclip company**, and no `workspace_membership` row exists, so `pc_company_id` stays empty → welcome screen.

## Goals

1. Picking an org in the hub immediately scopes `/workforce` to that org's Paperclip company.
2. Each gw org gets its **own** Paperclip company, provisioned automatically when the workforce plugin is enabled.
3. Make the gw org the single source of truth for workforce tenancy (retire the parallel `pc_company_id` / `workspace_membership` path for the active-org flow).

Non-goal (this spec): deep alignment of agent/user/customer shapes between gw and paperclip — that rides on the upstream merge and is tracked separately.

## Approach (chosen)

- **Mapping:** add a nullable `paperclip_company_id` column to the Supabase `organizations` table. One company per org.
- **Provisioning:** lazy, on first `/workforce` load. If the active org has no `paperclip_company_id` and the workforce plugin is enabled, create a Paperclip company named after the org and persist the id on the org row.
- **Resolution:** `paperclipIdentity.companyId` is derived from the **active org's** `paperclip_company_id`, not the `pc_company_id` cookie.

## Components

### A. Schema migration + backfill
`supabase/migrations/<ts>_org_paperclip_company.sql` (meta-repo root, alongside the CRM migration):
```sql
alter table organizations add column if not exists paperclip_company_id text;
create unique index if not exists organizations_paperclip_company_id_key
  on organizations (paperclip_company_id) where paperclip_company_id is not null;

-- Backfill: existing gw orgs already have paperclip companies on netcup
-- (verified 2026-06-14 via companies.list()). Pure backfill — no creation,
-- which also sidesteps the instance-admin create requirement for these orgs.
update organizations set paperclip_company_id = 'fea398fc-ca7f-4dc8-be3f-38b8725a51db'
  where id = '21e0601b-f632-43fd-8414-d644af4271f4' and paperclip_company_id is null; -- FACES SCULPTORS
update organizations set paperclip_company_id = 'a32be1cc-88e9-4207-a4da-cf818e3c91e9'
  where id = 'c9e8dc46-27b6-4aea-86a1-a2eb6b23be2d' and paperclip_company_id is null; -- MINION
-- Pinonite corp. (paperclip 3e721e98-…) has no matching gw org → left unmapped.
```
Unique-partial so two orgs can't share a company; nulls allowed (unprovisioned orgs).
FACES's existing paperclip company keeps its current agents as-is (out of scope — handled later).

### B. Server helper — `minion_hub/src/lib/server/paperclip-company.ts`
Single-purpose module bridging org → company:
- `getOrgCompanyId(orgId: string): Promise<string | null>` — read `organizations.paperclip_company_id` via `supabaseAdmin()`.
- `provisionOrgCompany(event, orgId, orgName): Promise<string>` — idempotent:
  1. Re-read mapping; if set, return it (handles races).
  2. `client.companies.create({ name: orgName })` via `paperclipServerClient(event)`.
  3. Conditional persist: `update organizations set paperclip_company_id = :id where id = :orgId and paperclip_company_id is null` (returning). If 0 rows (a concurrent request won), re-read the winner and best-effort `companies.archive()` the duplicate we just made, return the winner.

### C. Hook change — `paperclipIdentityHandle` (`hooks.server.ts`)
Derive `companyId` from the active org instead of the cookie, but only for paths that need it (avoid a Supabase read on every request):
```
const needsCompany = path.startsWith('/workforce') || path.startsWith('/api/pc');
const orgId = event.locals.tenantCtx?.tenantId ?? null;
const companyId = needsCompany && orgId ? await getOrgCompanyId(orgId) : null;
```
Token minting (board-key / JWT) is unchanged. The hook does **not** provision (read-only).

### D. Workforce gate — NEW `(app)/workforce/+layout.server.ts`
Single entry gate for the whole subtree:
- No user → `/login`. No active org → `/workforce/welcome`.
- `companyId` already resolved by hook → continue, return `{ companyId }`.
- Else if workforce plugin enabled → `provisionOrgCompany(...)`, then mutate `event.locals.paperclipIdentity.companyId` so child `+page.server.ts` loads (which read `locals.paperclipIdentity.companyId`) see it in the same request. Return `{ companyId }`.
- Provisioning throws (e.g. 403 board key not instance-admin) → `/workforce/welcome` with a reason flag.

The now-redundant null-check redirect in `workforce/+page.server.ts` is removed; the layout is the single gate.

### E. Welcome page copy (`workforce/welcome/+page.svelte`)
Update to reflect reality: distinguish "no organization selected" vs "workforce not enabled for this org" vs "couldn't reach Paperclip / provisioning failed (contact admin)". Reads a reason from the layout load.

### F. Deprecate the parallel path
`/api/workspaces/select` + `pc_company_id` cookie + `workspace_membership` reads are no longer the active-org carrier. Leave the table/endpoint in place for now (no destructive drop), but stop depending on the cookie. A follow-up can remove them once verified.

## Deployment prerequisite (important)

Paperclip's `POST /api/companies` requires the actor to be `local_implicit` **or** `isInstanceAdmin` (`server/src/routes/companies.ts:268-271`). The hub authenticates with a board key (`pcli_`), whose `isInstanceAdmin` comes from `resolveBoardAccess(boardKey.userId)` (`middleware/auth.ts:108`). **Therefore the netcup hub's `HUB_PAPERCLIP_BOARD_KEY` must belong to an instance-admin board user**, or provisioning 403s. Provisioning catches this and routes to the welcome page with an admin-action message rather than erroring.

## Data flow (after)

```
OrgPicker → /api/active-org (active_org cookie)
  → resolveSupabaseTenant → tenantCtx.tenantId = orgId
  → paperclipIdentityHandle: companyId = organizations[orgId].paperclip_company_id
  → /workforce/+layout.server: if null & plugin enabled → provision → persist on org row
  → child loads use locals.paperclipIdentity.companyId → Paperclip scoped to the org's company
```

## Testing

- `paperclip-company.test.ts`: `getOrgCompanyId` hit/miss; `provisionOrgCompany` happy path, idempotent re-read, race (0-row update → archive + return winner). Mock `supabaseAdmin` + paperclip client.
- Hook: companyId derived from org mapping; null when no org / non-workforce path.
- Layout gate: provision-on-first-load; welcome on disabled/no-org/403.
- Existing `paperclip-proxy.test.ts` stays green.
- Manual: with FACES active, visit `/workforce` → company auto-created, dashboard loads; switch org → workforce reflects the other org's company.

## Risks

- **Board key not instance-admin on prod** → provisioning 403. Mitigated by graceful welcome fallback; documented as prereq.
- **Per-request Supabase read** in hook → scoped to `/workforce` + `/api/pc` paths only.
- **Orphan company** on race → mitigated by conditional update + best-effort archive.
- **Duplicate company on rollout** — RESOLVED for current orgs: FACES + MINION companies already exist on netcup and are backfilled in the migration (§A), so lazy provision never fires for them. Lazy provision only applies to future orgs with no mapping.
