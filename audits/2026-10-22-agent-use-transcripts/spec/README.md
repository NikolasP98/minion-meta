# SDD/Ponytail specification evidence

The [full specification](../../../specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md) has 32 implementation slices. The [canonical review sidecar](../../../specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.review.md) records two review passes, dispositions and technical approval. The owner subsequently authorized implementation (`stage: dev`, `status: implementing`); see the [implementation ledger](../implementation/README.md).

- [Interactive overview](../spec-overview.html): searchable/filterable slices, dependencies and acceptance contracts, using Minion New York tokens.
- [Acceptance matrix](slice-plan.json): generated directly from the final spec, including its SHA256 and complete D1-D8 mapping.
- `pass1-spec.txt` and `pass2-reviewed-spec.txt`: frozen review inputs. The initial approved snapshot changes only verdict metadata after unanimous technical approval. Later lifecycle/authorization prose is recorded separately in the sidecar.
- `pass1-*.md`, `pass2-*.md`: independent domain reviews, including initial findings and final dispositions.
- `scoped-validation.txt`: canonical spec/proposal generators and checks passed in a temporary one-spec corpus with canonical topic/parser/sidecar modules and the original Git comparison history.
- `*-index-preservation.txt`: only this task's own canonical entries added to shared indices. Existing rows and metadata preserved, including the already-dirty spec index.
- `full-corpus-final-check.txt`, `full-proposal-final-check.txt`: read-only whole-workspace gates still fail on unrelated pre-existing metadata/headings/topics and stale corpus projections. Scoped success is not a whole-repository pass.
- `contract-validation.txt`: all32 acceptance IDs, delta coverage and acyclic dependency checks passed.
- `overview-browser-checks.json`: filter6/expand6/search slice32; no horizontal overflow at final390px mobile and checked desktop. Initial780px screenshot viewed; resized screenshot capture stalled and was interrupted. No claim of comprehensive visual certification.

This directory preserves the design review and its original verification boundary. Product implementation and tests now have a separate [slice ledger](../implementation/state.json); the original source/probe counts are not implementation acceptance.

The standalone export contains its page content and scripts; linked source documents remain separate files. No Lavish feedback session was opened or left polling.
