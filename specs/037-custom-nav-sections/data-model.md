# Data model: `app_nav_config` (Amendment A — symlink model)

## Table (migration `supabase/migrations/20261024000000_app_nav_config.sql`) — unchanged from v1 (exists in the S1 worktree)

```sql
-- Per-organization custom navigation (spec 037): sections with link / moved-main
-- entries and built-in overrides. One jsonb document per org, mirrors app_table_config.
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

Drizzle mirror `src/server/db/pg-schema/nav-config.ts` (exists in the worktree). No relation entries.

Link view rules are NOT in this table: they are `permission_rules` rows `(org_id, role_key, module = 'nav.<pageId>', can_view, …)` — the existing overrides table, written by `setRoleOverride` / `clearRoleOverride` through `POST/DELETE /api/roles/overrides`.

## Document shape (`value`)

```ts
// src/lib/nav/custom-sections.ts
export type NavPageKind = 'link' | 'main';
export interface NavPage {
  id: string;          // uuid v4, stable across renames; the link's permission key is `nav.${id}`
  kind: NavPageKind;   // 'link' = alias of target; 'main' = the target's canonical location moved here
  slug: string;        // ^[a-z][a-z0-9-]{0,31}$ ; unique within the section
  label: string;       // 1..40 chars, user data (not translated)
  icon?: string;       // one emoji (one grapheme) or a key of PLUGIN_ICON_MAP; absent = default
  target: string;      // static (app) screen pattern from SCREEN_DESIGN_MANIFEST, e.g. '/pos/sell'; maps the PREFIX
  hidden?: true;       // org-wide nav hide (I10); absent = shown
}
export interface NavSection {
  id: string;          // uuid v4
  slug: string;        // ^[a-z][a-z0-9-]{0,31}$ ; unique within the org; not in reservedSectionSlugs()
  label: string;       // 1..40 chars
  icon?: string;
  hidden?: true;
  pages: NavPage[];    // ≤ 30, ordered = display order
}
/** Overrides for built-in pages that stay in their native nav (Rename label / Hide). */
export interface BuiltinOverride { label?: string; hidden?: true }
export interface NavConfig {
  version: 1;          // no stored rows exist before S1 merges, so the amended shape keeps version 1
  sections: NavSection[];                   // ≤ 20, ordered = display order
  builtin: Record<string, BuiltinOverride>; // keyed by target pattern
}
export const EMPTY_NAV_CONFIG: NavConfig = { version: 1, sections: [], builtin: {} };
```

An absent row, `{}`, or a v1-shaped document without `builtin` reads as `normalizeNavConfig` → `builtin: {}` and `kind: 'link'` defaulted (I7).

## Validation rules (`validateNavConfig(config, ctx): NavConfigIssue[]`)

| Rule | Code | Message target |
|---|---|---|
| ≤ 20 sections; ≤ 30 pages per section | `limit` | section / page |
| slug grammar `^[a-z][a-z0-9-]{0,31}$` | `slug.format` | field |
| section slug ∉ `reservedSectionSlugs()` | `slug.reserved` | field |
| section slugs unique (org); page slugs unique (section) | `slug.duplicate` | field |
| label 1..40 chars after trim (also `builtin[*].label`) | `label.length` | field |
| icon: emoji (one grapheme, `\p{Extended_Pictographic}`) or `PLUGIN_ICON_MAP` key | `icon.unknown` | field |
| target ∈ `aliasableTargets()` (static `(app)` screens; also every `builtin` key) | `target.invalid` | field |
| at most ONE `kind: 'main'` entry per target across the document | `main.duplicate` | second entry's `kind` |
| `kind` ∈ `{'link','main'}` | `kind.invalid` | field |
| ids are uuids; unique across the document | `id.invalid` | field |

`role.unknown` (v1) is removed — roles are no longer in the document. Read-time validation (layout + "Not shown ›" submenu) runs the same function and reports `slug.reserved` / `target.invalid` as warnings; the nav builders drop offending entries instead of rendering dead links.

## Derived values (pure, `src/lib/nav/custom-sections.ts`)

- `entryPath(section, page) = '/' + section.slug + '/' + page.slug`
- `resolveNavPrefix(config, canonicalPath): { section, page, prefix, target, rest } | null` — `prefix` = `/<section>/<page>` matched on whole segments (`/staff/sell` and `/staff/sell/…`, never `/staff/sell-x`); `rest` = the remainder including its leading `/` (or `''`); `target + rest` is the rewritten path.
- `movedTargets(config): Map<target, mainPath>` — every `kind: 'main'` entry (hidden or not).
- `mainPathFor(config, canonicalPath): string | null` — if the path starts with a moved target (whole segments), the same path under the main; else `null`. Used by I9 (client-replace) only.
- `linkViewKey(page) = 'nav.' + page.id`; `navLinkKeys(config): { key, label: '<Section> › <Page>', target }[]` (links only, hidden included).
- `moduleViewFloor(target): string | null` — among `ROUTE_ACCESS_RULES` prefix rules matching `target` whose `policyId` is `permission:<module>:view` with no dot in `<module>`, the longest pattern's permission string (`'pos:view'`); `null` when none.
- `linkAllowed(page, permissions: ReadonlySet<string>, target = page.target): boolean` = `permissions.has(linkViewKey(page) + ':view') && (floor ? permissions.has(floor) : canAccessRoute(target, ctx))`.
- `visibleNavConfig(config, permissions: ReadonlySet<string>, canManage: boolean): NavConfig` — keeps links with `permissions.has('nav.<id>:view')`, keeps every main (the client gates mains through `canViewPath(target)`), drops `hidden` entries/sections unless `canManage` (I8). `builtin` ships to everyone unchanged: built-in items are code on the client, so the client needs `builtin[target].hidden` to hide them and `builtin[target].label` to relabel them.
- `reservedSectionSlugs()`, `aliasableTargets()` — unchanged (v1 R5).
- `customSections(config)`, `customModules(config)`, `navPath()` — `src/lib/nav/custom-sections-nav.ts` (v1 R6) plus: skip `hidden`; moved-main items carry the target's native icon when `icon` is absent.

### Operation functions (pure, same file; each returns a NEW config, never mutates)

| Function | Transition |
|---|---|
| `slugify(label)` | `label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32)` or `'page'` when empty |
| `uniqueSlug(section, base)` | `base`, `base-2`, `base-3`, … first not taken in `section.pages` |
| `addLink(config, sectionId, { target, label, icon? })` | appends `{ id: uuid, kind:'link', slug: uniqueSlug(section, slugify(label)), label, icon, target }` |
| `duplicatePage(config, sectionId, pageId)` | appends a copy with a new id and `uniqueSlug(section, page.slug)` (custom sections only) |
| `moveBuiltin(config, target, destSectionId, label)` | removes any `main` for `target`, appends `{ kind:'main', slug: uniqueSlug(dest, slugify(label)), label, target }` |
| `movePage(config, pageId, destSectionId)` | relocates the entry; slug kept, or `uniqueSlug(dest, slug)` when taken (caller shows the resulting slug) |
| `renamePage(config, pageId, { label?, slug? })` / `renameBuiltin(config, target, label)` / `renameSection(config, sectionId, { label?, slug? })` | field updates; a `null` builtin label deletes the override |
| `removePage(config, pageId)` | drops the entry (link = delete; main = restore) |
| `setHidden(config, ref: { pageId } \| { target } \| { sectionId }, hidden)` | sets/clears `hidden` on the entry, `builtin[target]`, or the section (removes empty `builtin[target]` objects) |
| `addSection(config, { label, slug })` / `removeSection(config, sectionId)` | append `{ id, slug, label, pages: [] }` / drop the section with its entries |

Every function is followed by `validateNavConfig` on the client before `PUT`; the server validates again.

## Seed (QA stack) — `scripts/qa/seed/tenancy.ts`

Upsert `app_nav_config` for `ORG_BUSINESS` with
```json
{ "version": 1,
  "builtin": {},
  "sections": [ { "id": "<matrixUuid('tenancy.nav.staff-section')>", "slug": "staff", "label": "Staff", "icon": "🧑‍⚕️",
    "pages": [
      { "id": "<matrixUuid('tenancy.nav.staff-sell')>", "kind": "link", "slug": "sell", "label": "Sell", "target": "/pos/sell" },
      { "id": "<matrixUuid('tenancy.nav.staff-appointments')>", "kind": "main", "slug": "appointments", "label": "Appointments", "target": "/pos/appointments" } ] } ] }
```
plus one `permission_rules` row `{ org_id: ORG_BUSINESS, role_key: 'viewer', module: 'nav.<matrixUuid('tenancy.nav.staff-sell')>', can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, can_manage: false }` (so the viewer persona proves the 404 path even though the link's default rule — `/pos/sell` → `pos:create` — already denies a viewer; the explicit row proves the override path).

`matrix.ts` entries: `tenancy.nav.staff-section` (table `app_nav_config`, where `org_id`) and `tenancy.nav.staff-sell-viewer-rule` (table `permission_rules`, where `{ org_id, role_key: 'viewer', module: 'nav.<uuid>' }`). `seed.contract.test.ts` asserts: `sections[0].slug === 'staff'`, kinds `['link','main']`, targets `['/pos/sell','/pos/appointments']`, and the rule row `can_view === false`.
