---
id: 2026-08-20-hub-datatable-server-mode-test-gap
title: DataTable.svelte server mode has no DOM-mount test — happy-dom/Button.svelte + browser stub gaps
status: in-spec
created: 2026-08-20
updated: 2026-08-21
repos: [minion_hub]
tags: [test, infra]
value: 5
effort: M
source: orch/crm-pagination-s3-s4
spawned_spec: 2026-08-21-hub-datatable-server-mode-test-gap-spec
source_trust: human
risk_class: high
priority: medium
owner: human
---

# DataTable.svelte server mode has no DOM-mount test

## Problem

`specs/2026-08-13-crm-customers-server-pagination-spec.md` §S4 shipped `DataTable.svelte`'s
opt-in `server` prop (search/sort/filter/page → `onQuery`, byte-identical client-mode behavior
when absent) without the DoD's DOM-mount tests. `@testing-library/svelte` is an installed
dependency but has **zero working usages anywhere in this repo** — attempting to add the first
one for this slice surfaced two independent, pre-existing infra gaps, neither introduced by
this change and neither fixable within S4's scope:

1. **`@minion-stack/ui`'s `Button.svelte` crashes happy-dom on mount.** Reproduced on a bare
   `DataTable` render with zero server-mode involvement — ANY mounted `Button.svelte` instance
   (a `<svelte:element>`-based polymorphic button) throws
   `TypeError: Cannot read properties of null (reading 'Symbol(parentNode)')` inside happy-dom's
   `Node.nextSibling` getter, from Button's insertion effect. `jsdom` is not an installed
   dependency to try as an alternative.
2. **Row virtualization requires `browser === true`.** `DataTable.svelte`'s `rowVirt` derivation
   only initializes `if (browser && wrapperEl)`; `src/server/test-utils/env-stubs/app-environment.ts`
   hardcodes `browser = false` for every test in the suite. With `rowVirt` always `null`, the
   `{:else if rowVirt}` render branch never fires and **no row ever appears in the DOM under
   test**, independent of the Button issue.

Also needed (not yet verified): getting `@testing-library/svelte`'s `mount()` to resolve to
Svelte's client build at all requires `resolve.conditions: ['browser']` in `vitest.config.ts`
(Svelte's package.json routes the default condition to its SSR build, which throws
`lifecycle_function_unavailable` on `mount`). This was verified safe against every current
dependency's export map (`postgres`, `drizzle-orm`, `@electric-sql/pglite` — none declare a
`browser` condition), but was reverted in this branch since it enabled nothing on its own with
(1) and (2) unresolved.

## Definition of done

- `Button.svelte` (or the happy-dom version pinned here) mounts cleanly under
  `@testing-library/svelte` + happy-dom — either a `@minion-stack/ui` fix, a happy-dom version
  bump, or a documented switch to `jsdom`.
- The `browser` stub gains a per-test override (e.g. a second stub file swapped in via
  `vitest.config.ts` `environmentMatchGlobs`, or a `vi.mock('$app/environment', ...)` override
  pattern documented for component tests) so row virtualization can initialize under test.
- `vitest.config.ts` gains `resolve.conditions: ['browser']` (guarded by `process.env.VITEST`,
  as documented above) once (1) and (2) make it actually useful.
- `DataTable.test.ts` covers the S4 DoD: server mode does not re-sort/re-filter (DOM order ==
  input order), pager label/range derive from `server.total` not `data.length`, and
  search/sort/page/filter changes each fire `onQuery` exactly once with the expected payload —
  plus the pre-existing client-mode behavior stays byte-identical (a regression snapshot before
  vs. after the S4 diff).

## Out of scope

Any other DataTable consumer's own component tests; general Svelte-5 component-testing
conventions for the rest of the repo beyond what DataTable's tests need.
