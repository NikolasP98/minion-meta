---
spec: 2026-08-18-hub-funnel-atomic-write-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

- Set `pass: 2`, `updated: 2026-08-18`, and `verdict: approved` for the completed review pass.
- Cited `/memory/MINION/crm-icp-score-spec.md` for the hard atomic-write constraint and `/memory/MINION/hub-org-scoping-rls.md` for the transaction/RLS constraint that shaped the helper contract.
- Removed the nested `withOrgCore` helper shape and required the atomic primitive to use the caller's existing transaction handle, preserving the `app_ledger` role and org GUC boundary.
- Replaced the unsafe `sql.raw` JSON path example with bound path/value parameters and required rejection of non-serializable values.
- Made the per-key primitive generic instead of applying a contradictory reserved-key allowlist inside a helper intended to serve user fields as well.
- Corrected the `_funnel` call example to pass the transaction handle rather than the request context.
- Changed S1 and S2 to one ship unit because an atomic `_funnel` writer can still be clobbered by any remaining stale whole-column writer.
- Expanded Slice 0 from the two expected sites to every reachable `custom_fields` writer so the ship invariant can be verified rather than assumed.
- Corrected the S1 parity test: existing unrelated JSON keys survive a sequential pre-fix spread, so that assertion is not a valid red-state regression test.
- Replaced byte-identity language with JSON deep equality because PostgreSQL JSONB does not preserve source byte representation or key order.
- Replaced plain `Promise.all` concurrency with a deterministic real-Postgres row-lock interleaving that forces both pre-fix reads before either update and records the required red state.
- Required two independent writer connections and both start orders so the concurrency definition of done is not scheduler-dependent or mock-vacuous.
- Preserved the PATCH endpoint's existing add/overwrite/delete/omission semantics instead of assuming shallow merge semantics that could silently break field deletion.
- Added parity checks for missing/not-authorized contacts and a cross-org update test to verify the atomic helper does not weaken tenancy behavior.
- Added the conditional owner file for an existing `_relationship` setter to the files-touched table, closing a missing impact surface in S1.
- Corrected malformed `rg -r` recon commands and broadened the end-to-end stale-writer scan to server and route code.
- Removed the requirement to edit the meta-repo spec/proposal inside the hub implementation PR; material recon mismatches now route back through the factory and coordination is recorded in the PR.
- Clarified that gateway CRM callers have no direct hub-Postgres path and see no REST/WS contract change, avoiding an unresolved cross-repo impact claim.
- Corrected the full-test label from “CRM suite” to “hub suite” and made the operator curl explicitly a smoke check rather than the concurrency proof.

## Human flags

None. The corrected requirements are decidable from the target checkout, preserve the existing API and funnel semantics, and provide a deterministic definition of done.
