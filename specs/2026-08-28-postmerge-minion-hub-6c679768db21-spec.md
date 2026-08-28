---
id: 2026-08-28-postmerge-minion-hub-6c679768db21-spec
title: "Post-merge finding — DataTable.svelte TODO(handoff) marker (minion_hub) — close the residual comment gap the approved S4 test-gap spec deliberately leaves behind"
stage: spec
status: draft
pass: 1
created: 2026-08-28
updated: 2026-08-28
proposal: postmerge-minion-hub-6c679768db21
verdict: pending
repos: [minion_hub]
type: fix
tags: [test, infra]
relationship: extends
related: [2026-08-21-hub-datatable-server-mode-test-gap-spec, 2026-08-20-hub-datatable-server-mode-test-gap, handoff-minion-hub-2249203609]
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
  `verdict: approved`, **not yet implemented** per `specs/index.json` as of 2026-08-28) already
  fully scopes closing the underlying reason this marker exists: `DataTable.svelte` has zero
  DOM-mount test coverage anywhere, `@testing-library/svelte` has never been wired up in
  `minion_hub`, and its Slice 1 (test-environment foundation) + Slice 2 (server-mode DOM
  coverage) together add exactly the missing test class the marker names. This is not new scope
  duplicated by this spec — it is a dependency this spec builds on.
- **Critical asymmetry that makes this `extends` and not `already-satisfied`:** that spec's own
  §3 TO-BE states an explicit invariant — *"No production `.svelte` source changes in this
  spec"* — and its Slice 2 machine-checkable DoD gates on
  `test -z "$(git diff --name-only <sha>..HEAD -- '*.svelte')"`. Implementing that spec adds the
  DOM tests but by design **never touches `DataTable.svelte` itself**, so the literal
  `TODO(handoff)` comment token stays in the file even after that spec ships. This proposal's DoD
  — the marker is *removed or intentionally left with an updated rationale* — is a one-line
  production-file edit that spec explicitly declines to make. That residual gap is this spec's
  entire scope (§4 DELTA #2).
- **`2026-08-20-hub-datatable-server-mode-test-gap`** (the proposal that spawned the spec above,
  `status: in-spec`) — linked for provenance; the spec is the operative artifact.
- **`handoff-minion-hub-2249203609`** (`status: review`, created 2026-08-22) — an independent,
  earlier discovery of a handoff marker in this same file, already flagged by the triage process
  with `duplicate_candidate: 2026-08-20-hub-datatable-server-mode-test-gap`. This is the second
  confirmation (this proposal is the third) that DataTable.svelte's untested-DOM-mount gap keeps
  resurfacing via independent discovery passes because the closing spec has not shipped yet — not
  because the finding is wrong. Not folded further than `related`: that proposal is still open
  and outside this spec's authority to close.

A repo-wide check of `specs/index.json` and `proposals/index.json` for `DataTable`,
`TODO(handoff)`, and `data-table` found no spec other than `2026-08-21-hub-datatable-server-mode-test-gap-spec`
targeting this file's test coverage, and no spec at all targeting removal of the literal comment
token. Not `conflicts-with`: nothing else plans to edit this line. Not `merges-drafts`: there is
only one open draft-class artifact (the `review`-status duplicate handoff), and this spec does
not have authority to merge it.

## 2. AS-IS → TO-BE → DELTA

### AS-IS (verified / carried, with anchors)

- `src/lib/components/data-table/DataTable.svelte` in `minion_hub@eb4deae` (merged PR #158,
  branch `master`) contains the literal comment `TODO(handoff): no DOM-mount test covers this
  block. @testing-library/svelte` (proposal-quoted; this meta-repo checkout does not include
  `minion_hub`, so the exact line number and enclosing code block are **not independently
  verified here** — Slice 0 turns this into fact on the live branch, same limitation the
  referenced spec's own §2 documents and resolves the same way).
- `2026-08-21-hub-datatable-server-mode-test-gap-spec` §2 (Verified AS-IS, read in full this
  session) independently establishes, for the same file: zero existing DOM-mount tests anywhere
  in `minion_hub` for `DataTable.svelte`; `@testing-library/svelte` installed but with no working
  usage in the repo; a `happy-dom` crash on `@minion-stack/ui`'s `Button.svelte`; and
  `rowVirt`/row-body rendering gated on `browser === true`, which the test suite's stub hardcodes
  to `false`. That spec's Slice 1 + Slice 2 close all of this — but, per §1 above, without editing
  `DataTable.svelte`.
- That spec is `status: approved` / `stage: spec` — approved to build, not yet built. Nothing in
  the current artifact graph has removed or updated the marker.

### TO-BE (target behavior + invariants)

- Invariant: this spec does not re-derive, re-scope, or duplicate any part of
  `2026-08-21-hub-datatable-server-mode-test-gap-spec`'s Slice 1 (test-environment foundation) or
  Slice 2 (DOM coverage). If that spec is still unimplemented when this spec's Slice 1 starts,
  the implementer confirms its current `specs/index.json` status first rather than re-deriving
  its infra fixes from scratch (same coordination discipline that spec's own §5 Alert A2 already
  documents for a different adjacent spec).
  Invariant: DataTable.svelte's shipped behavior (client mode and server mode) is byte-identical
  before and after this spec — the only change in scope is deletion/rewrite of one comment.
- Target: the literal `TODO(handoff): no DOM-mount test covers this block.
  @testing-library/svelte` string is no longer present in `DataTable.svelte`, replaced by nothing
  (clean deletion) once the block it flags has real DOM-mount coverage, or, if recon finds the
  marker's block sits outside `2026-08-21-hub-datatable-server-mode-test-gap-spec`'s Slice 2
  scope, by an added targeted DOM test for that exact block using that spec's already-established
  test-environment foundation, followed by the same deletion.

### DELTA

| # | Transition | Slice | Proof |
|---|---|---|---|
| 1 | Marker's exact file location, enclosing block, and whether that block falls inside `2026-08-21-hub-datatable-server-mode-test-gap-spec` §Slice 2's DOM-coverage scope are confirmed on the live branch | Slice 0 | recon output committed to the implementation PR description |
| 2 | Once DOM-mount coverage for the flagged block exists (via the referenced spec, already-shipped or landed in this same PR), the marker comment is deleted from `DataTable.svelte` in a standalone, test-behavior-neutral edit | Slice 1 | `rg` for the marker string returns no match; `git diff` for this PR touches only the comment line(s) in `DataTable.svelte`; full hub test suite and `bun run check` stay green |
| 3 (contingent) | If recon finds the marker's block is genuinely outside the referenced spec's Slice 2 scope, a targeted DOM-mount test is added for that specific block, using the referenced spec's test-environment foundation as a dependency, before the marker is deleted | Slice 2 (only if triggered by Slice 0) | new DOM test green; same deletion proof as row above |

### Slice 0 — Recon (≤ 30 min, prepend to Slice 1; not counted as a slice)

**Topics:** `test`, `infra`

```bash
cd minion_hub
git log --oneline -1 -- src/lib/components/data-table/DataTable.svelte
rg -n "TODO\(handoff\): no DOM-mount test covers this block" src/lib/components/data-table/DataTable.svelte
# record the enclosing markup block (which prop/branch it sits inside) in the PR description
```

From the meta-repo root, reconfirm the dependency spec's current status before proceeding (it may
have shipped between this spec's authoring and its implementation):

```bash
grep -A3 '"id": "2026-08-21-hub-datatable-server-mode-test-gap-spec"' specs/index.json
```

- If that spec's `status` is `done`/`shipped`/`merged`: the referenced-block DOM coverage should
  already exist — run `bun run vitest run src/lib/components/data-table` in `minion_hub` and
  confirm real DOM-mount cases (not just logic-level assertions) cover the marker's block before
  proceeding to Slice 1.
- If that spec is still `approved`/`implementing`: check whether it is concurrently in flight. If
  yes, coordinate (do not duplicate its Slice 1/2 PRs) and sequence this spec's Slice 1 after it
  merges. If no active run exists and closing this proposal cannot wait, escalate — implementing
  that spec's full infra foundation is out of this spec's estimate and repo-impact scope (§3).

If the recon block does not match either §Slice 2's server-mode scope (search/sort/filter/page)
or a virtualization-only path, stop and update this spec's DELTA row 3 trigger condition before
implementing — do not silently assume coverage.

---

### Slice 1 — remove the marker once its block has DOM-mount coverage

**Topics:** `test`, `infra`

**Goal:** the literal `TODO(handoff)` comment is gone from `DataTable.svelte`, with the removal
proven test-behavior-neutral.

**Do:**
- Confirm (via Slice 0's recon) that the flagged block now has real DOM-mount test coverage —
  either because `2026-08-21-hub-datatable-server-mode-test-gap-spec` already shipped it, or
  because it lands in the same implementation window as this slice (coordinate per Slice 0).
- Delete the `TODO(handoff)` comment line(s) from `DataTable.svelte`. No other line in the file
  changes.
- Run the full hub check/test suite to confirm the deletion is behavior-neutral.

**Files:** `src/lib/components/data-table/DataTable.svelte` (comment-only edit).

**Definition of done (machine-checkable):**
```bash
cd minion_hub
rg -n "TODO\(handoff\): no DOM-mount test covers this block" src/lib/components/data-table/DataTable.svelte
# expect: no match (exit 1)
git diff --name-only -- src/lib/components/data-table/DataTable.svelte
# expect: exactly this one file, and `git diff -- <file>` shows only comment-line removal
bun run vitest run src/lib/components/data-table
bun run check
```
**Estimate:** 1–2 h (comment-only edit gated on a dependency, not new implementation work — sized
below the repo's usual 4–8h convention because the substantive work belongs to the referenced
spec; see AGENTS.md SDLC contract note on not treating a dependent closure as undersized scope
creep).

---

### Slice 2 — contingent: targeted DOM test if the marker's block is out of the referenced spec's scope

**Topics:** `test`, `ui`

**Only executes if Slice 0's recon finds the marker's block is not covered by
`2026-08-21-hub-datatable-server-mode-test-gap-spec` §Slice 2** (e.g., it flags a different
render branch than the server-mode search/sort/filter/page path that spec targets).

**Goal:** add the one missing DOM-mount test case for that specific block, reusing the referenced
spec's test-environment foundation (Slice 1 there: happy-dom/testing-library setup, the
file-local `browser` override) as a dependency — this slice does not re-derive that foundation.

**Do:**
- Add a DOM-mount test case for the exact block the marker flags, following the same
  accessible-selector, real-DOM-assertion pattern as the referenced spec's Slice 2.
- Do not edit any other `DataTable.svelte` behavior.
- Proceed to Slice 1's deletion once this test is green.

**Files:** co-located `DataTable` test file only.

**Definition of done (machine-checkable):**
```bash
cd minion_hub
bun run vitest run src/lib/components/data-table
bun run check
test -z "$(git diff --name-only <sha-before-slice2>..HEAD -- '*.svelte')"
```
**Estimate:** 4–6 h.

## 3. Cross-repo impact assessment

Per AGENTS.md's "Cross-Project Impact Zones," this is a `minion_hub`-local, test-and-comment-only
change with no DB schema, gateway/WS protocol, or shared-package edit.

| Surface | Impact | Mitigation |
|---|---|---|
| `minion_site`, `paperclip-minion`, `pixel-agents`, `minion_plugins` | None — none consume `DataTable.svelte` or hub's test tooling | — |
| `@minion-stack/shared` / gateway WS protocol | None — no frame types touched | — |
| `@minion-stack/ui` (`packages/ui`, minion-meta) | None planned — Slice 1 only deletes a comment; Slice 2 (contingent) adds a test, not a `Button.svelte` edit. If Slice 0 or Slice 2 surfaces a need to edit `@minion-stack/ui` itself, that is `2026-08-21-hub-datatable-server-mode-test-gap-spec`'s Alert A1 territory (a separate minion-meta release-cycle spec), not this spec's scope | Stop and escalate rather than absorb a shared-package edit here |
| UI design governance (hub) | N/A — no markup, styling, token, or component-visual change; Slice 2 (if triggered) only adds a test file | — |
| `2026-08-21-hub-datatable-server-mode-test-gap-spec` (same repo) | **Direct dependency** — Slice 1 here cannot land the deletion credibly until that spec's coverage exists for the flagged block | Slice 0 recon gates on that spec's live status before any edit |

## 4. Out of scope (explicit)

- **Re-implementing `2026-08-21-hub-datatable-server-mode-test-gap-spec`'s Slice 1 (test-environment
  foundation) or Slice 2 (server-mode DOM coverage).** This spec depends on and reuses that work;
  it does not duplicate it.
- **Resolving `handoff-minion-hub-2249203609`** (the sibling duplicate-flagged proposal) —
  linked for context only; a human/the resolver disposes of that artifact, not this spec.
- **Any other `DataTable.svelte` consumer's own component tests.**
- **Editing `@minion-stack/ui`'s `Button.svelte` source** or any other shared-package change.
- **Any `DataTable.svelte` behavior change.** Scope is strictly comment deletion (Slice 1) plus,
  only if triggered, one additive test file (Slice 2).

## 5. End-to-end verification

```bash
cd minion_hub
rg -n "TODO\(handoff\): no DOM-mount test covers this block" src/lib/components/data-table/DataTable.svelte
# expect: no match
bun run vitest run src/lib/components/data-table
bun run vitest run
# no new failures or unexplained skips vs pre-change baseline
bun run check
git diff --name-only <sha-before-this-spec's-first-commit>..HEAD
# expect: DataTable.svelte (comment-only) +, only if Slice 2 triggered, the co-located test file
```

**Ship gate:** §5 all green; DELTA #1-3 each individually proven by its listed test/evidence; the
proposal's DoD ("the marker is removed, or intentionally left with an updated rationale") is
satisfied by the marker's deletion in Slice 1; no edit outside `minion_hub` unless explicitly
escalated per §3's `@minion-stack/ui` row.
