# Implementation Plan: Module SDK and install packages (spec 047)

**Branch**: `047-hub-module-sdk-install-packages` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

## Summary

Two hub slices. S6 (SDK, first) introduces `defineModule`, migrates `stock`, derives the three registries and adds the links test. S4 (install) adds `BASE_MODULES`, the idempotent installer, the provisioning `modules` step, and the manifest-driven Settings → Modules page. S4 is stacked on S6 only if S6 is not merged yet; otherwise it branches from master.

## Technical Context

- `MODULE_MANIFEST` is `as const satisfies Record<string, ModuleAvailability>`; `ModuleId = keyof typeof MODULE_MANIFEST` is used across route guards, so `manifestFrom(MODULES)` must return a typed object: `{ ...HAND_WRITTEN, ...derived } as const`-equivalent via a generic `<const M extends readonly ModuleDefinition[]>` returning `{ [K in M[number]['id']]: ModuleAvailability }`.
- `TABLE_REGISTRY` order = settings-page order; stock is first today, so `[...stock.tables, ...REST]` preserves order.
- `DATASETS` live server-side (raw SQL); the server companion holds them.
- Cross-module keys for stock, to declare as `links` (verify with `\d` on the QA DB or the migration text): `stk_consumption.item_id → stk_items.id`, `stk_entries.party_id → crm_parties.id`, `stk_entry_lines.item_id → stk_items.id`, `pos_*` → `stk_items` as present in migrations (`grep -i "references stk_" supabase/migrations`).
- Installer context: `{ db: getCoreDb(), tenantId: organization.id, profileId: params.profileId }` satisfies `CoreCtx` and `withOrgCore` (`with-org-core.ts:25`). Nav document write: `readNavConfig` (cached) then `writeNavConfig` only when `landingPage` absent; `invalidateTags(tags.tenantDomain(id,'modules'))` after inserting rows (see `modules.service.ts:44`).
- Settings page: `routes/(app)/settings/modules/+page.svelte` + `+page.server.ts` (`listModuleStates`); labels from `getModules()` by id, fallback to the id.
- Integration-test convention: nearest `*.sql.integration.test.ts` in `src/server/services/` (guarded by `HUB_TEST_DB_URL`); never run the full suite with `SUPABASE_DB_URL` set.

## Constitution Check

I–III satisfied (spec, anchors, slices). IV: no new route/page; Settings page change keeps tokens; no i18n beyond module labels already present (add `settings_modules_<id>` keys if a label is missing). V: data-tagged → owner merge; no prod script.

## Slices

### S6 — SDK + stock migrated + derived registries + links test
- `src/lib/modules/sdk.ts`: `ModuleDefinition = { id; appPrefixes; toggleId?; kinds?; requires?; tables: TableDef[] }`; `defineModule<const T extends ModuleDefinition>(d: T): T`; `manifestFrom(mods)`; `tablesFrom(mods)`.
- `src/lib/modules/stock/index.ts`: `export const stock = defineModule({ id: 'stock', appPrefixes: ['/stock'], toggleId: 'stock', kinds: ['business'], tables: [stockItemsDef, stockEntriesDef] })` (defs moved verbatim from `tables/defs/index.ts`).
- `src/server/modules/sdk.server.ts`: `ServerModuleDefinition = { module; datasets: Dataset[]; links: { from: string; to: string }[] }`; `defineServerModule()`; `datasetsFrom()`.
- `src/server/modules/stock.server.ts`: stock datasets moved from `sandbox/datasets.ts`; `links` from the migration grep.
- `availability.ts`: `MODULE_MANIFEST = { ...manifestFrom([stock]), crm: {...}, … }` keeping every comment; `tables/defs/index.ts`: `TABLE_REGISTRY = [...tablesFrom([stock]), ...rest]`; `sandbox/datasets.ts`: `DATASETS = [...datasetsFrom([stockServer]), ...rest]`.
- Tests: `src/lib/modules/sdk.test.ts` parity snapshots (literal copies of today's stock manifest entry, two TableDefs with label function identity checked by calling them, stock datasets); `src/server/modules/links.sql.integration.test.ts` (both directions: declared ⇒ FK exists; FK between `stk_*` and a non-stock table ⇒ declared).
- Gates: `bun run check`, full `bun run test` (SUPABASE_DB_URL unset), `format:check`. PR title `feat(modules): module SDK — stock is one definition, registries derived`.

### S4 — base set, installer, provisioning step, Settings → Modules
- `availability.ts`: `export const BASE_MODULES: Record<ToggleId, boolean>` (on/off per Q1) next to the manifest; `toggleIds()` helper.
- `src/server/services/module-install.service.ts`: `installBaseModules(ctx, kind)`; insert rows `ON CONFLICT DO NOTHING`; landing page via nav service; invalidate tags; returns `{ rowsWritten, landingSet }` for the step detail.
- `organization-provision.service.ts`: step `modules` ("Base modules and landing page installed") after `rbac`; resolve kind from the `organizations` row (`kind` column; default business); `OrganizationProvisionStepId` gains `'modules'`; route test `provision/server.test.ts` updated.
- Settings → Modules: loop over `toggleIds()` with labels; PUT unchanged.
- Tests: `module-install.service.sql.integration.test.ts` (8 rows, second run 0, pre-existing row untouched, landing only when absent); provision service test for step order and failure skip; route-guard test with `BASE_MODULES` states: `/sales` blocked, `/crm` not.
- Gates as S6 + `lint:design`, `lint:tokens`, `i18n:compile` if labels added. PR title `feat(org): provisioning installs the base modules and the landing page; Settings lists every toggle`.

## Verification (post-merge)

QA stack: provision an org through `/api/organizations/provision` (mock gateway), inspect `app_modules` and `app_nav_config`. Prod: none required (no data change for existing orgs); next real org provisioning is the proof.

## Complexity Tracking

No `template_version`, no backfill script, no DDL (spec FR-008). Ledger: versioned templates, backfill of explicit rows for FACES/MINION, day-one data (currency, kinds, roles) remain in the proposal.
