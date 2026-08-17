---
spec: 2026-08-17-gw-nostr-dispatch-pipeline-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

- Updated the spec frontmatter to pass 2 and approved because the correctness issues were resolvable without a human scope decision.
- Changed “SDK surface consumed by 45+ extensions” to “available to 45+ extensions” because adding an export does not make every extension consume it.
- Removed unsupported claims that the current bypass necessarily causes wall-sized replies, split fences, or missing ledger/reliability records; §3 correctly treats those effects as recon hypotheses.
- Rephrased the silent-failure outcome as an inbound-message drop rather than asserting the entire channel is dead, which the proposal does not establish.
- Moved the unsatisfiable-dispatcher-contract stop gate ahead of all implementation slices so S1 cannot land as a partial fix after S0 has already invalidated the planned scope.
- Added the `docs` tag to S3 because that slice explicitly edits extension documentation and the cited gate specification makes tags slice/path-derived.
- Replaced the new exactly-once/deduplication feature with the testable invariant “one existing publish-path call per dispatcher emission,” resolving its contradiction with preserved retry semantics and the proposal’s narrow scope.
- Changed the multi-block assertion from an unspecified “no split code fence” guarantee to ordered equality with blocks emitted by the real dispatcher, which verifies wiring without assigning undocumented block semantics to the dispatcher.
- Clarified that the fake relay may use an in-process or loopback transport while external network access and DNS remain forbidden, eliminating the conflict between a relay harness and “zero outbound network I/O.”
- Qualified relay impact as potentially public and multi-block event growth as conditional because deployments may use private relays and current behavior is explicitly unknown.
- Clarified that the Discord/Telegram extraction spec is precedent for additive SDK re-exports, not evidence that this dispatcher is already an SDK bridge.
- Added relay-level exactly-once delivery and new deduplication state to out of scope so the narrowed publish invariant cannot be misread as a delivery guarantee.

## Human flags

None. S0 retains explicit stop conditions for facts that require the unavailable `minion` checkout; those conditions do not require a decision before this implementation spec can be approved.
