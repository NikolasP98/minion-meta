# Implementation Plan: page shell (a11y S2)

**Branch**: hub `feat/151-page-shell`, PR base `master` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

## Summary

The signed-in layout gains a skip link and the page's one `<main>`. `PageShell` yields its landmark when it is inside that main. `PageHeader` sets the browser title; the root layout sets the fallback. The two primary `<nav>` elements get a name.

## Technical Context

**Language/Version**: Svelte 5, TypeScript strict | **Dependencies**: none new | **Testing**: Vitest mounted tests, source-scan tests, `bun run a11y`, the CI page sweep (`document-title`, `bypass`) | **Scale**: 2 layouts, 2 shared components, 2 nav components, 6 workforce pages, 67 files opted out, 1 string × 2 locales.

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | Pass: approved in advance by the owner (2026-11-26); reviewed in two passes |
| II. AS-IS / TO-BE / DELTA | Pass |
| III. Slice-scoped delivery | Pass: one hub PR; gates in the foreground |
| IV. Required build steps | Pass: semantic tokens only; Paraglide string in en + es; no route/API/RBAC change |
| V. Security/data gates | Not triggered |

## Design

| Change | Where |
|---|---|
| Skip link (first element) + `<main id="main-content" tabindex="-1">` + context `MAIN_LANDMARK` | `src/routes/(app)/+layout.svelte` |
| `PageShell` renders `div` when the context is set | `src/lib/components/ui/foundations/PageShell.svelte` |
| Fallback title = hub name | `src/routes/+layout.svelte` |
| `documentTitle` prop, "‹title› · ‹hub name›", not in a peek | `src/lib/components/ui/PageHeader.svelte` |
| `documentTitle={false}` on headers of files with their own title | 67 files + `BookingsView.svelte` |
| `aria-label` on the two primary navs | `Sidebar.svelte`, `Topbar.svelte` |
| `<main>` → `<div>` | 6 `workforce/*/+page.svelte` |
| `a11y_skip_to_content` | `messages/en.json`, `messages/es.json` |

Rejected: a title store written by `PageHeader` and rendered by the layout (the layout's title effect re-runs after the page's own and overwrites it); rewriting the 87 hand-written titles (changes 87 tab titles; follow-up).
