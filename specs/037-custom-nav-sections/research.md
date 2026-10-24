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

## R3 — RBAC model for sections and pages

**Decision: `roles: string[]` on section and page; empty = all members; platform admin and org owner always granted; page grants narrow section grants (both must pass); the target's policy and module availability always apply (I1).**
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

**Decision: one helper builds both shapes.** `customSections(navConfig)` → `Section[]` (id `custom:<section.id>`, `tone: 'accent'`, items `{ href: alias, label, icon, matcher: own(alias) }`) appended by `getNavSections`; `customModules(navConfig)` → `ModuleDef[]` (id `custom:<section.id>`, `href` = first page, `matcher: own('/<slug>')`, items as above) appended by `getModules`. `visibleModules`/`canViewPath` filtering, per-user `navOrder`, module-mode detection (`resolveModuleForNav`) and the POS layout's module-mode branch all work unchanged. Staff-default module mode (`nav-mode.svelte.ts:61-65`) is the reason the module shape is mandatory, not optional.

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
