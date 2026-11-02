# Feature Specification: Official module SDK and install packages at org provisioning

**Feature Branch**: `047-hub-module-sdk-install-packages`

**Created**: 2026-11-01

**Status**: Approved by owner 2026-11-01 (Q1 base set approved; "run autonomously … proceed")

**Input**: Proposal `proposals/2026-10-28-hub-org-module-packages-tenancy-nav-home.md` T3/T3b and the owner's 2026-10-29 addendum: "official minion modules (finances, crm, inventory, pos, etc.) use an SDK that simplifies integration; when they're added to the org, the tables are seamlessly connected to each other and integrate into the ecosystem."

Evaluated against hub `origin/master` `812a4b0a`.

## AS-IS

- **Tables share one schema; links are mostly soft.** Business tables are not declared in Drizzle (`src/server/sandbox/datasets.ts:8`). SQL migrations declare `REFERENCES` (counts `stk_items` 7, `stk_warehouses` 6, `sched_bookings` 4, `pos_tickets` 4, `crm_contacts` 3, `fin_products` 3, `crm_doors` 2), but for stock every one of those is intra-module; its 7 references to other modules are plain columns (found by S6's link test, hub #629). Every org shares the schema.
- **A module's description is scattered** over hand-kept registries that nothing keeps consistent: `MODULE_MANIFEST` (`src/lib/modules/availability.ts:40`, 13 ids, `requires` at :131), `getModules()` (`src/lib/nav/modules.ts:473`), `TABLE_REGISTRY` (`src/lib/tables/defs/index.ts:11`, 9 table ids), `DATASETS` (`src/server/sandbox/datasets.ts:53`), `customPropertyTablePolicy` (`src/server/services/custom-properties.service.ts:99`), `nav/routes.ts`, `route-design-manifest.ts`, `assistant/site-map.ts`, `hub-route-map.ts`, RBAC `Module` type.
- **Toggles.** `app_modules (org_id, module_id, enabled, updated_at)`; absent row = enabled (`modules.service.ts:28`). Settings → Modules (`routes/(app)/settings/modules/+page.svelte:14-30`) hand-lists five of the eight toggle ids (finances, crm, scheduling, support, sales); pos, stock, ads have toggles only through the API. Route enforcement for a toggled-off module is already central: the hook's `applyModuleAvailabilityGuard` (`hooks.server.ts:366`) → `isAppRouteBlocked` → `isModuleAvailable` 404s every manifest module with a `toggleId` whose row is `false`; the comment at `availability.ts:43` ("NO current (app)/crm route calls isModuleEnabled") predates that wiring.
- **Provisioning** (`organization-provision.service.ts:233-357`): steps organization, membership, rbac, workforce, gateway, workstation, readiness, stop at first failure; runs on `supabaseAdmin()`; installs no module rows, no navigation document, no table settings, no landing page. A new org has every module on by absence.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A new org comes up with the base modules and nothing else (Priority: P1)

A platform admin provisions "Clínica Norte". When it is ready, Settings → Modules shows crm, scheduling, pos, stock and finances on and support, sales and ads off, each as an explicit row; `/sales` answers 404 for the org; `/` for the first owner lands on `/overview`. Running provisioning again changes nothing.

**Why this priority**: the owner's "provisioned assets come up correctly and fully"; Q1 approved.

**Independent Test**: provisioning service test with the Supabase and gateway calls mocked: the `modules` step calls the installer with the org id; installer integration test on the QA database: rows written once, second run writes nothing, a pre-existing `support = true` row is not overwritten.

**Acceptance Scenarios**:

1. **Given** a fresh org id, **When** `installBaseModules(ctx, kind)` runs, **Then** `app_modules` has one row per manifest module with a `toggleId` (8 rows) with `enabled` per the base set, and the nav document has `landingPage: '/overview'` (business) or `/chat` (personal).
2. **Given** the same org, **When** it runs again, **Then** zero rows change (`ON CONFLICT DO NOTHING`; landing page set only when absent).
3. **Given** the `workforce` step fails, **When** provisioning stops, **Then** the module rows already exist (the `modules` step runs before `workforce`).
4. **Given** FACES and MINION, **When** this ships, **Then** their behaviour is unchanged: absent rows still mean enabled; no backfill is required for correctness.

---

### User Story 2 - Settings → Modules lists every toggle (Priority: P2)

The Modules page lists all eight toggle modules from the manifest, in one loop, with labels from the nav module definitions; pos, stock and ads are no longer API-only.

**Independent Test**: mounted test or server load test: the page data includes eight ids; toggling `stock` PUTs `{moduleId:'stock', enabled:false}`.

---

### User Story 3 - One module definition, derived registries (Priority: P2)

A developer adds a module by writing one `defineModule({...})` object (client-safe: id, app prefixes, toggle id, kinds, requires, tables) and one server companion (datasets, links, install template). The existing exports `MODULE_MANIFEST`, `TABLE_REGISTRY` and `DATASETS` keep their names and shapes; for the migrated module they are derived from the definition. `stock` is the first and, in this spec, only migrated module.

**Independent Test**: parity test asserting the derived `MODULE_MANIFEST.stock`, the stock entries of `TABLE_REGISTRY` and `DATASETS` deep-equal literal snapshots of today's hand-written objects.

**Acceptance Scenarios**:

1. **Given** the registries, **When** read by any existing consumer, **Then** nothing observable changes (parity test, full hub test suite green).
2. **Given** `stock.links` declares `{ from: 'stk_consumption.item_id', to: 'stk_items.id' }` and the other stock keys, **When** the link test runs on the QA database, **Then** every declared link has a foreign key in `information_schema.referential_constraints`, and every foreign key between stock tables and other modules' tables is declared.

### Edge Cases

- A manifest module without `toggleId` (team, workforce, memberships, pulse, posAppointments) gets no row; it is not toggleable today and this spec does not make it so.
- A kind-restricted module (`kinds: ['business']`) in a personal org still gets a row; `isModuleAvailable` already hides it by kind.
- The nav document may not exist yet: the installer writes `{ ...EMPTY_NAV_CONFIG, landingPage }`.
- Provisioning on an org that already exists (re-run) keeps the owner's later toggle choices.

## Requirements *(mandatory)*

- **FR-001**: `BASE_MODULES` (on: crm, scheduling, pos, stock, finances; off: support, sales, ads) is declared once, next to the manifest, and is the only base-set definition.
- **FR-002**: `installBaseModules(ctx, kind)` is idempotent: `INSERT … ON CONFLICT DO NOTHING` for module rows; landing page written only when the document lacks one; runs inside `withOrgCore`; invalidates the module and settings cache tags it touches.
- **FR-003**: Provisioning gains step id `modules` placed after `rbac` and before `workforce`, with the same `step()` error handling; the `OrganizationProvisionStepId` union and the route's response shape include it.
- **FR-004**: Settings → Modules renders its rows from the manifest's toggle ids; no per-module `$state` variables.
- **FR-005**: `src/lib/modules/sdk.ts` exports `defineModule()` and the `ModuleDefinition` type (client-safe); `src/server/modules/sdk.server.ts` exports `defineServerModule()` with `datasets`, `links`, `install`; `src/lib/modules/stock/index.ts` + `src/server/modules/stock.server.ts` are the first definitions.
- **FR-006**: `MODULE_MANIFEST`, `TABLE_REGISTRY`, `DATASETS` keep their export names, order and types; the migrated module's entries come from the definition (`ModuleId` stays a literal union).
- **FR-007**: The links test (`*.sql.integration.test.ts`, QA database) fails on an undeclared or missing foreign key for the migrated module.
- **FR-008**: No DDL. No `template_version` column (idempotency comes from the conflict clause; a versioned template is a later need). Backfill for existing orgs is not shipped: "absent = enabled" is unchanged, so existing orgs need nothing; this is recorded in the proposal ledger.

## Success Criteria *(mandatory)*

- **SC-001**: A QA-stack provisioning run yields 8 module rows and the org landing page; a second run yields 0 writes (integration test).
- **SC-002**: Full hub test suite green with the derived registries (parity).
- **SC-003**: Settings → Modules shows 8 toggles (screenshot in the PR).
- **SC-004**: `/sales` for a freshly provisioned business org answers 404 while `/crm` answers 200 (route-guard test with the base states).

## Assumptions

- Provisioned orgs are business kind unless the request says otherwise (executor confirms `organizations.kind` default and threads it to the installer).
- The links test runs in the existing CI job that runs `*.sql.integration.test.ts` against the QA database (`HUB_TEST_DB_URL`).

## Constitution check

Spec approved; anchors above; slices in plan.md; data-tagged → owner merges; no production script.
