---
id: 2026-08-18-factory-g0-ci-watch-auto-close
title: G0 reconciler should auto-close CI-watch proposals once the watched workflow goes green
status: draft
created: 2026-08-18
updated: 2026-08-18
repos: [minion-factory]
source: factory-run-8af03178
---

# G0 reconciler should auto-close CI-watch proposals once the watched workflow goes green

`2026-08-17-sdlc-phase-gates-scoring-spec.md` §3 G0 (Slice 1) bundles three things under
one slice: the spec-sweep (walk active specs, flip frontmatter on shipped evidence —
already built in minion-factory per `factory/449b2bf2-gates-g0-backward-staleness-reco`
and the review finding it produced, `2026-08-17-meta-spec-index-project-possibly-shipped.md`),
link hygiene (shipped in minion-meta — see this run, `factory/8af03178`,
`scripts/spec-index.mjs`'s `checkLinkHygiene`), and **CI-watch proposal auto-close**:

> Source hygiene (small, do with G0): ... CI-watch proposals auto-close when the watched
> workflow goes green again (reconciler checks).

This run (`8af03178`) was dispatched against the `minion-meta` checkout only (per its
harness contract) and could not verify or implement the third piece — it lives in
minion-factory's `agent/reconcile.sh`, a repo not checked out in this run's sandbox.

**Problem:** CI-watch files a proposal (e.g. `proposals/ci-minion-meta-claude-code-review.md`)
the first time a fleet workflow's latest completed run on its deploy branch fails. Nothing
currently reconciles these back to `closed`/`rejected` once the underlying workflow is
green again — they stay open indefinitely even after the human (or an unrelated commit)
fixes the red, becoming exactly the kind of stale board noise G0 exists to kill.

**Definition of done:** during the reconcile sweep, for every open CI-watch proposal
(`source` field or filename prefix identifies it), re-check the watched workflow's latest
completed run on its deploy branch; if green, set `status: closed` with a short reason
("workflow green again as of <date>, run <url>") and regenerate `proposals/index.json`.
Cadence matches the existing sweep (post-merge + daily).

**Out of scope:** the spec-sweep and link-hygiene pieces (already shipped, see above);
upstream-monitor noise thresholds (separate slice, `2026-08-17-sdlc-phase-gates-scoring-spec.md`
§5 slice 6, `minion` repo).
