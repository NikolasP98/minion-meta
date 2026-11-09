# Factory batch independent technical pass 2

Reviewer: Astra chat/evals author, acting independently of the Factory author. Date: 2026-10-23. Verdict: **changes_requested**. No B artifact/runtime edits, tests, model calls, commits or branch operations were performed.

## Reviewed identity

Factory source `5e28c7ae8c2bc9a7e2fef1da052f0ae2fbe86810`; approved parent §§5.1–5.3/A08/A09. Frozen hashes verified:

- spec `3a2e362cbbd931614dffaa4e3c8a950988c67594cd4db027bed9ef20712cfc81`
- plan `64ce134fa65d90b209257b4c3ad51df68ecc345728bb7b6f90d09e9602065005`
- tasks `33567b721fbc6c6b0a3ddb2f70f35f49367650e886727cacfc5dad6cea60036f`

Also read admission/deadline contract, checklist, board stub, Factory AGENTS and actual proxy/provider/shell/guard/queue/stats/budget consumers. Pass-1 lifecycle finding is already known to the parent; this review does not recount its heading or lifecycle checks as a second independent discovery.

## Standards

The bounded run ledger, existing capability authority and single-inflight policy satisfy Ponytail and parent scope. One PR for two slices is explicitly authorized. Actual loopback HTTP, shell and installed-hook proof are appropriately separate. No new queue, provider retries or production release is introduced. **One required correction:** T007 leaves the exact run-result writer/reader as discovery for the implementer even though current source identifies the lossy seam. Name those files and the coverage transport before declaring the plan immediately executable.

## Spec findings

| ID | Severity | Location | Trigger / consequence | Smallest correction and test |
|---|---|---|---|---|
| B2-01 | HIGH | `specs/106-harness-factory/plan.md:31`, tasks T006–T007; source `agent/run.sh:126–127`, `agent/spec.sh:22–23`, `agent/reconcile.sh:48–49`, `runner/src/queue.ts:3065–3106,3263`, `agent/hooks/jev-guard.sh:569–577` | A Jev attempt has unknown/failed spend, then the guard removes its temporary receipt and a worker emits numeric `costUsd`. Writers emit only the subtotal; `parseFinishResult` drops new coverage fields; `finishRunInner` passes that subtotal to `settleRunReservations` as the complete bill. Merely fixing `cost.sh`/`stats.ts` or including `*-error.json` cannot meet FR-B03/T007's promise that incomplete totals are not treated as full-spend evidence, especially after guard cleanup. | Specify one durable bounded v2 accounting source that survives the guard cleanup (reuse retained authoritative/comparison JSONL and existing reconciliation identity), wire the three worker result emitters and `FinishResult` parser, and prevent incomplete coverage from settling a full run bill from a known subtotal. Keep compatibility subtotal and unknown flag distinct. Test actual guard success/failure cleanup → worker result writer → queue parser/settlement, including `run_busy`/401/429 with zero actual provider attempts so denied calls do not fabricate unknown bills. |
| B2-02 | MEDIUM | Contract settlement after revoke and plan accounting; source `runner/src/stats.ts:18–20,46` | A run becomes terminal while its admitted proxy call is still awaiting a response; stats are read once, then a late valid cost receipt settles. The existing terminal-run cache is permanent, so its first incomplete/old snapshot never sees the newly settled receipt. The design explicitly supports settlement after token revocation but does not qualify this existing consumer assumption. | Define final receipt coverage/revision as the cache-stability condition, or omit permanent caching for unsettled/incomplete runs. Test stats read before terminal late settlement, append authoritative receipt, read again: known subtotal/coverage changes exactly once and remains deduplicated. No generic cache service is needed. |

The pass-1 HIGH about deleting settled ledgers while the same run can remint also requires correction before approval; the author's single revision should address both reviews.

## Nonblocking challenge results

- Synchronous cap reservation, no debit on busy, separate malformed saturation, exact admitted attempt settlement and unknown-cost fence are specified. Monetary overshoot is honestly reported; no invoice-ceiling claim is made.
- Timeout covers preparation, headers and body; short caller duration wins; explicit `req.aborted`/unfinished `res.close` avoids canceling every healthy request on ordinary `req.close`. Include the route's pre-body timing seam in actual code, as T009 already requires.
- Installed harness no-paid proof is explicitly required and cannot be replaced by shell-only tests. The source Dockerfile version is correctly not claimed as installed evidence.
- Root host/direct calls are excluded from proxy run-cap qualification without adding an unauthorized bypass.

## Next action

Revise B2-01/B2-02 plus pass-1 findings, send new hashes and request a bounded final challenge. I have not approved development against this frozen draft. No unresolved product decision requires asking the user; the parent approved requirements determine these corrections.

## Final bounded challenge — revised frozen draft

Verdict: **approved** for SDD development handoff, 2026-10-23. This supersedes the initial draft disposition above. I personally verified these exact SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| `spec.md` | `3a2e362cbbd931614dffaa4e3c8a950988c67594cd4db027bed9ef20712cfc81` |
| `plan.md` | `8026c5eaef85424d2d30b433fd97fddde8226af536a4fad1bb268349f9c85108` |
| `tasks.md` | `2da02fce831466a497369c3e24ce27ee4735c40c083cb4641631b8ca5c5a791a` |
| `contracts/admission-deadline.md` | `f0888174bc1b1dfda753f132a09678e85c8e55366954b3106260d79a1fb773d2` |

**Standards: pass.** The refinement keeps the existing run authority, bounded v2 records and existing reservation/cache consumers. The journal is necessary accounting persistence rather than a new billing platform. Per-file tasks now identify the actual writers, parser and settlement seam. One PR packaging is the explicit owner override; original slices A08/A09 remain separately verifiable and ordered. No unapproved paid/release action is included.

**Spec: pass.** B2-01 is resolved by contract lines 21–27 and plan step 7: authoritative pre-dispatch durable journal, bounded lock/append/fsync, guard cleanup preservation, exact three emitters and queue readers, runner reconciliation, and incomplete-reservation retention. Denied requests do not invent provider attempts; unresolved remote admission remains distinguishable from admitted unknown spend. B2-02 is resolved by contract line 29, plan step 8 and T006/T007: only finalized complete matching-revision data can be permanently cached; late settlement changes statistics once and invalidates aggregate cache. The pass-1 lifecycle correction also retains settled live-run counters until authoritative terminal status plus a no-remint tombstone. I found no additional blocking threat in this bounded rereview.

Canonical G2 scores below are my independent assessments on the 0–10 scale, evaluated over the original bounded slices A08 and A09, with both delivered in the one authorized group PR. They are design-readiness judgments, not implementation test results.

| Axis | Score | Rationale |
|---|---:|---|
| `slice_size` | 7 | A08 touches accounting consumers as required for truthful spend; A09 is a separate deadline increment. The named existing seams keep both bounded, although A08 has meaningful integration work. |
| `dod_verifiability` | 9 | Concrete concurrency, unknown/known-zero billing, cleanup-to-settlement and installed-hook deadline proofs correspond to the approved DoDs. |
| `scope_containment` | 9 | No new queue, provider retries or general billing service; journal and tombstones serve the approved admission/accounting invariants. |
| `impact_zones` | 9 | Proxy, guard, shell writers, queue settlement and late stats consumers are now explicitly covered. |
| `collisions` | 9 | Shared proxy/shell edits are serialized, prior receipt/report compatibility is retained, and delivery stays in Factory. |
| `testability` | 9 | Real loopback HTTP and shell-to-runner seams plus the pinned installed harness are specified; no actual paid calls are needed. |

Implementation must still produce the specified tests, installed harness proof, independent code verification and human merge approval. This review neither claims those checks have run nor substitutes for them. No B artifact was edited by this reviewer.
