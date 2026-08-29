---
id: 2026-08-29-proposal-index-auto-triage-drift
title: "`proposals/index.json` on dev is not reproducible by its own generator — an external auto-triage writer edits it directly"
status: draft
created: 2026-08-29
updated: 2026-08-29
repos: [minion-meta]
tags: [infra, hygiene]
value: 2
effort: S
source: spec-2026-08-26-spec-heading-lint-baseline-backfill-spec
---

# The committed proposal index disagrees with `node scripts/proposal-index.mjs`

Found while regenerating `proposals/index.json` for the spec-gate-debt spec, which is required
to leave that file generator-clean (`git diff --exit-code` after the run).

## AS-IS (evidenced)

On `origin/dev` at `2c86617`, running `node scripts/proposal-index.mjs` produces a file that
differs from the committed one, with no proposal Markdown having changed:

- the `2026-08-29-hub-pos-bookings-stock-gate-drift` entry sits at index 0 instead of its
  sorted position (the generator sorts `b.id.localeCompare(a.id)`, which puts `postmerge-*`,
  `handoff-*` and `merge-scan-*` ids ahead of `2026-*`), shifting 79 entries by one slot;
- that entry carries an `"effort": "S"` key. `scripts/proposal-index.mjs:59-72` does not project
  `effort`; 41 proposal files declare `effort:` in frontmatter and exactly **1** index entry has
  it, so this key came from outside the generator.

The writer is commit `6548c40` (`index: 2026-08-29-hub-pos-bookings-stock-gate-drift → approved
[auto-triage]`), which touches `proposals/index.json` **only** — no proposal Markdown. Which
service produces those commits is **not established by this run** (the commit is authored by the
repo owner's identity and the tool lives outside minion-meta); identifying it is step 1 below.

Why it survives: `scripts/proposal-index.mjs` has no `--check` mode and no CI step, so nothing
detects a hand-written or externally-written proposal index — the gap already recorded in
`2026-08-26-spec-heading-lint-baseline-backfill-spec` §2.5 and §10.

## TO-BE

`node scripts/proposal-index.mjs` is idempotent on `dev`: running it on a clean tree leaves
`git diff --exit-code proposals/index.json` clean. The auto-triage flow reaches the same result
by editing the proposal's **frontmatter** and re-running the generator, so its writes survive the
next agent's regeneration instead of being silently reverted.

Invariant that must not change: the proposal Markdown stays the source of truth; the index stays
a pure projection of it (`I7` of the spec above).

## DELTA

1. **Identify the auto-triage writer** (which repo/service emits `[auto-triage]` index commits)
   and confirm it edits `index.json` directly.
   *Proves it:* the code path is quoted with a file/line anchor.
2. **Make it write frontmatter + run the generator** instead of the index. If `effort` is wanted
   on the board, add it to `proposal-index.mjs`'s projection so it comes from frontmatter — 40
   other proposals already declare it and would gain it for free.
   *Proves it:* a fresh auto-triage commit leaves the index generator-reproducible.
3. **Optionally close the detection gap**: `proposal-index.mjs --check` + a CI step, mirroring
   `spec-index.mjs`. That is already parked in the spec above's §10 as a separate item — file it
   there, not here, if it is wanted.

## Out of scope

- The `--check` mode and CI step themselves (§10 of
  `2026-08-26-spec-heading-lint-baseline-backfill-spec`).
- Any change to proposal statuses. This is about how the projection is written, not what it says.

## Definition of done

On `dev`, `node scripts/proposal-index.mjs && git diff --exit-code proposals/index.json` exits 0
on an otherwise clean tree, and it still does so after the next `[auto-triage]` commit lands.
