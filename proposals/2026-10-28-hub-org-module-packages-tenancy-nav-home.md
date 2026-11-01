---
id: 2026-10-28-hub-org-module-packages-tenancy-nav-home
title: "Hub orgs as modular tenants: module SDK + install packages at provisioning, one shared database, Home = landing page (/home → /chat), sections without slugs"
status: in-spec
created: 2026-10-28
updated: 2026-11-01
repos: [minion_hub, minion-meta]
source: owner-request-2026-10-28
effort: L
value: 8
tags: [data, ui, permissions]
---

# Hub orgs as modular tenants

**Owner request (2026-10-28, condensed):** *Where are custom pages stored? We need to deploy
other orgs and have every provisioned asset come up correctly. We think in "modules": a base
org plus pluggable modules that interweave, each with its own tables and pages; bare-minimum
tables with custom columns; new modules arrive with their FK links and base columns already
set so setup is minimal. Modules are configuration packages with templates run by the hub.
Should orgs get their own database, or share tables? Redesign the side menu: "All sections"
becomes "Home" at the top, and when the user is inside a module, hovering the section icon
hints at going back Home. Also: creating a section throws a duplicate-slug error with odd
async behaviour; the user should never pick a slug; the dialog needs an "advanced settings"
section with permissions.*

**Addendum (2026-10-30):** *Remove the hard-coded `/home`; the default landing page is
dynamic. Pick the best initial landing page for new orgs; `/` redirects to the user-set page.*

**Addendum (2026-10-29):** *Official modules (finances, crm, inventory, pos, …) use an SDK that
simplifies integration: when a module is added to the org its tables are seamlessly connected
to each other and integrate into the ecosystem. Rename the current `/home` to `/chat`; `/`
always redirects to the user's selected landing page.*

Evaluated against hub `origin/master` `812a4b0a` (2026-10-28) and meta specs 037/039, then
stress-tested by two zero-context reviewers (§6). This is the input for `/speckit-specify`.
Evidence with file anchors is in the Appendix; page one is the answer.

## Short answers

1. **Where custom pages live.** In the shared Postgres: one JSON document per org in
   `app_nav_config`, locked to the org by row-level security. A "page" is a link to a built-in
   screen (or a built-in screen moved into your section), never content of its own. Who can
   see a page is a separate `permission_rules` row. (Appendix A1.)
2. **The section error.** Two causes. The false "Ya existe una sección" is a race: the
   sidebar is updated optimistically before the save finishes, and the dialog re-checks its
   own draft against that already-updated list, so it sees itself as a duplicate until the
   save returns. The slug field exists only because a section's URL is `/<slug>` with no id.
   Both go away (T1, S0–S1). (Appendix A2.)
3. **Provisioning.** Creating an org today sets up the org row, the owner, the owner role, a
   workforce company, a gateway route and a workstation. It installs **no** modules, nav,
   table settings, custom columns, roles, currency or catalog defaults. Every module is "on"
   only because a missing toggle row counts as on. (Appendix A3.)
4. **Modules.** They are code (manifest, nav, routes, migrations), not data. "Adding a module
   to an org" is a toggle. Tables for every module already exist for every org. (Appendix A4.)
5. **Own database per org?** No. Keep one database with shared tables and per-org
   row-level security. The real isolation work is closing the server-side bypass paths, and
   that work is the same under either model. Details and the strongest counter-argument in T4;
   the hardening list is its own proposal,
   `2026-10-28-hub-tenant-isolation-hardening-before-org-3`.
6. **Module SDK.** Tables are already physically connected: cross-module foreign keys live in
   the shared SQL schema for every org (`sched_bookings`, `pos_tickets`, `crm_contacts`,
   `stk_items` are each referenced by other modules' tables). What is *not* connected is the
   description of a module: it is spread over at least seven hand-kept registries. The SDK is
   one `defineModule()` contract those registries are derived from, plus the install package
   from T3. (T3b, Appendix A7.)
7. **`/` → landing page already exists.** The hook resolves a per-user `landingPage`
   preference (sidebar right-click "Set as home page"), defaulting to `/home`. The rename to
   `/chat` is a route move plus a redirect, and Home in the switcher becomes "go to `/`".
   (T2, Appendix A8.)

## TO-BE

### T1. Creating a section needs only a name

- The dialog shows **Name** and a URL preview. No slug field. The slug is derived from the
  name; when it is reserved (`pos`) or already used, the hub suffixes it (`staff-2`) and the
  preview shows that. No duplicate-slug or reserved-slug error can reach the user.
  Two sections may share a name, as pages already may.
- The **URL grammar stays as it is** (`/<sectionSlug>/<pageSlug>~<pageId>`). The reviewers
  showed that moving sections to `/<slug>~<id>` touches nine resolver and nav sites and
  invalidates spec 037 I3/I5/SC-004 for no owner-visible gain, while a section has no URL of
  its own to redirect (its header links to its first page). Auto-suffixing gives the owner's
  outcome with no URL migration.
- **Advanced settings** disclosure in the same dialog: Icon (emoji or plugin icon key) and
  **Access** (the per-role inherit / allow / deny rows from hub #602's `PageAccessDialog`).
  For a new section the access rows are saved after the document (the section id must
  exist first); a failed access save keeps the section and shows the error inline.
- The race is fixed on its own first: draft validation runs against the config snapshot
  taken when the dialog opened, not the optimistic view. A real duplicate still shows, and
  the server still re-validates. Rename is not affected (rename on the optimistic copy is
  idempotent).

### T2. Home = the user's landing page; `/home` becomes `/chat`

- **`/` already redirects to the selected landing page.** `hooks.server.ts:505` sends a
  signed-in user on `/` to `resolveLandingPage()`, which reads the per-user `landingPage`
  preference (written by the sidebar right-click "Set as home page", validated as a
  root-relative path at `api/me/preferences/[section]:144`, cached in `landing-cache.ts`)
  and prefixes the user's locale. What changes is the fallback: today it is the constant
  `/home`, repeated in the hook, the auth-disabled bypass, the auth callback, onboarding,
  `Sidebar` and `NavContextMenu`.
- **The default is resolved, never a constant (owner, 2026-10-30).** One function,
  `effectiveLandingPage(user, org, nav)` in `src/lib/nav/landing.ts`, is the only place that
  answers "where does `/` go", used by the hook and exposed as `page.data.landingPage` so the
  sidebar's "this is my home page" check reads it instead of `?? '/home'`. Resolution order:
  1. the user's `landingPage` preference, if the user may still view it (module on, page not
     denied); a stale or gated value is skipped, not looped;
  2. the org's landing page, a `landingPage` field in the org's `app_nav_config` document
     (the owner-editable navigation document that already exists per org; editable from the
     same nav context menu as "Set as home page", org-wide variant for owner/admin);
  3. the first item of the user's effective navigation: for full-nav roles the first org
     section item, for module-mode roles the first item of their first permitted module, so
     a receptionist lands on the calendar and the owner on the dashboard without anyone
     setting anything;
  4. `/chat`, universal and ungated, as the last resort.
  No string literal survives outside steps 2 and 4; a test asserts `git grep "'/home'"` and
  `'/chat'` appear only in `landing.ts`, the 308 redirect files and tests.
- **Where the redirect runs (corrected 2026-11-01).** The hook already loads, cached, every
  input the resolver needs: permissions (`hooks.server.ts:290`, 2 min cache), module states
  (`:382`, 5 min), the nav document (`readNavConfig`, 30 min), preferences, `locals.orgKind`
  and `user.role`. The redirect stays in the hook; the `(app)` layout exposes the same
  function's result as `page.data.landingPage` for the sidebar. `landing-cache.ts` is
  deleted (its inputs are already cached).
- **Initial value for new orgs, chosen:** the base install template (T3) writes the org
  landing page as **`/overview`** for business orgs and **`/chat`** for personal orgs.
  `/overview` because it is universal (`permissions.ts:177`, no module gate), exists for every
  business org, and is the one screen every role may see; not `/chat` because AI is the
  premium layer and the base org's front door should be the method, not the assistant.
  Existing orgs (FACES, MINION) get the same value from the backfill; users who set their own
  page are unaffected (step 1 wins).
- **Rename `/home` → `/chat`.** Move `routes/(app)/home/**` to `routes/(app)/chat/**`; keep
  `routes/(app)/home/+page.server.ts` (and `/home/settings`) as a `redirect(308, '/chat…')`
  exactly like `/ads → /socials` does, so bookmarks and stored `landingPage` values of
  `/home` keep working with no data migration (a stale preference costs one extra hop).
  Change the default in `resolveLandingPage`, the AUTH_DISABLED bypass (`hooks:251`), the
  auth callback `next`, the onboarding redirects, GNav `H`, and the registries that key on
  the path (`nav/routes.ts`, `nav/modules.ts`, `sections.ts` org items, `site-map`,
  `hub-route-map`, `route-design-manifest` + validation, `permissions.ts` universal set,
  `FloatingAssistant` "on my agent page"). 48 references on master; most are tests that pin
  the string. The i18n key for the screen title becomes `nav_chat` ("Chat"); `nav_home`
  ("Inicio") is freed for the switcher row.
- **Switcher: Home first.** Dropdown order: **Inicio** (house icon), divider, modules. Home
  navigates to **`/`** (so it lands wherever the user set their landing page, `/chat` by
  default) and shows the full navigation. The label collision from the first draft is gone:
  "Inicio" no longer names a screen.
- Expanded trigger while inside a module: hovering crossfades the module icon to the house
  icon with a tooltip "Volver a Inicio" (same crossfade cell the busy ring uses; honours
  reduced motion). The **whole trigger still opens the dropdown** (one click target, no hidden
  split). The crossfade is a hint; Home is the first row of the menu it opens.
- Stored preference: picking Home records `full` as the user's nav mode, exactly as
  "All sections" does today. Staff whose role defaults to module mode therefore keep the full
  sidebar after choosing Home until they pick a module again. The owner may instead want Home
  to be a one-off navigation that leaves the stored mode alone. Decision Q2.
- Mobile: the sheet is always module-scoped and has its own picker, and touch has no hover.
  The sheet gets a plain **Inicio** row at the top that navigates to `/`. Nothing else.
- Edge: a landing page the user can no longer view (module turned off, page denied) falls
  through to the next step of the resolver; the module guard runs after the redirect, so the
  check uses the same route-access policy the guard uses (`routeAccessPolicyIdForPath`).

### T3. Modules become install packages the hub runs at org creation and on enable

A module package = the code manifest that exists today + a **template** applied as data
writes (never DDL). The installer `installModule(ctx, moduleId)` is idempotent, runs inside the
org transaction (`withOrgCore`) with the provisioning admin as `created_by`, and is ordered by
`MODULE_MANIFEST.requires`.

| Template part | Store | Merge rule on re-run |
|---|---|---|
| toggle + version | `app_modules` gains `template_version`; a row is written for **every** manifest module (`enabled` true for the base set, false otherwise), because an absent row means "on" | version bump only |
| nav defaults (sections, links, moved mains, hidden built-ins) | `app_nav_config` entries carry `origin: 'module:<id>@<v>'` | add missing entries by origin; never touch entries without origin or edited ones |
| table settings | `app_table_config`, same `origin` marker per field override | same |
| optional fields | `app_table_properties` rows with `template_key` + new `template_version`, created **archived** (one click to enable in Table settings; the 09-30 rule "a fresh org gets none of them" stays true) | add missing keys; never overwrite org edits |
| roles and dataset rules | `org_roles` + `permission_rules` (`permission_roles` is the **global** catalog, not per org) | add missing |
| day-one data | per module: finances currency and tax, `pos_settings`, catalog kinds, calendar event kinds, stock units, doors defaults | add missing |
| org landing page | base template: `app_nav_config.landingPage` = `/overview` (business) / `/chat` (personal) | set if absent |

Day-one checklist a new clinic needs, and who provides it:

| Need | Installer | By hand |
|---|---|---|
| currency, tax rate, invoice series | finances template | |
| POS settings, catalog kinds, services | pos template (kinds only) | services |
| calendar event kinds, hours | scheduling template | hours |
| staff roles (reception, doctor) | base template (`org_roles`) | members |
| WhatsApp / channels | | always by hand (pairing) |
| landing page | base template (`/overview` business, `/chat` personal); users override per person | |

- Provisioning gains a `modules` step placed **before** `workforce` and `gateway`, so a
  gateway outage cannot leave an org half-installed (provisioning stops at the first failure).
- Existing orgs (FACES, MINION) get a one-time backfill that writes `app_modules` rows equal
  to their current effective state. No behaviour change for them.
- Route gates: `crm`, `memberships`, `workforce`, `team` have no route-level
  `isModuleEnabled` check today, so "off" would hide nav but leave URLs open. S4 adds the
  gates for the modules in the base-set decision, or states which stay open.
- "Interweave" needs no new mechanism: FK links are global schema and `requires` orders the
  install. What is new is that a template may add optional fields to **another** module's
  table (stock adds "Reorder qty" to `stock.items`; scheduling adds "Default duration" to
  `catalog.services`).
- Templates live in the repo (`src/lib/modules/<id>/template.ts`) and are reviewed as code.
  A marketplace package format is out of scope.

### T3b. The module SDK: one definition, derived registries

What "integration" costs today is not the database. The cross-module foreign keys already
exist in the shared SQL schema (bookings → parties/contacts, tickets → bookings, consumption
→ items, invoices → tickets; Appendix A7). It is the **description** of a module that is
scattered. A module is declared, by hand and separately, in:

| Registry | File | What it holds |
|---|---|---|
| availability | `lib/modules/availability.ts` `MODULE_MANIFEST` | route prefixes, toggle id, org kinds, `requires` |
| nav | `lib/nav/modules.ts` `getModules()` | sidebar items per module |
| routes | `lib/nav/routes.ts`, `route-design-manifest.ts`, `route-access-registry` | path → title/archetype/RBAC |
| tables | `lib/tables/defs/index.ts` `TABLE_REGISTRY` | `TableDef` per DataTable (id prefix, fields) |
| custom columns | `custom-properties.service.ts` `customPropertyTablePolicy()` | which tables accept custom columns |
| datasets | `server/sandbox/datasets.ts` `DATASETS` | SQL-safe dataset + RBAC module (spec 039) |
| RBAC | `rbac.service` `Module` type, capabilities | permission keys |
| assistant | `assistant/site-map.ts`, `hub-route-map.ts` | route descriptions for the agent |

Adding a module means touching all eight and keeping them consistent by eye; nothing fails
when one is missed (the `crm` toggle that no route enforces is exactly that drift).

**The SDK is a type, not a runtime.** `defineModule({...})` in `src/lib/modules/sdk.ts`
returns one object per official module that carries every row of the table above plus the
T3 template, and **the existing registries become derived**:

```ts
export const MODULES = [stock, scheduling, crm, pos, finances, …] as const;
export const MODULE_MANIFEST = manifestFrom(MODULES);   // availability.ts keeps its export
export const TABLE_REGISTRY  = MODULES.flatMap(m => m.tables);
export const DATASETS        = MODULES.flatMap(m => m.datasets);
```

Every consumer keeps importing the same names from the same files, so the refactor has no
blast radius beyond the registry files themselves. Two additions make "seamlessly connected"
checkable instead of hoped for:

- `links`: the cross-module relations a module relies on
  (`{ from: 'sched_bookings.party_id', to: 'crm_parties.id' }`). A test resolves each link
  against `information_schema.referential_constraints` on the QA database and fails when a
  declared link has no foreign key, or a foreign key between module tables is undeclared.
  Title links, pickers and dataset `from` joins can read the same list instead of restating it.
- `template`: the T3 install package, so `installModule` takes the module object and the
  `requires` order is the SDK's, not a second copy.

**Migration path, smallest first.** Write the type and the derivation shims; migrate `stock`
only (smallest nav, the only module with Drizzle references, already the T3 example); add a
parity test asserting that the derived `MODULE_MANIFEST`, `TABLE_REGISTRY` and `DATASETS`
deep-equal today's hand-written objects. Move the other modules when their next change
touches them. No module is rewritten for the sake of the SDK.

**What the SDK does not do.** It does not create tables. Official modules ship their DDL as
ordinary migrations, global for every org, as today; the tenancy decision (T4) depends on
that. A third-party or marketplace module that needs its own tables is a different product
(DDL at runtime, versioning, uninstall) and is out of scope here.

### T4. One shared database, and why

Shared tables with a per-org key and row-level security (the "pool" model) is the right
model for this stage:

- A second database **cannot be built from the repo today** (four core tables have no
  `CREATE` in source; memory `hub-supabase-schema-not-reproducible`). Fixing that is worth
  doing for CI and recovery regardless, and is a prerequisite for any per-org option.
- Cross-org features are product needs: the platform `/orgs` screen, MINION operating FACES,
  the marketplace catalog, AI usage metering, factory post-merge checks.
- Each Supabase project is a separately billed compute instance with its own pooler,
  backups and migration runs (Pro is billed per Supabase organization plus compute per
  project; exact figures to verify). Branching is for schema previews, not tenants.
- Schema-per-org in one project gives nothing RLS does not, and breaks the single-schema
  Drizzle and migration setup.

**Strongest counter-argument, stated honestly:** a clinic holds health data. Today the hub
connects as `postgres`, which bypasses RLS, so every plain `getCoreDb()` query (119 files)
and every `supabaseAdmin()` call (32 files) relies on a hand-written org filter; only the
253 files using `withOrgCore` are database-enforced. One missed filter exposes every tenant.
A database per org would cap that blast radius. The answer is not to multiply databases but
to close the bypass before a third org exists; that list, with a test that fails when a table
or query escapes, is `2026-10-28-hub-tenant-isolation-hardening-before-org-3`.

**Exit clause:** every org row is keyed by `org_id`, no FK crosses orgs, numbering is per
org. Moving one regulated customer to its own project later is an export plus the same
migrations. Keep that true.

## DELTA

| Slice | Change | Proof |
|---|---|---|
| S0 (hotfix, hub) | draft validation uses the dialog-open snapshot | mounted test: open New section, resolve the PUT late, no `slug.duplicate` while pending |
| S1 (hub) | dialog loses the slug field; auto-suffix reserved/duplicate slugs; `slug.duplicate`/`slug.reserved` stop being user-facing | unit test on the suffix helper; two sections named "Staff" both save; a section named "POS" saves as `pos-2` and renders |
| S2 (hub, after #602) | Advanced settings disclosure (icon, access) in New/Rename section | mounted test: new section + deny viewer ⇒ one `PUT` then one overrides write; failed overrides write keeps the section |
| S3 (hub) | `/home` → `/chat` (route move, 308 redirects for `/home` and `/home/settings`, `nav_chat` title); `effectiveLandingPage` resolver replaces every hard-coded `/home` (hook, bypass, callback, onboarding, Sidebar, NavContextMenu); org landing page in `app_nav_config` + context-menu action; Home first in the switcher = navigate to `/` + full mode; hover crossfade; mobile sheet Home row; retire `nav_allSections` | resolver unit test for the four steps (user pref, gated pref skipped, org value, role-derived first item, `/chat`); route test: `/home` → 308 `/chat`, `/` → 307 resolved page; literal-grep test; mounted test for order and one-click; screenshots light/dark/reduced motion/mobile |
| S4 (hub + migration) | `app_modules.template_version`; `installModule`; provisioning `modules` step before `workforce`; backfill for existing orgs; Settings → Modules lists every toggled module; route gates for the base-set decision; QA seed gains `org_roles` | provisioning test: base set installed, re-run is a no-op, existing-org backfill changes no effective state; installer test per template |
| S5 | moved to `2026-10-28-hub-tenant-isolation-hardening-before-org-3` | see that proposal |
| S6 (hub) | module SDK: `defineModule` type, derivation shims for `MODULE_MANIFEST` / `TABLE_REGISTRY` / `DATASETS`, `stock` migrated, `links` for every module's cross-module keys | parity test (derived registries deep-equal the hand-written ones); FK-link test against the QA database; `installModule` takes the module object |

Order: S0 now. S1 → S2 (S2 waits for hub #602). S3 independent. S6 before S4 (the installer
should take the SDK object, not a second manifest), S4 after Q1. The hardening proposal before
the next org onboards.

Out of scope: marketplace package format; moving any org to its own project; content pages;
write-button gating by data roles (tracked in `2026-10-24-hub-nav-sections-data-rbac-followups`).

## Decisions for the owner

1. **Base set.** Which manifest modules are on at provisioning? The manifest ids with a
   toggle today are `crm`, `finances`, `scheduling`, `support`, `sales`, `ads`, `pos`,
   `stock`; `team`/`workforce`/`memberships` have no toggle yet. Proposed base: `crm`,
   `scheduling`, `pos`, `stock`, `finances` on; `support`, `sales`, `ads` off.
2. **Home click — decided 2026-11-01 (owner asked for elaboration; spec 046 US4).** One-off
   navigation; the stored nav mode is untouched. The sidebar already derives its scope from
   the path (`navMode.isModule` is false on an organisation page), so Home shows the full
   navigation without storing anything, and a staff member's role default survives.

1 (base set) approved by the owner 2026-11-01 as proposed.

Answered by existing code or specs, so not open: optional fields install archived
(09-30 proposal); duplicate names are allowed (spec 037); `/` → landing page is already
built (`hooks.server.ts:505`); the default landing page is resolved, with `/overview`
(business) / `/chat` (personal) as the org's initial value (owner 2026-10-30, T2); the SDK
creates no tables (T3b).

## Ledger (open ends recorded 2026-11-01 when specs 046/047/048 were cut)

- `app_modules.template_version` and a versioned template: not shipped (spec 047 FR-008); the
  installer is idempotent by `ON CONFLICT DO NOTHING`. Needed only when a template changes.
- Backfill of explicit `app_modules` rows for FACES/MINION: not shipped; "absent = enabled"
  is unchanged so existing orgs need nothing. Hygiene only.
- Day-one data per module (currency, tax, POS settings, catalog kinds, event kinds, stock
  units, `org_roles`): not in 047 S4; next spec once the installer exists.
- Root `routes/+page.server.ts` so a client-side `goto('/')` cannot hit the error page
  (PostHog recon memory): the switcher navigates to `page.data.landingPage` instead; add the
  root page when the route-contract counts are touched next.
- Route gates: already central (hook `applyModuleAvailabilityGuard`); the `availability.ts`
  comment claiming crm is ungated is stale and is corrected in 047 S4.
- Proposal index: the two unknown-topic files were local leftovers, not on `dev`; nothing to fix.
- (hub #626, S2) Section icons: the dialog stores any string in `section.icon`, but the sidebar's
  `ModuleDef.icon` is a lucide component, so an emoji or unknown key falls back to `LayoutGrid`
  (`TODO(handoff)` in `src/lib/nav/custom-sections-nav.ts`). Render strings the way page icons
  are rendered, or restrict the field to known icon keys with a picker.
- (hub #626, S2) An invalid icon string surfaces as a generic form error, not under the Icon field.

## Definition of done

- A new org provisioned through `/api/organizations/provision` lands with the base modules
  installed, their nav, table and day-one defaults present, one `app_modules` row per
  manifest module; running provisioning twice changes nothing; existing orgs keep their
  effective module state after the backfill.
- Creating a section needs only a name; no slug error can reach the user; the dialog never
  shows an error for a save that succeeds.
- Home is first in the switcher and one click lands on the user's landing page (`/`) with
  the full navigation; `/home` answers 308 to `/chat`; no `/home` or `/chat` literal exists
  outside the resolver, the redirect files and tests; a new business org's first owner lands
  on `/overview`, a module-mode staff member on their first permitted module page.
- Every official module is one `defineModule` object or is listed as not yet migrated; the
  derived registries equal the hand-written ones; every declared cross-module link has a
  foreign key on the QA database.

## Appendix: evidence (hub `origin/master` 812a4b0a)

**A1. Storage.** `public.app_nav_config (org_id text pk, value jsonb, updated_at)`,
migration `20261024000000_app_nav_config.sql`, forced RLS on `app.current_org_id`, grants to
`app_ledger`; Drizzle `src/server/db/pg-schema/nav-config.ts`. Document shape in spec 037
`data-model.md`: `sections[].pages[]` (`kind: link | main`, `target` = built-in screen
pattern), `builtinSections`, `builtin` overrides. View rules = `permission_rules` keyed
`page:<id>` / `section:<id>`, written via `/api/roles/overrides`; orphans pruned after each
save (`nav-config.service.ts: deleteOrphanPageRules`, non-transactional). Read cached 30 min
(`settings` tag); `PUT /api/nav/config` replaces the whole document, `settings:manage`.
Sibling per-org stores: `app_table_config` (jsonb), `app_table_properties` +
`app_table_property_values` (`template_key` nullable + unique index; the service only maps
`23505` → `template_exists`; no version, no edit marker), `app_modules (org_id, module_id,
enabled, updated_at)`. Spec 037 status: S1–S4 merged (hub #597, #601, #598, #600); S5
Access dialog = hub #602 open.

**A2. The bug.** `NavContextMenu.svelte:87` `config = $derived(navConfig())`;
`nav-config.svelte.ts` `navConfig()` returns `navOptimistic.config ?? page.data.navConfig`;
`nav-edit.svelte.ts:63` sets `navOptimistic.config = guess` before the `PUT`;
`NavContextMenu.svelte:420` `draftIssues = newIssues(config, draftOp(config))` re-adds the
same section ⇒ `slug.duplicate` ⇒ "Ya existe una sección con este slug" under the slug field
while `pending` (screenshot 2); `PUT` succeeds ⇒ toast `nav_saved` (screenshot 3) ⇒
`closeDlg()`. Section URL = `/<slug>`, hence `slug.duplicate` + `slug.reserved`
(`validateNavConfig`, `reservedSectionSlugs()`); sections render as headers whose `href` is
their first page (`custom-sections-nav.ts:86`), so no route serves `/<slug>` itself.

**A3. Provisioning.** `organization-provision.service.ts: provisionOrganization` steps:
`organization`, `membership`, `rbac`, `workforce`, `gateway`, `workstation`, `readiness`;
stops at the first failure; runs on `supabaseAdmin()` without a `CoreCtx`. `modules.service.ts:28`
`states[id] ?? true`. Currency is a code default (`finance.service.ts:557`). Settings → Modules
lists only finances, crm, scheduling, support, sales. `availability.ts` notes crm (36),
memberships (63), workforce (103) have no route-level `isModuleEnabled` call.

**A4. Modules.** `src/lib/modules/availability.ts` (`MODULE_MANIFEST`: `appPrefixes`,
`toggleId`, `kinds`, `requires`); nav `src/lib/nav/modules.ts` + `components/layout/sections.ts`;
RBAC `src/lib/routes/route-access-registry`; tables by global migrations with module prefixes
and `org_id`. Core-vs-custom column rule:
`proposals/2026-09-30-hub-stock-item-optional-fields-to-custom-columns.md`.

**A5. Tenancy.** `with-org-core.ts:141` "The hub connects to Supabase as `postgres`
(rolbypassrls=true), so plain `getCoreDb()` queries bypass every RLS policy"; `withOrgCore`
= `SET LOCAL ROLE app_ledger` + `set_config('app.current_org_id')`. Counts: 253 files use
`withOrgCore`, 119 use `getCoreDb()/getDb()`, 32 use `supabaseAdmin()`. Hub has 122
migrations, 44 carrying `_org_guc` policies. Roles: `permission_roles` = global catalog,
`org_roles` = per org (`20260702140000_org_roles.sql`). Not verified this session: current
org count; the 6/90 replay failure figure (from memory, 2026-08-08); gateway org-map
fail-open and B2 public bucket (tracked in their own memos).

**A6. Sidebar.** `ModuleSwitcher.svelte:40` items = `[...modules, divider, nav_allSections]`;
expanded trigger = icon + label + chevrons; collapsed rail crossfades to `PanelLeft` on hover.
`Topbar.svelte:58` "Mobile is ALWAYS module-scoped, for every role", own picker. `nav_home` =
"Inicio" = `/home` title (`routes.ts:85`), freed by the `/chat` rename (T2). `nav-mode.svelte.ts` stores the pick in
localStorage (`hub-nav-mode`); role default module mode for non owner/admin/manager.

**A7. Module description is spread, tables are not.** Business tables are not declared in
Drizzle (`sandbox/datasets.ts:8` comment; only `stock` has `.references()` and only to its
own tables). SQL migrations declare the cross-module keys: `REFERENCES` counts on master
`stk_items` 7, `stk_warehouses` 6, `sched_bookings` 4, `pos_tickets` 4, `crm_contacts` 3,
`fin_products` 3, `crm_doors` 2. Registries a module touches: `MODULE_MANIFEST`
(`availability.ts:40`, 13 ids, `requires` at :131), `getModules()` (`nav/modules.ts:473`),
`TABLE_REGISTRY` (`tables/defs/index.ts:11`, 9 table ids), `DATASETS`
(`sandbox/datasets.ts:53`), `customPropertyTablePolicy` (`custom-properties.service.ts:99`),
`nav/routes.ts`, `route-design-manifest.ts:574`, `site-map.ts:25`, `hub-route-map.ts:37`.

**A8. Landing page wiring.** `hooks.server.ts:107` `resolveLandingPage` (default `/home`,
locale prefix, open-redirect guard), used at `:505` for `/`; AUTH_DISABLED bypass hardcodes
`/home` at `:251`; preference write `api/me/preferences/[section]/+server.ts:144` (path
regex), cache invalidation `:189`, `server/landing-cache.ts`; readers `Sidebar.svelte:72`,
`NavContextMenu.svelte:98` (right-click "Set as home page", PUT `/api/me/preferences/landingPage`).
`/chat` is unused as a route on master (only `/chat/completions` in LLM clients). Existing
308-rename precedent: `routes/(app)/ads/+page.server.ts:8`.

## §6. Goldfish review record (EGM)

Two zero-context reviewers read the first draft and the anchored code. Accepted and folded in:

- Design critic: Rename is not affected by the race (idempotent on the optimistic copy);
  no route serves `/<slug>`, so the planned 301 was a redirect of nothing; the `/<slug>~<id>`
  change touches nine sites and dead-ends spec 037 I3/I5/SC-004 → replaced by auto-suffix;
  "off until enabled" needs explicit rows for every module plus route gates; `template_key`
  carries no version or edit marker, and jsonb stores have no marker at all → merge rules per
  store; installer needs `withOrgCore` + an actor and must run before `workforce`/`gateway`;
  `permission_roles` is global → `org_roles`; the bypass inventory must include raw core-db
  queries; migration counts corrected to hub 122/44; the rename dialog has no icon field.
- Zoom-out: "Inicio" already names `/home` → Home = `/home` + full mode, Q3 closed
  (superseded 2026-10-29 by the owner's `/home` → `/chat` rename: Home = `/`); mobile
  has no hover and its own picker → sheet Home row; split-target trigger is a hidden
  affordance → single click target, hover is a hint; the stored-mode side effect for staff is
  now Q2; Q2/Q4 of the first draft were already decided by the 09-30 proposal and spec 037;
  a new org is still unusable without currency, POS settings, kinds, roles → day-one table;
  `app_module_installs` replaced by a column on `app_modules`; S5 split out; jargon moved to
  the appendix.

Rejected: none. Not checked by either reviewer: whether `Dropdown` can host a split trigger
(moot after the single-target decision); whether #602 changes section-id keys.
