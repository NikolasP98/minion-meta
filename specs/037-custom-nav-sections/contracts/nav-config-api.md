# Contracts: nav config API, reroute, permissions, layout data (Amendment A)

## `GET /api/nav/config`
- Auth: `requireOrgCapability(locals, 'settings', 'manage')` + `getCoreCtx` (401 without tenant).
- Response 200: the full `NavConfig` as stored (`EMPTY_NAV_CONFIG` when no row).

## `PUT /api/nav/config`
- Auth: as GET. Central guard: `/api/nav` ∈ `API_WRITE_PREFIXES` → `settings:manage`.
- Body: whole `NavConfig` (zod `navConfigSchema`: structural — `version: 1`, `kind` enum, `hidden` literal `true` optional, `builtin` record of `{ label?, hidden? }`). Server then runs `validateNavConfig(body, { reserved: reservedSectionSlugs(), targets: new Set(aliasableTargets().map(t => t.pattern)) })`.
- 400 `{ error: 'invalid_nav_config', issues: NavConfigIssue[] }` (`{ code, path: string[], message }`).
- 200: the stored document. Side effects, in order: `writeNavConfig` (upsert) → delete orphan link rules (`permission_rules` where `org_id = tenant` and `module like 'nav.%'` and `module ∉ navLinkKeys(body)`) → `invalidateTags(tags.tenantDomain(tenantId, 'settings'))` → `invalidateRbac(tenantId)`.
- Whole-document, last write wins (ledger: `expectedUpdatedAt` precondition).

## `GET /api/nav/resolve?path=/staff/sell/anything`
- Auth: `requireAuth` + `getCoreCtx` (401 otherwise). Any member.
- Logic: `canonical = canonicalPath(path)`; `hit = resolveNavPrefix(await readNavConfig(ctx), canonical)`; `permissions` via `loadPermissionsForUser(locals, user.id)` (cached; already contains `nav.<id>:view`). Link: `permissions.has('nav.<id>:view')` else 404; floor `moduleViewFloor(target)` string must be in `permissions` else **403** `{ error: 'forbidden' }`. Main: no check here (the guards evaluate the rewritten path on the subsequent request).
- 200 `{ prefix: '/staff/sell', target: '/pos/sell' }` — the client caches `prefix → target` and rewrites `rest` itself.
- 404 `{ error: 'not_found' }` when no entry matches, `path` is missing/malformed/not root-relative, or the link is not granted. Headers `cache-control: private, no-store`.

## `POST/DELETE /api/roles/overrides` (existing; one line changes)
- `module` accepted when `isModuleOrSub(module) || (module.startsWith('nav.') && navLinkKeys(await readNavConfig(ctx)).some(l => l.key === module))`. Everything else unchanged (`users:manage`, `setRoleOverride`/`clearRoleOverride`, `invalidateRbac`).

## Permission strings (`src/server/services/permissions.service.ts`)
- `loadPermissionsForUser(ctx, userId)` gains, after `capsToLegacyPermissions(caps)`: `const nav = await readNavConfig({ db: getCoreDb(), tenantId: ctx.tenantCtx.tenantId, profileId }).catch(() => EMPTY_NAV_CONFIG)`; for each `{ key, target }` of `navLinkKeys(nav)`: `out.push(`${key}:view`)` when `caps.explicitView(key) ?? decideRouteAccess(target, { authenticated: true, role: ctx.user?.role, permissions: new Set(out), orgCapabilities: new Set(out) }).allowed`.
- Platform-admin branch (`ctx.user?.role === 'admin'`): `[...PERMISSIONS, ...navLinkKeys(nav).map(l => `${l.key}:view`)]`.
- `Capabilities.explicitView(key: string): boolean | undefined` (new method on the object `buildCapabilities` returns): `undefined` when no override row exists for `key` under any of the member's roles; otherwise `true` if any such row has `can_view`.
- Result shape unchanged: `{ permissions: string[], roles: string[] }`.

## `listRbacRoles(orgId, navLinks: { key: string; label: string }[] = [])` (existing; one synthetic module)
- When `navLinks.length > 0`, each role's `modules` gains `{ module: 'nav', label: 'Custom pages', caps: NONE-shaped ActionSet, overridden: false, ifOwner: false, ownerScopable: false, fieldLevel: 0, fieldScopable: false, subResources: navLinks.map(l => ({ key: l.key, label: l.label, caps: ovr.get(`${role.key}:${l.key}`) ?? { view: <target default>, create:false, … }, overridden: !!ovr.get(…) })) }`. The per-role default (= the target's own policy) is not computed here (it needs the role's full permission-string set, which lives in `permissions.service` — importing it from `rbac.service` would be circular); an un-overridden link row renders its view checkbox **indeterminate** (`RbacRolesSection` already supports `indeterminate` via `use:indeterminate`) with the title "Inherits the page's own rule until set". Ticking writes `can_view: true`, unticking writes `can_view: false`, "Reset" (`resetSub`) returns to inherit. The guard semantics are unaffected (`explicitView ?? target policy`).

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
1. `const [, first, second] = pathname.split('/')`; if `!first || !second`, or `KNOWN_TOP_LEVEL_SEGMENTS.has(first)`, or `/\.[a-z0-9]+$/i.test(pathname)` → `undefined`.
2. `prefix = '/' + first + '/' + second`; `rest = pathname.slice(prefix.length)` (`''` or starts with `/`).
3. `browser && prefixCache.has(prefix)` → `target ? target + rest : undefined` (`null` = known miss).
4. `const res = await fetch('/api/nav/resolve?path=' + encodeURIComponent(pathname))`; `res.ok ? (await res.json()).target : null`; cache in the browser under `prefix`; return `target + rest` or `undefined`. Any thrown error → `undefined`.
- `setPrefixMap(config: NavConfig | undefined)` — browser only: rebuild `prefixCache` from every section entry (`entryPath → target`), clearing previous entries (org switch). Called from `(app)/+layout.svelte` in `$effect.pre(() => setPrefixMap(page.data.navConfig))`.
- `KNOWN_TOP_LEVEL_SEGMENTS` = first segments of `ROUTE_DESIGN_MANIFEST` patterns ∪ `INTERNAL_PREFIXES` — computed once at module load.

## Server guards (`src/hooks.server.ts`)
`effectiveGuardPath(event, permissions: ReadonlySet<string>): string`:
```
canonical = canonicalPath(event.url.pathname)
hit = resolveNavPrefix(event.locals.navConfig ?? EMPTY_NAV_CONFIG, canonical)
if (!hit) return canonical
if (hit.page.kind === 'link') {
  if (!permissions.has(`nav.${hit.page.id}:view`)) throw error(404, 'Not found')
  const floor = moduleViewFloor(hit.target)
  if (floor && !permissions.has(floor)) throw error(403, 'You do not have access to this module.')
  event.locals.navLinkRelaxed = Boolean(floor)   // D5: the link's own rule replaces the target's page-level rule
}
return hit.target + hit.rest
```
`applyModuleAvailabilityGuard` evaluates `isAppRouteBlocked(effectivePath)`; `applyRouteAccessGuard` evaluates `decideRouteAccess(effectivePath)` **unless** `navLinkRelaxed` (D5 = yes). Both receive the permissions computed once in `finishApp`.

## Client (`src/lib/access/can.svelte.ts`)
`canViewPath(path)`: `hit = resolveNavPrefix(navConfig(), p)`; link → `linkAllowed(hit.page, perms)` ∧ kind-visible(target); main → `canViewPath(hit.target + hit.rest)`; no hit → today.

## App layout data (`(app)/+layout.server.ts`)
- `depends('app:nav-config')`; loads `readNavConfig(ctx)` in the fail-soft group; returns `navConfig: visibleNavConfig(config, new Set(permissions.permissions), permissions.permissions.includes('settings:manage'))`.
- `App.Locals.navConfig?: NavConfig` (full document, set in `finishApp` for app page requests with a tenant) and `App.Locals.navLinkRelaxed?: boolean`.

## Client state helpers
- `src/lib/nav/nav-config.svelte.ts`: `navConfig(): NavConfig` = `page.data.navConfig ?? EMPTY_NAV_CONFIG`.
- `src/lib/nav/nav-edit.svelte.ts`: `navClipboard: { target, label, icon? } | null` (module `$state`), `canEditNav()` = `canClient('settings:manage')`, `canEditRoles()` = `canClient('users:manage')`, `saveNavConfig(next: NavConfig): Promise<void>` = client `validateNavConfig` → `PUT /api/nav/config` via `toastAsync` → `invalidate('app:nav-config')` + `invalidate('app:permissions')`.
