---
spec: 2026-08-26-spec-heading-lint-baseline-backfill-spec
pass: 2
verdict: changes_requested
reviewer: factory-review
created: 2026-08-26
score_slice_size: 3
score_dod_verifiability: 7
score_scope_containment: 9
score_impact_zones: 9
---

# Pass-2 correctness review

## Changes made

- Set the reviewed spec to `pass: 2` and `verdict: changes_requested` because the five heading
  batches do not credibly fit the stated 4–8-hour convention.
- Replaced the 22–26-file batching plan in §5C with thirteen frozen contiguous ranges of at most ten
  specs, preserving all 126 ids and the sequential execution constraint.
- Added an explicit readiness blocker above the slice definitions so the unchanged S5–S9 text
  cannot be mistaken for an implementable plan while its DELTA rows, slice numbering, ordering,
  and baseline-count DoDs still describe the oversized five-batch layout.
- Clarified that sequential batches contend on the shared heading-baseline file as well as possibly
  `specs/index.json`; disjoint spec bodies alone do not make them safe to run concurrently.
- Added the factory-nomenclature proposal to S2 and S3 files/DoDs because §8 already requires those
  proposal alerts, but the slice contracts previously omitted the write.
- Made a partially completed heading range explicitly fail its DoD; the earlier text simultaneously
  required zero range ids remaining and allowed unresolved ids in the PR body.
- Identified S4 as the sole lifecycle-field exception in Out of scope, resolving the contradiction
  between the blanket lifecycle prohibition and S4's required `superseded` → `retired` disposition.

## Human/author action required

The author must replace D6–D10 and S5–S9 with thirteen transitions/slices matching this exact split,
then renumber the cleanup slice and update §7/§9 references and cumulative baseline counts:

| Batch | Count | First id | Last id (inclusive) |
|---|---:|---|---|
| B1 | 10 | `2026-04-19-minion-meta-repo-design` | `2026-05-22-document-ingestion` |
| B2 | 10 | `2026-05-22-gateway-turn-recovery` | `2026-05-26-auth-token-simplification` |
| B3 | 10 | `2026-05-27-gateway-dx-simplification` | `2026-06-13-plugin-sdk-recon-and-improvement-report` |
| B4 | 10 | `2026-06-14-plugin-ui-cdn-caching-design` | `2026-07-02-hub-erp-agent-native-audit` |
| B5 | 10 | `2026-07-04-meta-business-integration` | `2026-07-06-hub-tanstack-pacer` |
| B6 | 10 | `2026-07-06-hub-tanstack-query` | `2026-07-10-per-org-volume-tenancy` |
| B7 | 10 | `2026-07-11-fleet-update-orchestration` | `2026-07-13-hub-ui-coherence-audit` |
| B8 | 10 | `2026-07-13-hub-ui-coherence-execution-log` | `2026-07-17-hub-performance-optimization-plan` |
| B9 | 10 | `2026-07-17-ig-ad-attribution-spec` | `2026-07-20-whatsapp-sync-status-spec` |
| B10 | 10 | `2026-07-21-unified-brains-knowledge-architecture` | `2026-08-03-crm-relationship-graph-v2-port-spec` |
| B11 | 10 | `2026-08-07-projects-github-repos-and-factory-gates-spec` | `2026-08-18-base-kanban-possibly-shipped-surface-spec` |
| B12 | 10 | `2026-08-18-base-phase-aware-sorting-provenance` | `2026-08-18-factory-workitem-handoff-schema-spec` |
| B13 | 6 | `2026-08-18-minion-base-mobile-hitl-ux-plan` | `ws-duplication-audit` |

The split is required because each file needs content-preserving judgment, active specs need real
scope and verification language, the corpus median is 15 KB, and S5–S9 currently assign 22–26 files
to one 4–8-hour run. This also follows the slice-scoped-run constraint recorded in
`/memory/MINION/sdlc-board-triage-and-phase-gates.md:133` and avoids the meta push races recorded in
`/memory/MINION/minion-factory-agent-pipeline.md`. The spec-index fixture guidance remains consistent
with `/memory/MINION/factory/2026-08-19-d9da93ee.md`: malformed `--check` fixtures must commit a stale
index instead of invoking the validating generator first.

No product-scope decision is requested. Approval is blocked only until the mechanical slice rewrite
is completed and the resulting cumulative DoDs are internally consistent.
