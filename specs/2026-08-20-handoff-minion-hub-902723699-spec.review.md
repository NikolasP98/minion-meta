---
spec: 2026-08-20-handoff-minion-hub-902723699-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-20
---

# Pass 2 review — updateSellable S2 handoff

Scope was correctness and consistency only. Cross-checked against `AGENTS.md`, both source
proposals, the approved pass-2 ancestor and its review, the stock-split and item-spine design
ancestors, the two cited contended-file specs, `/memory/MINION/MEMORY.md`,
`/memory/MINION/sdlc-board-triage-and-phase-gates.md`, and
`/memory/MINION/factory/2026-08-20-eafcc91e.md`.

## Changes made

1. Updated frontmatter to `pass: 2` and `verdict: approved`, as all blocking ambiguities were correctable from existing scope and evidence.
2. Replaced the indirect S1 run-history argument with the precise PR #120/`7fdc291` evidence from `/memory/MINION/factory/2026-08-20-eafcc91e.md`, which proves S1—not S2/S3—shipped.
3. Corrected AS-IS wording from markers existing “instead of code” to markers attached to S1 refusal code, matching the ancestor's implementation contract.
4. Defined omitted/blank UOM behavior by observable parity with `createSellable`, removing an unspecified false→true edge case without choosing a new product policy.
5. Required coupled `kind:'product'` + `trackStock:true` validation against the post-transition derived state, so the documented full-object wizard request is not rejected by S1's pre-transition `kind_derived` guard.
6. Defined “pristine” once as no movement/ledger row, non-zero bin, or billed-line reference, eliminating the contradictory “zero movements” shorthand.
7. Made the history predicate complete and recon-blocking; removed the instruction to silently return `true` when a query cannot be implemented, because that would leave a known partial implementation undocumented.
8. Required history-query failures to propagate and roll back, distinguishing operational database failure from the business state “has history.”
9. Added transaction/locking and a deterministic concurrency test for UOM rename versus history writers, closing the unlocked check-then-write race.
10. Added a Slice-0 gate proving the `(org_id, fin_product_id)` uniqueness guarantee has shipped, plus a concurrent false→true test; the stock-split ancestor explicitly recorded that this constraint was previously absent, while this spec forbids DDL.
11. Added the S1 stop/re-spec condition when linked-item uniqueness is absent and the S2 stop/re-spec condition when authoritative history surfaces or locking cannot be identified, keeping both zero-DDL and safety invariants verifiable.
12. Added Slice-0 target-file history inspection per `/memory/MINION/factory/2026-08-20-eafcc91e.md`, which records the prior zero-diff S1 rerun and makes already-live-slice detection a required pre-flight.
13. Expanded recon to record the exact marker baseline, all history writers/references, uniqueness evidence, and actual PATCH/GET response envelopes needed by later gates.
14. Changed the extraction requirement from impossible-to-prove “byte-identical” behavior to observable parity and made stable-field omissions explicit in the parity test.
15. Clarified that extraction preserves `createSellable`'s existing `itemId`/`item_taken` behavior but does not invent an `updateSellable` item-link transition outside the two handoff markers.
16. Removed the brittle global “one `createItem` call site” assertion, which could fail on unrelated valid uses, and replaced broad marker-count assumptions with exact target-marker absence plus baseline-minus-one/two checks.
17. Expanded Slice 2 verification to cover every pristine-predicate blocker, query failure rollback, and the concurrency invariant rather than only one movement fixture.
18. Updated the consolidated test-file entry to include movement, bin, billed-line, and concurrency coverage so the file inventory matches the slice DoD.
19. Reclassified REST consumers as a real behavioral impact zone and made the A1 inventory report searched and unavailable repos explicitly; any affected external caller requires its own proposal and coordinated rollout.
20. Reworded the contention note to follow the current runner's merge-based reconciliation workflow instead of prescribing a rebase.
21. Replaced A3's ambiguous “fail-closed if uncertain” escape hatch with a Slice-0 blocking condition, consistent with the complete-predicate requirement.
22. Corrected end-to-end scope guards to include both schema and migration paths, added the full-object wizard-shaped PATCH, and made the illustrative JSON envelope conditional on Slice-0 confirmation.
23. Corrected stale section references (`§5`/`§6`/`§7`) to the actual out-of-scope and end-to-end sections.
24. Changed the ship gate from deleting every handoff marker in the file to removing exactly the two owned markers; unrelated later markers must remain for their owning proposal even if that delays sweep auto-closure.
25. Replaced piped recon/diff gates with direct bounded searches and `git diff --quiet` pathspec checks, honoring the hard memory rule that a pipeline's final command can mask an earlier command failure.
26. Corrected the S1-invariant wording so only unsafe history-backed UOM refusals are described as preserved; the pristine refusal is intentionally narrowed by this spec and its old fixture must gain history.
27. Allowed the losing concurrent false→true request to be either idempotently successful or a mapped conflict while still requiring exactly one mirror and no partial write, avoiding an invented API policy.
28. Made the end-to-end refusal probes assert exact HTTP 400 statuses instead of merely printing response codes.
29. Corrected the source-proposal Markdown link to `../proposals/...`, because the prior specs-relative target did not exist.

## Review constraints

- `minion_hub/` and therefore its required `CLAUDE.md` are absent from this meta-repo checkout; the spec now makes all live-source claims and response shapes explicit Slice-0 gates rather than treating them as verified.
- The requested past-observation database `/home/agent/.claude-mem/claude-mem.db` is absent, and no semantic memory-search MCP tool is available in this session; no observation or semantic result was inferred.
- The public GitHub source link could not be fetched in this environment, so it was not used as evidence.

## Flagged for the human

None. If Slice 0 finds missing linked-item uniqueness, an incomplete authoritative-history model,
or no safe locking strategy, the corresponding slice must stop for a new spec; that is an
implementation-time evidence gate, not a decision hidden by this review.
