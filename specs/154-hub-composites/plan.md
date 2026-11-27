# Implementation Plan: composites (a11y S5)

**Branch**: hub `feat/154-table-grid` (PR A), `feat/154-charts` (PR B), `feat/154-workshop-keys` (PR C); PR base `master` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

## Summary

PR A: the table's wrapper stays the single focus owner; the active position gains a column; an attachment keeps in-grid controls out of the Tab order; Enter activates or enters a cell; sort is announced through `src/lib/a11y/announce.ts`. PR B: `ariaLabel` required, three more table builders, series and row buttons outside the image. PR C: the workshop list gains elements and Move / Link / Open / Remove, the palette gains "Add to canvas", the toolbar gains zoom, the context menu moves to the shared menu pattern.

## Technical Context

**Language/Version**: Svelte 5, TypeScript strict, Tailwind 4 | **Dependencies**: none new | **Testing**: Vitest mounted tests with `assertPattern(grid | menu)`, chart a11y tests, Playwright workshop suite, `bun run a11y`, real keys on a Storybook build (A, B) and on the local QA stack (C) | **Scale**: A = `DataTable.svelte` + tests, no caller edits; B = `Chart.svelte`, two sparkline components, 24 + 7 call sites, messages en/es; C = workshop list, palette, toolbar, context menu, messages en/es.

## Reuse

| Need | Existing piece |
|---|---|
| Announcements | `src/lib/a11y/announce.ts` |
| Menu keys | the shared menu/Dropdown pattern from spec 152 PR B |
| Move with arrows, drop, cancel, announce | the board move from spec 152 PR C |
| Roving helpers | `src/lib/a11y/roving.ts` |
| In-cell control detection | `interactiveTarget` / `cellControlFocused` (hub #743) |
| Pattern assertions | `src/lib/a11y/assert-pattern.ts` (`grid`, `menu`) |

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | Pass: approved in advance (2026-11-26); two-pass review |
| II. AS-IS / TO-BE / DELTA | Pass |
| III. Slice-scoped delivery | Pass: three PRs, each mergeable alone |
| IV. Required build steps | Pass: new strings in paraglide en + es; no route, API or RBAC change; semantic tokens only |

## Order and risk

A first (largest reach: 57 tables), then B, then C. While one PR's checks run, the next is built in its own worktree. Each PR: full unit suite, grep of every test and e2e script naming the component, CI's prettier over the diff, real keys on the final commit.
