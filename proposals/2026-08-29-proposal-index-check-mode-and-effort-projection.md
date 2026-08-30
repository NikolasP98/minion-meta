---
id: 2026-08-29-proposal-index-check-mode-and-effort-projection
title: proposal-index.mjs — add a read-only --check mode and reconcile projection with the auto-triage index writer
status: review
created: 2026-08-29
updated: 2026-08-30
repos: [minion-meta]
tags: [infra, test]
source: review-fix-6f292604
---

# proposal-index.mjs — read-only `--check` mode and projection parity

## Problem in the user's words

Agent-authored summary, not a user quotation: PR #281's 2026-08-29T17:06:55Z reviewer-integrity
note reports that running `proposal-index.mjs --check` for verification purposes silently
ignored the unknown flag, rewrote `proposals/index.json` anyway, and required the reviewer to
restore the file by hand. That review comment is the evidence for this proposal, not something
the user said.

## AS-IS (current observable behavior)

Two divergences between `scripts/proposal-index.mjs` and the out-of-band auto-triage writer
that maintains the same file:

1. **Read-only mode — fixed in the consolidated release.** `scripts/proposal-index.mjs`
   now recognizes `--check`, compares the generated projection with the committed index,
   exits non-zero on drift, and does not write. Focused tests cover both matching and drifted
   indexes.

2. **Field drift — fixed in review-fix-6f292604.** `proposals/index.json` at `6548c40` carried
   `"effort": "S"` on `2026-08-29-hub-pos-bookings-stock-gate-drift`, but the generator
   projected `id, title, status, created, updated, repos, merged_into, possibly_reopens,
   duplicate_candidate, spawned_spec, tags, value, source` — no `effort` — so the first
   mandated regeneration after any proposal edit dropped it. The generator now also projects
   `effort` (`scripts/proposal-index.mjs`'s proposal-object literal), covered by
   `scripts/proposal-index.test.mjs`, and the current `proposals/index.json` carries `effort`
   for all 40 declaring files. **Row ordering still diverges.** Before this branch regenerated,
   `proposals/index.json` led with the newest dated id (`2026-08-29-hub-pos-bookings-stock-gate-drift`
   at `6548c40`); the generator's `b.id.localeCompare(a.id)` sort leads with the `postmerge-*`
   ids instead, so the regeneration reordered the whole file. The auto-triage writer's exact
   insertion rule was not investigated and neither order has been declared canonical —
   `TODO(handoff)` sits at the sort site; see DELTA item 2 below.

## TO-BE (desired observable behavior)

- `node scripts/proposal-index.mjs --check` exits 0 when `proposals/index.json` matches the
  frontmatter projection and exits 1 with a diff-style message otherwise, writing nothing —
  same contract the file header already claims ("Same contract as spec-index.mjs").
- ~~One writer owns the projection: either the generator projects `effort`... or the auto-triage
  writer stops emitting it~~ — done: the generator now projects `effort` and is canonical.
  Remaining: confirm the auto-triage writer's insertion order matches the generator's sort, so
  a regeneration immediately after an auto-triage commit is a no-op end to end.

**Invariant that must not change:** the committed `proposals/index.json` stays the board's
read surface, and invalid frontmatter still exits 1.

## DELTA (exact transitions)

1. ~~Add `const check = process.argv.includes('--check')` and branch before
   `writeFileSync`, mirroring `scripts/spec-index.mjs`.~~ **Done** — matching and drifted
   index cases prove the command is read-only.
2. ~~Decide the `effort` question with whoever owns the auto-triage writer, then implement it in
   ONE place.~~ **Done** — the generator projects `effort` unconditionally when frontmatter
   declares it (`scripts/proposal-index.mjs`). Confirm separately whether the auto-triage
   writer edits proposal frontmatter and invokes the generator rather than mutating
   `proposals/index.json` directly, and whether its prepend-ordering still diverges from the
   generator's `b.id.localeCompare(a.id)` sort; if so, decide with whoever owns that writer which
   side changes. This preserves the distinct unresolved work formerly recorded in the removed
   duplicate `2026-08-29-proposal-index-auto-triage-drift` proposal.
3. ~~Extend the sibling coverage with both cases above.~~ **Done** in
   `scripts/proposal-index.test.mjs`.

## Out of scope

- Changing the board's rendering of `effort`/`value`.
- Backfilling `effort` into the index by hand.
- Any change to `scripts/spec-index.mjs`.

## Definition of done

`--check` verification and `effort` projection are complete. The remaining definition of done
is an auto-triage run that changes proposal frontmatter, regenerates the projection, and leaves an
immediate `proposal-index.mjs --check` green with no follow-up diff.

## Handoff note

This proposal is the required artifact for an open end left by factory run `6f292604`
(PR #281): that run's mandated `node scripts/proposal-index.mjs` regeneration dropped
`"effort": "S"` from the `2026-08-29-hub-pos-bookings-stock-gate-drift` projection and
reordered it. The generator is the documented canon, so the regenerated output was committed
as-is rather than hand-patched at the time.

**Update (review-fix-6f292604, round 1):** the `effort`-drop half of this handoff is now fixed
— `scripts/proposal-index.mjs` projects `effort`, `scripts/proposal-index.test.mjs` covers it,
and `proposals/index.json` was regenerated. The `TODO(handoff)` comment for the dropped-effort
site was removed from `scripts/proposal-index.mjs` since it no longer applies.

**Update (consolidated release, 2026-08-29):** read-only `--check`, its focused tests, effort
projection, and effort validation are complete. Only the out-of-band auto-triage ordering
contract remains open; its exact sort site retains the required `TODO(handoff)` marker.
