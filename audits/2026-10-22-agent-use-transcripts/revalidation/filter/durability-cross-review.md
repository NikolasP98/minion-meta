# Skeptical cross-review of durability recommendation

Reviewed `../durability/report.md` against Hub snapshot `b677a5d91a2b653211a1655465b2b5fd398efc2a`, especially `bg-runtime.ts:90-112,244-352,354-378`, jobs tick route `1-50`, and `pulse.service.ts:20-40,63-98`. No new executions were performed for this cross-review.

**Agree with reuse as an implementation direction; reject describing bg-runtime + Pulse as an already connected durable proactive workflow.** They are substantive reusable components with working callers elsewhere, not a ready-to-configure digest runtime. The durability report mostly preserves this distinction correctly.

Concrete integration work still required:

1. New digest handler and its import/registration in a qualified worker. The current jobs tick side-effect imports groupchat, brains/corpus and finance handlers; no digest handler exists. Enqueueing alone can leave work indefinitely queued (`advanceAdmittedJob` returns when `handlers.get(type)` is absent).
2. Logical request uniqueness above `enqueueJob`, which creates a random UUID every time. Source snapshot + policy revision must bind the new domain request; a generation-scoped lease alone does not deduplicate distinct queue rows.
3. A limited dispatcher/activation path. Default scheduled jobs route explicitly skips bg_jobs unless `jobs=1`, and global runTick selects the oldest 20 rows across types before checking whether any handler exists. Its `advanced` counter increments after `advanceJob` even if that invocation made no progress. A new pilot cannot count this return value as completed/admitted-work proof or enable all dormant job families casually.
4. Explicit transient-error policy for the new type. `RetryableJobError` is treated as resumable only when `job.type === 'booking_stock'` (`bg-runtime.ts:317-337`). Other handler exceptions are marked failed. Do not imply generic durable retries already apply to a new digest just because a retryable error class exists.
5. New effect receipt/result contract for classification/research. The embedding helper does not implement arbitrary external calls. Persist source evidence and detect lost-result ambiguity before automatic replay.
6. Transaction integration for publication. Pulse upsert opens its own `withOrgCore` transaction; invoking it inside `execution.withOwnership` does not automatically make the Pulse insert and cursor advance one commit. A transaction-accepting helper, or a deliberate outbox/reconciler protocol, is required.
7. Actor/org authority and cancellation policy for the new handler. Existing job ownership proves the current worker owns a tenant job; it does not automatically re-derive every permission needed for that new workflow.

The dependency-impact-card pilot remains plausible after these seams are specified and crash-tested. Reusing the informational Pulse card avoids the executable `cron.add` approval race, but it does not itself provide durable execution or adaptive feedback learning. The report should call the recommendation **compose and qualify existing components**, not activate an existing end-to-end feature.
