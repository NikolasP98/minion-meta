# Data model: `app_nav_config`

## Table (migration `supabase/migrations/20261024000000_app_nav_config.sql`)

```sql
-- Per-organization custom navigation (spec 037): sections with alias pages and
-- role grants. One jsonb document per org, mirrors app_table_config.
create table if not exists public.app_nav_config (
  org_id text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
grant select, insert, update, delete on public.app_nav_config to app_ledger;
--> statement-breakpoint
alter table public.app_nav_config enable row level security;
--> statement-breakpoint
alter table public.app_nav_config force row level security;
--> statement-breakpoint
drop policy if exists app_nav_config_org_guc on public.app_nav_config;
--> statement-breakpoint
create policy app_nav_config_org_guc on public.app_nav_config
  for all using (org_id = current_setting('app.current_org_id', true))
          with check (org_id = current_setting('app.current_org_id', true));
```

Drizzle mirror `src/server/db/pg-schema/nav-config.ts` (copy of `table-config.ts` with table name `app_nav_config`, export `appNavConfig`). No relation entries needed.

## Document shape (`value`)

```ts
// src/lib/nav/custom-sections.ts
export interface NavPage {
  id: string;        // uuid v4, stable across renames (nav-order preference key)
  slug: string;      // ^[a-z][a-z0-9-]{0,31}$ ; unique within the section
  label: string;     // 1..40 chars, user data (not translated)
  icon?: string;     // one emoji (≤ 2 code points) or a key of PLUGIN_ICON_MAP; absent = default
  target: string;    // static (app) screen pattern from SCREEN_DESIGN_MANIFEST, e.g. '/pos/sell'
  roles: string[];   // role keys; [] = every member of the org; narrows the section's grant
}
export interface NavSection {
  id: string;        // uuid v4
  slug: string;      // ^[a-z][a-z0-9-]{0,31}$ ; unique within the org; not in reservedSectionSlugs()
  label: string;     // 1..40 chars
  icon?: string;     // as above
  roles: string[];   // [] = every member
  pages: NavPage[];  // ≤ 30, ordered = display order
}
export interface NavConfig {
  version: 1;
  sections: NavSection[]; // ≤ 20, ordered = display order
}
export const EMPTY_NAV_CONFIG: NavConfig = { version: 1, sections: [] };
```

An absent row or `{}` reads as `EMPTY_NAV_CONFIG` (I7).

## Validation rules (`validateNavConfig(config, ctx): NavConfigIssue[]`)

| Rule | Code | Message target |
|---|---|---|
| ≤ 20 sections; ≤ 30 pages per section | `limit` | section / page |
| slug grammar `^[a-z][a-z0-9-]{0,31}$` | `slug.format` | field |
| section slug ∉ `reservedSectionSlugs()` | `slug.reserved` | field |
| section slugs unique (org); page slugs unique (section) | `slug.duplicate` | field |
| label 1..40 chars after trim | `label.length` | field |
| icon: emoji (`/^\p{Extended_Pictographic}/u`, ≤ 2 code points) or `PLUGIN_ICON_MAP` key | `icon.unknown` | field |
| target ∈ `aliasableTargets()` (static `(app)` screens: `SCREEN_DESIGN_MANIFEST` patterns without `[`, excluding `PUBLIC_ROUTE_PATTERNS` and anything outside the app shell: `/login*`, `/auth/*`, `/book/*`, `/invite/*`, `/join`, `/onboarding*`, `/artifacts/*`, `/link/*`) | `target.invalid` | field |
| roles ⊆ `ctx.roleKeys` (catalog) — write-time only | `role.unknown` | field |
| ids are uuids; unique across the document | `id.invalid` | field |

Read-time validation (layout + settings page) runs the same function with `ctx.roleKeys = undefined` (skip role check) and reports `slug.reserved` / `target.invalid` as warnings; `customSections()` drops offending sections/pages instead of rendering dead links.

## Derived values (pure, `src/lib/nav/custom-sections.ts`)

- `aliasPath(section, page) = '/' + section.slug + '/' + page.slug`
- `resolveNavAlias(config, canonicalPath): { section, page, target } | null` — exact match on `/<slug>/<slug>` (trailing slash tolerated, query/hash already stripped by callers).
- `aliasGranted(alias, roles: readonly string[], platformRole?: 'user' | 'admin'): boolean` — `platformRole === 'admin'` or `roles.includes('owner')` ⇒ true; else `(section.roles.length === 0 || ∩) && (page.roles.length === 0 || ∩)`.
- `visibleNavConfig(config, roles, platformRole): NavConfig` — keeps granted sections/pages, strips `roles` to `[]` (I8).
- `reservedSectionSlugs(): ReadonlySet<string>` — see research R5.
- `aliasableTargets(): { pattern: string; title: string }[]` — from `SCREEN_DESIGN_MANIFEST` (title via `meta.title()`).
- `customSections(config): Section[]`, `customModules(config): ModuleDef[]` — research R6 (live in `src/lib/nav/custom-sections-nav.ts` because they import lucide icons / nav types; keep `custom-sections.ts` dependency-free).
- `navPath(): string` (in `src/lib/nav/custom-sections-nav.ts`, Svelte-runtime aware: reads `page.url.pathname` and `page.data.navConfig`) = alias target when the current path is an alias, else the canonical path.

## Seed (QA stack)

`scripts/qa/seed/tenancy.ts`: upsert `app_nav_config` for `ORG_BUSINESS` with
```json
{ "version": 1, "sections": [ { "id": "<matrixUuid('tenancy.nav.staff-section')>", "slug": "staff", "label": "Staff", "icon": "🧑‍⚕️", "roles": ["staff"],
  "pages": [
    { "id": "<matrixUuid('tenancy.nav.staff-sell')>", "slug": "sell", "label": "Sell", "target": "/pos/sell", "roles": [] },
    { "id": "<matrixUuid('tenancy.nav.staff-appointments')>", "slug": "appointments", "label": "Appointments", "target": "/pos/appointments", "roles": [] } ] } ] }
```
`matrix.ts` entry: `{ id: 'tenancy.nav.staff-section', domain: 'tenancy', why: 'a custom "Staff" section granting only the staff role, with two POS alias pages, so /staff/sell renders for the staff persona and 404s for the viewer persona' }`; `register('tenancy.nav.staff-section', { table: 'app_nav_config', where: { org_id: ORG_BUSINESS } })`.
