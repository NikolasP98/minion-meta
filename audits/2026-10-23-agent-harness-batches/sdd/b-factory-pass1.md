# Factory batch B — independent Astra SDD pass 1

Reviewer: `/root/astra_sdd_pulse_digest`. Date: 2026-10-23. Review is read-only against B artifacts/source; no implementation or paid call performed.

## Reviewed identity

Meta base `220a9b9a0a96e950a5c2d986c6c218cd54ab307e`; Factory `5e28c7ae8c2bc9a7e2fef1da052f0ae2fbe86810`.

- spec SHA-256 `3a2e362cbbd931614dffaa4e3c8a950988c67594cd4db027bed9ef20712cfc81`
- plan `64ce134fa65d90b209257b4c3ad51df68ecc345728bb7b6f90d09e9602065005`
- tasks `33567b721fbc6c6b0a3ddb2f70f35f49367650e886727cacfc5dad6cea60036f`

Read parent §§0–12, Factory AGENTS.md, all B specification/plan/tasks/contract/checklist/stub, and current proxy, provider, Express, guard, shell cost and stats call boundaries. Frozen hashes match the author handoff.

## Standards — changes requested

| ID | Severity | Location | Trigger / impact | Required correction |
|---|---|---|---|---|
| B-P1-01 | Medium, blocking artifact registration | `specs/2026-10-23-harness-factory-spec.md:18–20` | New board stub has no `## 0. Product`, explicit out-of-scope or verification section. `scripts/spec-index.mjs:156–163` enforces these on every new top-level spec; prose mentions do not satisfy it. | Add real required headings with concise links/content. Do not edit generated index from the author scope; parent runs generator/check. |

## Spec — changes requested

| ID | Severity | Location | Trigger / impact | Required correction |
|---|---|---|---|---|
| B-P1-02 | High | `specs/106-harness-factory/plan.md:27`; contract lifetime | Cleanup permits deleting a settled expired inactive ledger, but token expiry/revocation does not prove a run namespace ended. A still-live run can lose its token at timeout and remint after cleanup, resetting spent/call allowance. Parent §5.2 forbids live-run token remint reset. | Distinguish token inactivity from authoritative terminal run retirement. Retain cumulative ledger or minimal deny/usage tombstone while the run namespace can be reminted; delete only after authoritative terminal retirement with an enforced no-remint rule. Test expiry → cleanup → same-run mint after known settlement; allowance must not reset. Existing unresolved-fence test is insufficient. |

## Nonblocking precision

- T007 names an exact run-result writer/reader only conditionally. Before coding that subtask, pin the actual `result.json` emitters and `finishRunInner`/durable field path, because `queue.ts:3266–3280` currently projects only `costUsd` and `stats.ts:25–39` reads stage files. Keep additive coverage scoped to the approved Slice 8 handoff; the real consumer test is required, not a helper-only aggregation test.
- Plan line 27's live-ledger ceiling needs a finite explicit formula/config boundary and test during implementation. Unresolved entries must be retained under pressure; deny new auxiliary work rather than evicting them.

## Traceability and strengths

FR-B01/B02/B06 and T003–T005 cover A08 atomic call reservation, one inflight, busy/no debit, malformed cap and late settlement. FR-B03/T006–T008 preserve merged v2 identity and failed/unknown billing. FR-B04/B05 and T009–T013 cover A09 preparation, direct/proxy transport, response body, genuine disconnect versus normal request completion, legacy signature and actual installed harness proof. Current source supports the AS-IS claims; independent local HTTP integration is feasible. The installed harness evidence remains an implementation gate and is not misrepresented as done. No default acting-mode, paid operation or merge authorization is introduced.

## Disposition

Pass 1: **changes_requested**, limited to B-P1-01/B-P1-02. Re-review changed artifact hashes after author remediation; then an independent pass 2 may proceed. No remaining concern with the approved scope/one-PR grouping itself.

## Revised artifact re-review

Re-read revised plan/tasks/contract/stub. Frozen identities:

- spec unchanged `3a2e362cbbd931614dffaa4e3c8a950988c67594cd4db027bed9ef20712cfc81`
- plan `8026c5eaef85424d2d30b433fd97fddde8226af536a4fad1bb268349f9c85108`
- tasks `2da02fce831466a497369c3e24ce27ee4735c40c083cb4641631b8ca5c5a791a`
- contract `f0888174bc1b1dfda753f132a09678e85c8e55366954b3106260d79a1fb773d2`

B-P1-01 resolved: stub now has actual Product, out-of-scope and verification headings plus AS-IS/TO-BE/DELTA description. B-P1-02 resolved: live run settled counters survive expiry/sweep, retirement requires authoritative terminal state and retained no-remint tombstone, and T003/T005 test both live remint and terminal rejection.

The previously conditional accounting propagation is now concrete: run/spec/reconcile emitters → queue FinishResult/parse/finish/restart → reservation settlement; bounded admitted/settled journal survives guard temp cleanup, incomplete totals retain unknown commitments, and stats cannot permanently cache late/unresolved receipts. These satisfy the approved Slice 8 accounting handoff; they do not introduce model retries or an acting-mode change. Entry bounds/write failure behavior and actual-caller tests are explicit. Existing installed harness qualification remains required even with a pinned binary available.

**Standards: approved. Spec: approved. Pass 1 final disposition: approved for development at the exact revised hashes above, subject to the separate independent pass 2.** No runtime qualification, CI, merge or deployment is claimed. The live-ledger finite ceiling remains a routine implementation detail to freeze/test beside existing capacity, not a reason to erase admission history.

## Final G2 scores

Scores apply to the bounded underlying Slices 8 and 9, packaged together by the owner's explicit authorization. They do not characterize the entire two-slice group as a single 4–8 hour slice. Minimum across the underlying slices is reported on the 0–10 scale.

| Axis | Score | Basis |
|---|---:|---|
| slice_size | 7 | Slice 8 spans the proxy ledger and several cost receipt consumers; task boundaries and serialized implementation keep it bounded. Slice 9 is a narrower lifecycle repair. |
| dod_verifiability | 9 | Frozen acceptance maps to concrete run/queue/stats and local transport boundaries, with required installed harness evidence. |
| scope_containment | 9 | Auxiliary accounting and transport lifecycle are explicit; acting mode, paid calls and release remain gated. |
| impact_zones | 8 | Actual run/spec/reconcile, queue recovery and stats consumers are named; cross-consumer changes require the specified integration proof. |
| collisions | 9 | One isolated Factory checkout and one group PR, with no overlapping runtime ownership from the other groups. |
| testability | 9 | Local HTTP provider fixtures, restart/cleanup races and installed binary checks exercise actual callers without paid inference. |

All six axes meet the constitution's threshold. Standards and Spec dispositions remain independently **approved** at the exact revised hashes above.
