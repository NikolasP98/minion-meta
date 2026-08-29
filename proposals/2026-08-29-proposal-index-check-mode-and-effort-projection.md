---
id: 2026-08-29-proposal-index-check-mode-and-effort-projection
title: proposal-index.mjs — add a read-only --check mode and reconcile projection with the auto-triage index writer
status: draft
created: 2026-08-29
updated: 2026-08-29
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

1. **No read-only mode.** `scripts/spec-index.mjs:574` reads `--check` and compares without
   writing. `scripts/proposal-index.mjs` has no equivalent: it always reaches
   `writeFileSync('proposals/index.json', ...)`. Running it to verify the index therefore
   mutates the working tree. Observed on PR #281 (2026-08-29): a reviewer ran
   `node scripts/proposal-index.mjs --check`, the unknown flag was ignored, the file was
   rewritten, and the reviewer had to restore it by hand. **Still open** — this proposal
   remains the tracking artifact for it.

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

1. Add `const check = process.argv.includes('--check')` and branch before `writeFileSync`,
   mirroring `scripts/spec-index.mjs:574-...`. Test: run `--check` on a clean tree (exit 0,
   `git status --porcelain proposals/` empty), then on a hand-perturbed index (exit 1, still
   no write). **Still open.**
2. ~~Decide the `effort` question with whoever owns the auto-triage writer, then implement it in
   ONE place.~~ **Done** — the generator projects `effort` unconditionally when frontmatter
   declares it (`scripts/proposal-index.mjs`). Confirm separately whether the auto-triage
   writer's prepend-ordering still diverges from the generator's `b.id.localeCompare(a.id)`
   sort; if so, decide with whoever owns that writer which side changes.
3. Extend `scripts/spec-index.test.mjs`'s sibling coverage (or a new
   `scripts/proposal-index.test.mjs`) with both cases above. `scripts/proposal-index.test.mjs`
   now exists and covers the `effort` projection (item 2); it does not yet cover `--check`
   (item 1, still open).

## Out of scope

- Changing the board's rendering of `effort`/`value`.
- Backfilling `effort` into the index by hand.
- Any change to `scripts/spec-index.mjs`.

## Definition of done

`--check` verifies without writing (proved by a test that fails if the write returns), and a
regeneration run straight after an auto-triage index commit produces an empty diff. The
`effort`-projection half of this is done; `--check` is not.

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

**Update (review-fix-6f292604, round 2):** that removal also took the row-ordering half of the
marker with it, leaving the ordering open end tracked in prose only. Both still-open ends now
carry a marker at their exact site in `scripts/proposal-index.mjs`: ordering above the
`proposals.sort(...)` call, `--check` above the `writeFileSync(...)` call. No functional
change to ordering was made in this review-fix branch; this proposal stays `draft`.
