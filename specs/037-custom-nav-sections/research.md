# Research: custom nav sections + alias pages

All hub anchors `origin/master` @ `7d06cdd4`; SvelteKit anchors from the installed `@sveltejs/kit` 2.70.2 under `minion_hub/node_modules`.

## R1 — How an alias renders "exactly the contents" of its target

**Decision: a universal `reroute` hook (paraglide's locale strip composed with an alias step), backed by the member's filtered nav config and one same-origin resolve endpoint for the cold path.**

Evaluation criteria (from the brief): target layout loads and guards still run · RBAC of alias AND target enforced · in-page `/pos/…` links and `startsWith('/pos')` matchers · breadcrumbs/titles · deep links and refresh · route-contract tests · app-feel shell (no module remount) · PWA.

| Option | Loads + guards of the target run? | Alias ∩ target RBAC | Links / matchers | Deep link / refresh | Route contract | Remount | Verdict |
|---|---|---|---|---|---|---|---|
| **A. `reroute` hook** (`src/hooks.ts`, async since kit 2.18; hub has 2.70.2 — `respond.js:243-244`, `client.js:1545-1551`) | Yes — the request is dispatched to the target route id; `pos/+layout.server.ts` and `sell/+page.server.ts` run as-is | Guards see `event.url.pathname` = alias and `event.route.id` = target; **must** resolve the alias to evaluate the target (AS-IS "unknown paths are open") — one helper call in two existing guards | `page.url.pathname` is the alias, so `startsWith('/pos')` matchers do not fire; outbound hard links go to canonical URLs (accepted, D3 / ledger) | Server reroute handles both the HTML shell and `__data.json` (suffix stripped before reroute, `respond.js:70`) | No new filesystem route for aliases ⇒ the six counts are untouched by aliases | Same route id ⇒ no remount | **Chosen** |
| B. Catch-all route `(app)/[section]/[page]` that imports the target `+page.svelte` | No — SvelteKit exposes no API to run another route's `load` chain; `pos/+layout.server.ts` (shift, settings, badge) and the POS layout would have to be re-implemented per target; `./$types` of the target page break | Would need a parallel implementation | Same as A | Works | +1 endpoint, +1 screen, every target archetype in one file | Different route id ⇒ remount on canonical↔alias | Rejected: duplicates every target's server load; unbounded per-target code |
| C. Server redirect (302 alias → target) | Yes | Target only (plus a grant check before redirecting) | Links fine (URL becomes canonical) | Works | None | N/A | Rejected: violates the owner's "under /staff/sell"; the sidebar could never highlight the custom item. Kept as the **fallback** if A fails in proof (same data model, replace the reroute step with a redirect in `finishApp`) |
| D. Vercel/`svelte.config` rewrites | Static, build-time | — | — | — | — | — | Rejected: aliases are per-org runtime data |
| E. `handle` hook mutating `event.url` | Route matching happens before `handle` (`respond.js`: route resolved from `resolved_path` right after reroute) | — | — | — | — | — | Rejected: cannot change the matched route |

### Why the resolve endpoint (and when it is hit)
- `reroute` runs before `handle`, so on the server it has no `locals`, no org — only `url` and a cookie-forwarding `event.fetch` (`fetch.js:66-77`). The server therefore cannot read the org's config directly; it asks `GET /api/nav/resolve?path=` (same-origin sub-request, cookies forwarded, runs through the normal handle chain). Universal hooks cannot import `$server/*` either (client bundle), which rules out a direct DB read.
- On the client, `ssr = false` (`src/routes/+layout.ts:17`) means the very first navigation runs `reroute` before any layout data exists ⇒ the client also needs the fetch on a cold cache. After the app layout loads, `page.data.navConfig` fills a module-level cache (`setAliasMap`) and later navigations resolve synchronously.
- Cost bound (I5): the alias step returns immediately when the first canonical segment is a known top-level segment (derived once from `ROUTE_DESIGN_MANIFEST` patterns + internal prefixes) or the path has a file extension. Only unknown prefixes — custom sections and genuine 404s — pay one resolve.
- The resolve endpoint applies the grant check (I1) so an ungranted member's alias simply does not resolve (404 like any unknown path, no section-name leak).

### Composition with paraglide
`i18n.reroute()` is `({ url }) => string` (sync, handles the data suffix itself). New `src/hooks.ts`:
```ts
const localeReroute = i18n.reroute();
export const reroute: Reroute = async ({ url, fetch }) => {
  const stripped = localeReroute({ url }) ?? url.pathname; // '/es/staff/sell' → '/staff/sell'
  return (await resolveAliasPath(stripped, fetch)) ?? stripped; // '/staff/sell' → '/pos/sell'
};
```
`canonicalPath()` is unchanged: it must keep returning the alias path so guards and nav can tell alias from target. Only the two server guards, `canViewPath`, and the section side-navs resolve the alias explicitly.

### Enforcement placement (I1)
- Server: in `finishApp` (`hooks.server.ts:321+`) after identity, for app page requests with a tenant: `event.locals.navConfig = await readNavConfig(ctx)` (cached). Then `applyModuleAvailabilityGuard` and `applyRouteAccessGuard` compute `const alias = resolveNavAlias(locals.navConfig, canonical)`; if alias and `!aliasGranted(alias, roles, user.role)` → `error(404)`; the path they evaluate becomes `alias?.target ?? canonical`.
- Client: `canViewPath(path)` → `const alias = resolveNavAlias(page.data.navConfig, path)` (already grant-filtered, I8) → `alias ? canViewPath(alias.target) : <today>`.
- Nothing else changes: write APIs, owner scope and field masking live in the target's services and are reached only through the target's API paths.

## R2 — Where per-org nav config lives and how it ships

**Decision: one jsonb document per org, table `app_nav_config`, exactly the `app_table_config` pattern.**
- Table: `org_id text primary key, value jsonb not null default '{}', updated_at timestamptz` with RLS (`app_ledger` grants, `force row level security`, `org_guc` policy) — copy `supabase/migrations/20260922000000_table_config.sql`.
- Access: `withOrgCore(ctx, tx => …)`; cache `keys.hub('nav-config', { t: ctx.tenantId })`, `ttl '30m'`, `swr '5m'`, tags `tags.tenantDomain(tenantId, 'settings')`; invalidate the tag on write (mirrors `table-config.service.ts:17-53`).
- Ships via a new SQL file in `supabase/migrations/` (next free timestamp after `20261023020000_pulse_digest.sql`), applied by `scripts/db-migrate.ts` on the production Vercel build; the Drizzle mirror `src/server/db/pg-schema/nav-config.ts` is hand-written (never `drizzle-kit push`).
- Seed pairing: `scripts/qa/seed/tenancy.ts` inserts the business org's `staff` section; `matrix.ts` gets `tenancy.nav.staff-section`; `seed.contract.test.ts` asserts it.
- Alternatives: (a) two relational tables (`app_nav_sections`, `app_nav_pages`) — more migration, joins and seed surface for a document that is read whole and written whole by one admin page; rejected for v1 (a later move is a data migration of one jsonb column). (b) `permission_rules` rows with module key `nav.<slug>` — reuses the matrix engine but couples sections to the `Module` union, `listRbacRoles` and the roles UI; rejected (role-key arrays on the document are the smallest expression of "own RBAC" and intersect cleanly).

## R3 — RBAC model for sections and pages (SUPERSEDED by R11, Amendment A)

**v1 decision (kept for history): `roles: string[]` on section and page; empty = all members; platform admin and org owner always granted; page grants narrow section grants (both must pass); the target's policy and module availability always apply (I1).**
- Role keys validated against `listRoleCatalog(orgId)` (system + `org_roles`) on write; dangling keys at read time are ignored (fail closed for that key) and surfaced in the settings page.
- Management capability: `settings:manage` — the same gate as `/settings/modules`, `/settings/tables`, `/api/modules`, `/api/tables/config`. `['/api/nav', 'settings']` is added to `API_WRITE_PREFIXES` (belt-and-suspenders like `/api/sandbox`); handlers also call `requireOrgCapability`.
- Why not replace-semantics (D1): the aliased screen's every read/write is a `/api/<module>/*` call gated by the module's capabilities; granting the alias without the capabilities yields a screen that 403s on every action — a UX trap, and a second grant system if "fixed". Intersection keeps one matrix as the source of truth; the admin widens access in Settings → Roles.

## R4 — Should "create your own page" reuse sandbox pages?

**Decision: out of scope for v1 (D2); no coupling.**
- Sandbox pages (spec 010, hub draft #542, specs 013/014) are a *content* system: user/agent-authored elements in sandboxed iframes over `POST /api/sandbox/query`, admin-only, not merged (PR #808 open). They have one route (`/sandbox`) with a `page` column that is not yet surfaced as separate URLs.
- The owner's examples here are about *organizing existing screens under new URLs with their own RBAC*. Delivering that does not need content authoring, and coupling the two would make this feature wait on an unmerged security-tagged POC.
- Compatibility: when sandbox pages gain per-page routes, each becomes an aliasable static screen like any other, so a custom section can host them with zero changes here. If the owner later wants "blank page inside a section", the smallest extension is a page `kind: 'sandbox'` whose target is a sandbox page id — a follow-up proposal, not v1.

## R5 — Reserved and conflicting slugs

**Decision: derive, do not list.** `reservedSectionSlugs()` = first segments of every `ROUTE_DESIGN_MANIFEST` pattern (screens + redirects) ∪ `availableLanguageTags` ∪ `INTERNAL_PREFIXES = ['api','_app','ingest','.well-known','vendor','icons','static','favicon.ico','manifest.webmanifest','service-worker.js','robots.txt']`. A vitest asserts the set ⊇ first segments of `discoverPageEndpoints(process.cwd())` (filesystem truth) so a future route directory cannot be shadowed without the test failing. Page slugs share the grammar but need no reservation (they live under the section prefix). Grammar `^[a-z][a-z0-9-]{0,31}$` keeps paths URL-safe and lower-case (SvelteKit routes are case-sensitive; paraglide locale detection reads the first segment).

## R6 — Nav integration in both modes

**Decision: one helper builds both shapes** (Amendment A adds: moved mains are filtered out of `getAreaItems`/native sections, `hidden` entries and sections are skipped, `builtin[target].label` overrides native labels; see R10). `customSections(navConfig)` → `Section[]` (id `custom:<section.id>`, `tone: 'accent'`, items `{ href: alias, label, icon, matcher: own(alias) }`) appended by `getNavSections`; `customModules(navConfig)` → `ModuleDef[]` (id `custom:<section.id>`, `href` = first page, `matcher: own('/<slug>')`, items as above) appended by `getModules`. `visibleModules`/`canViewPath` filtering, per-user `navOrder`, module-mode detection (`resolveModuleForNav`) and the POS layout's module-mode branch all work unchanged. Staff-default module mode (`nav-mode.svelte.ts:61-65`) is the reason the module shape is mandatory, not optional.

## R7 — Section side-nav active state under an alias (D3)

**Decision: keep the target's section nav; add `navPath()` (= alias-resolved canonical path) and use it for `activeId` in the area navs** (`AdsNav`, `BrainsNav`, `ChannelsNav`, `CloudNav`, `CrmNav`, `FinanceNav`, `MarketplaceNav`, `PosNav`, `SchedulingNav`, `SettingsNav`, `StockNav` — every component matching `canonicalPath(page.url.pathname)` in `src/lib/components/*/*Nav.svelte`; `AccountNav` is ungated and may stay). Mechanical one-line change per file; the side-nav links keep pointing at canonical URLs.

## R8 — Breadcrumbs, titles, PWA, app-feel

- No breadcrumb consumer of the route manifest exists in the layout components (grep `breadcrumb` under `src/lib/components/layout`, `src/lib/shell` → none); page titles come from each page's own `PageHeader`. The aliased screen keeps its own header. (Not further verified: `PageHeader`'s fallback title resolution via `ROUTES` matchers — an alias path matches no `ROUTES` entry, so pages relying on the fallback would show the generic title; the POS till passes its title explicitly. Listed as a check in `quickstart.md`.)
- PWA: `service-worker.ts` passes navigations to the network; `manifest.webmanifest` `start_url` `/` → landing-page redirect; an alias path saved as `landingPage` is a root-relative path and is honored by `resolveLandingPage` (`hooks.server.ts:108-117`).
- App-feel (spec 028): same route id ⇒ no remount; `viewMemory` keys by first canonical segment (`(app)/+layout.svelte:48-54`), so `/staff/*` gets its own module memory — acceptable.

## R9 — Testing approach and gates
- Pure modules (`custom-sections.ts`, `alias-reroute.ts`) are Svelte-free and import nothing from `$lib/i18n` (that import breaks vitest — `canonical-path.ts:10-13`), so they test in the plain vitest lane.
- Hook behaviour is tested in the existing harness `src/hooks.tenant.test.ts` (runs `handle` through `with_request_store`, mocks `rbac.service`, `modules.service`, identity).
- Never run the full `bun run test` with a production `.env` present (meta memory: `*.sql.integration.test.ts` once hit prod). Targeted `bun x vitest run <paths>` only; the QA stack (`bun run qa:up` / `dev:local`) for seeds and the proof.

---

# Amendment A research (2026-10-23)

## R10 — Symlink model: main + links, prefix mapping, the operation set

**Decision: one document holds custom sections with entries of `kind: 'link' | 'main'` plus `builtin` overrides for pages that stay in their native nav; every entry maps a path PREFIX.**

- Why entries carry a `kind` instead of a separate "moves" list: Move, Rename, Hide, Delete/Restore and the nav builders treat links and moved mains identically except for (a) RBAC (link = own rule, main = target's rule) and (b) the native nav dropping a moved main. One list, one `kind` field, two `if`s.
- Why `builtin[target]` exists: Rename (label) and Hide on a built-in page that has NOT moved need somewhere to live; the native sections are code. A tiny map keyed by the target pattern is the smallest home. It never carries slugs (a built-in page's URL only changes by moving it).
- Prefix mapping (I4′): `resolveNavPrefix(config, path)` splits on `/`, finds the entry whose `/<section>/<page>` equals the first two segments, returns `{ entry, section, prefix, target, rest }`. Longest-prefix is implicit (entries are exactly two segments; nesting is a named cut). `rest` is re-appended verbatim, so `[param]` subpages (`/pos/tickets/[id]`, `/pos/catalog/[productId]/edit`) resolve under the new location. The v1 depth-2 short-circuit and "static targets only" for the *resolved* path go away; the target of an *entry* stays a static screen (the picker lists `SCREEN_DESIGN_MANIFEST` patterns without `[`).
- Duplicate/Paste inside built-in sections — **rejected for v1**: a link `/pos/sell-2` would sit under a reserved prefix, which the reroute never consults (I5). Lifting I5 for one feature costs a resolve on every unknown path under every module. Built-in items keep Copy (then Paste into a custom section) and Move.
- Old URL after Move (D7): the alternative "404 the old URL" was rejected because 33 hard-coded `/pos/...` hrefs, `HUB_ROUTE_MAP`, `GNav` chords and bookmarks would all dead-end. `replaceState` in the app shell is one `$effect` on `page.url` (`mainPathFor(target)` is pure).
- Hide scope (D6): per-user hide would need a new `preferences` section (`VALID_SECTIONS`, `api/me/preferences/[section]/+server.ts:10`) and a second filter in every nav builder; org-wide hide is a boolean on the entry the builders already read. Recommended org-wide; per-user is a ledger item.
- Clipboard: in-memory module state (`$lib/nav/nav-edit.svelte.ts`), per tab. `navigator.clipboard` was rejected (permissions prompt, nothing to gain).

## R11 — Where a link's view rule lives: `permission_rules` + Settings → Roles (fit verified)

**Decision: a link's view rule is a `permission_rules` row keyed `nav.<pageId>`; Settings → Roles shows links under a synthetic "Custom pages" module; the context menu's "Permissions…" navigates there. `roles[]` on the document (v1 R3) is removed.**

Fit evidence (all `7d06cdd4`):
- The key column is free text (`CapabilityOverrideRow.module: string`, `rbac.service.ts:251`); nothing in the DB constrains it. The only validator is `isModuleOrSub` at `api/roles/overrides/+server.ts:36,52` (static set) → the handler gains `|| await isNavLinkKey(tenantId, module)` (reads the cached org document).
- `listRbacRoles(orgId)` (`:530-600`) builds `subResources` per module from `MODULE_SUBRESOURCES`; it gains an optional `navLinks: { key, label }[]` argument and appends one synthetic module `{ module: 'nav', label: 'Custom pages', subResources: navLinks… }`. The page load (`settings/roles/+page.server.ts`) reads the document and passes the links; `adminModules` gains `'nav'`.
- `RbacRolesSection.svelte` renders sub-resources with the full action grid (`:440-466`); for module `nav` the grid shows **view only** (the other actions are meaningless for a link and would write junk columns). One `$derived` `gridActions = rm.module === 'nav' ? ['view'] : actions`.
- Default when no row exists: **the target's own policy**, evaluated against the member's other permission strings (`decideRouteAccess(target, ctx).allowed`). `caps.can('nav.<id>','view')` cannot serve as the default because `effective()` falls to `defaultCaps(role,'nav')` = NONE for every non-admin role (`:165-186, 287-292`). `buildCapabilities` therefore exposes `explicitView(key): boolean | undefined` (any role's override row for `key` → OR of `can_view`; no rows → `undefined`), and `loadPermissionsForUser` appends `nav.<id>:view = explicitView(key) ?? targetAllowed`. Platform admins (static `PERMISSIONS`, `:118`) get every link key.
- Cache coupling: the permission strings now depend on the document ⇒ `PUT /api/nav/config` also calls `invalidateRbac(orgId)` (`:319`). `resolveCapabilities` is 2 m / SWR 30 s, so without this a new link would be invisible for up to 2 minutes (violates I6).
- Orphans: deleting a link deletes its rows (`supabaseAdmin().from('permission_rules').delete().eq('org_id', …).like('module', 'nav.%')` for keys no longer in the document) — same table the overrides API writes.

Rejected alternatives:
- (a) `roles[]` on the document + a per-link "Permissions…" dialog (v1): two places to express "who can see what"; the Roles matrix would not show it; needs role-key validation and a `MultiSelectFilter` dialog. Comparable code size, worse coherence.
- (b) Register links as real `MODULE_SUBRESOURCES` rows: the registry is static code shared by the route manifest; per-org data cannot live there.
- (c) Capability key per *section* instead of per link: the owner's rule is per page.

## R12 — The module-view floor (data-read exposure) and the relaxation question (D5)

Finding: target page server loads call services with `getCoreCtx(locals)` only (`pos/sell/+page.server.ts:24-27`, `pos/+layout.server.ts:14-22`); the services apply no capability checks (`git grep requireOrgCapability|caps.can -- src/server/services/pos.service.ts scheduling.service.ts` → none). The route-level view policy is the ONLY thing between a member and the page's data. API GETs are separately gated (`requireOrgCapability(locals,'pos','view')` in every `api/pos/**` GET).

Therefore:
- A link whose view rule is granted to a role without `<module>:view` would ship the page data and then 403 every API call — an exposure, not a UX trap. The floor `granted(moduleViewFloor(target))` closes it. `moduleViewFloor(target)` = the policy of the longest **prefix** rule in `ROUTE_ACCESS_RULES` whose policy id has no dot (module level: `permission:pos:view`), or, when none matches (`/settings/*`, `/home`, …), the target's resolved policy (fail closed).
- What the link MAY relax (D5, recommended yes): the target's *page-level* rules — the exact override (`/pos/sell` → `pos:create`) and the sub-resource key (`pos.sell:view`). This is exactly "view rules tied to pages, edit/delete tied to data": a role can be shown the till without being able to charge. Writes 403 at the API; buttons follow `canAct()` (FR-010).
- If the owner answers D5 "no" (pure narrowing as v1): in `effectiveGuardPath` keep running `decideRouteAccess(target)` for links as well as mains, and in `canViewPath` keep `canAccessRoute(target)` — three lines; the floor becomes redundant but harmless.
- Owner scope / field masking: module-level (`OWNER_SCOPABLE_MODULES`, `FIELD_LEVEL_MODULES`), enforced in services → unchanged by links or moves.
- Moved mains are never relaxed: they ARE the page; the target's rules apply unchanged (US3.5).
- Till gap found: `sell/+page.svelte:690-697` computes `chargeDisabled` from cart/pay blockers only; `ShiftBanner` (`:410…`) already gates "open shift" on `pos:edit`. S5 adds `!canAct('pos','create')` to the blocker with `m.no_permission()`.

## R13 — Management surface: context menus replace `/settings/navigation`

**Decision: no settings page.** Every operation is a context-menu entry plus at most one small dialog; permissions are edited in Settings → Roles (R11). Dropping the page keeps the six route-contract counts untouched, removes a `DataTable`+`Picker`+`DraggableDialog` page from S4, and matches the owner's screenshot.

- Primitive: `ContextMenu.svelte` (`src/lib/components/ui`), the opener contract from `RecordContextMenu.svelte:17-33,40-46` (right-click + `ContextMenu`/`Shift+F10`, inputs skipped, keyboard opens at the host rect). `Sidebar.svelte`'s hand-rolled `.ctx-menu` (`:102-125,540-570,899+`) is replaced by the same component so "Set as home page" becomes the first entry of the item menu (one menu, one a11y contract).
- Where it attaches: every `oncontextmenu={(e) => openCtx(e, href, label)}` site in `Sidebar.svelte` (`:290,333,403,474,512`), the section header `div` (`:355-368`) and the `<nav class="sidebar-nav">` element itself (`:304`) for the empty area; `Topbar.svelte` mobile sheet items (`:396-410`).
- Long-press: no helper exists; a 20-line `longpress` action (`pointerdown` → 500 ms → synthesize `{clientX, clientY}` open; cancelled by `pointerup`/`pointercancel`/`pointermove` > 8 px; `touch-action` untouched so scrolling still cancels). Android fires native `contextmenu` on long-press already; the action is for iOS Safari. Named as a small hand-rolled gap.
- Dialogs: `Dialog` + `FormField` (foundations) for Rename / New section; `Picker` (`$lib/components/ui`) for New page (rows = `aliasableTargets()`) and for Move (rows = custom sections); `ConfirmDialog` for Delete section / Delete link / Restore.
- What is lost without a page: a table of every entry with warnings. Replaced by the empty-area menu's "Not shown ›" submenu (hidden + broken entries with the reason, actions Show / Delete). Validation warnings (`slug.reserved` now, `target.invalid`) come from `validateNavConfig` at read time as in v1.
- Non-admin members: the item menu has one entry (Set as home page), exactly today's behaviour; the header/general menus do not open for them.

## R14 — Mobile and module-mode parity

- Module mode renders `navMode.activeModule.items` (`Sidebar.svelte:307-350`), i.e. `ModuleNavItem`s from `getAreaItems`/`customModules`. The item menu needs `{ href, label, target? }`; for built-in items `target = href` (a static screen) — the menu resolves "is this a page item" through `aliasableTargets()` membership, "is this a custom entry" through `resolveNavPrefix(navConfig(), href)`, and "is this moved" through `movedTargets(navConfig())`. No shape change to `ModuleNavItem`/`SectionItem`.
- Mobile sheet (`Topbar.svelte:396-410`) uses the same `NavContextMenu` host; keyboard opener is moot there, long-press is the opener.
- The module switcher (`ModuleSwitcher.svelte`, `Topbar.svelte` picker) lists custom sections as modules (R6); no menu on switcher rows (sections are edited from their header).

---

# Amendment B research (2026-10-23, owner answers to D5–D7)

## R15 — Two role axes: page roles vs data roles (D5 answered)

**Decision: page roles ("may navigate here") on every page instance and custom section; data roles (view/add/edit/remove per dataset) in spec 039. A page grant never gates data; a denied dataset renders as a disabled visual. Until 039 enforces a module's reads, the Amendment A module-view floor stays (I1‴).**

- Why the floor cannot simply go: R12's finding stands — 62 of the 73 `(app)` server loads that touch tenant data have no capability call (method and list in `specs/039-data-source-rbac/research.md` R1). Dropping the floor before 039 guards those reads would let a page grant ship data the role may not view.
- Why a shared constant: `DATASET_ENFORCED` in `src/lib/permissions.ts` is read by 037's guards/`canViewPath` (skip the floor) and by 039's ratchet test (forbid bare ctx reads under the module's prefixes). One list, two consumers, one PR per module to grow it. Alternatives: (a) a per-page `dataEnforced` flag in the route manifest — duplicates per screen what is a per-module fact; (b) a DB flag — runtime data for a code property.
- Built-in mains at their native path keep `defaultPolicy` (today's registry decision, including action-level overrides such as `/pos/sell` → `pos:create`) until an admin writes an explicit `page:<pattern>` row. So the floor is only observable on custom instances; day one is byte-identical for existing URLs (SC-003).

## R16 — Page-role storage and cascade

**Decision: `permission_rules` rows keyed `page:<id>` (custom instance), `page:<pattern>` (built-in main, e.g. `page:/pos/sell`), `section:<sectionId>` (custom section); resolution `page row ?? section row ?? defaultPolicy(target)`; the route-access registry IS the default table.**

- Key column is free text (`CapabilityOverrideRow.module: string`, `rbac.service.ts:251`); only `isModuleOrSub` validates at the overrides API (`api/roles/overrides/+server.ts:36,52`) — extended to accept the three key forms when they name an existing instance / section / `SCREEN_DESIGN_MANIFEST` pattern.
- Cascade: `buildCapabilities.effective()` (`:287-292`) strips a dotted key to its FIRST dot, so `page.<section>.<id>` would skip the section level; and its final fallback is `defaultCaps(role, 'page…')` = NONE. The cascade is therefore an explicit three-step walk on the raw override map (`explicitView`, introduced in Amendment A), not the dotted inheritance. Evidence that section→page cascade is wanted: the owner's "access permission actions in the context menu per page/section"; the hub already has the same shape for module→sub-resource rows (`listRbacRoles` `subResources`, `:596-600`).
- Why not reuse the registry's `MODULE_SUBRESOURCES` dotted keys (`pos.sell`) as the built-in page keys: they are *also* the client permission strings that `ROUTE_PERMISSION_PREFIXES` consumes (`route-access-registry.ts:195-197`) and the Roles matrix "Sections" rows; renaming them is a migration of `permission_rules` data. Instead `page:/pos/sell` is a NEW key whose absence means "use the registry as today", so existing `pos.sell` rows keep working untouched. When 039 S6 removes the "Sections" rows from the matrix, the dotted keys become read-only defaults (ledger: fold them into `page:` rows).
- Rejected: `roles[]` on the document (v1) — two sources of truth; a `page_access` table — a second overrides table for the same role × key × bool shape.

## R17 — "Access…" dialog instead of Roles-matrix rows

**Decision: a `PageAccessDialog` opened from the context menu on page items and custom section headers, for `users:manage` holders (the role-management capability: `settings/roles/+page.server.ts:20`, `api/roles/+server.ts:19`, `api/roles/overrides/+server.ts:27,49`). One tri-state per role (inherit / allow / deny) writing `POST`/`DELETE /api/roles/overrides`.** The Amendment A synthetic "Custom pages" module in `listRbacRoles` is dropped.

- Owner: "right-click a page in the sidemenu and view access permission actions in the context menu per page/section". The matrix stays the *data* editor (039); page rules are edited where pages are.
- Tri-state maps 1:1 to the existing API: allow → `POST {caps:{view:true}}`, deny → `POST {caps:{view:false}}`, inherit → `DELETE`. No new endpoint; the dialog needs the role catalog — `GET /api/roles` (unverified: `api/roles/+server.ts` has `POST`; if no `GET`, S5 adds one returning `listRoleCatalog(orgId)` gated `users:manage`).
- The dialog shows the *effective* default per role as the inherit label ("inherits: allowed / denied") computed client-side from `canViewPath(target)` for the acting user only — per-role effective defaults need the server; shown as "inherits the page's rule" text when unknown (same honesty as A/R11).

## R18 — Page ids in URLs (D7 answered)

**Decision: every custom instance URL is `/<section>/<slug>~<id>/<rest>`; `id` = 6 chars base36 (`[a-z0-9]{6}`, ~2.2 × 10⁹ values; generated from `crypto.randomUUID()` and checked unique within the document); the resolver matches `~<id>` only (D8: slug cosmetic); `~` in the second segment marks an instance path for the reroute (I5).**

Options weighed:
| Scheme | Readable | Built-in-section duplicates | Reserved-slug rule | Rename-safe | Verdict |
|---|---|---|---|---|---|
| `/<section>/<slug>` (A) | yes | no (reserved prefix short-circuit) | sections + pages | no | superseded |
| `/<section>/<slug>~<id>` | yes | **yes** (`/pos/sell~k3x9q2`) | sections only | **yes** | **chosen** |
| `/<section>/<id>` | no | yes | sections only | yes | rejected: unreadable sidebar/bookmark URLs |
| `/p/<id>/<rest>` | no | yes | none (one reserved `p`) | yes | rejected: loses the owner's `/<section>/<page>/<subpages>` shape and module-mode `viewMemory` keys by first segment (`(app)/+layout.svelte:48-54`) |
| `/<section>/<slug>-<id>` | yes | needs a slug grammar that forbids trailing `-xxxxxx` | sections only | yes | rejected: ambiguous with real slugs (`sell-2`) |

- Built-in mains keep their filesystem path (`/pos/sell`); a moved main gets an id like any instance (`/staff/sell~k3x9q2`), and its old path keeps rendering + client-replaces (I9 unchanged).
- Consequences: `slug.duplicate` for pages disappears; `uniqueSlug` disappears; Duplicate/Paste into built-in sections is allowed — instances pasted into a built-in module live in `C.builtinSections[module]` and render after that module's native area items (`getAreaItems`); R10's cut is lifted.
- Reroute check: `second.includes('~')` is a one-character test; the filesystem never produces it (SvelteKit route dirs are `[a-z0-9-[\]…]`), `slugify` never emits it. Unverified: edge normalisation of `~` on Vercel/Cloudflare (quickstart Q21 on a preview deployment); fallback marker `--` is a one-line constant swap plus a `slugify` rule forbidding `--`.
