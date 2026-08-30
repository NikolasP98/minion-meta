---
id: 2026-08-30-site-page-max-shared-token
title: Site content width — replace the unresolved page-max variable with a shared semantic token
status: draft
created: 2026-08-30
updated: 2026-08-30
repos: [minion-meta, minion-site]
tags: [ui, infra, test]
value: 5
effort: S
source: site-release-review-2026-08-29
---

# Site content width — move `--page-max` into the shared contract

## Problem in the user's words

Agent-authored summary, not a user quotation: the user requires Hub and Site UI changes to obey
the shared design-token contract and to pass both design-debt and token-integrity gates.

## AS-IS

Ten marketing layout rules in `minion-site` consume `var(--page-max)`, but neither
`packages/design-tokens/contract.json`, its generated CSS, nor the site's `app.css` declares that
variable. Browsers therefore discard those `max-width` declarations. The token-integrity gate
added during the 2026-08-29 site release records an exact cap of ten so new consumers fail while
the existing debt remains visible.

## TO-BE

The shared design-token contract owns one semantic content-width token with values documented for
every supported theme. The generated package exposes it, Site consumes it in all ten locations,
and the temporary undefined-token baseline is removed.

The existing responsive layout, theme colors, and component spacing must not otherwise change.

## DELTA

1. Name the semantic content-width role under the design-token naming law; do not preserve the
   appearance-derived `--page-max` name merely for convenience.
2. Add it to `packages/design-tokens/contract.json`, regenerate CSS, and pass the contract tests.
3. Release the design-token package and update the Site dependency.
4. Replace all ten Site consumers, remove the `TODO(handoff)` and baseline from
   `scripts/design-lint.mjs`, and prove `bun run lint:tokens` passes with no debt row.

## Out of scope

- Changing the current content width.
- Adding route-local width constants or Tailwind arbitrary values.
- Redesigning marketing sections.

## Definition of done

- The shared contract and generated CSS contain the new semantic token.
- `rg -- '--page-max' src` returns no Site consumers.
- `bun run lint:design`, `bun run lint:tokens`, Site check/test/build, and the design-token package
  tests all pass.
