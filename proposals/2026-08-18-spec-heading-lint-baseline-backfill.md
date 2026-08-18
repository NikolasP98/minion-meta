---
id: 2026-08-18-spec-heading-lint-baseline-backfill
title: Backfill required headings on 115 grandfathered specs; decide whether pass>1 without revises/supersedes should hard-block
status: draft
created: 2026-08-18
updated: 2026-08-18
repos: [minion-meta]
spawned_spec: 2026-08-17-maintenance-lane-monitors-spec
tags: [infra, hygiene]
source: factory-run-c6311188
---

# Backfill grandfathered spec headings + decide pass/revises presence policy

Filed while implementing slice 1 of `2026-08-17-maintenance-lane-monitors-spec.md`
§2 (validator hardening: `scripts/spec-index.mjs --check` as a meta CI gate). Two
scoping decisions were made to land the hardening without breaking CI on the
existing corpus; both are deliberate but leave real follow-up work:

## 1. Heading-lint baseline (115 specs)

`--check` now requires `## 0. Product`, an out-of-scope section, and a
verification section (per `specs/TEMPLATE.md`). 115 of the 155 existing specs
predate this convention and were grandfathered into
`scripts/spec-heading-lint-baseline.json` so CI doesn't go red on day one. Every
*new* or *hand-edited* spec is checked; the baseline is a one-way ratchet only
in the sense that nothing currently shrinks it automatically.

**Ask:** a sweep (agent or scripted) that reads each baselined spec, adds the
missing section(s) (can be a short "not applicable" stub for old design docs),
and removes the id from the baseline file once fixed — shrinking it toward
zero over time. Low urgency; do in batches, not one PR of 115 files.

## 2. `pass > 1` without `revises`/`supersedes` — not blocked

`2026-08-17-sdlc-phase-gates-scoring-spec.md` (row: "Pass-1/pass-2 spec pair
with no supersedes link either direction") already names this exact gap and
assigns the fix to the G0 reconciler ("auto-fixed or flagged"), not to
`spec-index.mjs`. Today 34 specs have `pass: 2` with neither field set — hard-blocking
on that in `--check` would fail CI immediately for all 34, so this hardening
pass left it unchecked (only *presence-implies-consistency* is checked: if
`revises`/`supersedes` *is* set, the target must exist and be consistent).

**Ask:** when G0 reconciler work (S-A/S-B of this spec, or the phase-gates
spec) lands, decide whether it should also *write* `revises`/`supersedes`
onto those 34 files (closing this proposal), or whether `--check` should gain
a `pass > 1` presence rule once the backlog is cleared. Don't add the rule to
`--check` before the backlog is cleared — it would just be red CI with no
signal.

## 3. Reverse-supersedes baseline (5 specs)

`--check` now requires every `status: superseded` spec to be named by some
other spec's `supersedes` field (bidirectional link integrity, closing the
one-way-link gap this proposal originally left open). Five specs were marked
`superseded` before that convention existed and have no successor anywhere in
the corpus, so they're grandfathered in `scripts/spec-supersede-baseline.json`
rather than failing CI:

- `2026-04-21-triage-executor-adapter-design` — Triage + Executor Adapter Architecture
- `2026-05-20-shells-golden-agents` — Shells — Golden Agents on exe.dev VMs
- `2026-06-15-plugin-distribution-cicd-design` — Plugin Distribution, Compatibility & CI/CD — Design Spec
- `2026-06-20-constructed-pipelines-voltagent-gaps` — Constructed Pipelines — Closing Minion's Dead-Ends (VoltAgent gap analysis)
- `2026-07-10-gateway-update-system` — Gateway Update System — Design Spec

All five were flipped to `superseded` on 2026-08-13 by out-of-band bookkeeping
(bulk status cleanup), not by a spec that names them via `supersedes` — so
there is no traceable successor to link back to.

**Ask:** for each id, find or write the spec that actually replaced it (check
`updated: 2026-08-13` sibling specs and commit history around that date first,
before writing a fresh successor) and add the missing `supersedes` link on
that successor's frontmatter. If a given spec was simply retired rather than
replaced by a successor, change its `status` from `superseded` to `retired`
(with a `retired_reason`, per the lifecycle-tools mandate `spec-index.mjs`
already enforces) instead of leaving it in this baseline. Remove each id from
`scripts/spec-supersede-baseline.json` as it's resolved — the file should
shrink to empty.

## Out of scope

Fixing the 115 files or the 34 files here — this proposal is the ledger entry,
not the fix.
