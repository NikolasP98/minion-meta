---
status: shipped
verdict: approved
created: 2026-11-26
updated: 2026-11-26
repos: [minion_hub]
tags: [ui, test]
source_proposal: 2026-11-20-hub-accessibility-program
source_item: S2
---

# Feature Specification: Page shell — skip to the content, one main region, a title on every page

**Feature Branch**: `151-hub-page-shell` (hub branch `feat/151-page-shell`); hub PR base `master`.

**Created**: 2026-11-26

**Status**: Approved in advance. Owner (2026-11-26): "start S2", then, verbatim: "fold the S1 leftovers into S3, then implement all slices directly, your work is fully approved to go live." The skip link (a visible change on keyboard focus) and the page-title format below are therefore approved in advance by the owner on 2026-11-26; where a choice was open, the option closest to today's look and behaviour that passes WCAG 2.2 AA was taken.

**Input**: "Slice S2 'Page shell' of the hub accessibility program: skip link + `<main id>` in `(app)/+layout.svelte`, with no nested `<main>` from PageShell; fallback `<title>`; PageHeader sets the page title; label the mobile `<nav>`. Acceptance: axe bypass, document-title and landmark-* rules pass on all swept routes; `bun run a11y` with baselines only decreasing."

## FigCraft demo

- File: [`page-shell.figcraft`](page-shell.figcraft), page "Spec 151 · page shell".
- Frames: [as-is](demo/as-is.png), [to-be: first Tab key](demo/to-be-first-tab.png), [to-be: after Enter](demo/to-be-after-enter.png).
- Interactive preview: https://claude.ai/artifact/TX2RjSiWHu9RHTLpMcACz2 (private to the owner).
- **Approved in advance by the owner on 2026-11-26** (quote in Status above). This approves the design; merging stays with the coordinator.

## AS-IS (hub master `c51c5b62`, read 2026-11-26)

| Fact | Anchor |
|---|---|
| The signed-in shell renders Sidebar, Topbar and the route viewport with no skip link and no `<main>`. The first Tab key lands in the sidebar; reaching the page content means tabbing through the whole menu on every page. | `src/routes/(app)/+layout.svelte:235-262` |
| The main landmark comes from each page: `PageShell` renders `<main>` unless `landmark={false}` (111 files use it); 6 workforce pages write their own `<main>`; pages with neither have no main landmark. | `src/lib/components/ui/foundations/PageShell.svelte:42-67`; `grep -rn "<main" "src/routes/(app)"` (7 files) |
| 63 of the 148 swept pages have no document title (`document-title` in the page ledger): the browser tab shows the address. | `tests/ui-audit/a11y-ledger.json` (`pages`, rule `document-title`) |
| `app.html` has no `<title>`; `PageHeader` requires a `title` prop and its own comment says it is "used for `<svelte:head>`", but it never sets one. | `src/app.html:1-17`; `src/lib/components/ui/PageHeader.svelte:35-44,101` |
| 87 components set a title by hand, in five shapes: "‹page› — ‹module›" 24, "‹page› · ‹module›" 20, "‹page›" alone 20, "‹page› · ‹brand› hub" 13, "‹page› — ‹brand›" 10. There is no shared helper. The brand comes from `getBranding()` (white-label: `name`, and `fullName` = "‹name› Hub"). | `grep -rh "<title" src --include=*.svelte`; `src/lib/branding.ts:99`; `src/lib/branding.svelte.ts:5` |
| The two primary navigation landmarks (desktop sidebar, mobile menu) have no accessible name. | `src/lib/components/layout/Sidebar.svelte:333-337`; `src/lib/components/layout/Topbar.svelte:427-430` |
| The page gate checks WCAG A/AA rules. `bypass` and `document-title` are in that set; axe's `landmark-*` and `region` rules are tagged best-practice and are NOT measured by the gate. | `tests/ui-audit/a11y-tags.json`; axe-core 4.14 rule tags |

## TO-BE

1. **Skip link.** The first Tab key on any signed-in page shows a "Skip to content" link at the top left. Activating it moves focus to the page content. It is invisible until it has keyboard focus, so nothing changes for mouse and touch users.
2. **One main region.** The shell owns the single `<main id="main-content">`. `PageShell` and the six workforce pages no longer render their own inside it.
3. **A title on every page.** Format: **`‹page title› · ‹hub name›`**, where the page title is the one the page already shows in its header and the hub name is the organisation's white-label name. Examples (English, default hub name "MINION Hub"): "Developers · MINION Hub", "Sign-in & security · MINION Hub", "Costs · MINION Hub". An organisation with its own hub name gets it: "Developers · Faces Hub". `PageHeader` supplies it, so a page gets a title by having a header. A page with no header gets the hub name alone. A header inside a record peek never sets the title.
4. **The 87 hand-written titles are not rewritten in this slice.** A page that sets its own title keeps it: in Svelte the deepest `<title>` wins on the server and on the client (measured, see review), so those pages pass `documentTitle={false}` to their header and a test enforces it. Bringing them to the one format is a follow-up (recorded as an open end), because it changes 87 tab titles.
5. **Named navigation.** The sidebar and the mobile menu are labelled with the existing string `nav_primaryAria` ("Primary" / "Principal").

Invariants: exactly one `<main>` per signed-in page; exactly one `<title>` in the served HTML; the skip link is the first focusable element; public pages (`PublicTaskShell`) are untouched.

## DELTA

| # | Transition | Proof |
|---|---|---|
| D1 | `(app)/+layout.svelte` renders the skip link first and wraps the route viewport content in `<main id="main-content" tabindex="-1">`. | mounted test: first focusable is the link, its target exists and takes focus; Chromium check on the built shell |
| D2 | `PageShell` renders a `div` when it is inside the shell's main (context set by the layout); standalone use keeps `<main>`. The six workforce pages' `<main>` become `div`s. | mounted tests for both cases; a test that counts `main` elements per route file; `grep` |
| D3 | The root layout sets the fallback title (hub name) through `<svelte:head>`; `PageHeader` sets "‹title› · ‹hub name›" through `<svelte:head>` unless `documentTitle={false}`; the 67 files that have both a hand-written title and a header pass `false` (plus `BookingsView`, whose two callers set their own). | mounted tests: header-only, own hub name, own title kept; a source test that fails when a file with its own `<title>` has a header that is not opted out |
| D4 | Both primary `<nav>` elements get `aria-label`. | mounted test; ad hoc axe run with best-practice rules on the shell |
| D5 | The page ledger's 63 `document-title` rows go to 0 and no row rises. | page gate in CI; baseline ratcheted from the PR's CI artifact |

Note on D3: the brief says "fallback `<title>` in app.html". A literal `<title>` in `app.html` would sit beside the one SvelteKit emits from `<svelte:head>`, giving two `<title>` elements, and it cannot carry the white-label name. The fallback therefore lives in the root layout's `<svelte:head>`, the mechanism the hub already uses. This is verified by the server-render test before it is relied on.

## User Scenarios & Testing

### User Story 1 — Skip the menu (P1)

A keyboard user presses Tab once, sees "Skip to content", presses Enter and is in the page content.

**Acceptance Scenarios**:

1. **Given** any signed-in page, **When** Tab is pressed first, **Then** the skip link is visible and focused.
2. **Given** the focused skip link, **When** Enter is pressed, **Then** focus is on the main region and the next Tab goes to the first control in the content.
3. **Given** a mouse or touch user, **When** they use the page, **Then** the link is never visible.

### User Story 2 — Know which page a tab is (P1)

Every signed-in page has a browser title that names the page and the hub.

**Acceptance Scenarios**:

1. **Given** a page with a header and no title of its own, **Then** the title is "‹header title› · ‹hub name›".
2. **Given** a page that sets its own title, **Then** that title is unchanged.
3. **Given** a page with neither, **Then** the title is the hub name.
4. **Given** an organisation with its own hub name, **Then** the title carries that name.

### User Story 3 — Landmarks make sense (P2)

A screen-reader user finds one main region and a named navigation.

**Acceptance Scenarios**:

1. **Given** any signed-in page, **Then** there is exactly one `main` landmark and it is not nested.
2. **Given** the landmarks list, **Then** the primary navigation is announced with a name.

### Edge Cases

- Immersive pages (no sidebar): the skip link and main region still exist.
- A page that hides its content (admin-only URL): the main region exists and is empty.
- Peek/drawer views that render a `PageShell` inside another page: they already pass `landmark={false}`; unchanged.
- The skip link must not shift the layout when it appears (it is positioned over the shell).
- Pages that deliberately scroll inside their own region keep doing so; the main wrapper adds no scroll container.

## Requirements

- **FR-001**: Every signed-in page MUST start with a skip link that is visible only while it has keyboard focus and moves focus to the main region.
- **FR-002**: Every signed-in page MUST have exactly one `main` landmark, owned by the shell, with no `main` nested inside it.
- **FR-003**: Every signed-in page MUST have a non-empty document title; a page with a header and no own title MUST get "‹header title› · ‹hub name›".
- **FR-004**: A title a page sets itself MUST keep winning; none of the 87 existing titles may change in this slice.
- **FR-005**: The served HTML MUST contain exactly one `<title>`.
- **FR-006**: The two primary navigation landmarks MUST have an accessible name.
- **FR-007**: The new user-facing string ("Skip to content" / "Saltar al contenido") MUST go through Paraglide in both locales; the navigation label reuses an existing string.
- **FR-008**: No route, API, permission or data change; semantic tokens only; `lint:design && lint:tokens` pass.
- **FR-009**: `bun run a11y` MUST pass with no baseline rising; the page baseline is ratcheted down to the measured counts.

## Success Criteria

- **SC-001**: `document-title` is 0 on every swept page (63 today) and `bypass` stays 0.
- **SC-002**: An ad hoc axe run with best-practice rules on the built shell reports no `landmark-*` violation caused by the shell (main, nav names, nesting). `region` and landmark findings inside individual pages are reported, not fixed here.
- **SC-003**: The skip link works with the keyboard in Chromium on the built shell: first Tab shows it, Enter moves focus into the content.
- **SC-004**: None of the 87 existing titles changes (test over the rendered titles of a sample that covers each of the five shapes).
- **SC-005**: Every check on the hub PR is green.

## Assumptions

- "All swept routes" means the CI page sweep (150 pages, one viewport); 22 of them cannot be measured today.
- The hub name in a title is `getBranding().fullName` ("‹name› Hub"), the same value the error page already uses.
- Not tagged security or data.

## Out of Scope

- Rewriting the 87 hand-written titles to the one format.
- `region` and landmark findings inside individual pages (content outside landmarks, duplicate banners).
- Public pages (`PublicTaskShell`), which already have their own `<main>`.
- Focus visibility and focus rings in general (S4).
