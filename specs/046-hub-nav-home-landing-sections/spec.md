# Feature Specification: Hub navigation home — resolved landing page, `/home` → `/chat`, sections without slugs

**Feature Branch**: `046-hub-nav-home-landing-sections`

**Created**: 2026-11-01

**Status**: Approved by owner 2026-11-01 ("run autonomously … proceed")

**Input**: Proposal `proposals/2026-10-28-hub-org-module-packages-tenancy-nav-home.md` (T1, T2, S0–S3) and the owner's answers of 2026-10-30/11-01: no hard-coded landing path anywhere, `/` always redirects to the user-set page, `/home` becomes `/chat`, Home first in the module switcher, sections need only a name, the section dialog gets an "Advanced settings" disclosure with permissions.

Evaluated against hub `origin/master` `812a4b0a`. Hub PR #602 (spec 037 S5, `PageAccessDialog`) is open and is the base of S2.

## AS-IS (observable today, with anchors)

- **Landing page.** `hooks.server.ts:505` redirects an authenticated `/` to `resolveLandingPage()` (`:107`), which reads the per-user `landingPage` preference and otherwise returns the constant `/home`. The same constant is repeated in the auth-disabled bypass (`hooks.server.ts:251`), the auth callback (`routes/auth/callback/+server.ts:8`), onboarding (`routes/onboarding/+page.server.ts:47,145`), `Sidebar.svelte:75` and `NavContextMenu.svelte:99` (`?? '/home'`). A stored preference that the user can no longer view (module turned off, page denied) is still returned and the module guard then 404s.
- **`/home`** is the personal-agent chat screen (`routes/(app)/home/+page.svelte`, settings at `/home/settings`). Its nav title is `nav_home` = "Inicio" (`nav/routes.ts:85`). 19 non-test files name the path.
- **Module switcher** (`ModuleSwitcher.svelte:42-44`): items = modules, divider, "Todas las secciones" (`nav_allSections`) last. Picking it calls `navMode.setMode('full')`, which is stored in `localStorage` (`nav-mode.svelte.ts:95`). Mobile (`Topbar.svelte:58-80`) is always module-scoped with its own picker and no full-nav entry.
- **New section dialog** (`NavContextMenu.svelte:395-450, 505-545`): fields Name and Slug (slug auto-filled from the name until edited, `:436`). Draft validation `draftIssues = newIssues(config, draftOp(config))` (`:418`) reads `config = navConfig()` (`:87`), which `saveNavConfig` replaces with the optimistic document **before** the PUT resolves (`nav-edit.svelte.ts:63`). While the save is pending the dialog therefore validates "add this section" against a document that already contains it and shows `nav_error_duplicate` ("Ya existe una sección con este slug") under the slug field with the spinner running; the toast "Navegación actualizada" then fires and the dialog closes. Screenshots 2026-10-28 (owner). Rename is unaffected (idempotent on the optimistic copy).
- A section with a reserved slug (`pos`, a locale tag, an internal prefix; `custom-sections.ts:77`) or a duplicate slug is refused (`:343-345`) and the user must pick another slug by hand.
- Access rules for a page or section are edited only through the context-menu "Access…" dialog that PR #602 adds; the New/Rename dialog has no access or icon controls (`NavContextMenu.svelte:187,205` TODO(handoff)).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Creating a section never shows a false error (Priority: P1)

An owner right-clicks the sidebar, picks "New section", types a name, presses Save. The section appears; no error is shown at any point; the dialog closes once.

**Why this priority**: it is a visible bug reported with screenshots.

**Independent Test**: mount `NavContextMenu` with a `fetch` mock that resolves the PUT late; open New section, type "this is a test", submit; assert no `nav_error_duplicate` text appears before the PUT resolves and the dialog closes after it.

**Acceptance Scenarios**:

1. **Given** the dialog is open with name "this is a test", **When** Save is pressed and the PUT is still pending, **Then** no slug error is rendered and Save stays in its loading state.
2. **Given** the PUT resolves 200, **When** the toast fires, **Then** the dialog is closed and the new section is in the sidebar.
3. **Given** the PUT resolves 400 with issues, **When** the error arrives, **Then** the dialog stays open and shows the server issue inline.

---

### User Story 2 - A section needs only a name (Priority: P1)

The New section dialog shows Name and a URL preview. The slug is derived from the name; a reserved or already-used slug gets a numeric suffix automatically (`pos` → `pos-2`, `staff` → `staff-2`). Two sections may share a name. Renaming a section changes its label only; its URL does not change.

**Independent Test**: unit test on the slug helper; mounted test that the dialog has no slug input and that "POS" saves as `pos-2`.

**Acceptance Scenarios**:

1. **Given** a section "Staff" exists, **When** a second section named "Staff" is created, **Then** it saves with slug `staff-2` and the preview showed `/staff-2` before saving.
2. **Given** the name "POS", **When** created, **Then** the slug is `pos-2` (reserved first segment) and no error is shown.
3. **Given** the Rename dialog on a section, **When** the label changes, **Then** the stored slug is unchanged and links to its pages keep resolving.
4. **Given** the Rename dialog on a page instance, **When** the label changes, **Then** the page slug is unchanged (the URL is id-addressed; a stale slug is already canonicalised client-side).

---

### User Story 3 - Advanced settings in the section dialog: icon and who can view (Priority: P2)

The New section and Rename section dialogs have a collapsed "Advanced settings" disclosure containing an Icon field and the per-role access rows (inherit / allow / deny) from PR #602. For a new section the rows are written after the section exists; a failed access write keeps the section and shows the error inline.

**Independent Test**: mounted test: open New section, expand Advanced settings, set role "viewer" to deny, Save; assert one PUT to `/api/nav/config` followed by one PUT to `/api/roles/overrides` with `module: 'section:<newId>'`.

**Acceptance Scenarios**:

1. **Given** a user with `users:manage`, **When** Advanced settings is expanded, **Then** the role rows load from `/api/roles` and `/api/roles/overrides?module=section:<id>` (rename) or default to inherit (new).
2. **Given** a user without `users:manage`, **When** Advanced settings is expanded, **Then** only the Icon field is shown.
3. **Given** the nav save succeeds and the overrides write fails, **When** the error arrives, **Then** the section exists, the dialog stays open with the error under the rows, and Save retries only the overrides.

---

### User Story 4 - Home is first in the switcher and means "my landing page" (Priority: P2)

The module switcher lists **Inicio** (house icon) first, then a divider, then the modules. Choosing Inicio navigates to the user's landing page. While inside a module, hovering the switcher trigger crossfades the module icon to the house icon with the tooltip "Volver a Inicio"; the whole trigger still opens the menu. On mobile the sheet's picker gets a plain Inicio row that navigates to the landing page.

**Decision Q2 (owner asked for elaboration; decided here):** choosing Inicio is a **one-off navigation and does not change the stored nav mode**. The sidebar already derives its scope from the current path: inside a module it narrows to that module, on an organisation page (`/overview`, `/chat`) `navMode.isModule` is false and the full navigation shows (`nav-mode.svelte.ts:79`). Storing `full` on every Home click would silently switch staff out of the role default the owner chose for them; a user who wants the full list permanently can still pick it from the switcher's existing mode behaviour (role default) or from the Settings nav mode when one exists. `nav_allSections` is retired.

**Independent Test**: mounted test on `ModuleSwitcher`: first item is Inicio, selecting it calls `goto(page.data.landingPage)` and does not call `localStorage.setItem('hub-nav-mode', …)`.

**Acceptance Scenarios**:

1. **Given** a staff user in module mode on `/pos/sell`, **When** they pick Inicio, **Then** they land on their landing page and `localStorage['hub-nav-mode']` is unchanged.
2. **Given** the desktop sidebar expanded inside a module, **When** the trigger is hovered, **Then** the house icon replaces the module icon (no layout shift, honours `prefers-reduced-motion`) and a click opens the dropdown.
3. **Given** the mobile sheet, **When** opened, **Then** its first row is Inicio and tapping it navigates to the landing page and closes the sheet.

---

### User Story 5 - `/` goes to the resolved landing page; `/home` becomes `/chat` (Priority: P2)

No literal landing path exists outside one resolver. `/` resolves, in order: the user's own choice if still viewable; the organisation's landing page (a `landingPage` field in the org's navigation document, set by owner/admin from the context menu "Set as organisation home page"); the first item of the user's effective navigation (full-nav roles: first organisation item; module-mode roles: first page of their first visible module); `/chat`. The chat screen moves to `/chat` (`/chat/settings`); `/home` and `/home/settings` answer 308 to the new paths.

**Independent Test**: unit test on the pure resolver for the four steps; route test `/home` → 308 `/chat`; hook test `/` → 307 to the resolved page with a stale `landingPage: '/home'` preference ending on `/chat`.

**Acceptance Scenarios**:

1. **Given** a user with no preference in a business org whose document has no landing page, **When** they open `/`, **Then** an owner lands on `/overview` (first org item after the rename is `/chat`; the base install in spec 047 writes `/overview` as the org value — until then, step 3 applies) and a module-mode receptionist lands on their first visible module page.
2. **Given** a user preference `/stock/items` and the stock module turned off, **When** they open `/`, **Then** they land on the next step's page, not a 404.
3. **Given** a bookmark to `/home/settings`, **When** opened, **Then** the response is 308 to `/chat/settings`.
4. **Given** a user preference stored as `/home`, **When** they open `/`, **Then** they end on `/chat` (307 then 308).
5. **Given** the sidebar, **When** rendered, **Then** the "this is my home page" check mark uses the resolved landing page from the layout data, not a constant.

### Edge Cases

- The user's and the org's choices are validated as root-relative paths (existing regex at `api/me/preferences/[section]/+server.ts:146`); the org value uses the same regex in the nav-config schema.
- A landing page under a custom section instance (`/<sec>/<slug>~<id>`) is viewable only if `instanceAllowed`; the resolver uses the same predicate as the sidebar.
- Personal orgs have no `/overview`; step 3 yields `/chat` for them, which is also step 4.
- Auth-disabled dev (`bypassGate`) has no user; it redirects to step 4.
- Locale prefix: the resolver returns a canonical path; the hook prefixes the user's locale as today.
- `/home/<anything else>` is not a route today; only `/home` and `/home/settings` get redirects.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Draft validation in the section/page dialogs MUST run against the document snapshot taken when the dialog opened, never the optimistic document.
- **FR-002**: The New section dialog MUST NOT contain a slug input. The slug MUST be derived from the name and made unique and non-reserved by numeric suffix (`-2`, `-3`, …) within 32 characters.
- **FR-003**: `slug.duplicate` and `slug.reserved` MUST NOT be reachable from the dialogs; the server validator keeps rejecting them (defence in depth).
- **FR-004**: Rename MUST change the label only, for sections and for pages.
- **FR-005**: The New/Rename section dialog MUST have an "Advanced settings" disclosure with an Icon field (same `icon` string the document already stores) and, for users with `users:manage`, the per-role access rows reusing PR #602's rows component; new-section rows are written after the document save with the section's pre-generated id.
- **FR-006**: The module switcher MUST list Inicio first, navigate to `page.data.landingPage` on selection, and MUST NOT change the stored nav mode. The mobile picker MUST have the same row. `nav_allSections` MUST be removed from code and messages.
- **FR-007**: One pure function `effectiveLandingPage()` MUST be the only place that decides the landing page, with steps user choice → org choice → first visible nav item → `/chat`; each step's candidate MUST pass the same viewability predicate the route guards use (`isAppRouteBlocked` + `decideRouteAccess` + instance rules).
- **FR-008**: The hook's `/` redirect and the `(app)` layout data `landingPage` MUST both use FR-007's function. `landing-cache.ts` is deleted (inputs are already cached).
- **FR-009**: The org navigation document MUST accept an optional `landingPage` (validated path) preserved by `normalizeNavConfig`, `visibleNavConfig` and the schema; an owner/admin context-menu action "Set as organisation home page" writes it through the existing nav PUT.
- **FR-010**: `/home` and `/home/settings` MUST respond 308 to `/chat` and `/chat/settings`; every registry entry, redirect default and test that named `/home` is updated; the screen title key becomes `nav_chat` ("Chat"); `nav_home` ("Inicio") is used only by the switcher/mobile Home rows.
- **FR-011**: A test MUST fail if a `'/home'` or `'/chat'` string literal appears in `src/` outside `src/lib/nav/landing.ts`, the two redirect files and test files.
- **FR-012**: Design-token lint and token-integrity debt MUST NOT increase; every new string is a Paraglide message in `en.json` and `es.json`.

### Key Entities

- **Landing page**: a canonical app path; sources: user preference (`user_preferences.section='landingPage'`), org nav document field `landingPage`, derived default.
- **Nav document** (`app_nav_config.value`): gains `landingPage?: string`.
- **Section**: `{ id, slug, label, icon?, pages }`; slug now machine-chosen.

## Success Criteria *(mandatory)*

- **SC-001**: Creating a section with any name, including "POS" and a duplicate, shows zero error states and one toast; measured by the mounted tests and a manual check on dev:local.
- **SC-002**: `/` never lands on a 404/403 for a user whose stored page became unavailable (resolver test matrix, 8 cases).
- **SC-003**: `git grep` for the two literals outside the allowed files returns nothing (test).
- **SC-004**: No increase in `lint:design` / `lint:tokens` debt; `bun run check`, `bun run test`, `i18n:compile` green per slice.
- **SC-005**: After deploy, opening `/home` in production answers 308 and `/` lands owners on their chosen or resolved page (prod check, two users).

## Assumptions

- Icon field accepts the same string the sidebar already renders for custom sections/pages (executor confirms the renderer and reuses it; if none exists for sections, the field stores and the sidebar renders it with the same resolver pages use).
- The organisation landing-page action is visible to `settings:manage` holders, the same capability that gates nav editing.
- Hub PR #602 merges before S2; S2 is opened stacked on its branch and retargeted to master after that merge (retarget BEFORE deleting the base).

## Constitution check

Spec before code: this file. AS-IS/TO-BE/DELTA with anchors: above and in plan.md. Slices with gates: plan.md. Required build steps named: route contract counts (rename keeps screen count; two redirect endpoints may change `redirects`/`endpoints` counts in `route-design-validation.ts`, `route-design-contracts.test.ts`, `business-route-shells.test.ts`, `frontend-contract-scanner.test.ts`, `scripts/ui-audit-inventory.test.ts`), RBAC (no new gated surface; `/chat` inherits `/home`'s universal policy), i18n, design lint. Tags ui + permissions: owner approved the spec; owner merges.
