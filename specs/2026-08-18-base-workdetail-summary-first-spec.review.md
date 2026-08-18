---
spec: 2026-08-18-base-workdetail-summary-first-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

## Changes made

- Set `status: approved`, `pass: 2`, `updated: 2026-08-18`, and `verdict: approved` because all defects were correctable without product adjudication.
- Corrected the dependency description to say `2026-08-18-base-ui-primitives-and-shell` is an approved proposal, not a spec present in this checkout, and made implementation wait for its recon-confirmed exports.
- Replaced the unsupported claim about both generated indexes with the narrower fact that no located artifact owns the same detail contract.
- Added implementation-time reading of any `minion-base` `AGENTS.md`/`CLAUDE.md` because the checkout and its own instructions are absent here.
- Required Slice 0 to enumerate the finite work-detail card-kind set and external-only links so “every kind” tests have a verifiable domain.
- Made issue routes validate the complete original decimal segment and reject zero, negative, empty, extra, malformed, and missing refs rather than relying on permissive numeric parsing.
- Required owner/repo path-segment encoding so the canonical issue URL is well-defined rather than merely described as “encoded.”
- Reconciled “exact revision” with sources such as issues that may expose no immutable revision token by requiring an explicit unavailable state and forbidding mutable substitutes.
- Clarified that only the new single-issue read is additive while existing source-fetch, cache, auth, UTF-8, lineage, and blob-SHA gate contracts remain unchanged.
- Restored `DecisionDock`, which UI-007 includes in the plan of record, and specified that it reuses the existing gate state machine and safe-area tokens without inventing actions.
- Clarified which disclosure auto-expands on failed review so review evidence cannot remain hidden merely because it shares a container with the raw document.
- Bounded the first-viewport assertion to a named fixture and separated the required blocker indicator from full blocker text, making the mobile DoD reproducible.
- Made the 20-case fixture library a committed coverage table spanning every recon-enumerated kind and all availability states across the suite, removing the ambiguous implication of a cross-product matrix.
- Required closed availability reason codes and a source-to-field mapping so `missing` versus `unsupported` is deterministic and testable.
- Replaced ambiguous readiness computation with transport of source-supplied scores and lossless deterministic normalization of explicit failed-review/blocker states, preserving the no-invented-evidence rule.
- Allowed source links and revisions to render explicit unavailability in all-kinds tests instead of requiring fabricated values for every source.
- Defined `PUBLIC_WORK_DETAIL_V2` as an exact `1` opt-in with unset, empty, `0`, and other values off, following the fail-closed flag lesson in `/memory/MINION/sdlc-board-triage-and-phase-gates.md`.
- Corrected rollback language to include the restart/redeploy required by the recon-confirmed SvelteKit environment import and added the missing minion-base deployment/config impact.
- Expanded flag verification to unset, `0`, invalid, and `1`, with an independent server/build per case so cached build-time public values cannot yield a false pass.
- Added dock-obscuration checks for anchors and final content, closing the interaction between the sticky identity strip, sticky dock, and safe-area offsets.
- Aligned the acceptance matrix with the corrected blocker-indicator and flag-state contracts.

## Flagged for the human/operator

- The prerequisite primitives/shell artifact has no spec in this checkout; implementation remains blocked until its proposed exports and safe-area contracts exist and Slice 0 confirms them.
- No relevant past-session observation was returned by the required read-only SQLite FTS query; the two raw memory topic files above were the applicable operator-memory sources.

No unresolved design choice requires human adjudication; verdict is approved.
