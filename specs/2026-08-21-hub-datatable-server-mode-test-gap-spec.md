---
id: 2026-08-21-hub-datatable-server-mode-test-gap-spec
title: "DataTable.svelte server mode DOM-mount tests — close the S4 test-gap (happy-dom, browser stub, testing-library)"
stage: spec
status: approved
pass: 2
created: 2026-08-21
updated: 2026-08-21
proposal: 2026-08-20-hub-datatable-server-mode-test-gap
verdict: approved
repos: [minion_hub]
relationship: extends
related: [2026-08-13-crm-customers-server-pagination-spec, 2026-08-13-crm-customers-server-pagination]
type: infra
tags: [infra, test, ui]
---

# DataTable.svelte server mode DOM-mount tests — close the S4 test-gap

**Owner surface:** `minion_hub` — existing `src/lib/components/data-table/DataTable.svelte`
(read-only subject), component tests under `src/lib/components/data-table/`, `vitest.config.ts`,
`src/server/test-utils/env-stubs/app-environment.ts` (read-only default stub), and dependency
metadata/lockfile only if the DOM environment changes.
**Design ancestor:** [`specs/2026-08-13-crm-customers-server-pagination-spec.md`](2026-08-13-crm-customers-server-pagination-spec.md)
§S4 — its DoD is what this spec finally satisfies with real DOM evidence (see §1).
**Coordinates with:** [`specs/2026-08-13-agentic-sdlc-test-quality-gates-spec.md`](2026-08-13-agentic-sdlc-test-quality-gates-spec.md)
S6, which independently plans the first working `@testing-library/svelte` usage in hub
(`ChannelSetupWizard.test.ts`). As of this writing that spec is `status: approved`, `pass: 1`,
`verdict: pending` — unimplemented (`specs/index.json`). Whichever of the two lands first
becomes the actual first working usage; the other should rebase onto its happy-dom/vitest.config
fixes rather than re-solving them. Not folded into `related` because the DoD and target
component are unrelated — this is a coordination note, not an overlap classification.

---

## 0. Product

From the approved proposal `2026-08-20-hub-datatable-server-mode-test-gap`, verbatim:

> `specs/2026-08-13-crm-customers-server-pagination-spec.md` §S4 shipped `DataTable.svelte`'s
> opt-in `server` prop (search/sort/filter/page → `onQuery`, byte-identical client-mode behavior
> when absent) without the DoD's DOM-mount tests. `@testing-library/svelte` is an installed
> dependency but has **zero working usages anywhere in this repo** — attempting to add the first
> one for this slice surfaced two independent, pre-existing infra gaps, neither introduced by
> this change and neither fixable within S4's scope:
>
> 1. **`@minion-stack/ui`'s `Button.svelte` crashes happy-dom on mount.** Reproduced on a bare
>    `DataTable` render with zero server-mode involvement — ANY mounted `Button.svelte` instance
>    (a `<svelte:element>`-based polymorphic button) throws
>    `TypeError: Cannot read properties of null (reading 'Symbol(parentNode)')` inside happy-dom's
>    `Node.nextSibling` getter, from Button's insertion effect. `jsdom` is not an installed
>    dependency to try as an alternative.
> 2. **Row virtualization requires `browser === true`.** `DataTable.svelte`'s `rowVirt` derivation
>    only initializes `if (browser && wrapperEl)`; `src/server/test-utils/env-stubs/app-environment.ts`
>    hardcodes `browser = false` for every test in the suite. With `rowVirt` always `null`, the
>    `{:else if rowVirt}` render branch never fires and **no row ever appears in the DOM under
>    test**, independent of the Button issue.
>
> Also needed (not yet verified): getting `@testing-library/svelte`'s `mount()` to resolve to
> Svelte's client build at all requires `resolve.conditions: ['browser']` in `vitest.config.ts`
> (Svelte's package.json routes the default condition to its SSR build, which throws
> `lifecycle_function_unavailable` on `mount`). This was verified safe against every current
> dependency's export map (`postgres`, `drizzle-orm`, `@electric-sql/pglite` — none declare a
> `browser` condition), but was reverted in this branch since it enabled nothing on its own with
> (1) and (2) unresolved.
>
> **Definition of done:**
>
> - `Button.svelte` (or the happy-dom version pinned here) mounts cleanly under
>   `@testing-library/svelte` + happy-dom — either a `@minion-stack/ui` fix, a happy-dom version
>   bump, or a documented switch to `jsdom`.
> - The `browser` stub gains a per-test override (e.g. a second stub file swapped in via
>   `vitest.config.ts` `environmentMatchGlobs`, or a `vi.mock('$app/environment', ...)` override
>   pattern documented for component tests) so row virtualization can initialize under test.
> - `vitest.config.ts` gains `resolve.conditions: ['browser']` (guarded by `process.env.VITEST`,
>   as documented above) once (1) and (2) make it actually useful.
> - `DataTable.test.ts` covers the S4 DoD: server mode does not re-sort/re-filter (DOM order ==
>   input order), pager label/range derive from `server.total` not `data.length`, and
>   search/sort/page/filter changes each fire `onQuery` exactly once with the expected payload —
>   plus the pre-existing client-mode behavior stays byte-identical (a regression snapshot before
>   vs. after the S4 diff).
>
> **Out of scope:** Any other DataTable consumer's own component tests; general Svelte-5
> component-testing conventions for the rest of the repo beyond what DataTable's tests need.

The quote is provenance, not the normative execution plan. Pass 2 corrects its illustrative
`environmentMatchGlobs` stub-swap and historical "before/after" snapshot language in §§3–7.

## 1. Relationship classification (recommend-only)

`relationship: extends`, `related: [2026-08-13-crm-customers-server-pagination-spec,
2026-08-13-crm-customers-server-pagination]`.

- **`2026-08-13-crm-customers-server-pagination-spec`** (`status: implementing`, `verdict:
  approved`) — its own §S4 DoD block reads: *"new: server mode does not re-sort/re-filter rows
  (feed unsorted rows, assert DOM order == input order) ... new: pager label/pages derive from
  `server.total`, not `rows.length` ... new: search/sort/page/filter changes each fire `onQuery`
  exactly once"* — run via `bun run vitest run src/lib/components/data-table`. That command only
  ever ran the pre-existing non-DOM tests, because no DOM-mount test exists; S4 shipped without
  the DOM evidence its own DoD demanded. This spec is not new scope — it is the missing DOM proof
  for a DoD that already exists, on a component that already merged. Not `already-satisfied`:
  the proposal is a first-hand report from the person who tried to write these tests and hit two
  named infra walls; nothing satisfies them yet. Not `conflicts-with` or `merges-drafts`: no
  other open spec targets `DataTable.svelte`'s test file.
- **`2026-08-13-crm-customers-server-pagination`** (the source proposal, `status: merged_into` this
  chain per `proposals/index.json`'s own `duplicate_candidate` link on the test-gap proposal) —
  linked for provenance; the spec above is the operative artifact.

A repo-wide check of `specs/index.json` and `proposals/index.json` for `DataTable`,
`testing-library`, `happy-dom`, and `vitest.config` found no other spec targeting this test file;
the one adjacent surface (`2026-08-13-agentic-sdlc-test-quality-gates-spec` S6) targets a
different component and is noted above as a coordination risk, not an overlap.

## 2. Verified AS-IS

`minion_hub` is not checked out in the meta-repo; the DataTable/vitest facts below are carried
from the proposal author's first-hand attempt (dated 2026-08-20) and are **strong leads, not
verified fact** — Slice 0 turns them into fact before any edit. One fact below *was* verified
live in this checkout, because the package in question lives in the meta-repo itself:

- **`@minion-stack/ui` is a real, published, checked-out package at `packages/ui/` in
  minion-meta** (`packages/ui/package.json`: name `@minion-stack/ui`, version `0.1.0`,
  `publishConfig.access: public`, consumed via changesets per AGENTS.md's release automation).
  It is **not listed** in AGENTS.md's "Shared packages" table — a pre-existing doc gap, out of
  this spec's scope to fix.
- **`packages/ui/src/lib/Button.svelte`** (read in full this session) is exactly the
  `<svelte:element this={element} …>`-based polymorphic button the proposal describes (lines
  93-119: `this={element}` where `element = $derived(href ? 'a' : 'button')`, spread `...rest`,
  and an `onclick` handler wired directly on the element). This matches the proposal's crash
  description structurally.
- **`packages/ui`'s own test suite never DOM-mounts anything.** `packages/ui/vitest.config.ts`
  sets `environment: 'node'` (not happy-dom, not jsdom). Its one test file,
  `packages/ui/src/lib/primitives.test.ts`, imports `render` from `svelte/server` and asserts
  against the returned SSR **HTML string** (`body.toContain(...)`) for `Button`, `Input`,
  `Toggle`, `Badge` — never a live DOM, never `@testing-library/svelte`, never happy-dom. This is
  why the proposal's happy-dom crash was never caught upstream in `packages/ui`: nothing there
  exercises Button through a real DOM insertion effect. This is new evidence beyond what the
  proposal stated, load-bearing for §5 Alert A1.
- Per the proposal (carried, re-verify in Slice 0): `DataTable.svelte`'s row-virtualization
  derivation only initializes `if (browser && wrapperEl)`, and
  `src/server/test-utils/env-stubs/app-environment.ts` hardcodes `browser = false` for every
  test — so `rowVirt` is always `null` under test and the `{:else if rowVirt}` render branch
  never fires. Row virtualization itself shipped via
  `2026-07-06-hub-tanstack-consolidated-execution` T2 (`specs/2026-07-06-hub-tanstack-consolidated-execution.md`
  §T2, "DataTable row virtualization + honest count") — that spec's own scope note says
  `2026-08-13-crm-customers-server-pagination-spec` §6 explicitly deferred virtualization
  concerns to T2; T2 has since landed (the `browser`-gated `rowVirt` the proposal found is its
  artifact), which is why this gap only surfaced now.
- Per the proposal (carried): `jsdom` is not an installed dependency; `happy-dom` is (version
  unconfirmed in this checkout — `specs/2026-07-08-package-updates-tracking.md` recorded hub's
  `happy-dom` at `15.11`, with a `15.11→20.10` bump held "do only if a test needs it"; that
  condition is now met). `@testing-library/svelte` is installed (same tracker: `5.3.1`, `5.4.2`
  available) but has zero working usages in `minion_hub` as of the proposal's date.
- Per the proposal (carried): `resolve.conditions: ['browser']` was tried in `vitest.config.ts`
  and reverted — it was verified safe against `postgres`, `drizzle-orm`, and
  `@electric-sql/pglite`'s export maps (none declare a `browser` condition) but enabled nothing
  on its own while gaps 1 and 2 stood. Re-verify the dependency set hasn't grown a `browser`-aware
  export map since 2026-08-20 (package-updates campaigns run often in this repo — see
  `specs/2026-07-08-package-updates-tracking.md`).
- **S4's original implementation-range git-diff check**
  (`2026-08-13-crm-customers-server-pagination-spec` §S4) already exists and reportedly
  passed (no consumer `.svelte` files touched). It does not prove that this follow-up remains
  test-only, so this spec has its own zero-production-`.svelte` diff gate in §7.

## 3. TO-BE

Invariants (must hold; none may regress what S4 shipped):

- No production `.svelte` source changes in this spec. Client-mode `DataTable` behavior (no
  `server` prop) is characterized by a reviewed, normalized DOM snapshot committed with the
  tests, while a zero-production-`.svelte` diff proves this test-gap closure did not change the
  implementation or any consumer route.
- The default (non-test) `browser` value and behavior for the rest of the suite is unchanged —
  the override is an explicit, file-local `vi.mock('$app/environment', ...)`, not a global flip.
- Fixing the happy-dom/Button crash does not require a `@minion-stack/ui` release cycle unless
  Slice 1 proves no hub-local test-environment fix works (§5 Alert A1).

Target behavior:

1. A minimal, isolated `render()` of `Button.svelte` (or a component that renders one) through
   `@testing-library/svelte` completes without throwing in the selected DOM environment and
   exposes its accessible role/name.
2. A component test can opt into `browser === true` (via `$app/environment`) without changing
   the default for every other test in the suite.
3. `@testing-library/svelte` resolves Svelte's client build under Vitest via an explicit
   browser condition, with the complete pre-existing hub test suite remaining at its recorded
   baseline (no new failures or skipped tests).
4. A co-located DataTable DOM test proves S4's original DoD: server mode does not re-sort or
   re-filter, the pager reads `server.total`, and each search/sort/page/filter interaction adds
   exactly one `onQuery` call with the complete expected payload. Client mode has a committed
   normalized-DOM characterization snapshot.

## 4. DELTA

| # | Transition | Slice | Proof |
|---|---|---|---|
| 1 | Vitest resolves Svelte's client build for testing-library renders | Slice 1 | committed isolated render test no longer throws `lifecycle_function_unavailable`; full baseline suite is no worse |
| 2 | Shared `Button` renders cleanly in a hub-local DOM test environment | Slice 1 | isolated render asserts accessible role/name and clean teardown |
| 3 | One component-test file can force `browser = true` while the default alias remains false | Slice 1 | file-local mock test renders a real DataTable row; separate no-override test imports `$app/environment` and asserts `false` |
| 4 | DataTable server-mode S4 behavior is proven in the DOM without runtime edits | Slice 2 | server-mode DOM tests, client-mode characterization snapshot, and zero production `.svelte` diff all pass |

The two implementation slices are intentionally slice-scoped and each fit the repository's
4–8 focused-hour convention. This follows the hard operational lesson in
`/memory/MINION/sdlc-board-triage-and-phase-gates.md` ("slice-scoped dev runs mandatory") and
avoids treating three coupled test-environment changes as separate undersized runs.

### Slice 0 — Recon (≤ 30 min, prepend to Slice 1; not counted as a slice)

**Topics:** `infra`, `test`

Turns §2's carried claims into fact on the actual branch. Machine-checkable:

```bash
cd minion_hub
test -f src/lib/components/data-table/DataTable.svelte
test -f src/lib/components/data-table/DataTable.test.ts
rg -n 'browser\s*&&\s*wrapperEl|rowVirt' src/lib/components/data-table/DataTable.svelte
test -f src/server/test-utils/env-stubs/app-environment.ts
cat src/server/test-utils/env-stubs/app-environment.ts
cat vitest.config.ts
rg -n '"happy-dom"|"jsdom"|"@testing-library/svelte"' package.json
if rg -n "from '@testing-library/svelte'|from \"@testing-library/svelte\"" src; then
  echo "Existing usage found: inspect and reuse its test-environment setup"
else
  echo "No existing testing-library usage"
fi
bun run vitest run                  # must exit 0; record pass/skip totals as Slice 1's floor
```

From the meta-repo root (not `minion_hub`), reconfirm §2's `@minion-stack/ui` claim hasn't moved:

```bash
cat packages/ui/package.json | grep '"version"'
git -C packages/ui log -1 --oneline -- src/lib/Button.svelte
```

Also inspect the current DataTable props/controls and identify the exact accessible selectors
for search, sort, filter, page, rows, and pager text; record them in the implementation PR so
tests exercise user-visible controls rather than implementation internals.

If the complete baseline suite does not exit 0, stop and report that blocker before editing;
this spec does not authorize accepting or baselining unrelated red tests.

If any recon step contradicts §2, fix the gap in this spec's Slice 1-2 text in the same commit
that starts implementation — do not silently implement against stale claims.

---

### Slice 1 — component-test environment foundation

**Topics:** `infra`, `test`

**Goal:** establish one hub-local component-test setup that resolves Svelte's client build,
renders the shared Button, and opts DataTable DOM tests into `browser === true`, while preserving
the suite-wide default `browser === false`.

**Do:**
- Add `resolve: { conditions: process.env.VITEST ? ['browser'] : [] }` (or an equivalent
  explicit `VITEST`-gated form) to `vitest.config.ts`.
- Re-run the export-map safety check the proposal did (`postgres`, `drizzle-orm`,
  `@electric-sql/pglite`) against the current dependency tree. If any dependency now has a
  materially different browser export, test that path before proceeding.
- In the co-located DataTable DOM test file, add an isolated `@testing-library/svelte`
  `render()` test for the shared Button. Fix
  its DOM-emulator crash in this order, stopping at the first green path:
  1. Update the hub's `happy-dom` devDependency to the current lockfile-resolved compatible
     release and rerun the isolated reproduction.
  2. If the crash remains, add `jsdom` and opt only the co-located DataTable DOM test file into
     it with `// @vitest-environment jsdom`; record the failed happy-dom reproduction in the PR.
  3. Only if both fail, stop and escalate per §5 Alert A1; a shared-package edit and release are
     outside this spec.
- In the co-located DataTable DOM test file, use a hoisted, file-local
  `vi.mock('$app/environment', ...)` that preserves the original module exports and overrides
  only `browser: true`; add a one-line comment explaining why virtualization needs it.
- Add a separate no-override test that imports `$app/environment` through the normal Vitest
  alias and asserts `browser === false`. This proves the default rather than testing the stub
  file directly.
- Render a minimal DataTable fixture and assert at least one real body row is present, proving
  the file-local mock makes `rowVirt` initialize.

**Files:** `vitest.config.ts`; co-located component-test files; `package.json` and lockfile only
if the DOM dependency changes. `src/server/test-utils/env-stubs/app-environment.ts` remains
unchanged unless Slice 0 finds the carried claim stale.

**Definition of done (machine-checkable):**
```bash
cd minion_hub
bun run vitest run src/lib/components/data-table
# green: isolated Button render exposes role/name and tears down cleanly
# green: browser=true DataTable smoke renders >=1 tbody row
# green: separate no-override import of $app/environment observes browser=false
bun run vitest run
# no new failures or unexplained skips vs Slice 0; command exit status is the gate
```
**Estimate:** 6–8 h.

---

### Slice 2 — DataTable server-mode DOM coverage (closes the original S4 DoD)

**Topics:** `test`, `ui`

**Goal:** the exact DoD `2026-08-13-crm-customers-server-pagination-spec` §S4 specified, finally
proven with real DOM evidence, plus a client-mode regression guard.

**Do:**
- Using Slice 1's render and file-local browser-override machinery, add DOM cases to the
  co-located DataTable DOM test file:
  - Server mode does not re-sort/re-filter: feed intentionally unsorted `rows` with a `server`
    prop set, assert rendered `<tr>` DOM order equals input order (not client-sorted order).
  - Pager label/range derive from `server.total`, not `rows.length` (feed a short `rows` array
    with a large `server.total`, assert the rendered pager text reflects `total`).
  - Drive search/sort/page/filter through accessible user interactions. After clearing any
    documented mount-time calls, each interaction increases the `onQuery` call count by exactly
    one and the last call deeply equals the complete expected
    `{ search, sort, filters, page, pageSize }` payload.
- Add a reviewed normalized-DOM snapshot for client mode (no `server` prop). Normalize only
  nondeterministic generated ids/attributes; do not remove row order, pager text, roles, or
  control state from the snapshot.
- Do not edit `DataTable.svelte` or any other production `.svelte` file.

**Files:** co-located DataTable DOM test and snapshot files only.

**Definition of done (machine-checkable):**
```bash
cd minion_hub
bun run vitest run src/lib/components/data-table
#   green: pre-existing client-mode tests (logic-level, non-DOM) untouched
#   green: new DOM-mount cases above
#   green: reviewed client-mode normalized-DOM snapshot
test -z "$(git diff --name-only <sha-before-this-spec-commits>..HEAD -- '*.svelte')"
bun run check
```
**Estimate:** 6-8 h.

## 5. Cross-repo impact assessment

Per AGENTS.md's "Cross-Project Impact Zones," this work is test-only inside one hub component's
test file plus hub-local test tooling. No DB schema, no gateway/WS protocol frame, and no
consumer-visible `.svelte` change is in scope.

| Surface | Impact | Mitigation |
|---|---|---|
| `minion_site` | None — does not consume `DataTable.svelte`, hub's `vitest.config.ts`, or hub's env stubs | — |
| `@minion-stack/shared` / gateway WS protocol | None — no frame types touched | — |
| `paperclip-minion`, `pixel-agents`, `minion_plugins` | None | — |
| `@minion-stack/ui` (`packages/ui`, minion-meta) | **Conditional — see Alert A1.** Approved scope does not touch it | Slice 1 stops and escalates before a shared-package edit |
| `2026-08-13-agentic-sdlc-test-quality-gates-spec` S6 (same repo, unimplemented) | Shares the same infra surface (`vitest.config.ts`, `@testing-library/svelte`, happy-dom) | Alert A2 — check status before starting Slice 1 |

### 🚨 A1 — the `@minion-stack/ui` fallback is a real cross-repo release cycle, not a local edit

`@minion-stack/ui` is not a hub-local component library — it is `packages/ui/` in **this**
meta-repo, published to npm (`publishConfig.access: public`, current `0.1.0`) and consumed by
`minion_hub` as a versioned dependency, per AGENTS.md's Changesets release flow ("merges to
`main` with `.changeset/*.md` trigger a Version Packages PR ... merging that PR publishes to
npm"). `packages/ui`'s own test suite (`environment: 'node'`, SSR-string assertions via
`svelte/server`'s `render()` — see §2) has never DOM-mounted `Button.svelte`, which is precisely
why this class of bug was never caught there. If Slice 1 needs an actual `Button.svelte` code
change:

1. That is a **minion-meta** change (`packages/ui/src/lib/Button.svelte`), not a `minion_hub`
   change — it needs a changeset, a Version-Packages PR, an npm publish, and then a
   `minion_hub` dependency bump before the fix is even consumable. `2026-08-17-hub-pos-appointments-fork-spec.md`
   documents this exact loop as a reason to avoid adding to `@minion-stack/ui` casually.
2. That loop is outside this spec's repository list and estimate. If Slice 1 lands here,
   **stop and raise it to a human** (new proposal, `repos:
   [minion-meta, minion_hub]`) rather than silently absorbing a package release cycle into this
   spec's scope or estimate.
3. Prefer path 1 (happy-dom bump) or path 2 (jsdom swap) — both are `minion_hub`-only
   devDependency changes with zero minion-meta impact, and both are explicitly named as
   acceptable by the original proposal's DoD.

### ⚠️ A2 — coordinate with the adjacent, unimplemented test-quality-gates S6

`2026-08-13-agentic-sdlc-test-quality-gates-spec` S6 independently plans "rewrite commit-order
tests with `@testing-library/svelte` (already a devDep) mounting the real component" for
`ChannelSetupWizard.test.ts` — the same `@testing-library/svelte` + happy-dom + `vitest.config.ts`
surface this spec's Slice 1 touches. Per `specs/index.json`, that spec is `status: approved`,
`pass: 1`, `verdict: pending` — not yet implemented. Whichever lands first genuinely becomes the
first working `@testing-library/svelte` usage in `minion_hub`; the other implementer should check
`specs/index.json` at start time and rebase onto the first mover's happy-dom/vitest.config fixes
instead of re-deriving them from scratch.

## 6. Out of scope (explicit)

- **Any other DataTable consumer's own component tests.** ~11 routes share `DataTable.svelte`;
  only co-located DataTable tests are touched, and Slice 2's DoD asserts zero production
  `.svelte` edits.
- **General Svelte-5 component-testing conventions for the rest of the repo.** `S7` of
  `2026-08-13-agentic-sdlc-test-quality-gates-spec` owns the repo-wide authoring standard; this
  spec documents only what the DataTable DOM test needs (Slice 1's local comment and PR note).
- **`ChannelSetupWizard.test.ts`** and any other file `2026-08-13-agentic-sdlc-test-quality-gates-spec`
  S6 owns — coordinate (§5 A2), do not implement here.
- **Editing `@minion-stack/ui`'s `Button.svelte` source.** Default plan never touches it; §5
  Alert A1's fallback path is explicitly escalated out of this spec if reached.
- **Row virtualization feature work itself** — already shipped by
  `2026-07-06-hub-tanstack-consolidated-execution` T2. This spec only makes its existing
  `browser`-gated behavior observable under test (Slice 1); it does not change virtualization
  logic.
- **Any `DataTable.svelte` runtime/behavior change.** This is test-and-test-infra-only; Slice 2's
  zero-production-`.svelte` diff proves the implementation source is untouched, and the
  characterization snapshot guards its observable client-mode DOM going forward.
- **CRM SQL/API-level testing** (search, sort, filter correctness at the service layer) — already
  covered by `2026-08-13-crm-customers-server-pagination-spec`'s own S1-S3 DoDs.

## 7. End-to-end verification

```bash
cd minion_hub
bun run check
bun run vitest run
#   total test count >= Slice 0's recorded baseline, zero failures, zero skipped-without-reason
bun run vitest run src/lib/components/data-table
#   the exact command 2026-08-13-crm-customers-server-pagination-spec §S4 specified — now
#   actually exercises DOM-mounted server-mode cases, not just logic-level assertions
test -z "$(git diff --name-only <sha-before-this-spec's-first-commit>..HEAD -- '*.svelte')"
```

**Ship gate:** §7 all green; DELTA #1-4 each individually proven by its listed test; the four DoD
bullets quoted verbatim in §0 are each satisfiable by pointing at a specific green test; no edit
outside `minion_hub` (§5 Alert A1's fallback was not needed) unless explicitly escalated and
approved as a separate spec. Once shipped, a human may reconcile
`2026-08-13-crm-customers-server-pagination-spec`'s own status/pass to reflect that its S4 DoD is
now fully (not just partially) satisfied — that reconciliation is a human call and is
deliberately not made by this spec.
