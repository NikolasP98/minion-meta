---
id: 2026-08-29-factory-intake-writers-emit-workitem-fields
title: Factory proposal writers must emit the required WorkItem fields (ci-watch, handoff-sweep, merge-scan, postmerge, auto-triage)
status: draft
created: 2026-08-29
updated: 2026-08-30
repos: [minion-factory]
tags: [infra, logic]
source: factory-run-48d75f6a
source_trust: trusted-automation
risk_class: high
priority: high
owner: factory
---

# Factory proposal writers must emit the required WorkItem fields

Open end left by spec
[`2026-08-18-factory-workitem-handoff-schema-spec`](../specs/2026-08-18-factory-workitem-handoff-schema-spec.md)
Slice 4 (minion-meta). Slice 4 makes `source`, `source_trust`, `risk_class`,
`priority` and `owner` required in every `proposals/*.md`, as the spec
requires ("`proposal-index.mjs` must reject missing/invalid values"). The spec
then updates exactly two writers: Slice 5 covers new **ci-watch** proposals and
Slice 6 covers **monitor** intake. Nothing in the spec covers the other
minion-factory writers that create proposal files directly.

## AS-IS (evidenced)

The current corpus proves which writers create proposals without the new
fields — each family exists on disk today and had to be classified by the
one-time retrofit's rule table (`scripts/proposal-workitem-retrofit.mjs`):

| Writer | Files it creates | Fields emitted today |
|---|---|---|
| CI watch | `proposals/ci-*.md` | none of the five (Slice 5 fixes this) |
| Handoff-ledger sweep | `proposals/handoff-<repo>-<n>.md` | none of the five |
| Merge-scan lane | `proposals/merge-scan-*.md` | none of the five |
| Post-merge discovery | `source: postmerge-discovery` | `source` only |
| Review-fix applier | `source: review-fix-<sha>` | `source` only |
| Auto-triage | edits `proposals/index.json` in place | n/a — see below |

As of this proposal, `node scripts/proposal-index.mjs` exits 1 on any proposal
missing the five fields, naming the file and field.

## TO-BE

Every minion-factory writer that creates or rewrites a proposal emits a
complete WorkItem, so the meta index regenerates cleanly without human repair:

- **handoff-sweep** → `source: handoff-sweep`, `source_trust: trusted-automation`, `owner: factory`, `priority: medium`, `risk_class` derived from the tags it already writes;
- **merge-scan** → same shape with `source: merge-scan`;
- **postmerge-discovery** and **review-fix-\*** → add the four missing fields alongside the `source` they already write;
- **auto-triage** → when it edits `proposals/index.json` in place it must carry the WorkItem fields through.

Invariant that must not change: risk is **derived** from tags, never declared
independently — a writer that hardcodes `risk_class: low` on `[infra]` work is
rejected by the meta validator by design.

## DELTA

1. One shared helper in the runner that stamps the five fields (mirroring
   `scripts/workitem.mjs`'s `classifyRisk`), used by every proposal writer.
2. Each writer above calls it; tests assert the emitted frontmatter validates.
3. Until then, `node scripts/proposal-workitem-retrofit.mjs` repairs an
   incomplete machine-written file in place (its rule table already knows every
   family listed above).

**Out of scope:** the ci-watch and monitor writers (spec slices 5 and 6 own
them), and any change to what the fields mean.

**Definition of done:** a fresh run of each writer produces a proposal that
`node scripts/proposal-index.mjs` accepts with no manual edit, and the meta
push that follows it stays green.
