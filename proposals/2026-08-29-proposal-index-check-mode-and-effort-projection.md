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

"Verifying the proposal index shouldn't change the proposal index, and regenerating it
shouldn't silently throw away triage data."

## AS-IS (current observable behavior)

Two divergences between `scripts/proposal-index.mjs` and the out-of-band auto-triage writer
that maintains the same file:

1. **No read-only mode.** `scripts/spec-index.mjs:574` reads `--check` and compares without
   writing. `scripts/proposal-index.mjs` has no equivalent: it always reaches
   `writeFileSync('proposals/index.json', ...)`. Running it to verify the index therefore
   mutates the working tree. Observed on PR #281 (2026-08-29): a reviewer ran
   `node scripts/proposal-index.mjs --check`, the unknown flag was ignored, the file was
   rewritten, and the reviewer had to restore it by hand.

2. **Field/order drift.** `proposals/index.json` at `6548c40` carries
   `"effort": "S"` on `2026-08-29-hub-pos-bookings-stock-gate-drift` and places that entry
   first. The generator projects `id, title, status, created, updated, repos, merged_into,
   possibly_reopens, duplicate_candidate, spawned_spec, tags, value, source` — no `effort` —
   and sorts `b.id.localeCompare(a.id)`, which puts `postmerge-*` ids above dated ids. So the
   first mandated regeneration after any proposal edit drops `effort` and moves the row.
   40 of 154 proposal files declare `effort:` in frontmatter; only 1 index entry carries it.

## TO-BE (desired observable behavior)

- `node scripts/proposal-index.mjs --check` exits 0 when `proposals/index.json` matches the
  frontmatter projection and exits 1 with a diff-style message otherwise, writing nothing —
  same contract the file header already claims ("Same contract as spec-index.mjs").
- One writer owns the projection: either the generator projects `effort` (making it canonical
  for all 40 declaring files) or the auto-triage writer stops emitting it and stops prepending
  rows. Either way, a regeneration immediately after an auto-triage commit is a no-op.

**Invariant that must not change:** the committed `proposals/index.json` stays the board's
read surface, and invalid frontmatter still exits 1.

## DELTA (exact transitions)

1. Add `const check = process.argv.includes('--check')` and branch before `writeFileSync`,
   mirroring `scripts/spec-index.mjs:574-...`. Test: run `--check` on a clean tree (exit 0,
   `git status --porcelain proposals/` empty), then on a hand-perturbed index (exit 1, still
   no write).
2. Decide the `effort` question with whoever owns the auto-triage writer, then implement it in
   ONE place. Test: `node scripts/proposal-index.mjs && git diff --exit-code proposals/index.json`
   is clean immediately after an auto-triage commit.
3. Extend `scripts/spec-index.test.mjs`'s sibling coverage (or a new
   `scripts/proposal-index.test.mjs`) with both cases above.

## Out of scope

- Changing the board's rendering of `effort`/`value`.
- Backfilling `effort` into the index by hand.
- Any change to `scripts/spec-index.mjs`.

## Definition of done

`--check` verifies without writing (proved by a test that fails if the write returns), and a
regeneration run straight after an auto-triage index commit produces an empty diff.

## Handoff note

This proposal is the required artifact for an open end left by factory run `6f292604`
(PR #281): that run's mandated `node scripts/proposal-index.mjs` regeneration dropped
`"effort": "S"` from the `2026-08-29-hub-pos-bookings-stock-gate-drift` projection and
reordered it. The generator is the documented canon, so the regenerated output was committed
as-is rather than hand-patched. Marked `TODO(handoff)` at both sites in
`scripts/proposal-index.mjs`.
