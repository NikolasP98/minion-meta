# Feature Specification: Custom navigation sections with alias pages and their own RBAC

**Feature Branch**: `spec/037-custom-nav-sections` (meta, → `dev`) · hub slices `feat/nav-sections-s1..s5` → `master`
**Created**: 2026-10-23 | **Status**: Draft — **security + data tag** (new RBAC surface, new org table): the owner approves this spec before code AND merges every hub slice (constitution Principle V).
**Input**: Owner (verbatim): "I need you to spec/plan the feature for users to create their own pages/sections. For new sections, they would also be able to re-use existing pages from other sections (but the url to this new page would be new, even though the point to the same destination). eg. I want to move /pos/sell to my new "/staff" section, so the new route would show exactly the contents of /pos/sell, but under /staff/sell. These sections/pages would have their own rbac."

## Owner decisions (answer before `/speckit-implement`; recommended answers are the spec's defaults)

| # | Question | Recommendation (= what this spec assumes) |
|---|---|---|
| D1 | **Does a section's RBAC replace or intersect the target page's RBAC?** `/staff/sell` for a role that lacks `pos.sell:view` / `pos:create`: open it anyway, or hide it? | **Intersect.** An alias can only *narrow* who sees a page; it never grants data the role lacks, because every button on `/pos/sell` calls `/api/pos/*`, which is gated by the POS capabilities (`apiWriteCapability`) and would 403. To let a role use `/staff/sell` the admin grants it POS capabilities in Settings → Roles, exactly as today. Replace-semantics would need a second capability system layered over `permission_rules` and is out of scope (see TO-BE I1). |
| D2 | **"Create your own page" that is NOT an alias (free content)** — in v1? | **No.** v1 = sections + alias pages + per-section/page RBAC + management UI. A free-content page already has a prototype (sandbox pages, spec 010 / hub draft #542, admin-only, not merged). When 010 lands, a sandbox page becomes one more aliasable target (`/sandbox/<page>`) and needs nothing from this feature. Justification in `research.md` R4. |
| D3 | **Inside an aliased page, which section nav shows?** `/staff/sell` renders the POS layout, whose side-nav lists the POS pages (`/pos/…`). | **Keep the target's section nav** (it IS "exactly the contents of /pos/sell"); the sidebar highlights the custom section's item, and the target's section nav highlights the aliased page. Replacing the POS side-nav with the custom section's pages is a follow-up (ledger). |

**Owner answers (2026-10-23, in session):** D1 = intersect · D2 = no free-content pages in v1 · D3 = keep the target's section nav · D4 (added: "move" vs copy) = **copy** — the canonical page stays in its native nav; a "hide original" toggle is a follow-up. All defaults stand. Owner also directed implementation by subagents right after the write-up (spec approval for code start); merges stay with the owner.

No `[NEEDS CLARIFICATION]` markers remain in the body.

## AS-IS (evidence; every anchor is `minion_hub` `origin/master` @ `7d06cdd4` unless stated)

### Navigation is code, not data
- Sidebar sections come from code registries only: static core sections + plugin-category sections, composed by `getNavSections()` (`src/lib/components/layout/sections.ts:508-525`), rendered by `Sidebar.svelte:34-40,351-354` and the mobile menu. Items are filtered per user with `canViewPath(href)` (`Sidebar.svelte:352`).
- The ERPNext-style module switcher lists modules from `getModules()` (`src/lib/nav/modules.ts:456-664`); `visibleModules()` (`:671-679`) drops what the user cannot open; `resolveModuleForNav(path)` (`:682-685`) picks the active module by path prefix. Section side-navs (PosNav, CrmNav, …) read the same registry via `getAreaItems` (`modules.ts:111`, `PosNav.svelte:13-18`).
- **Non-admin roles default to module mode**: `defaultNavMode` returns `'module'` unless the member holds owner/admin/manager (`src/lib/state/ui/nav-mode.svelte.ts:22-23,61-65`). A `staff` member therefore sees ONE module's pages in the sidebar — anything that is not a module is invisible to them.
- Per-user nav customization exists only as *ordering* (`navOrder` preference, drag-and-drop, `Sidebar.svelte:125-146,209-221`) and a *landing page* (`landingPage` preference, `:111-123`; honored by `hooks.server.ts:93-127`). No per-org section/page creation exists. Per-org module **toggles** exist (`app_modules`, `src/server/services/modules.service.ts:12-42`, UI `/settings/modules`).
- Org-level configuration documents already follow one pattern: one jsonb row per org, RLS via the `app_ledger` role + `app.current_org_id` GUC, cached under the tenant `settings` tag — `app_table_config` (`supabase/migrations/20260922000000_table_config.sql`, `src/server/db/pg-schema/table-config.ts:9-13`, `src/server/services/table-config.service.ts:17-53`, `GET/PUT /api/tables/config` at `src/routes/api/tables/config/+server.ts:26-39`, shipped to the client by `(app)/+layout.server.ts:151-157,271`).

### `/pos/sell` and its layout chain
- Files: `src/routes/(app)/pos/sell/+page.svelte` (1,923 lines) + `+page.server.ts`; layouts above it: `src/routes/(app)/+layout.svelte` (app shell) and `src/routes/(app)/pos/+layout.svelte` (`SectionShell` + `PosNav` + `ShiftBanner`, `:14-33`; in module mode the side-nav is dropped and the shift strip rendered).
- Server loads it depends on: `(app)/+layout.server.ts:61-272` (user, permissions, orgs, workspaces, personal agent, hosts, preferences, tableConfig, `schedulingEnabled`/`stockEnabled` from `locals.moduleStates`), `pos/+layout.server.ts:14-65` (`depends('pos:shift')`, `'pos:pending'`; POS settings, open shift, colleagues' shifts, pending-work badge), `pos/sell/+page.server.ts:24-90` (`depends('pos:sell')`; sellables, bundles, resources, event types, today's tickets/shifts). The page reads `page.data.user.id` and `page.data.activeOrgId` (`+page.svelte:107-111`).
- Guards it relies on (all central, path-based): the view permission `pos.sell:view` comes from `MODULE_SUBRESOURCES.pos` (`src/lib/routes/route-access-registry.ts:77-83`) and the stronger exact override `'/pos/sell': 'org-capability:pos:create'` (`:135`); the module-availability 404 for toggled-off/kind-hidden POS comes from `MODULE_MANIFEST.pos` (`src/lib/modules/availability.ts:105-109`) via `isAppRouteBlocked` (`route-guard.ts:72-77`).
- Locale: there is no `[locale]` directory. Paraglide-SvelteKit 0.16.1 rewrites `/es/pos/sell` → `/pos/sell` through the universal `reroute` hook (`src/hooks.ts:1-3` = `i18n.reroute()`), redirects unprefixed page URLs to the negotiated locale (`src/lib/i18n.ts:4-12`, `prefixDefaultLanguage: 'always'`, `/api`, `/ingest`, `/.well-known` excluded), and `canonicalPath()` strips the prefix for every path comparison (`src/lib/canonical-path.ts:16-22`). **The hub already lives with `page.url.pathname ≠ route pattern`** — every guard and nav matcher already canonicalizes.
- The whole app is client-rendered: `export const ssr = false` at `src/routes/+layout.ts:17`. Server loads still run and are fetched as `__data.json`; the hooks run on both the shell request and every data request.
- Hard-coded `/pos/...` hrefs inside the POS pages and components: 33 occurrences across 31 files (`git grep -o "['\"\`]/pos/[a-z]" -- 'src/routes/(app)/pos' src/lib/components/pos`), e.g. `sell/+page.svelte` (4), `accounts/+page.svelte` (5), `BookingDetailDrawer.svelte` (3). Prefix matchers on `/pos`: `sections.ts:234`, `modules.ts:463`.

### Route access is resolved by path, and unknown paths are *open*
- `applyRouteAccessGuard` (`src/hooks.server.ts:250-278`) evaluates `decideRouteAccess(canonicalPath(event.url.pathname))`; `applyModuleAvailabilityGuard` (`:287-313`) evaluates `isAppRouteBlocked(canonicalPath(...))`. Both run for authenticated `(app)` page requests with a tenant (`route-guard.ts:37-43`).
- `resolveRouteAccess()` returns `policyId: 'authenticated'` for any path that matches no rule (`src/lib/routes/route-access-policies.ts:121-138`). **Consequence for this feature:** a URL such as `/staff/sell` that is rerouted to the POS page but is not in the registry would pass the central guard for every signed-in member, and `isAppRouteBlocked('/staff/sell')` would pass for an org with POS toggled off. The alias layer MUST evaluate the target path, not the alias path (TO-BE I1).
- Client mirror: `canViewPath(path)` (`src/lib/access/can.svelte.ts:58-63`) = org-kind check on `resolveModuleForPath` + `canAccessRoute` against `page.data.permissions.permissions`. Unknown paths → visible.
- Write APIs are gated by prefix in `apiWriteCapability` (`src/server/services/rbac.service.ts:1112-1153,1209-1267`); org-config prefixes (`/api/modules`, `/api/plugins`, `/api/sandbox`) map to `settings:manage` (`:1140-1145,1257-1259`). Handlers also gate themselves (`requireOrgCapability(locals,'settings','manage')`, e.g. `api/tables/config/+server.ts:34`).

### RBAC primitives available
- Modules × actions matrix: `MODULES` (`rbac.service.ts:40-66`), `ACTIONS` (`:69`). Roles: system `owner > admin > manager > staff > viewer` (`:606`) plus **per-org custom roles** in `org_roles` (`:633-647` `listRoleCatalog(orgId)`, `createCustomRole :773`, `deleteCustomRole :855`). Assignments in `member_roles` (multi-role, `:354-417`). Overrides in `permission_rules` (`:223-234`).
- `buildCapabilities()` (`:245-307`): a dotted key (`pos.sell`) inherits its parent module unless overridden; `ownerScoped`, `fieldLevel` likewise. Owner-scope and field masking apply only to the modules listed in `OWNER_SCOPABLE_MODULES` (`:445-449`) and `FIELD_LEVEL_MODULES` (`src/lib/permissions.ts:123-127`) and are enforced inside the owning services — they travel with the target page's data, never with the URL.
- The client receives `{ permissions: string[], roles: string[] }` (`src/server/services/permissions.service.ts:118-131`); platform admins get every permission and `roles: ['admin']` (`:118`).

### Route contract and other registries a new page must touch
- A new filesystem page changes **six pinned counts**: `ROUTE_CONTRACT_EXPECTATIONS` (`endpoints: 160`, `screens: 149`, `redirects: 11`, `fixtures: 28` — `src/lib/routes/route-design-validation.ts:14-42`), `scripts/ui-audit-inventory.test.ts:12-13,133` (`160 / 149 / 11`), and `src/server/ui-audit/frontend-contract-scanner.test.ts:10` (`160`). Every screen needs a `screen(...)` manifest entry (`route-design-manifest.ts:335-366`; `/settings/tables` example `:413`) and must compose like its archetype (`archetype-composition.ts:10-20`: `form-settings` = a settings section shell, which `settings/+layout.svelte:28-33` already provides).
- A Spec Kit/Playwright capture persona matrix is derived from the policy id (`route-design-manifest.ts:314-325`): `org-capability:*` screens capture as `owner-admin` + `restricted-no-module`.
- Settings tabs: `SettingsNav.svelte:81-131` (`HUB_TABS`), filtered by `canViewPath` (`:173-177`); route policy overrides for settings pages at `route-access-registry.ts:139-149`.

### Hub migrations and seeds (how schema ships today)
- Migrations are plain SQL files in `supabase/migrations/` applied by hub's own runner `scripts/db-migrate.ts` (ledger `hub_migrations`; runs inside `vercel-build` for production only; manual `FORCE_DB_MIGRATE=1`). Drizzle files under `src/server/db/pg-*` are hand-written mirrors; **`drizzle-kit push` is never used** (the schema is not reproducible from the repo — meta memory, and `minion_hub/AGENTS.md` "never run schema push").
- CI rule: a PR touching `supabase/migrations/*.sql` must also touch `scripts/qa/seed/**` or `supabase/qa/baseline/**` (`scripts/qa/check-migration-seed-pairing.ts:1-12`); seed rows register in `scripts/qa/seed/matrix.ts` and are asserted by `scripts/qa/seed/seed.contract.test.ts` (example `tenancy.sandbox.hello`, `tenancy.ts:364-381`, contract `:196-207`).

### SvelteKit facts the mechanism depends on (verified in `minion_hub/node_modules`, kit 2.70.2)
- `reroute` is awaited and receives `{ url, fetch: event.fetch }` on the server (`src/runtime/server/respond.js:243-244`; the `__data.json` suffix is stripped before it, `:70`) and `{ url, fetch }` on the client (`src/runtime/client/client.js:1545-1551`). Type: `(event: { url: URL; fetch }) => MaybePromise<void | string>` (`types/index.d.ts:982`). Server `event.fetch` forwards cookies to same-origin sub-requests (`src/runtime/server/fetch.js:66-77`).
- Paraglide's reroute is synchronous and composable: `({ url }) => string` (`@inlang/paraglide-sveltekit/dist/runtime/hooks/reroute.js`).
- `event.route.id` after a reroute is the **target** route; `event.url` / `page.url` keep the requested URL. Same-route navigations (`/pos/sell` ↔ `/staff/sell`) do not remount the page component (spec 028 app-feel behaviour preserved).
- The service worker never caches navigations (`src/service-worker.ts:48-55`); the PWA manifest `start_url` is `/` (`static/manifest.webmanifest`). Neither cares about the pathname.

### Prior art decision input (sandbox pages)
- Hub `/sandbox` (route `src/routes/(app)/sandbox/+page.svelte`, lib `src/lib/sandbox/*`, table `sandbox_elements` with a `page` column, migration `20261016000000_sandbox_elements.sql`), admin-only via `'/sandbox': 'org-capability:settings:manage'` (`route-access-registry.ts:129`). Meta spec 010 (`specs/010-hub-sandbox-pages/spec.md`, commit `405ff83d8`, PR #808 **open**, not on `dev`), specs 013/014 extend it (worktrees `~/.cache/claude-tmp/hub-sb`, `meta-013`, `meta-014`). It is a *content* system (user-authored elements over a query endpoint); it has no notion of nav sections or URL aliases.

## TO-BE

An org admin creates **sections** (a sidebar group with its own URL prefix, e.g. `/staff`) and adds **pages** to them. A v1 page is an **alias**: it points at an existing hub screen (e.g. `/pos/sell`) and gets a new URL under the section (`/staff/sell`). Opening the alias shows exactly the target screen — same loads, same layout chain, same data, same buttons — at the alias URL. Each section and each page carries a list of roles that may see it. Custom sections appear everywhere the built-in ones do: the full sidebar, module mode (as a module), the mobile menu and the module switcher.

### Invariants
- **I1 — Intersection, never widening (D1).** `access(alias) = granted(section, roles) ∧ granted(page, roles) ∧ canAccessRoute(target) ∧ moduleAvailable(target)`. Both the server guards and `canViewPath` evaluate the **target** path for policy and module availability and the **alias** for grants. No API endpoint is aliased; every data call from the aliased screen hits the same `/api/*` paths with the same capability checks. Platform admins (`user.role === 'admin'`) and the org `owner` role are always granted (consistent with `defaultCaps`); an empty `roles` list means "every member".
- **I2 — Same URL, same screen.** The browser URL stays the (locale-prefixed) alias; `page.route.id` is the target's route id; no redirect. Query string and hash are preserved. Refresh and deep links work (server reroute). Navigating between the canonical and the alias URL of one screen does not remount it.
- **I3 — Reserved slugs.** A section slug can never equal a top-level segment of any filesystem route (`api`, `pos`, `settings`, `login`, …), a locale tag (`en`, `es`), or an internal prefix (`_app`, `ingest`, `.well-known`, `vendor`, `icons`). The reserved set is derived from the route manifest + filesystem in a test, not hand-listed, so a future top-level route is reserved automatically. Slug grammar `^[a-z][a-z0-9-]{0,31}$`; page slugs unique within a section; section slugs unique within the org.
- **I4 — Aliasable targets are static app screens.** A target must be a `SCREEN_DESIGN_MANIFEST` pattern under `(app)` with no `[param]` segment. Redirect routes (`/pos`), dynamic records and public routes are not aliasable.
- **I5 — Known prefixes cost nothing.** A request whose first canonical segment is a known top-level segment never consults the alias layer (no fetch, no DB read). Only unknown prefixes trigger one cached resolution.
- **I6 — Change is immediate.** Saving the config invalidates the org's cache and the app layout data; the sidebar updates without reload, and a removed alias answers 404 on the next request.
- **I7 — Nothing changes for orgs without sections.** Empty config ⇒ identical nav, identical guards, identical bundle except one empty `navConfig` field.
- **I8 — The client never receives sections it is not granted.** The app layout ships the config already filtered for the member (`roles` lists stripped); the full document is readable only with `settings:manage`.

### Mechanism (summary; full evaluation in `research.md` R1)
A universal `reroute` hook composes paraglide's locale strip with an alias step: known first segment ⇒ unchanged; otherwise resolve `/<section>/<page>` → target through the member's filtered `navConfig` (client cache, filled from `page.data.navConfig`) or, when cold (first navigation with `ssr=false`, server data requests), one same-origin `GET /api/nav/resolve?path=…` that applies I1's grant check. The server hooks then read the org's config (cached), resolve the alias, and run the existing module-availability and route-access guards on the target path plus the grant check on the alias (404 when not granted, so section names do not leak; the target's own `deniedStatus` otherwise).

## DELTA (each transition → slice → proof)

| # | Transition | Slice | Proof |
|---|---|---|---|
| T1 | New org document `app_nav_config` (jsonb, RLS like `app_table_config`) + Drizzle mirror + cached service `readNavConfig/writeNavConfig` | S1 | migration applies on the QA stack (`qa-stack` CI job); `scripts/qa/seed/seed.contract.test.ts` asserts the seeded `staff` section row; `migration-seed-pairing` passes |
| T2 | Pure nav-config model: types, zod schema, `validateNavConfig` (I3, I4, uniqueness, limits), `resolveNavAlias`, `aliasGranted`, `visibleNavConfig` (I8), `aliasableTargets`, `reservedSectionSlugs` | S1 | `src/lib/nav/custom-sections.test.ts`: reserved set ⊇ every first segment of `discoverPageEndpoints()` and `availableLanguageTags`; grammar; duplicates; owner/platform-admin always granted; empty roles = all; non-static targets rejected |
| T3 | `GET/PUT /api/nav/config` (`settings:manage`), `GET /api/nav/resolve` (member; grant-filtered); `/api/nav` added to `API_WRITE_PREFIXES` → `settings:manage` | S1 | `src/routes/api/nav/server.test.ts` (403 for a manager, 400 on reserved slug / bad target / unknown role, 200 round-trip; resolve 200/404); `rbac.service.test.ts` case for the prefix |
| T4 | App layout bundle gains `navConfig` (filtered, `depends('app:nav-config')`); `App.Locals.navConfig` | S1 | `src/routes/(app)/layout.server.test.ts` (field present, filtered by roles, `{}` on service failure) |
| T5 | Universal reroute: paraglide ∘ alias (`src/lib/nav/alias-reroute.ts`, `src/hooks.ts`); client cache set by `(app)/+layout.svelte` | S2 | `src/lib/nav/alias-reroute.test.ts`: known prefix ⇒ no fetch, unchanged; cached alias ⇒ target without fetch; cold ⇒ one fetch, cached after; fetch 404 ⇒ unchanged; `/es/staff/sell` ⇒ `/pos/sell`; query preserved |
| T6 | Server guards alias-aware: grants (404) + target policy + target module availability | S2 | `src/hooks.tenant.test.ts` cases: staff → `/staff/sell` 200; viewer (not in roles) → 404; staff without `pos:create` → 403; POS toggled off → 404; unknown `/staff/nothing` → unchanged 404 |
| T7 | `canViewPath` alias-aware (I1 on the client) | S2 | `src/lib/access/can.svelte.test.ts`: alias visible iff target visible; alias absent from filtered config ⇒ hidden |
| T8 | Custom sections in `getNavSections` (full sidebar + mobile) and `getModules` (module mode + switcher), active state via `own(alias)`; section side-navs highlight the aliased page | S3 | `src/lib/nav/custom-sections-nav.test.ts` (sections/modules built from a config; a section with no visible pages is dropped; `resolveModuleForNav('/staff/sell')` = the custom module); `sections.test.ts` + `nav-mode.test.ts` stay green |
| T9 | `/settings/navigation` management page (list, create/edit/delete section and page, reorder, roles, target picker) + registry + manifest + six counts + settings tab + i18n | S4 | `route-design-contracts.test.ts`, `ui-audit-inventory.test.ts`, `frontend-contract-scanner.test.ts` green with `161/150/11/28`; `route-access-authority.test.ts` asserts `org-capability:settings:manage`; archetype test green with no allow-list entry; `lint:design && lint:tokens` no new debt |
| T10 | End-to-end proof on `dev:local` with personas owner / staff / viewer; evidence + docs + ledger | S5 | `quickstart.md` scenarios with screenshots under `specs/037-custom-nav-sections/evidence/`; hub `AGENTS.md` RBAC checklist gains the alias rule |

## User Scenarios & Testing

### US1 — Owner builds a "Staff" section from existing pages (P1)
Owner opens Settings → Navigation, creates section `Staff` (slug `staff`, roles `staff`), adds page `Sell` → `/pos/sell` and page `Appointments` → `/pos/appointments`, saves.
1. **Given** the empty config, **When** the owner saves the section, **Then** `Staff` appears in the sidebar immediately with two items linking to `/staff/sell` and `/staff/appointments`, and the module switcher lists `Staff`.
2. **Given** slug `pos` or `api`, **When** saved, **Then** the form shows "reserved" and nothing is written (400 from the API as well).
3. **Given** a target typed as `/pos/catalog/123/edit` or `/pos`, **When** saved, **Then** it is rejected: only static app screens are offered by the picker.

### US2 — A staff member works from `/staff/sell` (P1)
1. **Given** a `staff` member with POS create capability, **When** they open `/es/staff/sell` (deep link, refresh, or sidebar click), **Then** the URL stays `/es/staff/sell`, the screen is the POS till with the shift banner and today's activity, selling a ticket works, and the sidebar highlights Staff → Sell.
2. **Given** the same member in module mode, **When** they pick `Staff` in the switcher, **Then** the sidebar shows the Staff pages only and the POS layout renders its shift strip (module-mode branch).
3. **Given** the member navigates from `/staff/sell` to `/pos/sell`, **Then** the till keeps its cart (no remount).

### US3 — RBAC narrows, never widens (P1)
1. **Given** a `viewer` (not in the section's roles), **When** they open `/staff/sell`, **Then** 404 "Not found"; the sidebar never showed the section.
2. **Given** a `staff` member whose role lost `pos:create`, **When** they open `/staff/sell`, **Then** 403 "You do not have access to this module." — the same answer `/pos/sell` gives — and the item is hidden from the sidebar.
3. **Given** POS toggled off for the org, **When** anyone opens `/staff/sell`, **Then** 404, as `/pos/sell` would.
4. **Given** the org `owner`, **When** sections exist that grant only `staff`, **Then** the owner still sees and opens them.

### US4 — Change and removal are immediate (P2)
1. **Given** a section renamed to slug `front`, **When** saved, **Then** `/front/sell` works and `/staff/sell` is 404 on the next request; the sidebar shows the new URL without reload.
2. **Given** a page deleted, **When** a member who had the tab open refreshes, **Then** 404.

### Edge cases
- A later hub release adds a filesystem route whose first segment equals an existing section slug: the static route wins (known prefix short-circuit); the section is dropped from nav and flagged "slug is now reserved" in Settings → Navigation. Same for a target screen that is retired (flagged "target no longer exists").
- A role referenced by a section is deleted (`deleteCustomRole`): the grant is ignored; the settings page shows the raw key as "unknown role".
- The member switches org: the layout bundle re-runs, the client alias cache is replaced; an alias of the previous org resolves to 404 via `/api/nav/resolve`.
- Unprefixed `/staff/sell`: paraglide's handle redirects to `/<locale>/staff/sell` as for any page; then the alias resolves.
- `/staff/sell/anything`: no alias (exact page match only) → 404.
- Alias of a settings page (e.g. `/settings/roles`): allowed; intersection keeps it admin-only.
- Hard-coded links inside an aliased screen (e.g. the till's link to `/pos/tickets/{id}`) leave the custom section for the canonical URL. Accepted in v1 (I2 concerns the page itself, not its outbound links); listed in the ledger.
- Section with zero visible pages for a member: hidden (`hasVisibleSectionItems`); still listed in settings.
- Two members editing the config concurrently: last write wins (whole-document PUT, admin-only surface); the page re-reads after save.

## Requirements

### Functional
- **FR-001** An org member with `settings:manage` can create, rename, reorder and delete sections `{slug, label, icon?, roles[]}` and, inside each, pages `{slug, label, icon?, target, roles[]}`; limits: ≤ 20 sections, ≤ 30 pages per section, labels ≤ 40 chars, icon = one emoji or an icon-map key.
- **FR-002** A page's alias URL is `/<section.slug>/<page.slug>`; opening it renders the target screen with its full layout chain and loads, at the alias URL, in every locale (I2).
- **FR-003** Access to an alias is the intersection in I1; denial statuses: 404 when not granted by the section/page roles or the target module is unavailable, otherwise the target's own status.
- **FR-004** Custom sections render in the full sidebar, the mobile menu, module mode and the module switcher through one helper, filtered by `canViewPath` like built-in items; items highlight on the alias path; the target's section nav highlights the aliased page (D3).
- **FR-005** Slugs obey I3; targets obey I4; the API rejects violations with 400 and a field-level reason; the UI prevents them before submit.
- **FR-006** The config is per org, stored as one document, cached and invalidated on write (I6); members receive only granted sections (I8).
- **FR-007** The management page is a hub route (`/settings/navigation`) gated `org-capability:settings:manage`, registered in the route manifest, access registry, settings nav and the six route-count pins; every string is a Paraglide message; UI uses semantic tokens and existing components only.
- **FR-008** Known-prefix paths incur no alias work (I5); unknown-prefix paths incur at most one cached resolution per navigation.
- **FR-009** The seeded QA business org carries a `staff` section (`sell`, `appointments`) so personas can exercise US2/US3 without manual setup.

### Key entities
- **NavConfig** — the org document `{ version: 1, sections: NavSection[] }`.
- **NavSection** — `{ id (uuid), slug, label, icon?, roles: string[], pages: NavPage[] }`; `roles` are role keys from the org's catalog (system + `org_roles`).
- **NavPage** — `{ id (uuid), slug, label, icon?, target, roles: string[] }`; `target` = static `(app)` screen pattern.
- **Alias** — the derived pair `(path = /<section>/<page>, target)`; never stored separately.

## Success Criteria
- **SC-001** An owner creates a section with two alias pages in under 2 minutes without reading docs (US1 on the QA stack).
- **SC-002** 100% of the US3 matrix (viewer / staff-without-cap / POS-off / owner) answers exactly as the canonical URL would, verified by `src/hooks.tenant.test.ts` and the quickstart run.
- **SC-003** Zero behaviour change for an org with no sections: the existing nav/route/RBAC test suites pass untouched (`sections.test.ts`, `nav-mode.test.ts`, `route-access-authority.test.ts`, `modules-rbac.test.ts`).
- **SC-004** A reserved slug can never be saved: the reserved-set test fails the moment a new top-level route is added without the set covering it (derived, not listed).
- **SC-005** Design debt does not increase (`lint:design`, `lint:tokens` ratchet); `bun run check` 0 errors / 0 warnings on every slice.

## Assumptions
- Role keys are the grant unit (not individual users). Per-user grants are out of scope; a custom role is the hub's existing way to express "these people".
- Aliasing the same target twice (two sections both pointing at `/pos/sell`) is allowed.
- Section labels are user data and are not translated; UI chrome is.
- The command palette, hotkey chords (`GNav`), the assistant's page list (`visiblePages`) and `HUB_ROUTE_MAP` keep offering canonical paths only; the assistant navigating to `/pos/sell` still works for a staff member who reached it via `/staff/sell`.
- Redirects from old alias URLs after a rename are not kept (v1).

## Out of scope (named cuts)
- Free-content pages (D2) — sandbox pages spec 010/013/014.
- Replacing the target's section nav with the custom section's pages inside an aliased screen (D3).
- Rewriting hard-coded outbound links inside aliased screens to stay under the alias prefix.
- Per-user grants, per-section managers, alias redirects on rename, nested sections, aliases with query strings or dynamic params, palette/assistant integration of alias pages, aliasing non-`(app)` routes.
- Reordering by drag-and-drop in the settings page (v1 uses move up/down); per-user reordering of custom sections already works through the existing `navOrder` preference.

## Verification (end-to-end, run by the implementer of S5)
`quickstart.md` — QA stack `bun run dev:local`, personas from `.env.qa.local`: owner creates the section (or uses the seeded one), staff opens `/es/staff/sell` and sells, viewer gets 404, POS toggle off gives 404, rename then old URL 404. Evidence: screenshots + the vitest run logs under `specs/037-custom-nav-sections/evidence/`.
