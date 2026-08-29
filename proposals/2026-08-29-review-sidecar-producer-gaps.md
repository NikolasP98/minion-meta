---
id: 2026-08-29-review-sidecar-producer-gaps
title: Close the producer-side gaps the review-sidecar contract now exposes
status: draft
created: 2026-08-29
updated: 2026-08-29
repos: [minion-factory, minion-base, minion-meta]
tags: [infra, docs]
value: 6
effort: M
source: 2026-08-17-sdlc-phase-gates-scoring-spec
---

# Close the producer-side gaps the review-sidecar contract now exposes

## Problem

`2026-08-17-sdlc-phase-gates-scoring-spec` §4 defines one sidecar format for every phase gate.
minion-meta now validates that format (`scripts/review-sidecar.mjs`) and publishes it as the
`review` object on each `specs/index.json` / `proposals/index.json` entry, so the board finally
has a score to render a chip from.

Standing up the consumer made four producer-side holes visible. None of them are regressions —
they were invisible before because nothing checked. Each is written down here because the
consumer is now live and silently tolerates them.

## AS-IS

1. **`reviewed_commit` has no writer.** §4 lists it; the shipped G2 pass-2 reviewer emits
   `spec`, `pass`, `verdict`, `reviewer`, `created` and four `score_*` axes, and nothing else.
   Every published score is therefore untraceable to the revision it judged — a score can be
   stale by 40 commits and look identical to a fresh one. `scripts/review-sidecar.mjs` pins the
   field's shape (7–40 hex) but cannot require what nobody writes.
2. **No G1 producer exists.** Slice 3 of the governing spec owns the proposal scorer. Until it
   lands, `proposals/*.review.md` is an empty namespace, and the G1 axes in `SCORE_AXES`
   (`problem_clarity`, `value`, `dedupe`) are transcribed from the spec's §3 prose rather than
   from a live writer. A G1 scorer that picks different key names will fail meta CI with the
   registry printed — deliberately fail-closed, but it is a handoff cost, not a free lunch.
3. **Sidecars are optional, so "ungated" and "gated and fine" look the same.** 129 of 198 specs
   have no sidecar at all. The index can say "this spec scored 8.8"; it cannot say "this spec was
   never scored and was promoted anyway". Answering that is §2 principle 3 (gates disable the
   board's promote button) — minion-base Slice 7, not a meta-side check.
4. **`proposals/index.json` has no projection-coverage contract.** `spec-index.mjs` has
   `assertProjectionCoverage()`, which is why its dropped fields got caught;
   `proposal-index.mjs` has nothing equivalent, which is how `effort` sat in 40 proposals'
   frontmatter while every regeneration deleted it from the artifact (fixed 2026-08-29, but the
   class is still open). Relatedly, `value` is written in two vocabularies — a 1–10 integer in
   40 files and `high`/`medium` in 16 — and neither is validated.

## TO-BE

- The G2 reviewer writes `reviewed_commit` with the sha it actually read; the board can show
  "scored N commits ago" and G0 can treat a score older than its subject as absent.
- The G1 scorer writes `proposals/<id>.review.md` against the axis registry, or amends the
  registry in the same change.
- The board refuses to promote an unscored artifact past G1/G2 (or records an override reason),
  which is what makes the optional sidecar safe.
- `proposal-index.mjs` gains the same projection-coverage assertion as `spec-index.mjs`, and
  `value` settles on one vocabulary.

## Out of scope

The meta-side consumer itself — schema, validation, and the `review` projection — is done. This
proposal is only the producer/board work it depends on, and item 4 (a meta-side hardening pass
that is a separate slice from the sidecar contract).

## Definition of done

- `specs/*.review.md` written after the change all carry a `reviewed_commit` that resolves in the
  target repo.
- At least one `proposals/<id>.review.md` exists and `node scripts/proposal-index.mjs` publishes
  its `review.score`/`gate`/`chip`.
- `node scripts/proposal-index.mjs` fails when a projected field is not declared, proven by a
  fixture in `scripts/`.
- Promoting an unscored spec past G2 on the board either blocks or records an override reason.
