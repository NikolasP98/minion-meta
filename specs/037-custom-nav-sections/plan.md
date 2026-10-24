# Implementation Plan: Custom navigation sections with alias pages (Amendments A + B)

**Branch**: `spec/037-custom-nav-sections` (meta) | **Date**: 2026-10-23 (amended) | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/037-custom-nav-sections/spec.md`, Amendment A

## Summary

Every hub page has one main location and any number of links; org admins reshape navigation from context menus on the sidebar (Copy · Duplicate · Move · Rename · Hide · Delete/Restore · Permissions; New section/page · Paste; Not shown). Technical approach (research R1, R10–R14): one jsonb org document `app_nav_config` whose entries carry `kind: 'link' | 'main'` and map a URL **prefix**; a universal SvelteKit `reroute` composes paraglide's locale strip with a prefix rewrite (client cache + one cached `GET /api/nav/resolve` on the cold path); every custom instance has a 6-char id in its URL (`/<section>/<slug>~<id>`, resolved by id); page view rules are `permission_rules` rows keyed `page:<id>` / `page:<pattern>` / `section:<id>` surfaced as `page:<id>:view` permission strings (page row ?? section row ?? today's route policy) and edited from the context-menu "Access…" dialog; the server guards and `canViewPath` evaluate the rewritten target path with the page rule and — until spec 039 enforces a module's reads — the module-view floor (I1‴, keyed on the shared `DATASET_ENFORCED` constant); custom sections are injected into `getNavSections`/`getModules`, moved mains leave their native navs; a moved page's old URL client-replaces to its new main (I9). The management UI is one `NavContextMenu.svelte` built on the existing `ContextMenu` primitive, replacing the sidebar's hand-rolled "Set as home" menu.

## Technical Context

**Language/Version**: TypeScript strict, Svelte 5 (runes), SvelteKit 2.70.2, Bun (hub package manager)
**Primary Dependencies**: `@inlang/paraglide-sveltekit` 0.16.1, `drizzle-orm` (hand-written mirror), `postgres` via `withOrgCore` (RLS), `@minion-stack/cache`, zod (`parseBody`), lucide-svelte, `$lib/components/ui` (`ContextMenu`, `Picker`, `Dialog`, `ConfirmDialog`, `FormField`), `supabaseAdmin` (`permission_rules`)
**Storage**: Supabase Postgres, new table `app_nav_config` (RLS, `app_ledger`) + existing `permission_rules` rows; migration via `supabase/migrations/*.sql` + `scripts/db-migrate.ts`; never `drizzle-kit push`
**Testing**: vitest (targeted `bun x vitest run <paths>`), `src/hooks.tenant.test.ts` harness, mounted component tests (`*.mounted.test.ts` pattern, see `ContextMenu.mounted.test.ts`), QA stack seeds (`qa:seed:verify`), browser proof on `dev:local`
**Target Platform**: Vercel (hub), client-rendered app (`ssr = false`)
**Project Type**: web app (SvelteKit routes + server services)
**Performance Goals**: zero added work on known-prefix paths; ≤ 1 cached resolve per cold entry navigation; one cached org-document read per permissions load (2 m RBAC cache) and per app-layout load (30 m)
**Constraints**: constitution IV (RBAC wiring, i18n, design tokens; **no new route** so the route contract is untouched); security/data tag (owner approves + merges); no full `bun run test` with prod env; hub worktrees need a real `bun install`
**Scale/Scope**: ≤ 20 sections × 30 entries per org; ~24 hub files touched, 0 new page routes (one optional `GET /api/roles`), 1 migration; 6 hub PRs; cross-spec dependency on 039 (below)

## Constitution Check

| Principle | Status | How |
|---|---|---|
| I Spec before code | PASS | this feature dir + stub `specs/2026-10-23-hub-custom-nav-sections-spec.md` (pass 2); owner approval precedes `/speckit-implement` |
| II AS-IS → TO-BE → DELTA with evidence | PASS | AS-IS anchors at `7d06cdd4` incl. the data-read exposure finding (§Data reads); DELTA T1–T11 each with a proving test; the one unverified behaviour (PageHeader fallback title) stays labelled (quickstart Q20) |
| III Slice-scoped delivery | PASS | 6 slices, each one hub PR against `master` from its own worktree, gates in the foreground; S1 is a delta on the existing `hub-037-s1` worktree |
| IV Required build steps | PASS | RBAC wiring table below (module/route gate, nav visibility, write-API gate, owner scope/field masking untouched); Paraglide keys + `i18n:compile` (S4, S5); `lint:design && lint:tokens` (S2 layout.svelte, S3 navs, S4 menus, S5 roles/sell); route contract untouched (no new page) |
| V Security/data human gates | PASS | tags `security`, `data`; the owner approves spec and merges every slice; migration additive; D5 answered (two axes) with the transition floor keeping reads safe until 039 |
| Open-items ledger | PASS | S6 writes `proposals/2026-10-23-hub-custom-nav-sections-followups.md` for the named cuts (D3 native-nav re-point, outbound links, per-user hide, PUT precondition, Duplicate in built-in sections, long-press helper promotion) |

Re-check after design: no violation introduced; no Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)
```text
specs/037-custom-nav-sections/
├── spec.md            # Amendment A summary + revised body
├── plan.md
├── research.md        # R1–R9 (v1) + R10–R14 (Amendment A)
├── data-model.md
├── quickstart.md
├── contracts/nav-config-api.md
├── checklists/requirements.md
├── tasks.md
└── evidence/          # S6 output
```

### Source code (hub, `minion_hub/`, PR base `master`)
```text
supabase/migrations/20261024000000_app_nav_config.sql          # S1 (exists in worktree, keep)
src/server/db/pg-schema/nav-config.ts                          # S1 (exists, keep)
src/server/services/nav-config.service.ts                      # S1 (exists; + deleteOrphanLinkRules)
src/server/services/rbac.service.ts                            # S1 edit: API_WRITE_PREFIXES (exists), Capabilities.explicitView
src/lib/permissions.ts                                         # S2 edit: DATASET_ENFORCED (shared with spec 039)
src/lib/nav/transition-floor.test.ts                           # S2 new
src/server/services/permissions.service.ts (+ .test.ts)        # S1 edit: page:<id>:view strings
src/lib/nav/custom-sections.ts (+ .test.ts)                    # S1 rewrite of the worktree file: model v2, prefix resolve, ops
src/lib/nav/nav-config-schema.ts                               # S1 edit (kind, hidden, builtin; no roles)
src/lib/nav/nav-config.svelte.ts                               # S1 (exists, keep)
src/routes/api/nav/config/+server.ts, resolve/+server.ts, server.test.ts   # S1 edit (resolve → {prefix,target}; PUT side effects)
src/routes/(app)/+layout.server.ts (+ layout.server.test.ts)   # S1 edit (exists; visibleNavConfig signature)
src/app.d.ts                                                   # S1 (exists; + pageRule)
scripts/qa/seed/tenancy.ts, matrix.ts, seed.contract.test.ts   # S1 edit (exists; kind + viewer rule row)
src/lib/nav/alias-reroute.ts (+ .test.ts)                      # S2 new (prefix rewrite)
src/hooks.ts                                                   # S2 edit: composed reroute
src/routes/(app)/+layout.svelte                                # S2 edit: setInstanceMap effect + moved-main / stale-slug replaceState (I9, D8)
src/hooks.server.ts (+ hooks.tenant.test.ts)                   # S2 edit: locals.navConfig + effectiveGuardPath + I1′
src/lib/access/can.svelte.ts (+ .test.ts)                      # S2 edit: prefix-aware canViewPath
src/lib/nav/custom-sections-nav.ts (+ .test.ts)                # S3 new (Section[]/ModuleDef[] builders, navPath, native-nav filters)
src/lib/components/layout/sections.ts, Sidebar.svelte          # S3 edit: custom sections, builtin overrides
src/lib/nav/modules.ts, src/lib/state/ui/nav-mode.svelte.ts    # S3 edit: custom modules; getAreaItems drops moved mains; ModuleNavData.navConfig
src/lib/components/*/*Nav.svelte (11 files)                    # S3 edit: activeId via navPath()
src/lib/nav/nav-edit.svelte.ts                                 # S4 new (clipboard, canEditNav, saveNavConfig)
src/lib/actions/longpress.ts                                   # S4 new (20 lines)
src/lib/components/layout/NavContextMenu.svelte (+ .mounted.test.ts)   # S4 new
src/lib/components/layout/Sidebar.svelte, Topbar.svelte        # S4 edit: menus wired, hand-rolled .ctx-menu removed
messages/en.json, messages/es.json                             # S4, S5 edit (append-only)
src/lib/components/layout/PageAccessDialog.svelte (+ .mounted.test.ts)   # S5 new
src/routes/api/roles/+server.ts                                # S5 edit: GET catalog (if absent)
src/routes/api/roles/overrides/+server.ts (+ server.test.ts)   # S5 edit: accept page:/section: keys
src/routes/(app)/pos/sell/+page.svelte                         # S5 edit: charge gated by canAct('pos','create')
AGENTS.md (hub)                                                # S6 edit: RBAC checklist item for links
```

**Structure Decision**: single SvelteKit project; pure logic under `src/lib/nav/` (Svelte-free, plain vitest lane), server logic in `src/server/services/`, API under `src/routes/api/nav/`, UI in `src/lib/components/layout/`.

## Phase 0 — research (done): `research.md` R1–R14. D5–D7 are owner confirmations with defaults.

## Phase 1 — design (done): `data-model.md`, `contracts/nav-config-api.md`, `quickstart.md`.

## Slices (one hub PR each; order and parallelism)

| Slice | Branch (hub) | Depends on | Parallel with | Scope |
|---|---|---|---|---|
| S1 storage + model v2 + API + permission strings + layout data + seed | `feat/nav-sections-s1-config` (existing worktree `~/.cache/claude-tmp/hub-037-s1`) | — | — | T1–T4 |
| S2 prefix routing + server/client enforcement (I1′, I9) | `feat/nav-sections-s2-alias-routing` | S1 | S3, S5 | T5–T7 |
| S3 nav integration (sidebar, module mode, switcher, moved mains, hidden, side-nav active state) | `feat/nav-sections-s3-nav` | S1 | S2, S5 | T8 |
| S4 context menus + dialogs + long-press + i18n | `feat/nav-sections-s4-context-menus` | S3 (nav shapes, Sidebar) | S2, S5 | T9 |
| S5 page-access surface (`PageAccessDialog`, overrides keys, `GET /api/roles`, till charge gating) | `feat/nav-sections-s5-page-access` | S1, S4 (menu entry) | S2, S3 | T10 |
| S6 proof + docs + ledger | `feat/nav-sections-s6-proof` (hub docs) + meta PR | S1–S5 + 039 S2 (POS enforced, to prove the floor flip) | — | T11 |

File-overlap check: S2 touches `hooks.ts`, `hooks.server.ts`, `can.svelte.ts`, `(app)/+layout.svelte`, `src/lib/permissions.ts` (`DATASET_ENFORCED`, if 039 S1 has not created it yet — whichever lands first owns the line); S3 touches `sections.ts`, `modules.ts`, `nav-mode.svelte.ts`, `Sidebar.svelte` (items only), the `*Nav.svelte` files; S4 touches `Sidebar.svelte`/`Topbar.svelte` heavily (hence after S3), `messages/*.json`; S5 touches `NavContextMenu.svelte` (wires the dialog), `api/roles/overrides`, `api/roles/+server.ts`, `nav-config.service.ts`, `pos/sell/+page.svelte`, `messages/*.json` (append-only; S4 and S5 both append — rebase, never checkout over). S2/S3 are disjoint ⇒ parallel worktrees; each rebases on `master` after S1 merges.

## Slice graph across specs 037 and 039
```text
037 S1 ─┬─► 037 S2 (routing + guards, floor ON for every module) ─┐
        ├─► 037 S3 (nav) ─► 037 S4 (menus) ─► 037 S5 (Access dialog) ─┤
        │                                                               ├─► 037 S6 proof (needs 039 S2 to show the flip)
039 S1 (readDataset + ratchet + DataSource + DATASET_ENFORCED=[]) ─► 039 S2 POS (DATASET_ENFORCED += pos) ─┤
        └────────────────────────────────── 039 S3/S4/S5 per module ──────────────────────────────────────┘
                                            039 S6 Roles matrix = data editor (after 037 S5)
```
- 037 S1–S5 ship **before** 039 under the transition floor: a custom instance pointing at an unenforced module needs the page role AND `<module>:view`; nothing is exposed.
- 039 S2+ flips the floor one module at a time by growing `DATASET_ENFORCED`; `transition-floor.test.ts` (037 S2) and the ratchet test (039 S1) both read it.
- 039 S6 removes the Roles matrix "Sections" page rows only after 037 S5's Access dialog exists (otherwise page rules lose their editor).

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
| Module/route gate for every instance path: rewritten target path through `isAppRouteBlocked`; page rule (`page:<id>:view`) + transition floor while `module ∉ DATASET_ENFORCED`; built-in mains: explicit `page:<pattern>` row ?? today's `decideRouteAccess` | S2 |
| Nav visibility: `canViewPath` instance-aware (`page:<id>:view` + floor while unenforced); custom items filtered like built-ins; hidden filtered; `visibleNavConfig` on the server (I8) | S2 (canViewPath), S1 (I8), S3 (items) |
| Write-API gate: `/api/nav` → `settings:manage` in `API_WRITE_PREFIXES` + `requireOrgCapability` in handlers (exists in worktree); `/api/roles/overrides` stays `users:manage` | S1, S5 |
| Page-rule surface: `permission_rules` `page:`/`section:` rows; `page:<id>:view` strings (page ?? section ?? target policy, admin all); orphan cleanup on PUT; `invalidateRbac` on PUT; editor = `PageAccessDialog` (`users:manage`) | S1, S5 |
| Owner scope / field masking | unchanged — module-level, enforced in the target's services (I1′); S6 proof confirms `/staff/sell` writes go to `/api/pos/*` |
| Button gating by data roles (FR-010) | S5 (till charge); others → ledger from S6 proof; denied reads → spec 039 |
| Menu entry visibility: structural ops `canClient('settings:manage')`, Access… `canClient('users:manage')` | S4 |

## Risks and fallbacks
- If the server-side `event.fetch` inside `reroute` misbehaves on Vercel, S2 falls back to research R1 option C (302 from `finishApp`) behind the same data model; I2 relaxes to "entry URL opens the target" and the owner is told before merge.
- `replaceState` before the router is initialised throws (`url-state.svelte.ts:217` comment) — the I9 effect runs in `afterNavigate`, never at module scope.
- Permission strings now depend on the nav document: a failed `readNavConfig` inside `loadPermissionsForUser` must fail soft (no instance strings), never 500 the layout.
- `~` in paths: if a deployed preview normalises or rejects it (quickstart Q21), swap the marker constant to `--` and add the `slugify` rule (research R18).
- `messages/*.json` are appended by S4 and S5 in parallel: rebase before opening each PR; a checkout once clobbered a co-agent's keys (meta memory).
