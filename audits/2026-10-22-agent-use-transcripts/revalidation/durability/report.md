# Durable work, proactive workflows and feedback revalidation

Source: gateway DEV `6d1cd8836ff7b82d21668c50cc20b9b6d1e79c18`; Hub master `b677a5d91a2b653211a1655465b2b5fd398efc2a`. Inspected isolated source snapshots at `/tmp/minion-agent-validation-20261022-blbb_5vg/{minion,minion_hub}`. All references below are relative to the named repository and these pins. Source and offline test evidence only; deployment, production schedules, flags, actual costs and user labels were not inspected.

## Revised conclusion

The original advice to reuse scheduling was directionally right but too shallow. Minion already has **two different durability levels** and a usable proactive product surface:

1. Gateway cron persists schedules and coarse run state. It deliberately avoids immediately replaying interrupted recurring runs. Its main-session path can record success after adding only an ephemeral event. This is not a workflow checkpoint engine.
2. Hub `bg-runtime` persists queued intent and cursors, fences claims/progress by tenant and lease generation, renews ownership and aborts on loss. Existing effect helpers and groupchat checkpoints already handle the difficult distinction between no effect, known result and unknown external outcome.
3. Pulse already stores deduplicated digest/fyi/proposal cards with approve/dismiss/edit and a gateway `pulse_propose` tool. Building a separate digest feed or thumbs-up store would duplicate this surface.

The highest-value near-term durability change is **repair and qualify existing admission/receipt boundaries**, then add one bounded informational workflow. A generic new durable-agent framework is not justified by this evidence.

## Actual execution paths and persistence matrix

| Stage / owner | Persisted state | Volatile state / recovery boundary | Evidence |
|---|---|---|---|
| Gateway cron registration | `jobs.json` via temporary file + rename; schedule, payload and coarse state | Process-local lock map, timers; no multi-process ownership claim | gateway `src/platform/cron/store.ts:55-68`; `service/locked.ts:3-23`; `service/ops.ts:107-133` |
| Gateway timer admission | Due jobs get `runningAtMs`, persisted before calls | Results collected in memory; batch result state persisted after calls | gateway `service/timer.ts:211-236,293-325` |
| Gateway restart | Reloads stored schedules | Clears stale running markers, skips interrupted job IDs during catch-up, recomputes next time; no per-step resume | gateway `service/ops.ts:27-52`; existing `service.restart-catchup.test.ts:90-146` asserts this behavior |
| Gateway main-session job | Schedule can become `ok` | `enqueueSystemEvent` is explicitly memory-only, max 20 entries. Non-immediate wake returns success before agent completion | gateway `service/timer.ts:464-527`; `src/infra/system-events.ts:1-17,69-82`; wiring `src/gateway/server-core/server-cron.ts:160-185` |
| Gateway isolated turn | Agent session/transcript and coarse scheduler result | Calls embedded/CLI runner; arbitrary model/tool steps do not acquire Hub job ownership | gateway `src/platform/cron/isolated-agent/run.ts:452-504`; caller `server-cron.ts:187-197` |
| Gateway delivery | Write-ahead outbound queue, lease, payload checkpoints, provider receipt states | Some adapters have uncertain remote outcomes; recovery withholds them | gateway `src/infra/outbound/deliver.ts:550-610`; `delivery-queue-recovery.ts:94-157`; isolated-agent `run.ts:650-664` requests required durability except best-effort delivery |
| Hub job admission | PG `bg_jobs`, tenant/user/type/ref/cursor and generation | Registration map and callback stack are local; admission alone does not dedupe logical jobs | Hub `src/server/services/bg-runtime.ts:90-112,129-189`; `src/server/db/pg-schema/bg-jobs.ts:12-35` |
| Hub execution | Atomic claim; progress/finish require same unexpired generation | `AbortSignal` is cooperative; late remote effects cannot be unsent | Hub `bg-runtime.ts:191-230,245-352`; `withOwnership` row lock and lease checks protect local domain mutations |
| Hub effect admission/result | `job_effects` source/revision/unit, admitted/received/committed; embedding request descriptor and vectors | Lost response leaves admitted receipt and fails closed rather than auto-repeat | Hub `job-effects.service.ts:702-792`; publication plus progress `795-842`; brain ingestion actual calls `brains.service.ts:966,1020` |
| Hub groupchat | Server-owned effect checkpoint with stable key, generation, config and payload hashes | Gateway model RPC lacks cancellation/idempotency receipt; admitted unknown result becomes explicit indeterminate failure | Hub `groupchat.service.ts:253-389,390-426`; handler registered at `559` |
| Pulse publication | Unique `(org_id, dedup_key)` cards; pending/approved/dismissed and actor | No reasoned feedback history or policy revision in this schema | Hub `src/server/db/pg-schema/pulse.ts:3-28`; `pulse.service.ts:20-39,63-78` |
| Pulse executable approval | Approved status is written after remote `cron.add` | No atomic admission/dispatch receipt before remote call; duplicate window reproduced | Hub `src/routes/api/pulse/proposals/[id]/+server.ts:29-32,43-70` |
| Hub notifications | Event outbox has source/subject revision, payload hashes, owner/generation lease | Separate notification projection contract; not a generic agent workflow queue | Hub `src/server/services/notifications/outbox-claim.ts:18-43,100+` |
| Hub artifact storage | Scoped HTML artifact rows, version and revision snapshots | No logical digest-job uniqueness in `createArtifactRow`; workflow must bind publication identity | Hub `src/lib/server/artifacts/store.ts:38-85` |

### Operational condition omitted by the first proposal

Hub's `/api/jobs/tick` advances `bg_jobs` **only with `?jobs=1`**. The default tick deliberately skips them because indiscriminate activation previously revived dormant corpus jobs and saturated Postgres (`src/routes/api/jobs/tick/+server.ts:35-42`). A schema and a scheduled URL do not prove background progress. Deployment qualification must establish the exact worker, handler imports, target job families and quotas. Enabling the global queue just to run a pilot is an excessive blast radius.

The runtime's generic `enqueueJob` generates a new UUID; feature-level logical deduplication belongs above it. `runTick` takes up to 20 oldest resumable rows (`bg-runtime.ts:364-385`), so backlog/fairness and unsupported handler registration are part of rollout qualification.

### Why scheduling success is weaker than task completion

A main-session cron event may be marked `ok` before the next model call. Restart then loses the event because the queue is intentionally ephemeral. The timer's `Promise.race` timeout at `service/timer.ts:247-274` stops waiting without an abort signal to `executeJobCore`; a late call can continue. These are source-established semantics, not newly executed live failures. They matter whenever a product promises accepted work will complete exactly once. Do not relabel every scheduled `ok` as a completed artifact.

This is not a claim that gateway delivery is generally non-durable: its outbound queue already has much stronger admission/checkpoint/recovery controls. **Run durability and delivery durability are distinct.**

## Confirmed issue DUR-01: duplicate Pulse execution admission

`POST /api/pulse/proposals/[id]` reads a pending proposal, performs `gatewayCallAsUser('cron.add', ...)`, then calls `markApproved`. The pending check is not an atomic claim; `markApproved` updates by org/id without a pending-state predicate. Each cron registration creates an independent job, and repeating the job name is not an idempotency key.

Two new controlled tests invoke the real route with mocked authority/database/gateway boundaries:

- Concurrent requests both read pending, both return 200, and produce **two `cron.add` calls**.
- First `cron.add` succeeds but the subsequent `markApproved` fails; retry still reads pending and creates **a second job**.

This is a confirmed route-level race/replay defect. The tests do not claim to reproduce a real calendar duplicate or actual multi-process database behavior. Existing tests check a later request seeing already-approved status; that does not cover concurrent or unknown-outcome admission.

Minimal fix requires an atomic server-owned transition to admitted/dispatching plus a stable logical effect key and persistent remote job receipt. A CAS alone addresses concurrency but not the crash after remote acceptance and before receipt storage: that outcome must be reconciled by an idempotent gateway request or fenced as indeterminate. Keep authority bound to the approving principal and org and recheck before an eventual retry. `digest` and `fyi` are informational; their approval does not call the gateway and can be used for a bounded pilot without reusing this executable approval path.

A comment-only patch is prepared in `pulse-approval-todo.patch`, pointing to proposal `2026-10-22-agent-decision-and-proactivity-experiments.md` (DUR-01). It is applied only to the isolated Hub scratch snapshot at the exact approval site; no original checkout was edited. Parent orchestration owns the proposal ledger update.

## What already exists, and what should be added

**Reuse Pulse for human review.** `extensions/gmail-calendar/src/pulse-tools.ts:31-62` provides `pulse_propose`, posting to the Hub gateway endpoint; registration is in plugin `index.ts:53`. Pulse insert deduplicates `(org,dedupKey)`. The Hub UI/API already distinguishes informational acceptance from executable proposals. Extend this surface with structured reason codes and evidence/policy revision bindings.

**Do not infer scheduling from Pulse settings.** Pulse settings store enabled, briefing time, watched categories and channels. Searches found `getSettings` consumers in settings page/API, not a scheduler that consumes these values. `autoApprove` is explicitly scaffold-only and rejected by the settings route (`src/routes/api/pulse/settings/+server.ts:9-16`). No claim is made that changing a UI preference already changes a running automation.

**Do not count absent work as deployed.** Searches of both current `src` trees found no `assistant-jobs`, `assistant_jobs` or `personal-chat-request`. Prior related proposals/branches cannot serve as current integration proof. Gateway `src/pipeline/workflow-runner.ts` has persistent run/step functions, but production-source search found only their definitions and no caller outside tests. Hub `workflow.service.ts` manages allowed transitions for business documents; it is not an agent execution runtime.

**Reuse existing effect semantics with a narrow extension.** `runJobEmbedding` is specialized to embeddings; it must not be presented as an already generic arbitrary-tool/LLM wrapper. A classifier/research step needs a similar typed descriptor and stored result contract, stable across claims, with admitted/received/committed/indeterminate outcomes. The groupchat handler is a second working implementation to learn from; its unknown outcome intentionally stops instead of retrying, with existing TODOs tracking reconciliation. This is stronger evidence than installing a new framework.

**Feedback is partly captured, not yet an adaptation loop.** Pulse records approve/dismiss actor and state; Workforce exposes numeric `feedbackScore` plus comment (`src/lib/workforce/pipeline-gate.ts:70-86,186-204`) in its UI mutation contract; Factory tracked source search found no `feedbackScore`/`feedback_score` identifier, so end-to-end persistence or learning from those fields is not established. Artifact store supplies artifact IDs and version snapshots. In inspected Pulse paths there is no reason taxonomy, policy/rubric revision, label provenance, holdout assignment, or consumer that adjusts ranking weights. Add those to the relevant existing domain contract and evaluation export, not a disconnected thumbs-up service. Natural-language preference editing should produce explicit, versioned changes; an implicit dismissal is neither a factual-error label nor permission to disable a whole topic.

## Smallest useful proactive slice

Build a **dependency-impact Pulse card**, scoped to one existing org and a small explicit dependency/source allowlist. It should answer: “An official release changed something Minion currently uses; this is the affected package/file and the concrete evaluation or change worth considering.” The domain relevance and code anchors are the novel value; generic news collection is not.

1. A trigger submits a stable `(org, source snapshot, policy revision)` request into the existing job infrastructure.
2. A deterministic fetch/hash/version comparison exits on unchanged input. Persist source evidence before reasoning.
3. Advance one bounded selection/research step with a persisted typed decision receipt. A paid unknown outcome becomes indeterminate; do not silently repeat it.
4. Publish a single informational Pulse `digest`/`fyi` card and checkpoint the source cursor in the same ownership-fenced transaction. Current `upsertProposals` opens its own transaction, so this needs a transaction-taking helper rather than pretending two calls are atomic.
5. Record reasoned feedback on the card and policy revision. Review the resulting cases offline first. Automatic weight updates are a subsequent experiment, not a prerequisite.

Gateway cron may wake this job, but the durable job record owns progress. A gateway tool failure must not advance the source cursor or erase the pending request. Keep an ordinary card output first; generated HTML can be added after the information proves useful.

Existing Factory watch/discovery systems need to be joined at the product boundary: this report does not duplicate their separate audit. The digest should address external dependency relevance that those repo-change monitors do not already cover. If Factory already yields that exact evidence, publish those findings directly rather than rerun collection.

## Executed validation and limits

- Hub `bg-runtime.test.ts` + `job-effects.service.test.ts`: **24 tests passed**. These exercise actual PGlite SQL with controlled providers/clock, including ownership/cancellation/replay boundaries.
- Hub `groupchat.effect-ownership.test.ts` + Pulse route existing tests: **13 tests passed**. Groupchat tests include cancellation, late output rejection, duplicate jobs, and non-replay of admitted unknown outcomes.
- New `pulse-admission-probe.test.ts`: **7 passed**, comprising 5 copied baseline route tests plus **2 new adversarial reproductions**. Mocks are explicit. Counts must not double-count copied baselines as new coverage.
- Gateway restart/tenant-scope tests: **blocked before test collection** by installed `@earendil-works/pi-ai` lacking exported `./providers/all`. A minimal-config retry produced the same import error; no passing gateway runtime result is claimed.
- Shared existing dependency installations were reused via parent/peer-provided symlinks. This is focused source qualification, not frozen-lockfile release qualification. No live paid calls, remote deliveries, production DB access or product behavior changes were made. The sole source edit is the comment-only TODO in the scratch snapshot.

## Revised priority within this area

1. Repair and qualify existing Pulse executable approval admission (DUR-01).
2. Qualify scheduler ownership and reused Hub effect semantics; distinguish task completion from cron success in telemetry.
3. Add reasoned outcomes to existing Pulse/Workforce artifact contexts for evaluation, with human-reviewed policy changes.
4. Pilot one informational dependency-impact card only after checking Factory overlap and worker activation.
5. Defer generic proactive runtime, generic news feed and automatic preference-learning system until measured missing capability justifies them.
