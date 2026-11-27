# Implementation Plan: hygiene (a11y S6)

**Branch**: hub `feat/155-names` (PR A), `feat/155-alerts` (PR B), `feat/155-workshop-dialogs` (PR C), `feat/155-aria-snapshots` (PR D); PR base `master` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

## Summary

A: literal accessible names to paraglide, `DataTable.ariaLabel` required, two design-lint rules. B: alert roles by the "follows a user action" rule, starting in the five shared pieces; Toaster mounted eagerly; private live regions to `announce()`. C: the five workshop element panels on the shared `Dialog`. D: one fixture with five widgets and accessibility-tree snapshots, as a third suite of the specs gate.

## Technical Context

**Language/Version**: Svelte 5, TypeScript strict | **Dependencies**: none new | **Testing**: Vitest mounted tests, design-lint, Playwright (`toMatchAriaSnapshot`) on a vite-built fixture, `bun run a11y`, real browser on Storybook and on the local real-renderer build | **Scale**: A ≈ 30 files for labels + 56 table call sites + lint; B ≈ 5 shared files + ≈ 40 call sites + Toaster + 5 announcers; C = 5 panel files + canvas; D = 1 fixture + 1 spec + gate wiring.

## Reuse

| Need | Existing piece |
|---|---|
| Lint rule + decrease-only baseline | `scripts/design-lint.mjs` (`RULES`, `icon-button-unlabelled` as the model) |
| Announcements | `src/lib/a11y/announce.ts` |
| Modal shell | `ui/foundations/Dialog.svelte` (`presentation="bare"`, as `workshop/RelationshipPrompt.svelte`) |
| Dialog assertion | `src/lib/a11y/assert-pattern.ts` (`dialog`) |
| Fixture build + serve + Playwright suite | `tests/fixtures/workshop-accessibility/`, `scripts/a11y.mjs` specs gate |

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | Pass: approved in advance (2026-11-26); two-pass review |
| II. AS-IS / TO-BE / DELTA | Pass |
| III. Slice-scoped delivery | Pass: four PRs, each mergeable alone |
| IV. Required build steps | Pass: new strings in paraglide en + es; no route, API or RBAC change; semantic tokens only |

## Order

A, then B, then C, then D (D last so its snapshots record the names and roles A–C settle). While one PR's checks run, the next is built in its own worktree.
