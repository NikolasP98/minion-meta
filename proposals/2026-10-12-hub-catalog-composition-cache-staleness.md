---
id: 2026-10-12-hub-catalog-composition-cache-staleness
title: Catalog composition editor's per-row cache never invalidates on external changes
status: draft
created: 2026-10-12
updated: 2026-10-12
repos: [minion_hub]
tags: [ui, data]
value: 2
effort: S
---

# Catalog composition editor's per-row cache never invalidates on external changes

## Problem

Fix for the catalog "expanding row B reloads already-open row A" bug
(`src/lib/components/pos/CompositionEditor.svelte`) added a module-scoped
`compositionCache` (`Map<productId, CompositionCacheEntry>`) so an already-loaded
row's composition survives DataTable's row-virtualizer transiently
unmounting/remounting an open `expandedContent` block when a sibling row's
expand state changes. The cache is kept in sync with every write THIS editor
makes (`$effect` watching `serviceRows`/`consumptionRows`/`bomRows`/`validity`,
guarded on `!loading`), so it never goes stale from the current tab's own
edits.

## AS-IS

The cache has no TTL and is never invalidated except by the tab's own writes.
It lives for the lifetime of the page (module scope, not per-navigation) and
is keyed only by `productId`. If a composition is changed from another
browser tab, another user's session, or directly in the DB, this tab's
already-cached entry for that row stays stale until a full page reload
(`invalidate('pos:catalog')`, called via `onChanged`, refreshes `sellables`/
`stockItems` but does not touch `compositionCache`).

## TO-BE

Either (a) key the cache additionally by a version/updatedAt stamp from the
sellable row so a changed row's stale cache entry is detected and dropped, or
(b) clear the whole `compositionCache` inside the `onChanged`/`invalidate`
flow in `+page.svelte` (simplest, coarser — invalidates every open row's
cache on ANY catalog write, not just the changed row).

## DELTA

Add a cache-busting hook to `onChanged` (catalog page) or to the composition
APIs' response (a version field) and consume it in `CompositionEditor`'s
cache-hit check. Out of scope for the original bug fix (single-tab,
single-editor flows were the reported symptom); this proposal exists only so
the limitation isn't lost.
