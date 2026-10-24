# Feature Specification: Custom navigation sections with alias pages and their own RBAC

**Feature Branch**: `spec/037-custom-nav-sections` (meta, → `dev`) · hub slices `feat/nav-sections-s1..s6` → `master`
**Created**: 2026-10-23 | **Amended**: 2026-10-23 (Amendment A) | **Status**: Draft — **security + data tag** (new RBAC surface, new org table): the owner approves this spec before code AND merges every hub slice (constitution Principle V).
**Input**: Owner (verbatim, v1): "I need you to spec/plan the feature for users to create their own pages/sections. For new sections, they would also be able to re-use existing pages from other sections (but the url to this new page would be new, even though the point to the same destination). eg. I want to move /pos/sell to my new "/staff" section, so the new route would show exactly the contents of /pos/sell, but under /staff/sell. These sections/pages would have their own rbac."

## Amendment A — symlink model (2026-10-23)

Owner, after reading v1 (verbatim): "so it'd behave like a symlink, where they both point to the same content through different names/paths, and there's a "main" location which is pos/sell. So in the example of staff/sell, the user right-clicks the pos/sell navmenu item and the context menu shows "duplicate"/copy options, along with a "move" option (to move the page between sections new routes would be "/<section>/<page>/<subpages>"). Referencing the screenshot, there should be a context menu for items (copy/duplicate/move/rename/delete/hide), and a general context menu (new page/paste/etc). Remember, RBAC view rules are tied to pages, and the edit/delete rules are tied to data."

What changes against v1:

| v1 | Amendment A |
|---|---|
| A page is an *alias*; the canonical page stays put (D4 "copy, not move") | Every page has ONE **main** location and zero or more **links**. Built-in pages start with their filesystem URL as main. **Move** changes the main (`/pos/sell` → `/staff/sell`); **Copy/Paste/Duplicate** create links. D4 is superseded. |
| Alias = exact `/<section>/<page>` (I4 static targets only, depth-2 short-circuit) | A link or a moved main maps a **prefix**: `/staff/sell/<rest>` → `/pos/sell/<rest>`. Subpages, including dynamic segments, resolve under the new location. I4 is replaced (see I4′). |
| RBAC = `roles[]` on section and page; access = intersection with the target (D1 "intersect") | **View rules are tied to pages; edit/delete rules are tied to data.** A link is a page with its own **view rule**, stored where every other page view rule already lives (`permission_rules`, key `nav.<pageId>`, edited in Settings → Roles). Data mutations stay gated by the module capabilities at the API. A link may relax the target's page-level view policy down to the **module-view floor** — never below it, because target server loads read data with no capability check of their own (AS-IS §Data reads). D1 is superseded; `roles[]` is removed. |
| Management = `/settings/navigation` page (S4) | Management = **context menus** on nav items, section headers and the empty sidebar area (right-click, long-press, keyboard), reusing the hub's `ContextMenu` primitive. No new screen; route-contract counts untouched. |
| D2 no free-content pages · D3 keep the target's section nav | **Both stand.** "New page" = pick an existing screen to link (D2). Inside `/staff/sell` the POS layout keeps its own section nav (D3); a *moved* page is dropped from its native nav, so that nav shows no active item while the moved page is open (accepted, see Edge cases). |

The rest of this document is the revised body. Rejected alternatives for each new decision are in `research.md` R10–R14.

## Owner decisions (answer before `/speckit-implement`; recommended answers are the spec's defaults)

| # | Question | Recommendation (= what this spec assumes) |
|---|---|---|
| D5 | **Can a link's view rule relax the target's page-level view policy?** Today `/pos/sell` requires `org-capability:pos:create` just to open (`route-access-registry.ts:135`). With the view/data split, a role ticked "view" on link `/staff/sell` but lacking `pos:create` would see the till and every write would 403 at `/api/pos/*`. | **Yes, down to the module-view floor** (`pos:view` for anything under `/pos`). That is the owner's stated model, and the floor is what keeps data reads safe (invariant I1′). The spec adds the "write button the role can't use" UX: buttons disabled via `canAct()` with the `m.no_permission()` title, the pattern `crm/[contactId]/+page.svelte:623-624` already uses; the till's charge button is the one gap found (S5). If the owner prefers v1's pure narrowing, S2 keeps evaluating the target's own policy for links too — a 3-line change, named in `research.md` R12. |
| D6 | **Hide: org-wide (admin) or per-user?** | **Org-wide, admin-only (`settings:manage`), stored in the org nav document.** Hide is a *nav* operation (the URL still resolves; access is the view rule), so it belongs with the other structural edits and needs no new preference. Per-user hide = follow-up (ledger); today's per-user customisation stays ordering + home page (`navOrder`, `landingPage`). Non-admins get the existing menu only ("Set as home page"). |
| D7 | **After a Move, what does the old URL do?** 33 hard-coded `/pos/...` hrefs, bookmarks and the assistant's route map still say `/pos/sell`. | **Keep resolving, then client-replace the address to the new main** (`/pos/sell/<rest>` renders the page and the app shell rewrites the URL to `/staff/sell/<rest>` with `replaceState`). Nothing breaks, and the sidebar highlights the new location. Alternative (404 the old URL) would turn every hard-coded link into a dead end until each is rewritten. |

**Earlier owner answers (2026-10-23):** D1 intersect → **superseded** by the view/data split (I1′). D2 no free-content pages → **stands**. D3 keep the target's section nav → **stands**. D4 copy-not-move → **superseded**: Move is in scope. Owner directed implementation by subagents right after the write-up (spec approval for code start); merges stay with the owner.

Decided from evidence (not open): link view rules live in `permission_rules`/Settings → Roles, not in a parallel `roles[]` (research R11); no `/settings/navigation` page (R13); Duplicate/Paste create entries in custom sections only (R10); dynamic segments under a moved or linked page resolve (I4′).

No `[NEEDS CLARIFICATION]` markers remain in the body.

## AS-IS (evidence; every anchor is `minion_hub` `origin/master` @ `7d06cdd4` unless stated)

### Navigation is code, not data
- Sidebar sections come from code registries only: static core sections + plugin-category sections, composed by `getNavSections()` (`src/lib/components/layout/sections.ts:508-525`), rendered by `Sidebar.svelte:34-40,351-354` and the mobile menu (`Topbar.svelte`). Items are filtered per user with `canViewPath(href)` (`Sidebar.svelte:352`). In **full** mode the sidebar lists *modules* as items (`sections.ts:228-235`: one `/pos` item, matcher `startsWith('/pos')`); pages appear in **module** mode (`Sidebar.svelte:307-350`, items from `navMode.activeModule.items`) and in each area's side-nav (`PosNav.svelte:13-18` via `getAreaItems('pos')`, `modules.ts:111-…`). The owner's screenshot (module "MARKETING", groups CRM / REDES SOCIALES) is the module-mode branch.
- The ERPNext-style module switcher lists modules from `getModules()` (`src/lib/nav/modules.ts:456-664`); `visibleModules()` (`:671-679`) drops what the user cannot open; `resolveModuleForNav(path)` (`:682-685`) picks the active module by path prefix.
- **Non-admin roles default to module mode**: `defaultNavMode` returns `'module'` unless the member holds owner/admin/manager (`src/lib/state/ui/nav-mode.svelte.ts:22-23,61-65`). Mobile is always module-scoped (`Topbar.svelte:57-66`).
- Per-user nav customization exists only as *ordering* (`navOrder` preference, drag-and-drop, `Sidebar.svelte:125-146,209-221`, shared with mobile via `nav-order.ts`) and a *landing page* (`landingPage` preference, `:49-53`; honored by `hooks.server.ts:415-419`). No per-org section/page creation exists. Per-org module **toggles** exist (`app_modules`, `src/server/services/modules.service.ts:12-42`, UI `/settings/modules`).
- **A right-click menu already exists on every sidebar item** — hand-rolled: `openCtx()` (`Sidebar.svelte:102-125`), markup `.ctx-menu` with one entry "Set as home page" (`:540-570`), attached with `oncontextmenu` on utility links, module-mode items, full-mode items, sub-items and the settings link (`:290,333,403,474,512`). It does not use the shared `ContextMenu` primitive, has no keyboard opener and no touch path. The mobile sheet (`Topbar.svelte:396-410`) has no context menu.
- The hub's **context-menu primitive** is `src/lib/components/ui/ContextMenu.svelte` (point-anchored, `role="menu"`, first item focused, arrow/Enter/Escape/Tab handling, one-level-or-deeper `children` submenus, `selection: 'radio' | 'checkbox'`, `danger`, `disabled`, outside-click + Escape dismissal via `svelte:document`, `use:floatingLayer`). Exported from `$lib/components/ui` (`index.ts:25,47`). `src/lib/records/RecordContextMenu.svelte` wraps it with the opener contract: `oncontextmenu` + `keydown` `ContextMenu` / `Shift+F10` (`:40-46`), skipping inputs, anchoring keyboard opens at the host's rect. `DataTable.svelte:1689` uses the same key test. `RecordAction extends ContextMenuItem` with `run` (`src/lib/records/actions.ts:4-7`). No long-press helper exists (`git grep -i longpress` → none; `scroll-memory.ts` only listens to `touchstart`).
- Org-level configuration documents follow one pattern: one jsonb row per org, RLS via `app_ledger` + `app.current_org_id` GUC, cached under the tenant `settings` tag — `app_table_config` (`supabase/migrations/20260922000000_table_config.sql`, `src/server/db/pg-schema/table-config.ts:9-13`, `src/server/services/table-config.service.ts:17-53`, `GET/PUT /api/tables/config`, shipped by `(app)/+layout.server.ts:151-157,271`).

### `/pos/sell` and its layout chain
- Files: `src/routes/(app)/pos/sell/+page.svelte` (1,923 lines) + `+page.server.ts`; layouts above it: `src/routes/(app)/+layout.svelte` (app shell) and `src/routes/(app)/pos/+layout.svelte` (`SectionShell` + `PosNav` + `ShiftBanner`; module mode drops the side-nav and renders the shift strip).
- Server loads: `(app)/+layout.server.ts:61-272`, `pos/+layout.server.ts:14-65` (`depends('pos:shift')`, `'pos:pending'`; POS settings, open shift, colleagues' shifts, pending-work badge), `pos/sell/+page.server.ts:24-90` (`depends('pos:sell')`; sellables, bundles, resources, event types, **today's tickets, shifts and payments**).
- Guards (all central, path-based): view permission `pos.sell:view` from `MODULE_SUBRESOURCES.pos` (`src/lib/routes/route-access-registry.ts:77-83`) and the stronger exact override `'/pos/sell': 'org-capability:pos:create'` (`:135`, comment `:129-134`: closes the hole that a viewer "could open the page"); module 404 via `MODULE_MANIFEST.pos` (`src/lib/modules/availability.ts:105-109`) and `isAppRouteBlocked`.
- Locale: no `[locale]` directory; paraglide rewrites `/es/pos/sell` → `/pos/sell` through the universal `reroute` (`src/hooks.ts:1-3`); `canonicalPath()` strips the prefix (`src/lib/canonical-path.ts:16-22`). The app is client-rendered (`ssr = false`, `src/routes/+layout.ts:17`).
- Hard-coded `/pos/...` hrefs inside POS pages/components: 33 occurrences across 31 files. Prefix matchers on `/pos`: `sections.ts:234`, `modules.ts:463`. The assistant route map `src/routes/api/gateway/_shared/hub-route-map.ts` offers canonical paths only.

### Data reads are gated by the route guard, not by the services (CRITICAL for I1′)
- `pos/sell/+page.server.ts:24-27` and `pos/+layout.server.ts:14-22` call `getCoreCtx(locals)` and then the services (`listSellables`, `listTickets`, `listShifts`, `listPaymentsFor`, `getOpenShift`, `listOpenShifts`) **with no capability check**; the comment at `sell/+page.server.ts:19-20` says so: "View perm (`pos.sell:view`) is enforced centrally by the root layout guard — this load only fetches the tab's data." `pos.service.ts` and `scheduling.service.ts` contain no `requireOrgCapability` / `caps.can` call (`git grep` → none).
- The **API** reads ARE gated: every `GET` under `src/routes/api/pos/**` calls `requireOrgCapability(locals, 'pos', 'view')` (e.g. `accounts/+server.ts:20`, `appointments/+server.ts:52`, `categories/+server.ts:24`, `slots/+server.ts:10`); writes map to `pos` actions through `API_WRITE_PREFIXES` `['/api/pos', 'pos']` (`rbac.service.ts:1132`) plus per-handler `requireOrgCapability` (`edit`/`manage`/`create`).
- Owner scope and field masking apply only to the modules in `OWNER_SCOPABLE_MODULES` / `FIELD_LEVEL_MODULES` and are enforced inside the owning services — they travel with the data (module-level), never with the URL.
- **Consequence:** whoever passes the route-level view check for a POS screen receives the page's server-load data. A link whose view rule is granted to a role without `pos:view` would ship sellables, today's tickets and payments to that role while its follow-up `/api/pos/*` GETs 403. Hence the module-view floor in I1′.

### Route access is resolved by path, and unknown paths are *open*
- `applyRouteAccessGuard` (`src/hooks.server.ts:250-278`) evaluates `decideRouteAccess(canonicalPath(event.url.pathname))`; `applyModuleAvailabilityGuard` (`:287-313`) evaluates `isAppRouteBlocked(canonicalPath(...))`; both are called from `finishApp` (`:429-430`) and the `AUTH_DISABLED` bypass branch (`:234-235`).
- `resolveRouteAccess()` returns `policyId: 'authenticated'` for any path that matches no rule (`src/lib/routes/route-access-policies.ts:121-138`). A URL such as `/staff/sell` rerouted to the POS page but absent from the registry would pass the central guard for every signed-in member. The alias layer MUST evaluate the **target** path.
- Client mirror: `canViewPath(path)` (`src/lib/access/can.svelte.ts:58-63`). Button-level gating: `canAct(module, action)` (`:39-42`) reads the `<module>:<action>` strings and is used in 60 files (`ShiftBanner.svelte:410,420,438,451` gates "open shift" on `pos:edit`; `SellCart.svelte:94` price override on `pos:manage`; `ClientAccountDrawer.svelte:121-123`; `crm/[contactId]/+page.svelte:623-626` = `disabled` + `title={m.no_permission()}`). The till's **charge** path (`sell/+page.svelte:690-697`, `chargeDisabled`) does not consult `canAct` — the charge posts `/api/pos/tickets` (`pos-ticket-transport.ts:85`) → `pos:create` at the API.

### RBAC primitives available
- Modules × actions matrix: `MODULES` (`rbac.service.ts:40-66`), `ACTIONS` (`:69`). Roles: system `owner > admin > manager > staff > viewer` plus per-org custom roles (`listRoleCatalog`, `createCustomRole`, `deleteCustomRole`). Assignments in `member_roles`; overrides in `permission_rules` with a **free-text `module` key** (`CapabilityOverrideRow.module: string`, `:251`).
- `defaultCaps(roleKey, module)` (`:165-186`): owner/admin ALL; manager RWXE(M) on business modules; staff RWX on crm/scheduling/support/comms/pos/stock, VIEW on finance/sales/projects/memberships; **viewer VIEW on every business module**; unknown modules NONE.
- `buildCapabilities()` (`:270-330`): a dotted key (`pos.sell`) with no explicit override inherits its parent module recursively (`effective()`, `:287-292`). A `nav.<id>` key without an override would therefore fall to `defaultCaps(role, 'nav')` = NONE for non-admin roles — the default for links must NOT come from `caps.can` (TO-BE: default = the target's own policy).
- Only `isModuleOrSub()` (`:1072-1080`, static set from `ALL_SUBRESOURCES`) validates keys at `POST/DELETE /api/roles/overrides` (`src/routes/api/roles/overrides/+server.ts:36,52`).
- `listRbacRoles(orgId)` (`:530-600`) builds, per role, `modules: MODULES.map(...)` with `subResources` from `MODULE_SUBRESOURCES[mod]`; the matrix UI `src/lib/components/users/RbacRolesSection.svelte` renders sub-resources under a "Sections" heading (`:609-650`) with the full action grid (`:440-466`) and `toggleChild`/`resetSub` posting to `/api/roles/overrides` (`:221,235`). Page `settings/roles/+page.server.ts` passes `businessModules` / `adminModules` (string lists) and is gated `users:manage`.
- The client receives `{ permissions: string[], roles: string[] }` (`permissions.service.ts:118-131`): `capsToLegacyPermissions` adds `${key}:view` for every `ALL_SUBRESOURCES` entry (`:84`) and `<module>:<action>` for `BUSINESS_ACTION_MODULES` (`:88-94`); platform admins get the static `PERMISSIONS` list (`:118`). `resolveCapabilities` caches raw rows 2 m under `rbacCacheTags(orgId)`; `invalidateRbac(orgId)` (`:319-321`) flushes them.

### Route contract and other registries
- A new filesystem page would change six pinned counts (`route-design-validation.ts:14-42`, `ui-audit-inventory.test.ts:12-13,133`, `frontend-contract-scanner.test.ts:10`) and need a manifest entry. **Amendment A adds no filesystem page** (R13) — API routes are not counted.
- Static screens: `SCREEN_DESIGN_MANIFEST` (`route-design-manifest.ts`), e.g. `/pos/sell` (`:530`), `/pos/catalog/[productId]/edit` (`:526`), `/crm/[contactId]` (`:478`); redirect routes (`/pos`) are separate.

### Hub migrations and seeds (how schema ships today)
- Plain SQL in `supabase/migrations/` applied by `scripts/db-migrate.ts`; Drizzle files hand-written; **`drizzle-kit push` is never used**. A PR touching `supabase/migrations/*.sql` must also touch `scripts/qa/seed/**` (`scripts/qa/check-migration-seed-pairing.ts`); seed rows register in `scripts/qa/seed/matrix.ts` and are asserted by `seed.contract.test.ts`.

### SvelteKit facts the mechanism depends on (kit 2.70.2 in `minion_hub/node_modules`)
- `reroute` is awaited and receives `{ url, fetch }` on server and client; it returns a **path**, so a prefix rewrite (`/staff/sell/x` → `/pos/sell/x`) is as valid as an exact one. `event.route.id` after reroute is the target's route; `event.url`/`page.url` keep the requested URL. `replaceState` from `$app/navigation` changes the address without a navigation (used by `TimeOffCalendar.svelte:117`, `url-state.svelte.ts:211`).

### Existing S1 work (worktree `~/.cache/claude-tmp/hub-037-s1`, uncommitted, v1 model)
Model/schema/service/API/layout/seed per v1 exist and compile; `roles[]`, `aliasGranted`, exact-match `resolveNavAlias`, depth-2 resolve. Three files (`src/lib/nav/back-nav.svelte.ts`, `prefill.ts`, `routes.test.ts`) carry **formatting-only churn** (tabs → spaces; not in v1 tasks, not needed — `bun run check` is svelte-check only, `format:check` is a separate script). `tasks.md` S1 is written as a delta from that state.

## TO-BE

Every hub page has one **main** location and any number of **links**. Built-in pages start with their filesystem URL as main. An org admin (`settings:manage`) reshapes navigation from the sidebar itself: right-click (or long-press, or the context-menu key) a nav item, a section header, or the empty sidebar area. Items offer Copy · Duplicate · Move… · Rename… · Hide · Delete/Restore · Permissions…; headers offer New page… · Paste · Rename… · Hide · Delete section…; the empty area offers New section… · Paste into › · Not shown ›. Custom sections appear everywhere built-in ones do (full sidebar, module mode, mobile sheet, module switcher). Opening a link or a moved page shows exactly the target screen — same loads, same layout chain, same data, same buttons — at the new URL, including its subpages. **View** is a per-page rule (links get their own row in Settings → Roles; mains keep theirs); **edit/delete** stay the module's data capabilities enforced at the API.

### Invariants
- **I1′ — View is per page; data is per module; the floor is the module view.** For a link L with target T: `access(L/<rest>) = view(L) ∧ moduleAvailable(T) ∧ granted(moduleViewFloor(T))`, where `view(L)` is the link's own rule (`nav.<L.id>:view`; default = T's own policy until an admin edits it) and `moduleViewFloor(T)` is the `<module>:view` permission of T's module prefix (`pos:view` for `/pos/*`; when T has no module prefix rule — e.g. `/settings/*` — the floor is T's own resolved policy). For a moved main M: `access(M/<rest>) = access(T/<rest>)` exactly as canonical. No API endpoint is aliased; every data call from the screen hits the same `/api/*` paths with the same capability checks; owner scope and field masking are untouched (they live in the services). Platform admins (`user.role === 'admin'`) are always granted. Denials: link view not granted → 404 (no section-name leak); floor not met → 403 "You do not have access to this module."; module off → 404.
- **I2 — Same URL, same screen.** The browser URL stays the (locale-prefixed) link/main path; `page.route.id` is the target's route id; no redirect. Query string and hash are preserved. Refresh and deep links work. Navigating between a link and its target does not remount the screen.
- **I3 — Reserved slugs.** A section slug never equals a top-level segment of any filesystem route, a locale tag, or an internal prefix; the set is derived from the manifest + filesystem in a test. Grammar `^[a-z][a-z0-9-]{0,31}$`; page slugs unique within a section; section slugs unique within the org; **one `main` entry per target across the document**.
- **I4′ — Prefix mapping.** An entry at `/<section>/<page>` with target T maps the whole subtree: `/<section>/<page>/<rest>` → `T/<rest>` for any `<rest>` (including dynamic segments). A target must be a static `(app)` screen pattern (no `[param]`, not a redirect, not public) — the *entry* is static; what lives under it follows the target's filesystem.
- **I5 — Known prefixes cost nothing.** A request whose first canonical segment is a known top-level segment never consults the alias layer. Only unknown prefixes trigger one cached resolution (longest-prefix match on the org document).
- **I6 — Change is immediate.** Every context-menu operation is one whole-document `PUT`; the org cache, the RBAC permission cache and the app layout data are invalidated; the sidebar updates without reload; a removed entry answers 404 on the next request.
- **I7 — Nothing changes for orgs without a document.** Empty config ⇒ identical nav, identical guards, identical permission strings, identical bundle except one empty `navConfig` field.
- **I8 — The client never receives links it may not see.** The app layout ships the document filtered by the member's `nav.<id>:view` permissions; `hidden` entries ship only to members with `settings:manage` (so they can be shown again).
- **I9 — Moved mains stay reachable at the old URL (D7).** `T/<rest>` for a moved T keeps rendering and the app shell replaces the address with `main(T)/<rest>`; the native nav no longer lists T.
- **I10 — Hide is nav-only.** A hidden page or section disappears from every nav surface for every member but its URL keeps resolving under its view rule.

### Operations (state transitions on the org nav document `C`)
Entry = `{ id, kind: 'link' | 'main', slug, label, icon?, target, hidden? }` inside a section; `C.builtin[target]` = `{ label?, hidden? }` for built-in pages in their native nav.

| Op | On | Transition | Result |
|---|---|---|---|
| Copy | any page item (built-in, link, moved main) | clipboard ← `{ target, label, icon }` (in-memory, per tab) | enables Paste |
| Paste | custom section header / "Paste into ›" (empty area) | `section.pages += link{ slug: unique(slugify(label)), label, icon, target }` | new link `/<section>/<slug>` |
| Duplicate | item in a custom section | `section.pages += link{ ...entry, id: new, slug: entry.slug + '-2' | '-3' … }` | sibling link |
| Move… | built-in page | `C.sections[dest].pages += main{ slug, label: builtinLabel, target }` (any previous `main` for `target` removed) | main becomes `/<dest>/<slug>`; old URL per I9; dropped from native nav |
| Move… | link or moved main | entry relocated to `dest` (slug kept unless clashing → dialog asks) | path changes; old path 404 |
| Rename… | link / moved main | `entry.label`, `entry.slug` (slug change ⇒ old path 404, no redirect) | — |
| Rename… | built-in page in its native nav | `C.builtin[target].label` | label override; URL unchanged |
| Delete | link | entry removed | path 404; its `permission_rules` rows deleted |
| Restore to `<native path>` | moved main | entry removed | page back at its filesystem URL |
| (no Delete) | built-in page in native nav | menu offers Hide instead | — |
| Hide / Show | item (entry or built-in) · section | `hidden` toggled on the entry / `C.builtin[target]` / section | I10 |
| Permissions… | link (`users:manage`) | navigates to `/settings/roles` (row "Custom pages › `<Section> › <Page>`") | view rule edited where every other view rule is |
| New section… | empty area | `C.sections += { slug, label, pages: [] }` | header appears (empty sections are shown only to admins) |
| New page… | custom section header | `Picker` of aliasable screens → Paste semantics | link (D2: no free content) |
| Rename… / Delete section… | custom section header | label/slug; delete removes the section with its entries (moved mains revert to native) after `ConfirmDialog` | — |

Who sees what: structural entries require `settings:manage` (`canClient('settings:manage')`); "Permissions…" requires `users:manage`; everyone keeps "Set as home page". Page items are nav items whose href is an aliasable screen (the full-mode `/pos` module item is a redirect, so it only gets the existing entry).

### Mechanism (summary; full evaluation in `research.md` R1, R10–R14)
A universal `reroute` composes paraglide's locale strip with a prefix step: known first segment ⇒ unchanged; otherwise the longest entry prefix in the member's filtered document (client cache) or, when cold, one same-origin `GET /api/nav/resolve?path=…` yields `{ prefix, target }` and the path is rewritten `target + rest`. The server hooks read the org document (cached), resolve the prefix, and run the existing module-availability and route-access guards on the rewritten path, with the link's view rule and floor from I1′ applied first. `loadPermissionsForUser` appends `nav.<id>:view` for every link (override row if any, else the target's own policy evaluated against the member's permissions), so the client `canViewPath`, the sidebar filter and the Roles matrix all read one set of strings.

## DELTA (each transition → slice → proof)

| # | Transition | Slice | Proof |
|---|---|---|---|
| T1 | New org document `app_nav_config` (jsonb, RLS like `app_table_config`) + Drizzle mirror + cached `readNavConfig/writeNavConfig` | S1 | migration applies on the QA stack; `seed.contract.test.ts` asserts the seeded `staff` section (one link, one moved main); `migration-seed-pairing` passes |
| T2 | Pure model v2: entries with `kind`/`hidden`, `builtin` overrides, prefix resolution `resolveNavPrefix`, `mainPathFor`, `movedTargets`, `linkViewKey`, `moduleViewFloor`, `visibleNavConfig(config, permissions, canManage)`, validation (I3 incl. one-main-per-target, I4′ targets, limits), the operation functions | S1 | `src/lib/nav/custom-sections.test.ts`: reserved set ⊇ filesystem first segments; prefix match `/staff/sell/x/y` → `/pos/sell/x/y`, longest wins, `/staff` → null; one-main-per-target rejected; each op's before/after document |
| T3 | `GET/PUT /api/nav/config` (`settings:manage`; PUT invalidates settings + RBAC caches and deletes orphan `nav.*` override rows), `GET /api/nav/resolve` → `{ prefix, target }` (link view + floor applied); `/api/nav` in `API_WRITE_PREFIXES` | S1 | `src/routes/api/nav/server.test.ts` (403 manager; 400 reserved / bad target / two mains; 200 round-trip; resolve 200 for `/staff/sell/abc`, 404 for a role without `nav.<id>:view`, 403 without floor) |
| T4 | Permission strings: `nav.<id>:view` per link (`Capabilities.explicitView(key)` + target-policy default; platform admins get all); layout bundle gains filtered `navConfig` (`depends('app:nav-config')`); `App.Locals.navConfig` | S1 | `permissions.service.test.ts` (default = target policy; override wins; admin all); `layout.server.test.ts` (link absent without the string; hidden entries only for `settings:manage`; `{}` on failure) |
| T5 | Universal reroute: paraglide ∘ prefix rewrite (`alias-reroute.ts`, `hooks.ts`); client cache from `page.data.navConfig` | S2 | `alias-reroute.test.ts`: known prefix ⇒ no fetch; cached prefix ⇒ `target+rest` without fetch; cold ⇒ one fetch, cached; 404 ⇒ unchanged; `/es/staff/sell/t/1` ⇒ `/pos/sell/t/1`; query preserved |
| T6 | Server guards prefix-aware with I1′ (link: 404 / floor 403 / target availability; main: target rules) | S2 | `hooks.tenant.test.ts`: staff → `/staff/sell` 200; viewer with link view but POS off → 404; role without `nav.<id>:view` → 404; role with link view but no `pos:view` → 403; moved main `/staff/appointments/new` → evaluated as `/pos/appointments/new` (`pos:create`); canonical paths unchanged |
| T7 | `canViewPath` prefix-aware (I1′ on the client); moved-main client-replace (I9) in `(app)/+layout.svelte` | S2 | `can.svelte.test.ts`: link visible iff `nav.<id>:view` ∧ floor; main visible iff target visible; `layout.svelte` effect unit-tested through `mainPathFor` (pure) |
| T8 | Nav integration: custom sections in `getNavSections` + `getModules`; moved mains dropped from `getAreaItems`/native sections; `builtin` label overrides; hidden filtered; `navPath()` for side-nav active state | S3 | `custom-sections-nav.test.ts`; `sections.test.ts`, `nav-mode.test.ts`, `topbar-parity.test.ts` stay green; empty config ⇒ identical output |
| T9 | Context menus: `NavContextMenu.svelte` (ContextMenu primitive; item / header / general menus; Move picker, Rename dialog, New section dialog, New page Picker, ConfirmDialog; long-press + keyboard opener) wired into `Sidebar.svelte` (replacing the hand-rolled `.ctx-menu`) and `Topbar.svelte`; i18n | S4 | `NavContextMenu.mounted.test.ts` (entries per role; keyboard open; op → PUT body); `lint:design && lint:tokens` no new debt; `Sidebar` set-as-home still works |
| T10 | RBAC surfaces: Roles matrix "Custom pages" rows (view-only grid) via `listRbacRoles(orgId, navLinks)`; overrides API accepts `nav.<uuid>` keys that exist; till charge button gated by `canAct('pos','create')` | S5 | `rbac.service.test.ts` (synthetic module rows); `api/roles/overrides` test (unknown `nav.x` 400, known 200); sell page: charge `disabled` + `title` when the string is absent |
| T11 | End-to-end proof on `dev:local` (owner / staff / viewer), docs, ledger | S6 | `quickstart.md` Q1–Q18 with screenshots under `evidence/`; hub `AGENTS.md` RBAC checklist gains the link rule |

## User Scenarios & Testing

### US1 — Owner builds a "Staff" section from the sidebar (P1)
1. **Given** the full sidebar, **When** the owner right-clicks the empty area below the items and picks "New section…", types `Staff`, **Then** a `Staff` header appears (admins see empty sections) and the module switcher lists `Staff` once it has a visible page.
2. **Given** module mode on POS, **When** the owner right-clicks `Sell` → Copy, then right-clicks the `Staff` header → Paste, **Then** `Staff › Sell` appears linking to `/staff/sell`, `/pos/sell` still lists under POS, and `GET /api/nav/config` shows a `link` entry.
3. **Given** the same, **When** the owner right-clicks `Appointments` → Move… → `Staff`, **Then** `Appointments` leaves the POS list, `Staff › Appointments` opens `/staff/appointments`, and typing `/es/pos/appointments` lands on `/es/staff/appointments` (address replaced, same screen).
4. **Given** slug `pos` or `api` typed in New section, **Then** the dialog shows "reserved" and nothing is written (400 from the API as well).
5. **Given** "New page…" on `Staff`, **Then** the Picker offers static screens only (`/pos` and `/pos/catalog/[productId]/edit` absent).

### US2 — A staff member works from `/staff/sell` (P1)
1. **Given** a `staff` member (has `pos:create`), **When** they open `/es/staff/sell` (deep link, refresh, or sidebar click), **Then** the URL stays, the till renders with the shift banner, selling a ticket works, and the sidebar highlights Staff → Sell.
2. **Given** the moved `Appointments`, **When** they open `/es/staff/appointments/new`, **Then** the new-appointment form renders at that URL (prefix mapping, I4′).
3. **Given** module mode, **When** they pick `Staff` in the switcher, **Then** the sidebar shows the Staff pages only and the POS layout renders its shift strip.
4. **Given** they navigate `/staff/sell` → `/pos/sell` → back, **Then** the cart survives (no remount).

### US3 — View per page, data per module (P1)
1. **Given** a `viewer` and the link's default rule (= `/pos/sell` policy `pos:create`), **When** they open `/staff/sell`, **Then** 404; the sidebar never showed it.
2. **Given** the owner ticks "view" for `viewer` on `Custom pages › Staff › Sell` in Settings → Roles, **When** the viewer opens `/staff/sell`, **Then** the till renders read-only: "Open shift" is absent (`canAct('pos','edit')`), "Charge" is disabled with the no-permission title, and a forced `POST /api/pos/tickets` answers 403.
3. **Given** a custom role with the link ticked but **without** `pos:view`, **When** it opens `/staff/sell`, **Then** 403 "You do not have access to this module." (floor) — and no POS data is loaded.
4. **Given** POS toggled off for the org, **Then** `/staff/sell` and `/staff/appointments` 404, as the canonical URLs would.
5. **Given** the moved `Appointments`, **When** a role without `pos:create` opens `/staff/appointments/new`, **Then** 403 — the moved page keeps `/pos/appointments/new`'s own rule (mains are not relaxed).

### US4 — Change, hide and removal are immediate (P2)
1. **Given** `Staff › Sell` renamed to slug `till`, **Then** `/staff/till` works and `/staff/sell` 404s on the next request; the sidebar shows the new URL without reload.
2. **Given** `Staff › Sell` hidden, **Then** no member sees it in any nav; `/staff/sell` still opens for granted roles; the owner finds it under the empty-area menu "Not shown ›" and shows it again.
3. **Given** `Staff › Sell` deleted, **Then** its `permission_rules` rows are gone and a member with the tab open gets 404 on refresh.
4. **Given** "Restore to /pos/appointments" on the moved main, **Then** POS lists Appointments again and `/staff/appointments` 404s.

### Edge cases
- A later hub release adds a filesystem route whose first segment equals an existing section slug: the static route wins (I5); the section is dropped from nav and listed under "Not shown ›" with "slug is now reserved". Same for a retired target ("target no longer exists").
- A role referenced by a `nav.<id>` override is deleted: the row is orphaned and ignored (same as any `permission_rules` row for a deleted role today).
- Org switch: the layout bundle re-runs, the client prefix cache is replaced; a link of the previous org resolves 404 via `/api/nav/resolve`.
- Unprefixed `/staff/sell`: paraglide's handle redirects to `/<locale>/staff/sell`, then the prefix resolves.
- `/staff/sell/anything` where the target has no such subpage: rewritten to `/pos/sell/anything`, which 404s as it would canonically.
- Two entries whose prefixes nest (`/staff/sell` and `/staff/sell-x`) are distinct slugs; matching is by whole segments, so `/staff/sell-x/…` never hits `/staff/sell`.
- A link to a settings page (e.g. `/settings/roles`): no module prefix rule ⇒ floor = the target's own policy (`org-capability:users:manage`); the link cannot relax it.
- Inside a moved main, the target's section nav (PosNav) shows no active item because the page left that nav (D3 + Move); the sidebar highlights the new location. Accepted; listed in the ledger with "re-point the native nav item at the main" as the follow-up.
- Hard-coded links inside the screen (e.g. the till's `/pos/tickets/{id}`) go to canonical URLs; if that page was moved they client-replace (I9), otherwise they leave the custom section. Accepted (ledger).
- The clipboard is per browser tab and in memory; Paste is disabled when empty.
- Concurrent admins: last write wins (whole-document PUT); the menu re-reads after each save. Ledger: `expectedUpdatedAt` precondition.
- Long-press: Android Chrome already fires `contextmenu` on long-press; the custom timer exists for iOS Safari; a scroll or pointer move cancels it.

## Requirements

### Functional
- **FR-001** An org member with `settings:manage` performs every operation in §Operations from the nav context menus (right-click, long-press ≈ 500 ms, `ContextMenu` key / `Shift+F10` on a focused item or header) in the full sidebar, module mode and the mobile sheet. Limits: ≤ 20 sections, ≤ 30 entries per section, labels ≤ 40 chars, icon = one emoji or an icon-map key.
- **FR-002** An entry's URL is `/<section.slug>/<page.slug>` and maps the target's whole subtree (I4′); opening it renders the target screen with its full layout chain and loads, at that URL, in every locale (I2).
- **FR-003** Access follows I1′; denial statuses 404 (link view not granted, module off, unknown path) and 403 (floor or target policy).
- **FR-004** Custom sections render in the full sidebar, the mobile sheet, module mode and the module switcher through one helper, filtered like built-in items; moved mains leave their native nav; hidden entries/sections leave every nav; items highlight on the entry path; the target's section nav highlights a *linked* page (D3).
- **FR-005** Slugs obey I3; targets obey I4′; the API rejects violations with 400 and a field-level reason; dialogs prevent them before submit.
- **FR-006** The document is per org, stored whole, cached and invalidated on write together with the RBAC permission cache (I6); members receive only what I8 allows.
- **FR-007** Link view rules are `permission_rules` rows keyed `nav.<pageId>`, listed in Settings → Roles under "Custom pages" as `<Section> › <Page>` with a view-only grid; the overrides API accepts such a key only when the org document contains the link; deleting a link deletes its rows.
- **FR-008** Known-prefix paths incur no alias work (I5); unknown-prefix paths incur at most one cached resolution per navigation.
- **FR-009** The seeded QA business org carries a `staff` section (link `sell → /pos/sell`, moved main `appointments → /pos/appointments`) and a `viewer × nav.<sell-id>` override row with `can_view=false`, so personas exercise US2/US3 without manual setup.
- **FR-010** Write controls on a screen reached through a link are disabled or hidden by `canAct()` with the no-permission title; S5 closes the till's charge button; any other ungated write button found during proof is a ledger entry.

### Key entities
- **NavConfig** — `{ version: 1, sections: NavSection[], builtin: Record<target, { label?, hidden? }> }`.
- **NavSection** — `{ id, slug, label, icon?, hidden?, pages: NavPage[] }`.
- **NavPage (entry)** — `{ id, kind: 'link' | 'main', slug, label, icon?, target, hidden? }`.
- **Link view rule** — `permission_rules` row `(org_id, role_key, module = 'nav.<pageId>', can_view)`; absent row = target's policy.

## Success Criteria
- **SC-001** An owner creates a section, pastes a link and moves a page in under 2 minutes from the sidebar alone, without docs (US1 on the QA stack).
- **SC-002** 100% of the US3 matrix answers as specified, verified by `hooks.tenant.test.ts` and the quickstart run; the floor case (US3.3) loads no POS data (server log / network tab).
- **SC-003** Zero behaviour change for an org with no document: `sections.test.ts`, `nav-mode.test.ts`, `route-access-authority.test.ts`, `modules-rbac.test.ts`, `permissions.service.test.ts` pass untouched.
- **SC-004** A reserved slug can never be saved: the derived-set test fails the moment a new top-level route is added without the set covering it.
- **SC-005** Design debt does not increase (`lint:design`, `lint:tokens`); `bun run check` 0 errors / 0 warnings on every slice; the hand-rolled `.ctx-menu` in `Sidebar.svelte` is gone (one `ContextMenu` primitive).

## Assumptions
- Role keys are the grant unit (via `permission_rules`); per-user grants are out of scope.
- Linking the same target from several sections is allowed; moving it is allowed once (one main).
- Section/entry labels are user data and are not translated; UI chrome is.
- The command palette, hotkey chords, the assistant's page list and `HUB_ROUTE_MAP` keep offering canonical paths; a moved main's canonical path client-replaces (I9), so they still land correctly.
- No redirects for renamed slugs (v1 assumption kept).

## Out of scope (named cuts)
- Free-content pages (D2) — sandbox pages spec 010/013/014.
- Replacing the target's section nav inside a linked screen, or re-pointing a native nav item at a moved main (D3 follow-up).
- Rewriting hard-coded outbound links to stay under the entry prefix.
- Duplicate/Paste **into built-in sections** (would need links under reserved prefixes; R10).
- Per-user hide (D6), per-section managers, rename redirects, nested sections, drag-and-drop *between* sections (per-user reordering within the existing `navOrder` preference already works), palette/assistant integration of entry paths, aliasing non-`(app)` routes, a per-link permissions dialog (Roles matrix is the one surface), optimistic-concurrency precondition on the PUT.

## Verification (end-to-end, run by the implementer of S6)
`quickstart.md` — QA stack `bun run dev:local`, personas from `.env.qa.local`: owner builds the section from the context menus, staff opens `/es/staff/sell` and sells, viewer 404s then (after the Roles tick) sees a read-only till, floor 403, POS toggle off 404, rename/hide/delete/restore. Evidence: screenshots + vitest logs under `specs/037-custom-nav-sections/evidence/`.
