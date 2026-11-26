# Implementation Plan: focus and contrast (a11y S4)

**Branch**: hub `feat/153-focus-contrast` (PR 1), `feat/153-accent-text` (PR 2); PR base `master` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

## Summary

PR 1: a helper beside `readableMutedFor` returns the accent, or its nearest darker / lighter shade, at 3:1 (ring) or 4.5:1 (text) on every surface of the theme. `applyTheme` publishes `--color-focus-ring`, `--color-link` and a solid `--shadow-focus`. The global rule, 62 focus utilities and 36 component focus rules use the ring colour; a forced-colours rule; a lint rule against new bare `outline-none`.

PR 2: every use of the accent as a text colour moves to `--color-link`. Held for the owner.

## Technical Context

**Language/Version**: Svelte 5, TypeScript strict, Tailwind 4 | **Dependencies**: none new | **Testing**: Vitest (helper over all themes × accents, runtime contract), design-lint, `bun run a11y`, real browser on a Storybook build incl. forced-colours emulation | **Scale (PR 1)**: 2 theme modules, `app.css`, about 75 component files (mechanical), 1 lint rule.

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | Pass: approved in advance (2026-11-26); two-pass review |
| II. AS-IS / TO-BE / DELTA | Pass |
| III. Slice-scoped delivery | Pass: two PRs, each mergeable alone; PR 2 gated on the owner |
| IV. Required build steps | Pass: tokens only; no string / route / API / RBAC change |
