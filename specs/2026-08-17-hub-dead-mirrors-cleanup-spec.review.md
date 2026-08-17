---
spec: 2026-08-17-hub-dead-mirrors-cleanup-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

- Set the spec to pass 2 with an approved verdict because the remaining issues were correctable without a product or ownership decision.
- Changed the checkout claim from absolute to conditional because the current meta-repo checkout does not contain `minion_hub`, while AGENTS.md describes it as an independent subproject that may exist alongside the meta-repo.
- Required a green pre-change check/test baseline and zero-exit post-change checks, matching the proposal's “svelte-check green” DoD and removing the undefined error-count comparison.
- Corrected the secrets audit total from 20 to 18 canonical exports and required every local export to be included, so the equivalence claim has an accurate finite scope.
- Replaced the bundle-size/manual-inspection fallback with a required scan of the actual client output directory, because `du -sh` cannot verify absence of Node-only imports.
- Added a field-by-field workspace schema equivalence audit, because the spec previously asserted that the two declarations matched without requiring proof.
- Removed the Branch A option that dropped `workspace_membership` from the hub migration graph, because it contradicted the proposal's retarget-to-`@minion-stack/db` requirement and the cited no-destructive-drop decision.
- Made the canonical `@minion-stack/db/schema` barrel re-export the sole allowed end state and made any migration diff a hard stop, preserving migration ownership and giving the slice a verifiable safety boundary.
- Corrected the caller-audit classification to describe the barrel export as re-pointed rather than removed, keeping it consistent with the required end state.
- Removed the Branch A TODO and proposal ledger artifact, eliminating an unnecessary cross-repo write and keeping the implementation within the declared `repos: [minion_hub]` impact zone.
- Removed the impossible “clean working tree” precondition from post-edit verification.
- Replaced the workforce navigation check with a before/after read-only row check, because the cited workforce design explicitly says the active-org flow no longer depends on `workspace_membership` and therefore could not prove table preservation.
- Updated the impact table to describe source ownership rather than calling the schema-declaration change merely import-graph-only.

## Human flags

None.
