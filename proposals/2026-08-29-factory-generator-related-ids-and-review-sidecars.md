---
id: 2026-08-29-factory-generator-related-ids-and-review-sidecars
title: "Teach the minion-factory spec generator the two new meta gate rules: `related` ids must resolve, and an in-place `pass` bump must refresh the review sidecar"
status: draft
created: 2026-08-29
updated: 2026-08-29
repos: [minion-factory]
tags: [infra, hygiene, test]
value: 3
effort: S
source: spec-2026-08-26-spec-heading-lint-baseline-backfill-spec
---

# Two new meta CI rules the factory spec generator does not yet satisfy

Filed by the spec run for `2026-08-26-spec-heading-lint-baseline-backfill-spec` (§8 of that
spec, "minion-factory (spec generator) — unavoidable, ALERT"). That spec adds two rules to
`node scripts/spec-index.mjs --check`, a **required** meta CI step
(`.github/workflows/ci.yml:55-58`). Both rules are correct, and both add a new way for a
*factory-generated* spec to red `dev` in minion-meta.

This proposal exists because the adjacent proposal that used to carry generator work,
`2026-08-20-factory-spec-heading-nomenclature`, is `status: done` — its board audit of
2026-08-28 recorded the `## 0. Product` DELTA as addressed. A completed proposal cannot own
new work, so appending these two failure modes to it would leave them with no active
lifecycle item. This is that item.

## AS-IS

**Evidenced (minion-meta corpus, measured 2026-08-29 on `minion-meta@dev`):**

1. The gate does not resolve `related` ids at all, and its own fixture encodes that
   permissiveness: `scripts/spec-index.test.mjs:665` writes `related: [some-other-spec]` — a
   deliberately dangling id — and asserts `--check` exits 0. Across the corpus there are 99
   `related` ids on 35 specs; 0 are unresolvable today, 22 resolve only against `proposals/`.
2. A spec's `pass` is bumped **in place on the same file** by the factory's review loop, and
   the `specs/<id>.review.md` sidecar is not always updated with it. Parsing all 69 pass>1
   sidecars found 2 whose `pass` lagged their spec's. One was the sidecar of the spec that
   filed this proposal: the spec read `pass: 3` / `approved` while its sidecar still read
   `pass: 2` / `changes_requested`. The other,
   `2026-08-18-base-attention-queue-responsive-runs-spec`, is at spec `pass: 5` / sidecar
   `pass: 2`. Structural sidecar validity was 69/69 — the failure mode is staleness, not
   absence.

**Inferred, not evidenced — confirm this first.** The cause above is stated as a corpus
observation. This run had no access to the minion-factory checkout, so *where* in the
generator/review pipeline the sidecar write is skipped, and whether the generator can emit an
unresolvable `related` id at all, are **hypotheses**. DELTA 1 is to confirm them against the
minion-factory source before any prompt or template is edited.

## TO-BE

A spec produced (or re-passed) by the factory pipeline passes `node scripts/spec-index.mjs
--check` in minion-meta unmodified, specifically:

- every id the generator writes into `related:` resolves against the union of `specs/` and
  `proposals/` in minion-meta at generation time — the generator emits no id it has not seen;
- every `pass` bump writes the sidecar in the same commit as the spec's frontmatter, so
  `specs/<id>.review.md` parses, its `spec:` equals the spec id, and its `pass`/`verdict`
  equal the spec's current `pass`/`verdict`.

Invariant that must not change: the sidecar keeps its per-pass history — the frontmatter is the
**current-pass roll-up** and each pass keeps its own `## Pass N — <verdict>` section (or, for a
pass whose record is genuinely unrecoverable, `## Pass N — record unavailable: <reason>`).
Refreshing the roll-up must not overwrite or delete earlier passes' recorded findings, and a pass
whose detail was never committed is named as such rather than reconstructed. This is a machine-
checked requirement, not a convention: `2026-08-26-spec-heading-lint-baseline-backfill-spec` S3
ships it as the Body clause of `node scripts/spec-index.mjs --check` — a sidecar with a current,
agreeing frontmatter but no section for the current pass fails the gate even though its frontmatter
alone is spotless.

## DELTA

1. **Confirm the two hypotheses in the minion-factory source**: find the code/prompt that emits
   `related:` and the code that bumps `pass`, and record whether each can produce the failure
   above. If either cannot, say so and drop that half.
   *Proves it:* the file/line anchors are quoted in this proposal's follow-up or in the spec
   that picks it up.
2. **Constrain `related:` emission** to ids the generator actually resolved against the target
   repo's `specs/` + `proposals/` trees (drop unresolved ids rather than guessing).
   *Proves it:* a generated spec containing a `related` id that does not exist no longer
   occurs; `--check` exits 0 on the generated spec unmodified.
3. **Make the `pass` bump and the sidecar write atomic** — one commit updates both the spec's
   `pass`/`verdict` and the sidecar's roll-up frontmatter, appending a `## Pass N — <verdict>`
   section for the new current pass rather than replacing the file.
   *Proves it:* after a factory re-pass, `sidecar.pass === spec.pass` and
   `sidecar.verdict === spec.verdict`, the prior pass's section is still present, and a `## Pass N`
   section exists for the new current pass (the Body clause — see TO-BE above).

The exact rule semantics and error text that the generator must satisfy are appended to this
proposal by slices S2 and S3 of
`2026-08-26-spec-heading-lint-baseline-backfill-spec` when those rules actually ship — the
wording here is the pre-implementation statement of intent, not the shipped contract.

## Out of scope

- **Any change to the two rules themselves.** They are owned by
  `2026-08-26-spec-heading-lint-baseline-backfill-spec` (§5A, §5B) and were each measured green
  on the minion-meta corpus the day they land. This proposal adapts the generator to them; it
  does not relax them.
- **The `## 0. Product` heading fix** — owned and closed by
  `2026-08-20-factory-spec-heading-nomenclature` (DELTA 2, recorded addressed in its
  2026-08-28 board audit). Named here only so the two are not confused.
- **Repairing the existing stale sidecar** in minion-meta
  (`2026-08-18-base-attention-queue-responsive-runs-spec`) — that repair is S3 of the spec
  above, in minion-meta, and is a precondition of the rule landing there.
- **Proposal-side link integrity** (`spawned_spec`, `merged_into`, `duplicate_candidate`) and a
  `--check` mode for `scripts/proposal-index.mjs` — also parked by that spec's §10.

## Definition of done

A spec generated by the factory pipeline, and a spec re-passed by it, both pass
`node scripts/spec-index.mjs --check` in minion-meta with no hand-editing, on a `dev` that has
S2 and S3 of `2026-08-26-spec-heading-lint-baseline-backfill-spec` merged. Until those slices
merge, the rules are not live and this proposal cannot be verified end to end — so it should be
scheduled after them, not before.
