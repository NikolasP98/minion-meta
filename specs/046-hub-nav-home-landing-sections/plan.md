# Implementation Plan: Hub navigation home (spec 046)

**Branch**: `046-hub-nav-home-landing-sections` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

## Summary

Four hub slices, each one PR against `master` from its own worktree. S0 is a one-line hotfix. S1 removes the slug field and auto-suffixes. S2 (stacked on hub #602) adds the Advanced settings disclosure. S3 renames `/home` to `/chat`, introduces the single landing-page resolver, puts Inicio first in the switcher and on mobile, and retires `nav_allSections`.

## Technical Context

- Hub: SvelteKit 2 / Svelte 5 runes / Bun 1.3.4 / vitest (happy-dom mounted tests) / Paraglide i18n (`messages/{en,es}.json` → `bun run i18n:compile`).
- Nav document: `src/lib/nav/custom-sections.ts` (types, ops, validator), `nav-config-schema.ts` (zod), `nav-edit.svelte.ts` (save + optimistic), `nav-config.svelte.ts` (`navConfig()` = optimistic ?? layout data), server `nav-config.service.ts` (cached read, write, orphan-rule prune), API `routes/api/nav/config/+server.ts`.
- Switcher: `ModuleSwitcher.svelte` (desktop; uses `Dropdown` with `items[]`, `onSelect(value)`), `Topbar.svelte` (mobile sheet with its own picker), `nav-mode.svelte.ts` (`setMode`, `pickModule`, `activeModule`, `defaultNavMode(roles, platformRole)`).
- Landing: `hooks.server.ts:97-141` (`resolveLandingPage`), `:505` (redirect), `:251` (bypass), `server/landing-cache.ts`; preference API `routes/api/me/preferences/[section]/+server.ts` (`landingPage` regex at :146, cache invalidation at :189). The hook already has, cached, everything the resolver needs: `loadPermissionsForUser` (2 m cache, `:290`), `listModuleStates` (5 m, `:382`), `readNavConfig` (30 m), `getUserPreferences`; `event.locals.orgKind`, `user.role`. Predicates: `isAppRouteBlocked(path, {kind, moduleStates})` (`lib/modules/route-guard.ts:72`), `decideRouteAccess(path, {authenticated, role, permissions, orgCapabilities})` (used at `hooks.server.ts:341`), `instanceAllowed` + `resolveNavInstance` (`custom-sections.ts`).
- Access rows: hub #602 `src/lib/components/layout/PageAccessDialog.svelte` (props `open`, `subject {key,label}`, `onclose`; fetches `/api/roles` + `/api/roles/overrides?module=`; per-row optimistic PUT).
- Tests touching `/home`: `hooks.ambient-org-tx.test.ts:164`, `sections.test.ts:10,85,91,127,164`, `availability.test.ts:59`, `route-guard.test.ts:129`, `custom-sections.test.ts:212`, `modules-rbac.test.ts:19,48`, `wave-d-composition.test.ts:76`, `assistant-context.test.ts:90`, `nav-mode.test.ts:52`, `onboarding/page.server.test.ts:80`.

## Constitution Check

- I: spec exists and is owner-approved. II: anchors in spec AS-IS. III: one PR per slice from `~/.cache/claude-tmp/hub-046-sN`, gates foreground. IV: i18n, design lint, route contract, RBAC addressed per slice below. V: tags ui + permissions → owner merges; no production data script in this spec.

## Slices

### S0 — hotfix: validate the draft against the dialog-open snapshot
- `NavContextMenu.svelte`: add `let base = $state<NavConfig>(EMPTY_NAV_CONFIG)`; set `base = config` in `openDlg`; `draftIssues = $derived(draftOp ? newIssues(base, draftOp(base)) : [])`. (`config` stays for everything else.)
- Test: `NavContextMenu.mounted.test.ts` case "new section while the PUT is pending shows no duplicate error": mock `fetch` so the GET returns `CONFIG` and the PUT returns a deferred promise; type a name, submit, assert `nav_error_duplicate` text absent while pending, dialog closed after resolve.
- Gates: `bun run check`, `bun run vitest run src/lib/components/layout/`, `lint:design`, `lint:tokens`.
- PR title: `fix(nav): new-section dialog validates against the snapshot, not the optimistic document`. Body names the spec and that it bypasses nothing (S0 of 046).

### S1 — name only; auto-suffixed slug
- `custom-sections.ts`: `export function uniqueSectionSlug(config, label, reserved = reservedSectionSlugs())`: base `slugify(label)`; while `reserved.has(s) || config.sections.some(x => x.slug === s)` append `-n` (n from 2), trimming the base so the result is ≤ 32 chars. `addSection(config, { label, id? })` computes the slug itself and accepts an optional pre-generated id (used by S2). Export `freshId` (rename to `freshNavId`) for S2.
- `NavContextMenu.svelte`: remove `fSlug`, `slugEdited`, `onLabelInput`, the slug `FormField`, the `hasSlug` branch; `urlPreview` for new-section = `/${uniqueSectionSlug(base, fLabel)}`; `renameSection`/`renamePage` calls pass `{ label }` only; `issueText` maps slug codes to `field: 'form'` (should never appear).
- Messages: remove `nav_dialog_slug`, `nav_error_format`, `nav_error_reserved`, `nav_error_duplicate` from `en.json`/`es.json` only if no other reader (grep); keep `nav_dialog_url_preview`.
- Tests: `custom-sections.test.ts` — suffixing (`staff`→`staff-2`→`staff-3`, `pos`→`pos-2`, 32-char trim); mounted — no slug input, "POS" saves with slug `pos-2` (inspect the PUT body).
- Gates as S0 plus `bun run i18n:compile`.
- PR title: `feat(nav): sections need only a name; slugs are auto-suffixed`.

### S2 — Advanced settings disclosure (stacked on hub #602 `feat/nav-sections-s5-page-access`)
- Extract `AccessRoleRows.svelte` from `PageAccessDialog.svelte`: props `roles`, `values` (bindable), `fixed` set, `onchange(roleKey, choice)`; `PageAccessDialog` keeps its fetch + immediate PUT and renders the rows. For the section dialog: `AccessRoleRows` with deferred values; on Save after `saveNavConfig` resolves, PUT each non-inherit row to `/api/roles/overrides` (same body #602 sends) with `module: 'section:<id>'`; errors shown under the rows; Save retries only the overrides when the section already exists (`sectionCreatedId` state).
- Icon field: text input bound to `fIcon`; `addSection`/`renameSection` accept `icon`. Confirm the sidebar renders `section.icon` (grep `icon` in `Sidebar.svelte` custom-section header); if it does not, render it with the same resolver pages use.
- Disclosure: use the house `Disclosure`/`Collapsible` primitive if one exists in `$lib/components/ui` (grep); else a `<details>` styled with tokens.
- Tests: mounted — expand, deny `viewer`, Save ⇒ one nav PUT then one overrides PUT with the pre-generated id; overrides failure keeps the section and the dialog open.
- Gates as S1. PR base = `feat/nav-sections-s5-page-access`; after #602 merges, retarget to master (never delete the base first).
- PR title: `feat(nav): section dialog gets Advanced settings — icon and who can view`.

### S3 — `/home` → `/chat`, single landing resolver, Inicio first, mobile Home row
- Rename `src/routes/(app)/home/**` → `src/routes/(app)/chat/**`; new `routes/(app)/home/+page.server.ts` and `home/settings/+page.server.ts` with `redirect(308, '/chat' | '/chat/settings')` (pattern: `routes/(app)/ads/+page.server.ts`). Update every registry/caller listed in spec AS-IS and the tests listed above. `nav/routes.ts` entry: path `/chat`, `title: m.nav_chat`, matcher `/chat`; `nav/modules.ts:605` organization `href: '/chat'` + matcher; `GNav` `H` → `page.data.landingPage`; `FloatingAssistant` `onMyAgentPage` → `/chat`; `site-map`, `hub-route-map`, `route-design-manifest` (+ `route-design-validation` list), `permissions.ts` comment, `secure-permissions`/`architecture.service` are filesystem paths, untouched.
- `src/lib/nav/landing.ts` (pure, no `$app` imports): `effectiveLandingPage({ userChoice, orgChoice, canView, mode: 'full'|'module', orgItems: string[], moduleHrefs: string[] }): string` — steps per FR-007; `isSafePath` = the preference regex, exported and reused by the preferences API and the nav schema; last resort `CHAT_PATH = '/chat'` exported from here only.
- `src/server/nav/landing.server.ts`: `resolveLandingFor(locals)` builds the inputs from the hook/layout-available data (permissions, moduleStates, kind, navConfig, preferences, roles) and returns `effectiveLandingPage(...)`. Used by `hooks.server.ts` (replace `resolveLandingPage`; keep the locale prefix and the open-redirect guard; bypass branch → `CHAT_PATH`), and by `(app)/+layout.server.ts` which returns `landingPage`. Delete `server/landing-cache.ts` and its invalidation call. Auth callback and onboarding redirect to `/` (the resolver decides).
- Nav document: `NavConfig.landingPage?: string`; `navConfigSchema` adds `landingPage: z.string().regex(SAFE_PATH).optional()`; `normalizeNavConfig`, `visibleNavConfig`, `validateNavConfig` preserve it; op `setOrgLandingPage(config, path)`; context-menu entry (settings:manage) "Set as organisation home page" / "Organisation home page" with check mark, next to the personal one.
- `Sidebar.svelte:75`, `NavContextMenu.svelte:99`: `currentHome = page.data.landingPage`.
- `ModuleSwitcher.svelte`: items `[ {value:'home', label: m.nav_home(), icon: Home}, divider, ...modules ]`; `onSelect('home')` → `goto(page.data.landingPage)` only; trigger hover crossfade (`.icon-cell` gets a `.home-icon` sibling; `.switcher:hover .mod-icon {opacity:0}`, `.switcher:hover .home-icon {opacity:1}` only when `active` is set; `@media (prefers-reduced-motion: reduce)` no transition); tooltip via `title={m.nav_back_home()}` on the trigger when inside a module. `Topbar.svelte`: first picker row = Inicio → `moduleNavigation.go(page.data.landingPage)` and close. Remove `nav_allSections` from both components and messages; add `nav_chat`, `nav_back_home`, `nav_org_setAsHome`, `nav_org_isHome` (en + es).
- Literal test: `src/lib/nav/landing.test.ts` includes a case that greps `src/` (Node `fs`) for `'/home'`/`"/home"`/`` `/home`` and `/chat` literals and asserts the only hits are `landing.ts`, `routes/(app)/home/**`, and `*.test.ts`.
- Route contract: `/home` + `/home/settings` screens become `/chat` + `/chat/settings` (same count); the two redirect pages are new endpoints — run the full `bun run test` and adjust the six counts (memory `hub-route-contract-required-build-step`).
- Tests: resolver matrix (user pref viewable / gated / absent; org value; full vs module default; personal org); hook/route tests for 308 and 307; mounted switcher test; update the 12 listed tests.
- Gates: `bun run check`, `bun run test` (full, `SUPABASE_DB_URL` unset), `lint:design`, `lint:tokens`, `i18n:compile`, `format:check`.
- PR title: `feat(nav): Inicio first and `/` resolves to your landing page; /home becomes /chat`.

## Verification (post-merge)

- dev:local: create "this is a test" twice and "POS"; open `/home` → 308; set a personal home page, turn the module off in Settings → Modules, open `/` → not 404.
- Prod after deploy: `curl -sI https://hub.minion-ai.org/home` → 308 `/chat`; owner opens `/`.

## Complexity Tracking

No constitution violations. Slug field removal deletes code; the resolver replaces six constants with one function; `landing-cache.ts` is deleted.
