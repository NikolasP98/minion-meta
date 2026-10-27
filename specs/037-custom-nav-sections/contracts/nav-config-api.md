# Contracts: nav config API, reroute, permissions, layout data (Amendments A + B)

## `GET /api/nav/config`
- Auth: `requireOrgCapability(locals, 'settings', 'manage')` + `getCoreCtx` (401 without tenant).
- Response 200: the full `NavConfig` as stored (`EMPTY_NAV_CONFIG` when no row).

## `PUT /api/nav/config`
- Auth: as GET. Central guard: `/api/nav` ∈ `API_WRITE_PREFIXES` → `settings:manage`.
- Body: whole `NavConfig` (zod `navConfigSchema`: structural — `version: 1`, ids `/^[a-z0-9]{6}$/`, `kind` enum, `hidden` literal `true` optional, `builtinSections` record of page arrays, `builtin` record of `{ label?, hidden? }`). Server then runs `validateNavConfig(body, { reserved: reservedSectionSlugs(), targets: new Set(aliasableTargets().map(t => t.pattern)) })`.
- 400 `{ error: 'invalid_nav_config', issues: NavConfigIssue[] }` (`{ code, path: string[], message }`).
- 200: the stored document. Side effects, in order: `writeNavConfig` (upsert) → delete orphan page/section rules (`permission_rules` where `org_id = tenant` and (`module like 'page:%'` and not `like 'page:/%'`) or `module like 'section:%'`, and `module ∉ navPageKeys(body) ∪ section keys`) → `invalidateTags(tags.tenantDomain(tenantId, 'settings'))` → `invalidateRbac(tenantId)`.
- Whole-document, last write wins (ledger: `expectedUpdatedAt` precondition).

## `GET /api/nav/resolve?path=/staff/sell~k3x9q2/anything`
- Auth: `requireAuth` + `getCoreCtx` (401 otherwise). Any member.
- Logic: `canonical = canonicalPath(path)`; `hit = resolveNavInstance(await readNavConfig(ctx), canonical)`; `permissions` via `loadPermissionsForUser(locals, user.id)` (cached; already contains `page:<id>:view`). `permissions.has('page:<id>:view')` else 404; while `floorApplies(target)`, `moduleViewFloor(target)` must be in `permissions` else **403** `{ error: 'forbidden' }`.
- 200 `{ prefix: '/staff/sell~k3x9q2', target: '/pos/sell', id: 'k3x9q2' }` — the client caches `id → target` and rewrites `rest` itself.
- 404 `{ error: 'not_found' }` when no entry matches, `path` is missing/malformed/not root-relative, or the link is not granted. Headers `cache-control: private, no-store`.

## `POST/DELETE /api/roles/overrides` (existing; one line changes)
- `module` accepted when `isModuleOrSub(module) || await isPageRuleKey(ctx, module)` where `isPageRuleKey` (new export in `nav-config.service.ts`): `page:<id>` / `section:<id>` present in the org document, or `page:<pattern>` with `<pattern>` ∈ `aliasableTargets()`. Everything else unchanged (`users:manage`, `setRoleOverride`/`clearRoleOverride`, `invalidateRbac`).

## `GET /api/roles` (add if absent — `api/roles/+server.ts` has `POST` today)
- Auth `requireOrgCapability(locals, 'users', 'manage')`; returns `listRoleCatalog(tenantId)` as `{ roles: { key, name, isSystem }[] }`. Consumed by `PageAccessDialog`.

## Permission strings (`src/server/services/permissions.service.ts`)
- `loadPermissionsForUser(ctx, userId)` gains, after `capsToLegacyPermissions(caps)`: `const nav = await readNavConfig({ db: getCoreDb(), tenantId: ctx.tenantCtx.tenantId, profileId }).catch(() => EMPTY_NAV_CONFIG)`; for each `{ key, sectionKey, target }` of `navPageKeys(nav)`: `out.push(`${key}:view`)` when `caps.explicitView(key) ?? (sectionKey && caps.explicitView(sectionKey)) ?? decideRouteAccess(target, { authenticated: true, role: ctx.user?.role, permissions: new Set(out), orgCapabilities: new Set(out) }).allowed`. Built-in mains need no string: the guards consult `explicitView('page:' + pattern)` through the same resolver, falling back to today's `decideRouteAccess`.
- Platform-admin branch (`ctx.user?.role === 'admin'`): `[...PERMISSIONS, ...navPageKeys(nav).map(l => `${l.key}:view`)]`.
- `Capabilities.explicitView(key: string): boolean | undefined` (new method on the object `buildCapabilities` returns): `undefined` when no override row exists for `key` under any of the member's roles; otherwise `true` if any such row has `can_view`.
- Result shape unchanged: `{ permissions: string[], roles: string[] }`.

## `listRbacRoles` — unchanged (Amendment B drops the Amendment A synthetic "Custom pages" module; page rules are edited in `PageAccessDialog`).

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
1. `const [, first, second] = pathname.split('/')`; if `!first || !second`, or `/\.[a-z0-9]+$/i.test(pathname)`, or (`KNOWN_TOP_LEVEL_SEGMENTS.has(first)` and `!second.includes('~')`) → `undefined`.
2. `id = second.slice(second.lastIndexOf('~') + 1)`; `prefix = '/' + first + '/' + second`; `rest = pathname.slice(prefix.length)` (`''` or starts with `/`).
3. `browser && idCache.has(id)` → `target ? target + rest : undefined` (`null` = known miss).
4. `const res = await fetch('/api/nav/resolve?path=' + encodeURIComponent(pathname))`; `res.ok ? (await res.json()).target : null`; cache in the browser under `id`; return `target + rest` or `undefined`. Any thrown error → `undefined`.
- `setInstanceMap(config: NavConfig | undefined)` — browser only: rebuild `idCache` from every instance (`sections[].pages`, `builtinSections[*]`), clearing previous entries (org switch). Called from `(app)/+layout.svelte` in `$effect.pre(() => setInstanceMap(page.data.navConfig))`.
- `KNOWN_TOP_LEVEL_SEGMENTS` = first segments of `ROUTE_DESIGN_MANIFEST` patterns ∪ `INTERNAL_PREFIXES` — computed once at module load.

## Server guards (`src/hooks.server.ts`)
`effectiveGuardPath(event, permissions: ReadonlySet<string>): string`:
```
canonical = canonicalPath(event.url.pathname)
hit = resolveNavInstance(event.locals.navConfig ?? EMPTY_NAV_CONFIG, canonical)
if (!hit) {
  // built-in main at its native path: explicit page row (if any) replaces the registry decision
  const explicit = caps?.explicitView('page:' + screenPatternFor(canonical))   // undefined when no row / no static screen
  event.locals.pageRule = explicit                                              // consumed by applyRouteAccessGuard
  return canonical
}
if (!permissions.has(`page:${hit.page.id}:view`)) throw error(404, 'Not found')
if (floorApplies(hit.target)) {                                                 // I1‴ — until spec 039 covers the module
  const floor = moduleViewFloor(hit.target)
  if (floor && !permissions.has(floor)) throw error(403, 'You do not have access to this module.')
}
event.locals.pageRule = true                                                    // page role already decided navigation
return hit.target + hit.rest
```
`applyModuleAvailabilityGuard` evaluates `isAppRouteBlocked(effectivePath)`. `applyRouteAccessGuard`: when `locals.pageRule === true` skip `decideRouteAccess` (instance paths); when `=== false` throw 403; when `undefined` run today's `decideRouteAccess(effectivePath)`. Both receive the permissions computed once in `finishApp`. `screenPatternFor(canonical)` = the `SCREEN_DESIGN_MANIFEST` pattern matching the path (`patternMatches` from `route-access-policies`), or `null`.

## Client (`src/lib/access/can.svelte.ts`)
`canViewPath(path)`: `hit = resolveNavInstance(navConfig(), p)`; hit → `instanceAllowed(hit.page, perms)` ∧ kind-visible(target) ∧ (module toggle via server); no hit → today (built-in page rows reach the client as the existing permission strings are unchanged; an explicit built-in row only changes the server decision — ledger: ship `page:/pattern` results to the client when the first admin uses one).

## App layout data (`(app)/+layout.server.ts`)
- `depends('app:nav-config')`; loads `readNavConfig(ctx)` in the fail-soft group; returns `navConfig: visibleNavConfig(config, new Set(permissions.permissions), permissions.permissions.includes('settings:manage'))`.
- `App.Locals.navConfig?: NavConfig` (full document, set in `finishApp` for app page requests with a tenant) and `App.Locals.pageRule?: boolean` (see §Server guards).

## Client state helpers
- `src/lib/nav/nav-config.svelte.ts`: `navConfig(): NavConfig` = `page.data.navConfig ?? EMPTY_NAV_CONFIG`.
- `src/lib/nav/nav-edit.svelte.ts`: `navClipboard: { target, label, icon? } | null` (module `$state`), `canEditNav()` = `canClient('settings:manage')`, `canEditAccess()` = `canClient('users:manage')`, `saveNavConfig(next: NavConfig): Promise<void>` = client `validateNavConfig` → `PUT /api/nav/config` via `toastAsync` → `invalidate('app:nav-config')` + `invalidate('app:permissions')`.
