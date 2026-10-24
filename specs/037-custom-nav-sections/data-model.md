# Data model: `app_nav_config` (Amendment A symlink model + Amendment B ids and page roles)

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

Page view rules are NOT in this table: they are `permission_rules` rows `(org_id, role_key, module = 'page:<id>' | 'page:<pattern>' | 'section:<id>', can_view, …)` — the existing overrides table, written by `setRoleOverride` / `clearRoleOverride` through `POST/DELETE /api/roles/overrides`.

## Document shape (`value`)

```ts
// src/lib/nav/custom-sections.ts
export type NavPageKind = 'link' | 'main';
export interface NavPage {
  id: string;          // ^[a-z0-9]{6}$ — part of the URL (`/<section>/<slug>~<id>`); page-role key `page:${id}`
  kind: NavPageKind;   // 'link' = alias of target; 'main' = the target's canonical location moved here
  slug: string;        // ^[a-z][a-z0-9-]{0,31}$ ; cosmetic (the resolver matches the id)
  label: string;       // 1..40 chars, user data (not translated)
  icon?: string;       // one emoji (one grapheme) or a key of PLUGIN_ICON_MAP; absent = default
  target: string;      // static (app) screen pattern from SCREEN_DESIGN_MANIFEST, e.g. '/pos/sell'; maps the PREFIX
  hidden?: true;       // org-wide nav hide (I10); absent = shown
}
export interface NavSection {
  id: string;          // ^[a-z0-9]{6}$ ; page-role key `section:${id}`
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
  /** Instances pasted/duplicated INTO a built-in module's nav (`/pos/sell~k3x9q2`), keyed by module segment. */
  builtinSections: Record<string, NavPage[]>;
  builtin: Record<string, BuiltinOverride>; // keyed by target pattern
}
export const EMPTY_NAV_CONFIG: NavConfig = { version: 1, sections: [], builtinSections: {}, builtin: {} };
```

An absent row, `{}`, or a document missing `builtin`/`builtinSections` reads as `normalizeNavConfig` → empty maps and `kind: 'link'` defaulted (I7).

## Validation rules (`validateNavConfig(config, ctx): NavConfigIssue[]`)

| Rule | Code | Message target |
|---|---|---|
| ≤ 20 sections; ≤ 30 pages per section | `limit` | section / page |
| slug grammar `^[a-z][a-z0-9-]{0,31}$` | `slug.format` | field |
| section slug ∉ `reservedSectionSlugs()` | `slug.reserved` | field |
| section slugs unique (org) | `slug.duplicate` | field |
| ids `^[a-z0-9]{6}$`, unique across sections, pages and `builtinSections` | `id.invalid` | field |
| `builtinSections` keys ∈ first segments of `MODULE_MANIFEST` app prefixes / static sections (`pos`, `crm`, …) | `section.unknown` | key |
| label 1..40 chars after trim (also `builtin[*].label`) | `label.length` | field |
| icon: emoji (one grapheme, `\p{Extended_Pictographic}`) or `PLUGIN_ICON_MAP` key | `icon.unknown` | field |
| target ∈ `aliasableTargets()` (static `(app)` screens; also every `builtin` key) | `target.invalid` | field |
| at most ONE `kind: 'main'` entry per target across the document | `main.duplicate` | second entry's `kind` |
| `kind` ∈ `{'link','main'}` | `kind.invalid` | field |

`role.unknown` (v1) is removed — roles are no longer in the document. Read-time validation (layout + "Not shown ›" submenu) runs the same function and reports `slug.reserved` / `target.invalid` as warnings; the nav builders drop offending entries instead of rendering dead links.

## Derived values (pure, `src/lib/nav/custom-sections.ts`)

- `instancePath(sectionSlug, page) = '/' + sectionSlug + '/' + page.slug + '~' + page.id` (section slug = custom section slug or built-in module segment)
- `newId()` = 6 base36 chars from `crypto.randomUUID()` (first 6 of the hex, re-encoded); callers re-roll on collision within the document
- `resolveNavInstance(config, canonicalPath): { sectionSlug, sectionId: string | null, page, prefix, target, rest, slugStale: boolean } | null` — the second segment must contain `~`; the id after the last `~` is looked up across `sections[].pages` and `builtinSections[*]`; the first segment must equal that instance's section slug / module segment; `prefix` = the two matched segments as requested; `rest` = remainder incl. leading `/` or `''`; `slugStale` = the slug part differs from the stored slug (D8).
- `canonicalInstancePath(config, canonicalPath): string | null` — when `slugStale`, the same path with the stored slug (shell client-replaces).
- `movedTargets(config): Map<target, mainPath>` — every `kind: 'main'` entry (hidden or not).
- `mainPathFor(config, canonicalPath): string | null` — if the path starts with a moved target (whole segments), the same path under the main; else `null`. Used by I9 (client-replace) only.
- `pageViewKey(page) = 'page:' + page.id`; `sectionViewKey(section) = 'section:' + section.id`; `builtinPageKey(pattern) = 'page:' + pattern`; `navPageKeys(config): { key, sectionKey: string | null, target }[]` (every custom instance, hidden included).
- `DATASET_ENFORCED: readonly Module[]` lives in `src/lib/permissions.ts` (shared with spec 039; `[]` until 039 S2 adds `'pos'`). `floorApplies(target)` = `moduleOf(target) ∉ DATASET_ENFORCED`.
- `moduleViewFloor(target): string | null` — among `ROUTE_ACCESS_RULES` prefix rules matching `target` whose `policyId` is `permission:<module>:view` with no dot in `<module>`, the longest pattern's permission string (`'pos:view'`); `null` when none.
- `instanceAllowed(page, permissions: ReadonlySet<string>): boolean` = `permissions.has(pageViewKey(page) + ':view') && (!floorApplies(page.target) || !moduleViewFloor(page.target) || permissions.has(moduleViewFloor(page.target)))`.
- `visibleNavConfig(config, permissions: ReadonlySet<string>, canManage: boolean): NavConfig` — keeps instances (links AND moved mains) with `permissions.has('page:<id>:view')`, drops `hidden` entries/sections unless `canManage` (I8). `builtin` ships to everyone unchanged: built-in items are code on the client, so the client needs `builtin[target].hidden` to hide them and `builtin[target].label` to relabel them.
- `reservedSectionSlugs()`, `aliasableTargets()` — unchanged (v1 R5).
- `customSections(config)`, `customModules(config)`, `navPath()` — `src/lib/nav/custom-sections-nav.ts` (v1 R6) plus: skip `hidden`; moved-main items carry the target's native icon when `icon` is absent.

### Operation functions (pure, same file; each returns a NEW config, never mutates)

| Function | Transition |
|---|---|
| `slugify(label)` | `label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32)` or `'page'` when empty (never emits `~`) |
| `addLink(config, dest: { sectionId } \| { module }, { target, label, icon? })` | appends `{ id: newId(), kind:'link', slug: slugify(label), label, icon, target }` to `sections[dest].pages` or `builtinSections[module]` |
| `duplicatePage(config, ref: { pageId } \| { target, module })` | appends a link copy with `newId()` next to the source (custom section page, built-in-section instance, or a built-in main → `builtinSections[module]`) |
| `moveBuiltin(config, target, destSectionId, label)` | removes any `main` for `target`, appends `{ id: newId(), kind:'main', slug: slugify(label), label, target }` |
| `movePage(config, pageId, dest)` | relocates the entry (id and slug kept) between custom sections / `builtinSections` |
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
  "sections": [ { "id": "st4ff1", "slug": "staff", "label": "Staff", "icon": "🧑‍⚕️",
    "pages": [
      { "id": "k3x9q2", "kind": "link", "slug": "sell", "label": "Sell", "target": "/pos/sell" },
      { "id": "a1b2c3", "kind": "main", "slug": "appointments", "label": "Appointments", "target": "/pos/appointments" } ] } ],
  "builtinSections": {} }
```
(fixed ids: seeds must be deterministic — `matrixUuid` is kept for the registry key only) plus one `permission_rules` row `{ org_id: ORG_BUSINESS, role_key: 'viewer', module: 'page:k3x9q2', can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, can_manage: false }` (so the viewer persona proves the 404 path even though the link's default rule — `/pos/sell` → `pos:create` — already denies a viewer; the explicit row proves the override path).

`matrix.ts` entries: `tenancy.nav.staff-section` (table `app_nav_config`, where `org_id`) and `tenancy.nav.staff-sell-viewer-rule` (table `permission_rules`, where `{ org_id, role_key: 'viewer', module: 'page:k3x9q2' }`). `seed.contract.test.ts` asserts: `sections[0].slug === 'staff'`, kinds `['link','main']`, targets `['/pos/sell','/pos/appointments']`, and the rule row `can_view === false`.
