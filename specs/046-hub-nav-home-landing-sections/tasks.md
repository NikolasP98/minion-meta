# Tasks: Hub navigation home (spec 046)

Format: `[ID] [P?] [Slice] Description`. Paths are hub paths. Each slice = one worktree `~/.cache/claude-tmp/hub-046-sN` from `origin/master` (S2 from `origin/feat/nav-sections-s5-page-access`), one draft PR, gates in the foreground with `timeout`.

## S0 — snapshot validation (hotfix)

- [ ] T001 [S0] `NavContextMenu.svelte`: `base` snapshot set in `openDlg`; `draftIssues` uses `base`.
- [ ] T002 [S0] `NavContextMenu.mounted.test.ts`: deferred-PUT case asserting no duplicate error while pending and close after resolve.
- [ ] T003 [S0] Gates: `bun run check`; `bun run vitest run src/lib/components/layout/ src/lib/nav/`; `bun run lint:design && bun run lint:tokens`; `bun run format:check`. Draft PR to master; body cites spec 046 S0.

## S1 — name only, auto-suffixed slug

- [ ] T010 [S1] `custom-sections.ts`: `uniqueSectionSlug`, `addSection({label, id?, icon?})` computes slug, export `freshNavId`.
- [ ] T011 [S1] `NavContextMenu.svelte`: remove slug field/state/handlers; preview from `uniqueSectionSlug(base, fLabel)`; rename passes label only.
- [ ] T012 [P] [S1] `custom-sections.test.ts`: suffix cases; `NavContextMenu.mounted.test.ts`: no slug input, "POS" ⇒ PUT body slug `pos-2`, two "Staff" ⇒ `staff`, `staff-2`.
- [ ] T013 [S1] Messages: drop unused slug error keys from `en.json`/`es.json` after grep; `bun run i18n:compile`.
- [ ] T014 [S1] Gates as T003 + `i18n:compile`. Draft PR.

## S2 — Advanced settings (stacked on #602)

- [ ] T020 [S2] Extract `AccessRoleRows.svelte` from `PageAccessDialog.svelte`; `PageAccessDialog` renders it unchanged in behaviour (its mounted test still green).
- [ ] T021 [S2] `NavContextMenu.svelte`: Advanced settings disclosure (Icon input; rows when `canEditAccess()`); new-section flow pre-generates the id, saves the document, then PUTs non-inherit rows to `/api/roles/overrides`; failure keeps the section and the dialog, Save retries the rows only.
- [ ] T022 [S2] Confirm/implement `section.icon` rendering in `Sidebar.svelte` with the pages' icon resolver.
- [ ] T023 [P] [S2] Mounted tests: order of PUTs with the pre-generated id; overrides failure path; no rows without `users:manage`.
- [ ] T024 [S2] Messages `nav_dialog_advanced`, `nav_dialog_icon` (en/es); gates as T014. Draft PR base `feat/nav-sections-s5-page-access`.

## S3 — `/chat`, landing resolver, Inicio first

- [ ] T030 [S3] Move `routes/(app)/home/**` → `routes/(app)/chat/**`; add `home/+page.server.ts` + `home/settings/+page.server.ts` 308 redirects.
- [ ] T031 [S3] `src/lib/nav/landing.ts`: `SAFE_PATH`, `CHAT_PATH`, `effectiveLandingPage()`; `src/lib/nav/landing.test.ts` matrix + literal-grep test.
- [ ] T032 [S3] `src/server/nav/landing.server.ts`: `resolveLandingFor(locals)` from cached inputs; `hooks.server.ts` uses it at the `/` redirect and the bypass branch; delete `server/landing-cache.ts` and its import in the preferences API; auth callback and onboarding redirect to `/`.
- [ ] T033 [S3] `(app)/+layout.server.ts` returns `landingPage`; `Sidebar.svelte` and `NavContextMenu.svelte` read it.
- [ ] T034 [S3] Nav document `landingPage`: type, schema (`SAFE_PATH`), normalize/visible/validate preserve it, op `setOrgLandingPage`, context-menu action for `settings:manage` with check mark; `nav-config.service.test.ts` round-trip.
- [ ] T035 [S3] `ModuleSwitcher.svelte`: Inicio first → `goto(page.data.landingPage)`, no `setMode`; hover crossfade + tooltip inside a module; reduced-motion. `Topbar.svelte`: Inicio row in the mobile picker.
- [ ] T036 [S3] Registries and callers: `nav/routes.ts`, `nav/modules.ts`, `GNav.svelte`, `FloatingAssistant.svelte`, `site-map.ts`, `hub-route-map.ts`, `route-design-manifest.ts`, `route-design-validation.ts`, `permissions.ts` comment; the twelve tests listed in plan.md.
- [ ] T037 [S3] Messages: add `nav_chat`, `nav_back_home`, `nav_org_setAsHome`, `nav_org_isHome`; remove `nav_allSections`; `i18n:compile`.
- [ ] T038 [S3] Route contract counts (six files) after `bun run test` (full suite, `SUPABASE_DB_URL` unset).
- [ ] T039 [S3] Gates: `check`, full `test`, `lint:design`, `lint:tokens`, `format:check`. Draft PR to master.

## Post-merge

- [ ] T040 Prod: `/home` → 308; owner opens `/`; record in the spec stub's §Verification.
