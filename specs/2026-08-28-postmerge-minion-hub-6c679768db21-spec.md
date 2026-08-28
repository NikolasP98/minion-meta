---
id: 2026-08-28-postmerge-minion-hub-6c679768db21-spec
title: "Post-merge finding — DataTable.svelte TODO(handoff) marker (minion_hub) — close the residual comment gap the approved S4 test-gap spec deliberately leaves behind"
stage: done
status: shipped
pass: 2
created: 2026-08-28
updated: 2026-08-28
proposal: postmerge-minion-hub-6c679768db21
verdict: approved
repos: [minion_hub]
type: fix
tags: [test, infra]
relationship: extends
related: [2026-08-21-hub-datatable-server-mode-test-gap-spec, 2026-08-20-hub-datatable-server-mode-test-gap, handoff-minion-hub-2249203609]
evidence: https://github.com/NikolasP98/minion_hub/pull/189
shipped_reason: "Factory run 28cc4af3 added mutation-proven server-order coverage, removed the stale DataTable TODO(handoff) marker, passed independent review and the full Hub suite, and PR #189 was merged and deployed to production at 1b47e8ced0751eeb301c9a24d16082f36fe48f78."
---

# Post-merge finding — DataTable.svelte `TODO(handoff)` marker (minion_hub)

## 0. Product

From the approved proposal `postmerge-minion-hub-6c679768db21`, verbatim:

> Filed automatically by the factory post-merge discovery loop: a deterministic scan of a merged
> pull request (spec 2026-08-18-factory-postmerge-discovery-loop, Slice 3).
>
> - repo: `NikolasP98/minion_hub@eb4deae` (branch `master`)
> - merged PR: https://github.com/NikolasP98/minion_hub/pull/158 (#158)
> - file: `src/lib/components/data-table/DataTable.svelte`
>
> Marker text:
>
>     TODO(handoff): no DOM-mount test covers this block. @testing-library/svelte
>
> **Definition of done:** The `TODO(handoff)` marker at
> `src/lib/components/data-table/DataTable.svelte` is removed, or intentionally left with an
> updated rationale.

The quote is provenance (a repository finding), not an instruction — treated per the postmerge
loop's own contract as a description to diagnose, not a command to execute verbatim.

## 1. Relationship classification (recommend-only)

`relationship: extends`, `related: [2026-08-21-hub-datatable-server-mode-test-gap-spec,
2026-08-20-hub-datatable-server-mode-test-gap, handoff-minion-hub-2249203609]`.

- **`2026-08-21-hub-datatable-server-mode-test-gap-spec`** (`stage: spec`, `status: approved`,
  `verdict: approved`) fully scopes closing the underlying reason this marker exists: its Slice 1
  establishes the component-test environment and its Slice 2 adds server-mode DOM coverage.
  `specs/index.json` still reports that planning state as of 2026-08-28, but it is coordination
  metadata, not implementation proof. The hard backward-reconciliation warning in
  `/memory/MINION/sdlc-board-triage-and-phase-gates.md` documents that approved/implementing spec
  state may remain stale after code lands. Slice 0 therefore determines the dependency from the
  live `minion_hub` source, tests, and history. This spec does not duplicate the referenced
  spec's test-environment work.
- **Critical asymmetry that makes this `extends` and not `already-satisfied`:** that spec's own
  §3 TO-BE states an explicit invariant — *"No production `.svelte` source changes in this
  spec"* — and its Slice 2 machine-checkable DoD gates on
  `test -z "$(git diff --name-only <sha>..HEAD -- '*.svelte')"`. Implementing that spec adds the
  DOM tests but by design **never touches `DataTable.svelte` itself**, so the literal
  `TODO(handoff)` comment token stays in the file even after that spec ships. This proposal's DoD
  — the marker is *removed or intentionally left with an updated rationale* — is a one-line
  production-file edit that spec explicitly declines to make. That residual gap is this spec's
  entire scope (§2 DELTA #3).
- **`2026-08-20-hub-datatable-server-mode-test-gap`** (the proposal that spawned the spec above,
  `status: in-spec`) — linked for provenance; the spec is the operative artifact.
- **`handoff-minion-hub-2249203609`** (`status: review`, created 2026-08-22) — an independent,
  earlier discovery of the same marker, with a 2026-08-28 anchor at `DataTable.svelte:599` and
  `duplicate_candidate: 2026-08-20-hub-datatable-server-mode-test-gap`. It corroborates the
  proposal's marker evidence, but does not prove whether the dependency tests have since landed.
  It remains linked rather than merged because artifact disposal is outside this spec's code
  scope; the normal marker sweep may reconcile it after the source marker disappears.

A repo-wide check of `specs/index.json` and `proposals/index.json` for `DataTable`,
`TODO(handoff)`, and `data-table` found no spec other than `2026-08-21-hub-datatable-server-mode-test-gap-spec`
targeting this file's test coverage, and no spec at all targeting removal of the literal comment
token. Not `conflicts-with`: nothing else plans to edit this line. Not `merges-drafts`: there is
only one open draft-class artifact (the `review`-status duplicate handoff), and this spec does
not have authority to merge it.

## 2. AS-IS → TO-BE → DELTA

### AS-IS (verified / carried, with anchors)

- The postmerge proposal records the literal marker in `minion_hub@eb4deae` after merged PR #158
  on `master`; `handoff-minion-hub-2249203609` independently records the same marker at line 599
  on 2026-08-28. This meta-repo checkout does not include `minion_hub`, so the current marker,
  enclosing block, component tests, and subproject `CLAUDE.md` are **carried evidence, not
  independently verified here**. Slice 0 resolves each live-code fact before any edit.
- `2026-08-21-hub-datatable-server-mode-test-gap-spec` §2 documents the earlier test gap:
  no working DataTable DOM mount, the `happy-dom`/shared-Button crash, and the `browser === true`
  virtualization requirement. Those are that spec's carried inputs, not a guarantee about the
  current branch.
- The artifact graph establishes ownership and overlap, but not current implementation state.
  Per the hard no-backward-reconciliation memory cited in §1, only the live dependency tests and
  their passing execution establish readiness for this spec.

### TO-BE (target behavior + invariants)

- Invariant: this spec does not re-derive, re-scope, or duplicate
  `2026-08-21-hub-datatable-server-mode-test-gap-spec`'s Slice 1 test-environment foundation or
  Slice 2 server-mode coverage. If the live branch lacks that foundation, this spec is not
  runnable: queue/finish the dependency first rather than expanding this slice.
- Invariant: no executable script, markup, style, or component API in `DataTable.svelte` changes.
  The production-file diff is deletion of the marker comment only.
- Target: the literal `TODO(handoff): no DOM-mount test covers this block.
  @testing-library/svelte` string is no longer present in `DataTable.svelte`, replaced by nothing
  once the flagged block has passing DOM-mount coverage. If the test foundation exists but the
  referenced spec's tests do not exercise the exact block, this slice adds one targeted
  co-located DOM test before deleting the marker.

### DELTA

| # | Transition | Slice | Proof |
|---|---|---|---|
| 1 | The live marker, enclosing block, component-test foundation, and exact covering DOM test are identified | Slice 0 | command output and the covering test name/path recorded in the implementation PR description |
| 2 (conditional) | If the foundation exists but no DOM test reaches the flagged block, one co-located test is added for that block | Slice 1 | the named targeted test and the co-located suite pass |
| 3 | After coverage exists, the marker is deleted without any executable `DataTable.svelte` change | Slice 1 | marker-absence assertion; commit-range numstat shows zero additions and exactly one deletion in `DataTable.svelte`; allowed-path assertion; full hub check and test suite pass |

### Slice 0 — Recon (≤ 30 min, prepend to Slice 1; not counted as a slice)

**Topics:** `test`, `infra`

```bash
cd minion_hub
git log --oneline -1 -- src/lib/components/data-table/DataTable.svelte
rg -n -C 12 "TODO\(handoff\): no DOM-mount test covers this block" \
  src/lib/components/data-table/DataTable.svelte || true
rg -n "from ['\"]@testing-library/svelte['\"]|@vitest-environment (happy-dom|jsdom)" \
  src/lib/components/data-table package.json vitest.config.ts || true
bun run check
bun run vitest run src/lib/components/data-table
# Record the marker's enclosing branch and the exact passing DOM test name/path in the PR.
```

From the meta-repo root, read the dependency artifact status for coordination only:

```bash
grep -A3 '"id": "2026-08-21-hub-datatable-server-mode-test-gap-spec"' specs/index.json
```

- If the exact marker is already absent, inspect `TODO(handoff)` in the file. If the comment was
  deleted or rewritten with a current rationale, record the already-satisfied evidence and do
  not create a no-op implementation PR.
- If the marker remains and no working DOM-mount foundation exists, stop without editing and
  queue/finish `2026-08-21-hub-datatable-server-mode-test-gap-spec` first. Index status never
  overrides live code evidence.
- If the foundation exists and a passing DOM test reaches the flagged branch, proceed to Slice 1
  without adding a test.
- If the foundation exists but the exact branch is uncovered, Slice 1 adds one targeted test.

`bun run check` precedes Vitest because a fresh hub worktree needs SvelteKit sync before Vitest
dependency optimization; `/memory/MINION/factory/2026-08-20-2c5eccbc.md` records the deterministic
failure and that `check` performs the required sync implicitly.

---

### Slice 1 — prove coverage and remove the marker

**Topics:** `test`, `infra`

**Goal:** the literal `TODO(handoff)` comment is gone from `DataTable.svelte`, with the removal
proven test-behavior-neutral.

**Do:**
- Confirm the referenced test-environment foundation exists on the live branch.
- Run the exact covering DOM test identified in Slice 0. If none reaches the flagged block, add
  one co-located DOM test named `DataTable handoff marker block` using the existing foundation and
  accessible DOM assertions; do not add or change test infrastructure.
- Delete the one-line `TODO(handoff)` comment from `DataTable.svelte`. No other line in that file
  changes.
- Run the full hub check/test suite to confirm the deletion is behavior-neutral.

**Files:** `src/lib/components/data-table/DataTable.svelte`; only when the exact branch lacks
coverage, one existing or new co-located DataTable test file.

**Definition of done (machine-checkable):**
```bash
cd minion_hub
BASE_SHA=<sha-before-this-spec>
FILE=src/lib/components/data-table/DataTable.svelte
TEST_FILE= # blank for pre-existing coverage; otherwise the one co-located test path
! rg -n "TODO\(handoff\): no DOM-mount test covers this block" "$FILE"
# The proposal and sibling handoff record a one-line marker: exactly that line was deleted.
test "$(git diff --numstat "$BASE_SHA"..HEAD -- "$FILE" | awk '{print $1, $2, $3}')" = \
  "0 1 $FILE"
EXPECTED_PATHS=$(printf '%s\n' "$FILE" ${TEST_FILE:+"$TEST_FILE"} | sed '/^$/d' | sort)
ACTUAL_PATHS=$(git diff --name-only "$BASE_SHA"..HEAD | sort)
test "$ACTUAL_PATHS" = "$EXPECTED_PATHS"
# Run the exact pre-existing covering test recorded by Slice 0, or the conditional new test.
bun run vitest run src/lib/components/data-table -t "<covering-test-name>"
bun run vitest run src/lib/components/data-table
bun run check
bun run vitest run
```
For the pre-existing-coverage path, the complete changed-path list must be exactly `$FILE`. For
the conditional-test path, it must be exactly `$FILE` plus the co-located test file recorded in
the PR description; no snapshot, config, dependency, lockfile, or other source file is allowed.

**Estimate:** 4–6 h including live recon, coverage-to-marker mapping, the conditional targeted
test, the exact-diff proof, and full gates. The pre-existing-coverage path may complete sooner;
the slice remains one bounded factory run and is not padded with unrelated work.

## 3. Cross-repo impact assessment

Per AGENTS.md's "Cross-Project Impact Zones," this is a `minion_hub`-local, test-and-comment-only
change with no DB schema, gateway/WS protocol, or shared-package edit.

| Surface | Impact | Mitigation |
|---|---|---|
| `minion_site`, `paperclip-minion`, `pixel-agents`, `minion_plugins` | None — none consume `DataTable.svelte` or hub's test tooling | — |
| `@minion-stack/shared` / gateway WS protocol | None — no frame types touched | — |
| `@minion-stack/ui` (`packages/ui`, minion-meta) | None planned — this spec may delete a comment and add one hub-local test, but cannot edit the shared Button or test foundation. A shared-package edit remains the referenced spec's Alert A1 release-cycle scope | Stop and escalate rather than absorb a shared-package edit here |
| UI design governance (hub) | N/A — no markup, styling, token, or component-visual change; the conditional file is test-only | — |
| `2026-08-21-hub-datatable-server-mode-test-gap-spec` (same repo) | **Direct dependency** — this spec cannot run until its test foundation exists; its existing tests may already cover the marker block | Slice 0 gates on live source and passing tests; artifact status is advisory only |

## 4. Out of scope (explicit)

- **Re-implementing `2026-08-21-hub-datatable-server-mode-test-gap-spec`'s Slice 1 (test-environment
  foundation) or Slice 2 (server-mode DOM coverage).** This spec depends on and reuses that work;
  it does not duplicate it.
- **Resolving `handoff-minion-hub-2249203609`** (the sibling duplicate-flagged proposal) —
  linked for context only; a human/the resolver disposes of that artifact, not this spec.
- **Any other `DataTable.svelte` consumer's own component tests.**
- **Editing `@minion-stack/ui`'s `Button.svelte` source** or any other shared-package change.
- **Any `DataTable.svelte` behavior change.** Scope is strictly comment deletion (Slice 1) plus,
  only if triggered, one additive co-located test file.
- **Manual edits to spec/proposal frontmatter or any `index.json`.** Reconciliation of the two
  marker findings remains the maintenance sweep/resolver's responsibility after the code lands.

## 5. End-to-end verification

```bash
cd minion_hub
BASE_SHA=<sha-before-this-spec>
FILE=src/lib/components/data-table/DataTable.svelte
TEST_FILE= # blank for pre-existing coverage; otherwise the one co-located test path
! rg -n "TODO\(handoff\): no DOM-mount test covers this block" "$FILE"
test "$(git diff --numstat "$BASE_SHA"..HEAD -- "$FILE" | awk '{print $1, $2, $3}')" = \
  "0 1 $FILE"
EXPECTED_PATHS=$(printf '%s\n' "$FILE" ${TEST_FILE:+"$TEST_FILE"} | sed '/^$/d' | sort)
ACTUAL_PATHS=$(git diff --name-only "$BASE_SHA"..HEAD | sort)
test "$ACTUAL_PATHS" = "$EXPECTED_PATHS"
bun run check
bun run vitest run src/lib/components/data-table
bun run vitest run
```

**Ship gate:** §5 all green; DELTA #1-3 each individually proven by its listed test/evidence; the
proposal's DoD ("the marker is removed, or intentionally left with an updated rationale") is
satisfied by the marker's deletion in Slice 1; no edit outside `minion_hub` unless explicitly
escalated per §3's `@minion-stack/ui` row.
