---
id: 2026-08-17-meta-spec-index-project-possibly-shipped
title: spec-index.mjs drops possibly_shipped/evidence/link_review — G0 amber chip never renders
status: review
created: 2026-08-17
updated: 2026-08-21
spawned_spec: 2026-08-18-meta-spec-index-project-possibly-shipped-spec
repos: [minion-meta]
duplicate_candidate: 2026-08-17-base-kanban-possibly-shipped-surface
tags: [logic]
source: human
source_trust: human
risk_class: low
priority: medium
owner: human
---

# spec-index.mjs drops possibly_shipped/evidence/link_review

Filed by the minion-factory dev agent fixing the G0 backward-staleness-reconciler
review (`factory/449b2bf2-gates-g0-backward-staleness-reco`), per a cross-provider
review finding. The G0 sweep (`agent/reconcile.sh` in minion-factory, spec `
2026-08-17-sdlc-phase-gates-scoring-spec.md` §3 G0) writes `possibly_shipped:` (plus
`evidence:` and `link_review:`) onto `specs/*.md` frontmatter for medium-confidence
shipment matches. The design says the board renders an amber "verify" chip for these
so a human can confirm with one click — but `scripts/spec-index.mjs` (this repo,
`dev` branch) only projects a fixed field list into `specs/index.json`:

```
id, title, stage, status, pass, created, updated, repos, revises, supersedes,
proposal, verdict, pr, type, tags
```

`possibly_shipped`, `evidence`, and `link_review` are absent. Since the
minion-base board reads only the generated `index.json` (not raw markdown), these
fields are invisible downstream no matter how correctly G0 sets them — the amber
chip in spec §7 (board slice, minion-base) has nothing to render.

**Definition of done:** `scripts/spec-index.mjs` projects `possibly_shipped`,
`evidence`, and `link_review` into `specs/index.json` (same `...(fm.x ? {x: fm.x} :
{})` pattern already used for `revises`/`supersedes`/`verdict`), and the
minion-base board (spec §7 in the same phase-gates spec) renders the amber
"verify" chip from `possibly_shipped` with a one-click confirm that clears it.

**Out of scope:** changing G0's write side (already correct, minion-factory); any
new board columns; scoring already-done specs.

## Reconciliation note 2026-08-17

Overlaps `2026-08-17-base-kanban-possibly-shipped-surface`: both target the same
end-to-end gap (G0's `possibly_shipped`/`evidence`/`link_review` invisible on the
minion-base board), but that proposal's "Out of scope" claims minion-meta "already
emit[s] and project[s] the three fields" — checked against `scripts/spec-index.mjs`
on this branch and that is not the case (only `id, title, stage, status, pass,
created, updated, repos, revises, supersedes, proposal, verdict, pr, type, tags`
are projected; `possibly_shipped`/`evidence`/`link_review` are still absent, matching
this proposal's own finding). That proposal's board-side DoD (SpecFile type fields,
one-click confirm/reject write-back mechanics via the existing PR/commit path) is
more detailed than this one's. Flagged rather than merged because picking a canonical
here means resolving that factual conflict, not just concatenating text — left for a
human to reconcile.

---

**Corrected gate record 2026-08-18:** The delegated decision was invalid. Verified
`minion-factory@a45b225b` does not emit `possibly_shipped`, `evidence`, or `link_review`, and
`minion-base` PR #13 is open rather than shipped; current base `main` (`ccc5db78`) contains no
consumer for `possibly_shipped` or `link_review`. The projector-only scope crossed its explicit
stop gate. This proposal returns to review and must be reordered behind an approved producer
contract and a merged (or atomic) consumer contract. It is not approved for implementation.

**Reconciliation update 2026-08-21:** frontmatter `status`/`merged_into` had not been synced to
this correction — reset to `status: review` (`duplicate_candidate` kept, pointing at
`2026-08-17-base-kanban-possibly-shipped-surface`, itself `in-spec` and off-limits to edit) to
match the gate record above.
