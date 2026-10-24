# Implementation Plan: Custom navigation sections with alias pages

**Branch**: `spec/037-custom-nav-sections` (meta) | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/037-custom-nav-sections/spec.md`

## Summary

Org admins create sidebar sections with their own URL prefix and add alias pages that render existing hub screens at new URLs (`/staff/sell` → `/pos/sell`), each with role grants. Technical approach (research R1–R3): one jsonb org document `app_nav_config`; a universal SvelteKit `reroute` that composes paraglide's locale strip with an alias step (client cache + one cached `GET /api/nav/resolve` on the cold path); the two existing server guards and `canViewPath` evaluate the **target** path plus the alias grant (RBAC intersects, never widens); custom sections are injected into `getNavSections` and `getModules` through one helper; a `/settings/navigation` page manages the document.

## Technical Context

**Language/Version**: TypeScript strict, Svelte 5 (runes), SvelteKit 2.70.2, Bun (hub package manager)
**Primary Dependencies**: `@inlang/paraglide-sveltekit` 0.16.1 (reroute composition), `drizzle-orm` (hand-written mirror), `postgres` via `withOrgCore` (RLS), `@minion-stack/cache` (`cached`, tenant tags), zod (`parseBody`), lucide-svelte, existing `$lib/components/ui` + `foundations`
**Storage**: Supabase Postgres, new table `app_nav_config` (RLS, `app_ledger`), migration via `supabase/migrations/*.sql` + `scripts/db-migrate.ts`; never `drizzle-kit push`
**Testing**: vitest (targeted `bun x vitest run <paths>`), `src/hooks.tenant.test.ts` harness, QA stack seeds (`qa:seed:verify`), route-contract suites, browser proof on `dev:local`
**Target Platform**: Vercel (hub), client-rendered app (`ssr = false`)
**Project Type**: web app (SvelteKit routes + server services)
**Performance Goals**: zero added work on known-prefix paths; ≤ 1 cached resolve per cold alias navigation; nav config read is one cached (30 m / SWR 5 m) org document
**Constraints**: constitution IV (RBAC wiring, route contract, i18n, design tokens); security/data tag (owner approves + merges); no full `bun run test` with prod env; hub worktrees need a real `bun install`
**Scale/Scope**: ≤ 20 sections × 30 pages per org; ~15 hub files touched + 1 new route + 1 migration; 5 hub PRs

## Constitution Check

| Principle | Status | How |
|---|---|---|
| I Spec before code | PASS | this feature dir + stub `specs/2026-10-23-hub-custom-nav-sections-spec.md`; owner approval precedes `/speckit-implement` |
| II AS-IS → TO-BE → DELTA with evidence | PASS | spec.md AS-IS anchors at `7d06cdd4`; DELTA T1–T10 each with a proving test; the one unverified behaviour (PageHeader fallback title) is labelled and checked in quickstart Q15 |
| III Slice-scoped delivery | PASS | 5 slices, each one hub PR against `master` (registry PR base) from its own worktree, gates in the foreground |
| IV Required build steps | PASS | S4 wires RBAC (registry override + `canViewPath` + write prefix + handler gate), route manifest + six counts, Paraglide keys, `lint:design && lint:tokens`; S1/S2 wire the alias guards (module/route gate, nav visibility, write-API gate); owner scope and field masking are untouched because they live in the target services |
| V Security/data human gates | PASS | tags `security`, `data`; the owner approves spec and merges every slice; the migration is additive (new table) with no data script |
| Open-items ledger | PASS | S5 writes `proposals/2026-10-23-hub-custom-nav-sections-followups.md` for the named cuts |

Re-check after Phase 1 design: no violation introduced; no Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)
```text
specs/037-custom-nav-sections/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/nav-config-api.md
├── checklists/requirements.md
├── tasks.md
└── evidence/            # S5 output
```

### Source code (hub, `minion_hub/`, PR base `master`)
```text
supabase/migrations/20261024000000_app_nav_config.sql          # S1 new
src/server/db/pg-schema/nav-config.ts                          # S1 new (Drizzle mirror)
src/server/services/nav-config.service.ts                      # S1 new (read/write, cached)
src/server/services/rbac.service.ts                            # S1 edit: API_WRITE_PREFIXES += ['/api/nav','settings']
src/lib/nav/custom-sections.ts (+ .test.ts)                    # S1 new (pure model, validation, grants, reserved set, aliasable targets)
src/lib/nav/nav-config-schema.ts                               # S1 new (zod)
src/lib/nav/nav-config.svelte.ts                               # S1 new (page.data getter)
src/routes/api/nav/config/+server.ts, resolve/+server.ts, server.test.ts   # S1 new
src/routes/(app)/+layout.server.ts (+ layout.server.test.ts)   # S1 edit: navConfig in the bundle
src/app.d.ts                                                   # S1 edit: Locals.navConfig
scripts/qa/seed/tenancy.ts, matrix.ts, seed.contract.test.ts   # S1 edit: seeded staff section
src/lib/nav/alias-reroute.ts (+ .test.ts)                      # S2 new
src/hooks.ts                                                   # S2 edit: composed reroute
src/routes/(app)/+layout.svelte                                # S2 edit: setAliasMap effect
src/hooks.server.ts (+ hooks.tenant.test.ts)                   # S2 edit: locals.navConfig + alias-aware guards
src/lib/access/can.svelte.ts (+ .test.ts)                      # S2 edit: alias-aware canViewPath
src/lib/nav/custom-sections-nav.ts (+ custom-sections-nav.test.ts)   # S3 new (Section[]/ModuleDef[] builders, navPath)
src/lib/components/layout/sections.ts, Sidebar.svelte          # S3 edit: append custom sections
src/lib/nav/modules.ts, src/lib/state/ui/nav-mode.svelte.ts    # S3 edit: append custom modules; ModuleNavData.navConfig
src/lib/components/*/*Nav.svelte (11 files, research R7)       # S3 edit: activeId via navPath()
src/routes/(app)/settings/navigation/+page.server.ts, +page.svelte   # S4 new
src/lib/routes/route-access-registry.ts, route-design-manifest.ts, route-design-validation.ts   # S4 edit
scripts/ui-audit-inventory.test.ts, src/server/ui-audit/frontend-contract-scanner.test.ts        # S4 edit (counts)
src/lib/components/settings/SettingsNav.svelte, messages/en.json, messages/es.json                # S4 edit
src/lib/routes/route-access-authority.test.ts                  # S4 edit
AGENTS.md (hub)                                                # S5 edit: RBAC checklist item for aliases
```

**Structure Decision**: single SvelteKit project; pure logic under `src/lib/nav/` (Svelte-free, vitest plain lane), server logic in `src/server/services/`, API under `src/routes/api/nav/`, UI under `src/routes/(app)/settings/navigation/`.

## Phase 0 — research (done): `research.md` R1–R9. All NEEDS CLARIFICATION resolved; D1–D3 are owner confirmations with defaults.

## Phase 1 — design (done): `data-model.md`, `contracts/nav-config-api.md`, `quickstart.md`.

## Slices (one hub PR each; order and parallelism)

| Slice | Branch (hub) | Depends on | Parallel with | Scope |
|---|---|---|---|---|
| S1 storage + model + API + layout data + seed | `feat/nav-sections-s1-config` | — | — | T1–T4 |
| S2 alias routing + server/client enforcement | `feat/nav-sections-s2-alias-routing` | S1 | S3, S4 | T5–T7 |
| S3 nav integration (sidebar, module mode, switcher, side-nav active state) | `feat/nav-sections-s3-nav` | S1 | S2, S4 | T8 |
| S4 management page + route contract + i18n | `feat/nav-sections-s4-settings-page` | S1 | S2, S3 | T9 |
| S5 proof + docs + ledger | `feat/nav-sections-s5-proof` (hub docs) + meta PR | S1–S4 | — | T10 |

File-overlap check: S2 touches `hooks.ts`, `hooks.server.ts`, `can.svelte.ts`, `(app)/+layout.svelte`; S3 touches `sections.ts`, `modules.ts`, `nav-mode.svelte.ts`, `Sidebar.svelte`, the `*Nav.svelte` files; S4 touches the settings route, registries, manifest, count pins, `SettingsNav.svelte`, `messages/*.json`. No shared files between S2/S3/S4 ⇒ safe to run in parallel worktrees; each rebases on `master` after S1 merges. `messages/*.json` are append-only (meta memory: a checkout once clobbered a co-agent's i18n keys).

## Gates (every slice, foreground, capture exit codes — never pipe a gate into `tail`)
```bash
bun install --frozen-lockfile
bun run i18n:compile                      # whenever messages/*.json changed
timeout 900 bun run check; echo "check exit=$?"          # 0 errors, 0 warnings
bun run lint:design && bun run lint:tokens                 # any .svelte touched; debt may only decrease
bun x vitest run <slice paths>            # listed per slice in tasks.md — NEVER `bun run test` with a prod .env
```
Schema slice (S1) additionally: `bun run qa:up --fresh` (or `dev:local`) then `bun run qa:seed:verify`; CI jobs `migration-seed-pairing` and `qa-stack` must be green.

## RBAC wiring checklist (constitution IV) — who does what
| Item | Slice |
|---|---|
| Module/route view gate for `/settings/navigation` (`ROUTE_ACCESS_POLICY_OVERRIDES` → `org-capability:settings:manage`) | S4 |
| Module/route gate for every alias (target policy + target availability + section/page grant in both server guards) | S2 |
| Nav visibility: `canViewPath` alias-aware; settings tab filtered by `canViewPath`; custom items filtered like built-ins | S2 (canViewPath), S3 (items), S4 (tab) |
| Write-API gate: `/api/nav` → `settings:manage` in `API_WRITE_PREFIXES` + `requireOrgCapability` in handlers | S1 |
| Owner scope / field masking | unchanged — enforced in the target's services (I1); S5 proof confirms `/staff/sell` writes go to `/api/pos/*` |

## Risks and fallbacks
- If the server-side `event.fetch` inside `reroute` misbehaves on Vercel (e.g. prerender state or sub-request depth), S2 falls back to research R1 option C (302 to the target from `finishApp`) behind the same data model; the spec's I2 would then be relaxed to "alias URL opens the target" and the owner is told before merge.
- Paraglide's `i18n.handle()` locale redirect for an unprefixed alias costs one extra resolve round-trip; acceptable (already true for every unprefixed page URL).
- Route-count pins are updated in S4 only; S1–S3 add no filesystem page routes (API routes are not counted: `discoverPageEndpoints` walks `+page*` files only).
