---
spec: 2026-08-18-base-kanban-possibly-shipped-surface-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 review

- Set `status: approved`, `pass: 2`, and `verdict: approved` because all correctness issues were resolvable from the source proposal, current scripts, related specs, and operator memory without a human product decision.
- Retitled the spec to distinguish rendering all G0 warnings from acting specifically on `possibly_shipped` flags.
- Corrected the owner-surface description because minion-meta is the current checkout, while only minion-base and minion-factory are external.
- Expanded the spec and slice tags to include `docs` and `test`, matching the phase-gates spec's authoritative path-derived routing contract.
- Raised Slice 1 to a 4–6 hour estimate so it satisfies the governing 4–8 hour slice-size convention.
- Replaced the false body-wide grep claim with an anchored frontmatter check, since this spec's own prose contains the field names.
- Distinguished behavioral contract drift from harmless path/name drift during recon, so implementation stops only when the approved behavior would change.
- Removed unsupported assumptions that minion-base already has a reusable reason dialog and optimistic spec patch, requiring recon and a minimal governed fallback instead.
- Clarified that the existing GitHub-contents commit path satisfies the proposal's “PR/commit path” requirement even when no PR is created.
- Made `status` and `disposition` mutually exclusive and restricted dispositions to flagged specs, preventing an alternate arbitrary mark-shipped API.
- Added stale-request and link-review `409` behavior plus no-commit assertions, making invalid disposition outcomes verifiable.
- Preserved confirmed evidence by copying the `possibly_shipped` URL into `evidence` when absent instead of deleting all reconciliation metadata.
- Preserved `evidence` and `link_review` on reject, preventing a shipment judgment from erasing unrelated history or link-hygiene work.
- Separated `link_review` from shipment disposition semantics and blocked both dispositions while it remains, preventing confirm from hiding the warning or reject from making G0 ignore it permanently.
- Required the endpoint to return the canonical committed spec projection, avoiding duplicated client-side mutation rules.
- Required G0 skip behavior to be proven in the mocked reconcile harness for both flagged and ignored fixtures, avoiding destructive production-sweep verification.
- Added exact negative cases for short reasons, mixed status/disposition input, absent flags, and unresolved link reviews.
- Required every existing spec-card/detail renderer to show warnings, eliminating the prior optional detail-route wording.
- Added safe URL handling for evidence values so only parsed HTTP(S) values render as links.
- Required the minion-base server proxy and secret boundary to be reconfirmed and narrowly extended, citing `/memory/MINION/minion-factory-agent-pipeline.md` for the shipped “Base = the interface” contract.
- Made local UI updates response-driven, preserved amber state on remaining `link_review`, and required errors to leave local state unchanged.
- Added pure predicate/update tests for amber visibility, action availability, link-review blocking, and failed-request behavior.
- Removed the redundant raw-value diff grep because minion-base's authoritative `bun run lint:design` debt ratchet is the applicable design gate.
- Added scratch-fixture cleanup to the browser probe so verification does not leave test cards in the live planning system.
- Replaced ambiguous grep-based Slice 1 checks with JSON assertions for present, absent, and deliberately unprojected fields.
- Made the sibling proposal merge part of Slice 1 and its indexes/guards, eliminating a known duplicate Proposal card instead of leaving a human follow-up.
- Corrected the minion-meta scope guard to compare against `origin/dev`, consistent with `/memory/MINION/dev-process-specs-is-the-live-system.md` and the board's committed-index branch contract.
- Reframed the human-gate guarantee so `by` is audit metadata rather than authorization, while retaining authenticated proxying, recorded reasons, commit audit, and a negative automation-wiring check.
- Replaced the unverifiable live-match fallback and permissive “explicitly explained” ship gate with required fixture tests and exact green assertions.
- Removed the unrelated AGENTS.md follow-up from the ship gate and kept it explicitly out of scope because it does not affect this feature's contracts.

## Human flags

None.
