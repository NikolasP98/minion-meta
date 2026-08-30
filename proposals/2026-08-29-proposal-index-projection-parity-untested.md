---
id: 2026-08-29-proposal-index-projection-parity-untested
title: proposals/index.json silently drops frontmatter fields the projection forgets
status: draft
created: 2026-08-29
updated: 2026-08-29
repos: [minion-meta]
tags: [test, infra]
value: 2
effort: S
---

# `proposals/index.json` silently drops fields the projection forgets

## Problem

`scripts/proposal-index.mjs` rewrites the whole index from frontmatter, so any
field missing from its object literal is deleted from the board's view of every
proposal — with no error, no warning, and no diff anyone reads. It already
happened: `effort: S` on `2026-08-29-hub-pos-bookings-stock-gate-drift` was
published on `dev` (written there by auto-triage, which does not go through this
generator) and vanished the next time an unrelated branch added a proposal and
regenerated. Caught only by a PR reviewer diffing the index by hand.

`scripts/spec-index.mjs` cannot fail this way: `scripts/spec-index.test.mjs`
("M1: every validated frontmatter field is published to specs/index.json")
asserts validated↔published parity. `proposal-index.mjs` has no test file at all.

## AS-IS (evidenced 2026-08-29)

- Fix for `effort` landed on `factory/25dc3d65-approved-spec-autonomous-sdlc-tr`:
  it is now validated (`P_EFFORTS = ['S','M','L']`, fail-closed) and projected.
- The *class* is untouched. Nothing stops the next hand-written or auto-triage
  frontmatter key from being dropped on the next regeneration, and nothing
  detects it afterwards — the loss is invisible in the generator's own output.
- Two writers disagree about the file: this generator, and whatever auto-triage
  path wrote `effort` straight into the index on `dev`.

## TO-BE

A field that reaches `proposals/*.md` frontmatter either reaches the index or
fails the build. Regeneration is never a lossy transform that no one notices.

## DELTA

1. Add `scripts/proposal-index.test.mjs` with the spec-index M1 analogue: every
   key the generator validates must appear in the projection.
2. Add a drift check for the other direction — a key present in committed
   frontmatter but absent from the projection should fail (or at minimum warn
   with the file and key named), which is what would have caught `effort`.
3. Decide the second writer: either route auto-triage through this generator, or
   record that it may write index-only fields and teach the generator to preserve
   them. Two writers with different field sets is the underlying defect.

**Out of scope:** the board's consumption of `value`/`effort`; the proposal
lifecycle statuses; anything under `specs/`.

## Definition of done

- `node --test scripts/*.test.mjs` includes proposal-index cases and fails when a
  validated key is removed from the projection (verify by temporarily deleting
  the `effort` line — the suite must go red).
- Regenerating on a clean checkout of `dev` produces a byte-identical
  `proposals/index.json`, proving the generator and the committed file agree.
