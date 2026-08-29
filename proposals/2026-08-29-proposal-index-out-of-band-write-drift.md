---
id: 2026-08-29-proposal-index-out-of-band-write-drift
title: Auto-triage writes proposals/index.json out-of-band, drifting from the proposal-index.mjs generator contract
status: draft
created: 2026-08-29
updated: 2026-08-29
repos: [minion-meta]
tags: [infra]
source: review-fix-df8a53d7
---

# Auto-triage writes proposals/index.json out-of-band, drifting from the proposal-index.mjs generator contract

## Problem

Discovered while adding a real `--check` mode to `scripts/proposal-index.mjs`
(review-fix run `df8a53d7`, fixing a harness-blocking finding where a reviewer
ran the previously-nonexistent `--check` flag and it silently rewrote
`proposals/index.json`).

**AS-IS:** Commit `6548c40` ("index: 2026-08-29-hub-pos-bookings-stock-gate-drift
→ approved [auto-triage]") hand-updated `proposals/index.json` in the same
run that flipped the proposal's frontmatter `status` (commit `8e68e33`),
instead of invoking `node scripts/proposal-index.mjs`. Evidence this bypassed
the generator: the committed entry for
`2026-08-29-hub-pos-bookings-stock-gate-drift` (a) sits first in the file,
violating the generator's `b.id.localeCompare(a.id)` descending sort (it
belongs among the other `2026-08-29-*` ids, well after `postmerge-*`), and
(b) carries an `"effort": "S"` key that `proposal-index.mjs` never projects
(that key is not in its whitelist, nor documented in `proposals/TEMPLATE.md`).
Running the real generator against the current tree reproduces exactly this
2-hunk diff — confirming the committed file is stale relative to its own
frontmatter sources, silently, because nothing gates it.

**TO-BE:** Whatever automation performs "auto-triage" status flips must either
shell out to `node scripts/proposal-index.mjs` after editing frontmatter, or
`proposals/index.json` must be covered by a wired `--check` CI/pre-merge gate
(mirroring `specs/index.json`'s `spec-index.mjs --check` step in
`.github/workflows/ci.yml`) so drift like this fails loudly instead of sitting
undetected. Separately, decide whether `effort` is a real schema field: if so,
add it to `proposal-index.mjs`'s projected fields and to
`proposals/TEMPLATE.md`'s frontmatter table; if not, stop writing it.

**DELTA:** No source change proposed here — this proposal only records the
finding for triage. Not fixed in the review-fix run that found it because
correcting `proposals/index.json` and/or the auto-triage automation (which
lives outside this repo, most likely in minion-factory) was out of scope for
that run's reviewed findings.

## Out of scope

- Reconciling the current one-entry drift in `proposals/index.json` (trivial
  by itself, but changing it wasn't part of the triggering review's findings).
- Locating/fixing the auto-triage automation's source, which is not in this
  repo.

## Definition of done

- `proposals/index.json` only ever changes via `node scripts/proposal-index.mjs`
  (enforced by CI, by the auto-triage tool, or both).
- `effort`'s status (real field vs accidental) is resolved in both the
  generator and `proposals/TEMPLATE.md`.
