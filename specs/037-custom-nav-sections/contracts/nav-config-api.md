# Contracts: nav config API, reroute, and layout data

## `GET /api/nav/config`
- Auth: `requireOrgCapability(locals, 'settings', 'manage')` + `getCoreCtx` (401 without tenant).
- Response 200: the full `NavConfig` (roles included) as stored (`EMPTY_NAV_CONFIG` when no row).

## `PUT /api/nav/config`
- Auth: as GET. Central guard: `/api/nav` ∈ `API_WRITE_PREFIXES` → `settings:manage` (`apiWriteCapability`).
- Body: `NavConfig` (whole document; zod schema `navConfigSchema` in `src/lib/nav/nav-config-schema.ts`, structural checks only). Server then runs `validateNavConfig(body, { reserved: reservedSectionSlugs(), targets: aliasableTargets(), roleKeys: (await listRoleCatalog(orgId)).map(r => r.key) })`.
- 400 `{ error: 'invalid_nav_config', issues: NavConfigIssue[] }` where `NavConfigIssue = { code, path: string[], message }` (`path` like `['sections', 0, 'slug']` serialised as strings).
- 200: the stored document. Side effects: `invalidateTags(tags.tenantDomain(orgId, 'settings'))`.
- Not idempotent-by-id: the client sends the whole document; ids are generated client-side (`crypto.randomUUID()`) and preserved.

## `GET /api/nav/resolve?path=/staff/sell`
- Auth: `requireAuth` + `getCoreCtx` (401 otherwise). Any member.
- Logic: `canonical = canonicalPath(path)`; `alias = resolveNavAlias(await readNavConfig(ctx), canonical)`; `granted = alias && aliasGranted(alias, permissions.roles, user.role)` (roles via `loadPermissionsForUser(locals, user.id)`, cached).
- 200 `{ target: '/pos/sell' }` when granted; 404 `{ error: 'not_found' }` otherwise (also when `path` is missing/malformed or not root-relative).
- Cache headers: `cache-control: private, no-store` (grants change).

## Universal reroute (`src/hooks.ts`)
```ts
import type { Reroute } from '@sveltejs/kit';
import { i18n } from '$lib/i18n';
import { resolveAliasPath } from '$lib/nav/alias-reroute';
const localeReroute = i18n.reroute();
export const reroute: Reroute = async ({ url, fetch }) => {
  const stripped = localeReroute({ url }) ?? url.pathname;
  return (await resolveAliasPath(stripped, fetch)) ?? stripped;
};
```
`resolveAliasPath(pathname, fetch): Promise<string | undefined>` (`src/lib/nav/alias-reroute.ts`):
1. `const [, first] = pathname.split('/')`; if `!first` or `KNOWN_TOP_LEVEL_SEGMENTS.has(first)` or `/\.[a-z0-9]+$/i.test(pathname)` → `undefined`.
2. Depth must be exactly 2 segments (`/<section>/<page>`), else `undefined`.
3. `browser && aliasCache.has(pathname)` → cached value (`string` target or `null` for a known miss).
4. `const res = await fetch('/api/nav/resolve?path=' + encodeURIComponent(pathname))`; `res.ok ? (await res.json()).target : null`; cache in the browser; return target or `undefined`. Any thrown error → `undefined`.
- `setAliasMap(config: NavConfig | undefined)` — browser only: rebuild `aliasCache` from `config.sections` (`aliasPath → target`), clearing previous entries (org switch). Called from `(app)/+layout.svelte` in `$effect.pre(() => setAliasMap(page.data.navConfig))`.
- `KNOWN_TOP_LEVEL_SEGMENTS` = first segments of `ROUTE_DESIGN_MANIFEST` patterns ∪ `INTERNAL_PREFIXES` (research R5) — computed once at module load; never includes locale tags (they were stripped already).

## App layout data (`(app)/+layout.server.ts`)
- `depends('app:nav-config')` added to the list at `:78-87`.
- Loads `readNavConfig(ctx)` inside the fail-soft group (like `table-config`, `:152-157`), then returns `navConfig: visibleNavConfig(config, permissions.roles ?? [], user.role)`.
- `App.Locals.navConfig?: NavConfig` (full document; set in `finishApp` for app page requests with a tenant; the layout reuses it when present to avoid a second cached read).

## Client state helper
`src/lib/nav/nav-config.svelte.ts`: `navConfig(): NavConfig` = `page.data.navConfig ?? EMPTY_NAV_CONFIG` (same pattern as `src/lib/tables/config.svelte.ts`).

## Settings page load (`/settings/navigation/+page.server.ts`)
- `depends('settings:navigation')`; `requireOrgCapability(locals, 'settings', 'manage')`; returns `{ config: await readNavConfig(ctx), roles: await listRoleCatalog(ctx.tenantId), issues: validateNavConfig(config, { reserved, targets }) }` (`targets` computed from the manifest on the server — same pure function; the page also computes the picker rows client-side from `aliasableTargets()`).
