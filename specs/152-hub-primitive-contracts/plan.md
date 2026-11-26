# Implementation Plan: primitive contracts (a11y S3)

**Branch**: hub `feat/152-dialogs` (PR A), then `feat/152-menus`, `feat/152-board-moves`, `feat/152-status-labels`, `feat/152-modals`; PR base `master` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

## Summary

Five hub PRs by widget family. Each extends the shared primitive, moves the hand-rolled copies onto it, and proves the result with `assertPattern`. PR A: the shared `Dialog` learns `role`, a `bare` presentation and a name required by type; the unsaved-changes prompt and the command palette render through it; confirmations become alert dialogs; floating windows manage focus.

## Technical Context

**Language/Version**: Svelte 5, TypeScript strict | **Dependencies**: none new | **Testing**: Vitest mounted tests with `assertPattern`, `bun run a11y`, the CI story and page gates | **Scale (PR A)**: 1 primitive, 2 wrappers, 4 components, 1 registry entry, 3 test files touched, 2 added.

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | Pass: approved in advance by the owner (2026-11-26); reviewed in two passes |
| II. AS-IS / TO-BE / DELTA | Pass: DELTA per PR, added when the PR starts |
| III. Slice-scoped delivery | Pass: one PR per family, each green and mergeable alone; gates in the foreground |
| IV. Required build steps | Pass: semantic tokens only; strings through Paraglide; no route/API/RBAC change |

## Order and dependencies

A (dialogs) first: E (hand-rolled modals) needs the `bare` presentation and the required name. B, C and D are independent of each other and of A.
