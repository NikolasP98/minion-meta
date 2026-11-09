# Pass 2 independent design review: durability and proactive work

Verdict: **changes_requested** for two narrow remaining contract gaps. Reviewed spec SHA-256: `8f97591a08878bab4da6b580c5de5c62c347235b1dc903cc4aed627ec01df4e3` (`pass: 2`).

Scope: complete specification, with detailed scrutiny of Pulse/digest schema, effect guarantees, source triggers, selected workers, authority, migrations, dependencies and rollback. Source comparison: Hub `b677a5d91a2b653211a1655465b2b5fd398efc2a`; Gateway `6d1cd8836ff7b82d21668c50cc20b9b6d1e79c18`. This is design review, not implementation or new runtime qualification. No provider calls, production reads/writes or product edits.

## Pass 1 disposition

| Finding | Disposition | Revised contract |
|---|---|---|
| DR-01 execution principal | Addressed | §7.1 freezes explicit personal agent/session, disables external announcement, tightens explicit-agent cron admission/execution and gates Hub activation on gateway qualification. Omitted generic-cron IDs preserve defaults. |
| DR-02 shared admission/budget | Addressed | §7.3 adds stable persisted owner/budget namespace, active run/attempt/generation, atomic exposure reservation, cross-policy/day unknown fence and disabled SDK retry/fallback. |
| DR-03 receipt visibility/scope | Addressed | §7.2 restricts pilot to personal org and adds authoritative owner-scoped receipt GET and recent-decisions query; refresh and another profile in the same org are covered. |
| DR-04 retry/state contracts | Substantially addressed; DR2-02 below remains | Domain terminal states, pre-dispatch-only retries, counts/due times, narrow postpone result and no-reset indeterminate policy are concrete. Due-time enforcement still needs the final claim predicate. |
| DR-05 atomic publication/conflicts | Addressed | §7.3 reserves ingress namespace and requires immutable owner/run/content bindings, matching-card readback, no overwrite of decided cards and atomic cursor/job settlement. |
| DR-06 dependencies/slices | Addressed | Worker primitive is independent Slice19; source, admission, reasoning, publication and feedback are Slices21–25. Repair no longer waits on optional digest. |
| DR-N1..N4 | Addressed | Tombstone restrictions, scoped cancellation/rechecks, structural-versus-factual validation distinction and state-dependent receipt checks now explicit. |

The stronger design still takes the smallest useful path: domain rows on current bg-runtime, one tool-free inference, current Pulse presentation, no general workflow engine. Unknown external effects are retained instead of repeated; scheduled is not executed; approval/merge and live-budget authority remain explicit.

## Blocking findings

### DR2-01 — Source collection has no executable trigger contract

**Medium product-completion blocker. Spec §7.2–7.4, lines231–272; Slices19/21/22.** The authenticated selected tick consumes existing bg_jobs. Slice21 defines fetching/snapshots and Slice22 deduplicates/enqueues logical runs, but no named handler invokes collection periodically, no cadence is assigned, and no persisted due/claim owner prevents several tick requests collecting the same policy simultaneously. E5 starts with an injected duplicate trigger, so it can pass while the supposedly proactive digest never starts with clients closed. Existing Pulse settings have no runtime scheduler caller at the audited pin (durability report); it cannot be assumed.

**Smallest fix:** explicitly extend the dedicated authenticated pilot tick to perform a bounded source-collection/admission sweep for configured due owners before advancing selected jobs. Name the route/runtime caller and cadence (for example an operator-configured one-minute trigger and a conservative fifteen-minute source poll); disabled means no trigger. Persist next source-poll due time and a short owner/generation lease in an existing new domain policy/admission row, claim atomically, fetch outside the transaction, then deduplicate/enqueue under the current policy and claim generation. Cap owners/sources per tick, retain source cursors until publication and do not overlap or catch up unbounded missed polls. Release/reschedule after a bounded fetch failure without inventing no-change. An equally concrete alternative trigger is acceptable; another scheduler platform is unnecessary.

**Tests:** close all clients, invoke the production tick entrypoint with fake clock/fixture HTTP and no precreated digest job, and obtain one logical run/card; concurrent ticks produce one collection lease and one logical job; restart/expired collection lease recovers; disabled/revoked policy makes no fetch/model call; failed fetch preserves committed source cursor; unrelated queues remain unclaimed. Put this wiring explicitly in Slice21/22 and their dependencies/DoD rather than leaving it to rollout prose.

### DR2-02 — Candidate due filtering does not fence a stale claim

**Medium correctness blocker. Spec line254 and Slice19 A19 line466.** Due time is checked only in candidate SQL. At the audited Hub pin, `bg-runtime.ts:129–156` claims on ID/tenant/queued-or-expired status; `advanceJob` at239–251 can also be called directly, and `runTick` at355–375 snapshots IDs before advancing them. Two ticks can see a due job; worker A claims and safely postpones it, releases it to queued, then worker B's previously selected ID enters claim immediately. Without due time in the atomic claim WHERE, the intended 5s/30s backoff is bypassed. The same issue exists for direct advance calls. This need not duplicate an admitted remote effect to violate the specified retry bound/timing and consume all retries in one tick burst.

**Smallest fix:** add `(next_attempt_at IS NULL OR next_attempt_at <= claim_now)` to the authoritative atomic claim predicate, not merely candidate selection; handlers cannot bypass it through direct advance. When a stale candidate is rejected, return not-advanced so metrics remain honest. Use the same database/clock convention for postpone and claim. This is one narrow addition to Slice19, preserving NULL legacy behavior.

**Tests:** barrier-controlled real-DB interleaving where B snapshots candidate before A postpones, then B tries after release; B must not enter handler until due. Also direct advance before due, exact due boundary, legacy NULL, cancellation and expired lease. Count handler calls and lease generations rather than only SQL query shape.

## Nonblocking implementation precision

- On recovery of reasoning_received under a newer bg-job lease, explicitly distinguish original admitted-effect generation from the newly authorized publisher generation. The new owner may publish a stored validated receipt; it must not pretend to be the original caller or release a successor's budget slot. This follows existing ownership invariants and needs a regression in Slice23.
- The plan now names real PG uniqueness/locking as mandatory; implement its test fixture so the native-Postgres lane fails loudly when absent. Do not silently downgrade these tests to mocks or treat PGlite-only results as deployment-equivalent concurrency evidence.
- Slice20 touches Hub strict authority plus gateway cron semantics. Its boundaries are coherent, but source reconciliation must split it before coding if the declared 4–8h estimate fails. The gateway prerequisite must ship/qualify before Hub activation, not merely appear in the same PR description.
- Existing authorized in-flight generic cron work can execute after later revocation. The spec states this limit accurately; no extra execution framework is necessary for this scoped repair.

## G2 scores

Scale: 0–10; these assess the reviewed artifact, not implemented behavior.

| Canonical axis | Score | Rationale |
|---|---:|---|
| slice_size | 8 | Thirty focused slices fix the prior publication/feedback and optional-product dependency problems; cross-repo Slice20 remains the largest. |
| dod_verifiability | 8 | Detailed negative/recovery assertions and test commands; proactive cold-start and stale-candidate claim tests still missing. |
| scope_containment | 9 | Existing runtimes/stores/UI retained; no abstract workflow/learning service; product pilot and live evaluation remain gated. |
| impact_zones | 8 | Gateway explicit-agent compatibility, owner reads, migrations and data deletion now explicit; trigger/runtime ownership still absent. |
| collisions | 9 | Shared-file serialization and source reconciliation explicit; independent worker prerequisite avoids digest blocking repairs. |
| testability | 8 | Stubbed providers, real transactions, browser/status and chaos boundaries specified; add the two deterministic interleavings above. |

After these two clauses and their acceptance cases are added, no remaining durability-design blocker is identified. This statement is not a technical pass for an unreviewed future hash. Human approval remains separate from technical review and does not follow automatically from these scores.

## Final correction review — technical pass

Final reviewed spec SHA-256: `1f3ef8329b698570eeebdfde6d1df96611d700565706a71d0963b0bba88cd70e`. **Final technical verdict: pass.** This supersedes the earlier changes_requested verdict for its earlier hash; the historical findings above remain as review evidence.

Re-read the changed worker/admission/trigger contracts, Slice19/A19, Slice32/A32 and dependencies, the full DELTA mapping and revised evaluation-transport boundary. DR2-01 is closed: §7.4 now names authenticated `GET /api/pulse/tick`, configured scope, a deployment-managed per-minute invocation, persisted fifteen-minute source cadence, thirty-second collection lease/generation, fifteen-second aggregate fetch limit, bounded concurrency, failed-poll delay and current-policy fencing. Slice32 owns route/schedule/collection wiring and proves empty-queue progress with clients closed, concurrent ticks, restart and unrelated backlog isolation. The schedule remains absent until separately authorized pilot deployment. Source acceptance cursors still advance only with publication/no-signal settlement.

DR2-02 is closed: §7.3 now requires the due predicate in the atomic claim itself, including direct advance and stale-candidate paths; failed claims do not count as advanced. Slice19 explicitly includes the interleaving and preserves legacy NULL behavior. The final change introduces no general scheduler or workflow framework. Thirty-two slices retain an independent worker repair path; the bounded collector is a separate optional-product slice rather than expanding admission/publication scope.

| Canonical axis | Final score | Basis |
|---|---:|---|
| slice_size | 8 | Explicit collector and live-adapter slices keep responsibilities bounded; Slice20 still warrants its stated pre-coding estimate check. |
| dod_verifiability | 9 | Source cold-start and stale-candidate acceptance cases now specified alongside receipt, recovery and authority tests. |
| scope_containment | 9 | Domain-specific rows, existing runtimes/UI, one configured pilot owner and disabled-by-default activation remain intact. |
| impact_zones | 9 | Trigger/auth allowlist/deployment template ownership now joins explicit gateway, schema, UI and retention contracts. |
| collisions | 9 | Dependencies and serialization preserve independent repairs and contain optional-product integration. |
| testability | 9 | Deterministic race/lease/crash cases, real transactions, stub transports and closed-client proof cover the remaining design gaps. |

No remaining blocking durability-design finding is identified for this exact hash. Implementation must still prove lease expiry as well as generation ownership at collection finalization, use the available tick budget correctly for the thirty-second reasoning deadline, and distinguish the original admitted-effect generation from a recovering publisher's current job generation; these are applications of the specified ownership/deadline invariants, not requests for new architecture. The earlier nonblocking native-PG and gateway-before-Hub activation notes remain verification obligations. This technical pass is not human security/data approval, implementation evidence, provider qualification or deployment authorization.
