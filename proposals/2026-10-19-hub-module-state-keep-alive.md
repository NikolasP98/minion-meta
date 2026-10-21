---
id: 2026-10-19-hub-module-state-keep-alive
title: Hub modules remember where you were (filters, scroll, selection) across module switches
status: in-spec
created: 2026-10-19
updated: 2026-10-20
repos: [minion_hub]
tags: [ui, ux]
value: 8
effort: M
source: specs/028-hub-app-feel-shell
---

# Module state keep-alive

## AS-IS
Since spec 028 (hub #571) the shell stays mounted across module switches, but each module's page still unmounts: leaving `/crm` for `/pos` and coming back resets its filters, scroll position, selection and open panels. URL-mirrored table state survives; everything else is lost.

## TO-BE
Returning to a module restores what the user left: scroll offset of the route viewport, table selection, open peek/tray, unsaved filter chips. URLs stay the contract and deep links keep working (no ArtCraft-style URL-less tabs).

## DELTA
Module-scoped `<script module>` stores (the assistant-launcher #539 pattern) or SvelteKit `snapshot` per module root; restore scroll on `afterNavigate` for the route viewport. Proof: mounted test leaves and re-enters a module and asserts restored state; browser check on /crm and /pos.

## Implementation

Implementation and qualification are tracked in
`specs/2026-10-20-hub-app-backlog-spec.md`. The candidate is [Hub PR #575](https://github.com/NikolasP98/minion_hub/pull/575)
on `feat/app-backlog`. Merge and deployment remain owner-gated.

## Release qualification

Mounted and headless browser fixtures exercise the actual shared table, filters,
selection and context controls with synthetic rows. Authenticated CRM/POS route
loads have not been exercised in this lane. `TODO(handoff)` at the app layout's
`afterNavigate` registration points here and to the Hub verification receipt.
Run the leave-return, deep-link, panel and scroll scenarios with an authenticated
loopback QA session before release.
