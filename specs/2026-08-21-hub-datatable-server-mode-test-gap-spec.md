---
id: 2026-08-21-hub-datatable-server-mode-test-gap-spec
title: "DataTable.svelte server mode DOM-mount tests — close the S4 test-gap (happy-dom, browser stub, testing-library)"
stage: spec
status: draft
pass: 1
created: 2026-08-21
updated: 2026-08-21
proposal: 2026-08-20-hub-datatable-server-mode-test-gap
verdict: pending
repos: [minion_hub]
relationship: extends
related: [2026-08-13-crm-customers-server-pagination-spec, 2026-08-13-crm-customers-server-pagination]
type: infra
tags: [infra, test, ui]
---

# DataTable.svelte server mode DOM-mount tests — close the S4 test-gap

**Owner surface:** `minion_hub` — `src/lib/components/data-table/DataTable.svelte`,
`src/lib/components/data-table/DataTable.test.ts` (new/extended), `vitest.config.ts`,
`src/server/test-utils/env-stubs/app-environment.ts`.
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
- **S4's DoD git-diff check** (`2026-08-13-crm-customers-server-pagination-spec` §S4) already
  exists and already passed (no consumer `.svelte` files touched); that check is orthogonal to
  this gap and is not re-run here.

## 3. TO-BE

Invariants (must hold; none may regress what S4 shipped):

- Client-mode `DataTable` behavior (no `server` prop) stays byte-identical before and after this
  spec's changes — proven by a regression snapshot, not just "tests still pass."
- No other DataTable consumer route (~11 total) requires any edit. Verified the same way S4
  itself proved it: a diff of `.svelte` files outside `src/lib/components/data-table/` across
  this spec's own commit range must be empty.
- The default (non-test) `browser` value and behavior for the rest of the suite is unchanged —
  the override is opt-in per test file/glob, not a global flip.
- Fixing the happy-dom/Button crash does not require a `@minion-stack/ui` release cycle unless
  Slice 2's recon proves no local (hub-side) fix works (§5 Alert A1).

Target behavior:

1. A minimal, isolated mount of `Button.svelte` (or any component that renders one) under
   `@testing-library/svelte` + happy-dom completes without throwing, in `minion_hub`'s existing
   test environment.
2. A component test can opt into `browser === true` (via `$app/environment`) without changing
   the default for every other test in the suite.
3. `@testing-library/svelte`'s `mount()` resolves to Svelte's client build under `vitest`
   (`resolve.conditions: ['browser']`, `VITEST`-guarded) with zero regression to the rest of the
   suite (which does not depend on this condition).
4. `DataTable.test.ts` proves S4's original DoD in a real DOM: server mode doesn't re-sort/
   re-filter, the pager reads `server.total`, `onQuery` fires exactly once per interaction —
   while the pre-existing client-mode suite stays green and snapshot-identical.

## 4. DELTA

| # | Transition | Slice | Proof |
|---|---|---|---|
| 1 | `vitest.config.ts` resolves Svelte's client build under `vitest` (`resolve.conditions: ['browser']`, `VITEST`-guarded) | Slice 1 | full pre-existing hub vitest suite stays green (count ≥ pre-change baseline, zero new failures); a throwaway `mount()` call no longer throws `lifecycle_function_unavailable` |
| 2 | `Button.svelte` (any consumer) mounts cleanly under `@testing-library/svelte` + happy-dom | Slice 2 | new isolated Button mount test green, asserting the rendered role/text/attrs, not just "did not throw" |
| 3 | Component tests can force `browser = true` for row virtualization without changing the suite default | Slice 3 | a smoke test using the override renders ≥1 real row in the DOM; an unrelated existing test (no override) still observes `browser === false` |
| 4 | `DataTable.test.ts` proves S4's DoD in the DOM; client-mode stays byte-identical | Slice 4 | new server-mode DOM cases green + client-mode before/after snapshot diff is empty |

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
rg -rn "from '@testing-library/svelte'|from \"@testing-library/svelte\"" src   # confirm still zero real usages; if one landed (e.g. S6 of the test-quality-gates spec), rebase onto its fixes instead of re-solving
bun run vitest run 2>&1 | tail -20   # record current green/red baseline + total test count — this is Slice 1's regression floor
```

From the meta-repo root (not `minion_hub`), reconfirm §2's `@minion-stack/ui` claim hasn't moved:

```bash
cat packages/ui/package.json | grep '"version"'
git -C packages/ui log -1 --oneline -- src/lib/Button.svelte
```

If any recon step contradicts §2, fix the gap in this spec's Slice 1-4 text in the same commit
that starts implementation — do not silently implement against stale claims.

---

### Slice 1 — `vitest.config.ts` browser-condition resolution

**Topics:** `infra`, `test`

**Goal:** `@testing-library/svelte`'s `mount()` resolves to Svelte's client build instead of its
SSR build, without touching anything else in the suite.

**Do:**
- Add `resolve: { conditions: process.env.VITEST ? ['browser'] : [] }` (or equivalent explicit
  `VITEST`-gated form) to `vitest.config.ts`.
- Re-run the export-map safety check the proposal already did (`postgres`, `drizzle-orm`,
  `@electric-sql/pglite`) against whatever `package.json` looks like today — if any dependency
  now declares a `browser` condition with materially different code, note it and re-verify
  before proceeding.

**Files:** `vitest.config.ts`.

**Definition of done (machine-checkable):**
```bash
cd minion_hub
bun run vitest run 2>&1 | tail -5
#   total test count >= Slice 0's recorded baseline, zero new failures
cat > /tmp/mount-smoke.test.ts <<'EOF'
import { describe, it, expect } from 'vitest';
import { mount, unmount } from 'svelte';
import Spinner from '../src/lib/components/data-table/../ui/Spinner.svelte'; // adjust to any trivial existing component
it('mounts without lifecycle_function_unavailable', () => {
  const target = document.createElement('div');
  const app = mount(Spinner, { target });
  expect(target.innerHTML).not.toBe('');
  unmount(app);
});
EOF
#   run once, ad hoc, to prove the condition works; delete the scratch file — Slice 2 supplies the real committed test
```
**Estimate:** 2-3 h.

---

### Slice 2 — happy-dom / `Button.svelte` mount fix

**Topics:** `infra`, `test`, `ui`

**Goal:** any component that renders `Button.svelte` mounts cleanly under
`@testing-library/svelte` + happy-dom. Preferred path is hub-local and touches zero shared
packages — see §5 Alert A1 for why the `@minion-stack/ui` path is last resort.

**Do, in this preference order (stop at the first that works):**
1. Bump `happy-dom` (hub devDependency) toward the version already flagged available in
   `specs/2026-07-08-package-updates-tracking.md` (`15.11→20.10` at time of writing; use
   whatever is current) and re-test the crash repro. `happy-dom`'s `Node.nextSibling` getter
   throwing on `Symbol(parentNode)` reads like exactly the class of DOM-emulation bug point
   releases fix.
2. If the bump doesn't resolve it, switch `minion_hub`'s vitest environment to `jsdom` for
   component tests only (via `environmentMatchGlobs` scoped to the data-table test glob, or a
   `// @vitest-environment jsdom` file-level pragma) — add `jsdom` as a new devDependency, and
   document in the PR why happy-dom was insufficient.
3. Only if both fail: this needs a `@minion-stack/ui` code change to `Button.svelte`'s insertion
   effect. **Stop and escalate per §5 Alert A1** — do not fold a changeset/publish cycle into
   this slice's estimate.

**Files:** `minion_hub/package.json` (dep bump or new devDependency), possibly
`minion_hub/vitest.config.ts` (`environmentMatchGlobs`), new isolated mount test (co-located,
e.g. `src/lib/components/data-table/DataTable.test.ts`'s first DOM case, or a throwaway
`Button.mount.test.ts` deleted once Slice 4 supersedes it).

**Definition of done (machine-checkable):**
```bash
cd minion_hub
bun run vitest run <path-to-the-new-Button-mount-test>
#   green: mounts, asserts rendered role/text (e.g. a button with children renders role="button"
#   and the child text node), no TypeError, unmounts cleanly
bun run vitest run 2>&1 | tail -5
#   full suite still green at >= Slice 1's baseline count
```
**Estimate:** 4-6 h.

---

### Slice 3 — per-test `browser` override

**Topics:** `infra`, `test`

**Goal:** a component test can force `browser === true` so `DataTable`'s `rowVirt` initializes,
without changing the default `browser = false` for the rest of the suite.

**Do:** pick one documented mechanism and use it consistently:
- A second env-stub file (e.g. `app-environment.browser-true.ts`) wired via `vitest.config.ts`
  `environmentMatchGlobs` scoped to a naming convention (e.g. `*.dom.test.ts`), **or**
- A per-file `vi.mock('$app/environment', () => ({ browser: true, ... }))` override, documented
  in a short comment at the top of any test file that uses it.
Whichever is chosen, write one paragraph in the PR description (not a new standalone doc — S7 of
`2026-08-13-agentic-sdlc-test-quality-gates-spec` owns the repo-wide authoring standard) naming
the mechanism so `DataTable.test.ts` and any future component test can reuse it without
rediscovering this slice's reasoning.

**Files:** `src/server/test-utils/env-stubs/` (new stub or override helper), `vitest.config.ts`
(if `environmentMatchGlobs` is chosen).

**Definition of done (machine-checkable):**
```bash
cd minion_hub
bun run vitest run <a-throwaway-or-DataTable-smoke-test-using-the-override>
#   with override: renders >= 1 real <tr> row in the DOM (rowVirt is non-null)
bun run vitest run <any-preexisting-unrelated-test-importing-'$app/environment'>
#   still observes browser === false — the override is opt-in, not global
```
**Estimate:** 3-5 h.

---

### Slice 4 — `DataTable.test.ts` server-mode DOM coverage (closes the original S4 DoD)

**Topics:** `test`, `ui`

**Goal:** the exact DoD `2026-08-13-crm-customers-server-pagination-spec` §S4 specified, finally
proven with real DOM evidence, plus a client-mode regression guard.

**Do:**
- Using Slices 1-3's now-working mount + browser-override machinery, add DOM-mount cases to
  `DataTable.test.ts`:
  - Server mode does not re-sort/re-filter: feed intentionally unsorted `rows` with a `server`
    prop set, assert rendered `<tr>` DOM order equals input order (not client-sorted order).
  - Pager label/range derive from `server.total`, not `rows.length` (feed a short `rows` array
    with a large `server.total`, assert the rendered pager text reflects `total`).
  - Search/sort/page/filter interactions each fire the `onQuery` callback exactly once with the
    expected payload shape (`{ search, sort, filters, page, pageSize }`).
- Regression snapshot: capture the rendered DOM (or a normalized subset of it) for
  client-mode (no `server` prop) **before** this slice's diff and assert it is byte-identical
  **after**. If no pre-existing client-mode DOM snapshot exists, generate the "before" snapshot
  from the current `DataTable.svelte` on the commit immediately preceding this slice's own
  commits (not from `origin/master`, for the same shared-branch reason S4's own DoD scopes its
  diff check to its own commit range — see §2).

**Files:** `src/lib/components/data-table/DataTable.test.ts`.

**Definition of done (machine-checkable):**
```bash
cd minion_hub
bun run vitest run src/lib/components/data-table
#   green: pre-existing client-mode tests (logic-level, non-DOM) untouched
#   green: new DOM-mount cases above
#   green: client-mode DOM snapshot diff is empty
git diff --name-only <sha-before-this-spec-commits>..HEAD -- '*.svelte' \
  | grep -v '^src/lib/components/data-table/' \
  && echo "FAIL: closing this test gap must not require consumer edits" && exit 1
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
| `@minion-stack/ui` (`packages/ui`, minion-meta) | **Conditional — see Alert A1.** Default plan (Slice 2, path 1 or 2) touches it not at all | Slice 2 stops and escalates before falling to path 3 |
| `2026-08-13-agentic-sdlc-test-quality-gates-spec` S6 (same repo, unimplemented) | Shares the same infra surface (`vitest.config.ts`, `@testing-library/svelte`, happy-dom) | Alert A2 — check status before starting Slice 1 |

### 🚨 A1 — the `@minion-stack/ui` fallback is a real cross-repo release cycle, not a local edit

`@minion-stack/ui` is not a hub-local component library — it is `packages/ui/` in **this**
meta-repo, published to npm (`publishConfig.access: public`, current `0.1.0`) and consumed by
`minion_hub` as a versioned dependency, per AGENTS.md's Changesets release flow ("merges to
`main` with `.changeset/*.md` trigger a Version Packages PR ... merging that PR publishes to
npm"). `packages/ui`'s own test suite (`environment: 'node'`, SSR-string assertions via
`svelte/server`'s `render()` — see §2) has never DOM-mounted `Button.svelte`, which is precisely
why this class of bug was never caught there. If Slice 2 needs an actual `Button.svelte` code
change:

1. That is a **minion-meta** change (`packages/ui/src/lib/Button.svelte`), not a `minion_hub`
   change — it needs a changeset, a Version-Packages PR, an npm publish, and then a
   `minion_hub` dependency bump before the fix is even consumable. `2026-08-17-hub-pos-appointments-fork-spec.md`
   documents this exact loop as a reason to avoid adding to `@minion-stack/ui` casually.
2. That loop is materially bigger and slower than this spec's Slice 2 estimate (4-6 h) assumes.
   If Slice 2's recon lands here, **stop and raise it to a human** (new proposal, `repos:
   [minion-meta, minion_hub]`) rather than silently absorbing a package release cycle into this
   spec's scope or estimate.
3. Prefer path 1 (happy-dom bump) or path 2 (jsdom swap) — both are `minion_hub`-only
   devDependency changes with zero minion-meta impact, and both are explicitly named as
   acceptable by the original proposal's DoD.

### ⚠️ A2 — coordinate with the adjacent, unimplemented test-quality-gates S6

`2026-08-13-agentic-sdlc-test-quality-gates-spec` S6 independently plans "rewrite commit-order
tests with `@testing-library/svelte` (already a devDep) mounting the real component" for
`ChannelSetupWizard.test.ts` — the same `@testing-library/svelte` + happy-dom + `vitest.config.ts`
surface this spec's Slices 1-2 touch. Per `specs/index.json`, that spec is `status: approved`,
`pass: 1`, `verdict: pending` — not yet implemented. Whichever lands first genuinely becomes the
first working `@testing-library/svelte` usage in `minion_hub`; the other implementer should check
`specs/index.json` at start time and rebase onto the first mover's happy-dom/vitest.config fixes
instead of re-deriving them from scratch.

## 6. Out of scope (explicit)

- **Any other DataTable consumer's own component tests.** ~11 routes share `DataTable.svelte`;
  only `DataTable.test.ts` is touched, and Slice 4's DoD asserts zero other `.svelte` edits.
- **General Svelte-5 component-testing conventions for the rest of the repo.** `S7` of
  `2026-08-13-agentic-sdlc-test-quality-gates-spec` owns the repo-wide authoring standard; this
  spec documents only what `DataTable.test.ts` needed (Slice 3's one-paragraph PR note).
- **`ChannelSetupWizard.test.ts`** and any other file `2026-08-13-agentic-sdlc-test-quality-gates-spec`
  S6 owns — coordinate (§5 A2), do not implement here.
- **Editing `@minion-stack/ui`'s `Button.svelte` source.** Default plan never touches it; §5
  Alert A1's fallback path is explicitly escalated out of this spec if reached.
- **Row virtualization feature work itself** — already shipped by
  `2026-07-06-hub-tanstack-consolidated-execution` T2. This spec only makes its existing
  `browser`-gated behavior observable under test (Slice 3); it does not change virtualization
  logic.
- **Any `DataTable.svelte` runtime/behavior change.** This is test-and-test-infra-only; Slice 4's
  DoD includes a byte-identical client-mode snapshot specifically to prove this.
- **CRM SQL/API-level testing** (search, sort, filter correctness at the service layer) — already
  covered by `2026-08-13-crm-customers-server-pagination-spec`'s own S1-S3 DoDs.

## 7. End-to-end verification

```bash
cd minion_hub
bun run check
bun run vitest run 2>&1 | tail -20
#   total test count >= Slice 0's recorded baseline, zero failures, zero skipped-without-reason
bun run vitest run src/lib/components/data-table
#   the exact command 2026-08-13-crm-customers-server-pagination-spec §S4 specified — now
#   actually exercises DOM-mounted server-mode cases, not just logic-level assertions
git diff --name-only <sha-before-this-spec's-first-commit>..HEAD -- '*.svelte' \
  | grep -v '^src/lib/components/data-table/' \
  && echo "FAIL: zero consumer routes should be touched" && exit 1
```

**Ship gate:** §7 all green; DELTA #1-4 each individually proven by its listed test; the four DoD
bullets quoted verbatim in §0 are each satisfiable by pointing at a specific green test; no edit
outside `minion_hub` (§5 Alert A1's fallback was not needed) unless explicitly escalated and
approved as a separate spec. Once shipped, a human may reconcile
`2026-08-13-crm-customers-server-pagination-spec`'s own status/pass to reflect that its S4 DoD is
now fully (not just partially) satisfied — that reconciliation is a human call and is
deliberately not made by this spec, which touches no other file's frontmatter but the source
proposal's (below).
